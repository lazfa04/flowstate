import { Router } from 'express'
import type { Response } from 'express'
import type { Prisma } from '@prisma/client'
import { TaskPriority, TaskStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { addLocalDays, parseISODate, startOfLocalDay } from '../lib/dates.js'
import { paramId } from '../lib/params.js'

const router = Router()
router.use(requireAuth)

function parseTaskStatus(v: unknown): TaskStatus | null {
  if (v === 'TODO' || v === 'IN_PROGRESS' || v === 'DONE') return v as TaskStatus
  return null
}

function parseTaskPriority(v: unknown): TaskPriority | null {
  if (v === 'LOW' || v === 'MEDIUM' || v === 'HIGH') return v as TaskPriority
  return null
}

async function assertProjectOwned(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  })
}

const taskInclude = {
  project: { select: { id: true, name: true, status: true } },
  assignee: { select: { id: true, email: true, name: true } },
} as const

router.get('/', async (req: AuthedRequest, res) => {
  const { projectId, status, priority, dueToday } = req.query
  const where: Prisma.TaskWhereInput = {
    project: { ownerId: req.userId! },
  }

  const dueTodayFlag =
    dueToday === '1' || dueToday === 'true' || (typeof dueToday === 'string' && dueToday.toLowerCase() === 'yes')
  if (dueTodayFlag) {
    const start = startOfLocalDay(new Date())
    const end = addLocalDays(start, 1)
    where.dueDate = { gte: start, lt: end }
  }

  if (projectId !== undefined) {
    if (typeof projectId !== 'string' || !projectId) {
      res.status(400).json({ error: 'projectId must be a non-empty string when provided' })
      return
    }
    const owned = await assertProjectOwned(projectId, req.userId!)
    if (!owned) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    where.projectId = projectId
  }

  if (status !== undefined) {
    const s = parseTaskStatus(status)
    if (!s) {
      res.status(400).json({ error: 'status must be TODO, IN_PROGRESS, or DONE' })
      return
    }
    where.status = s
  }

  if (priority !== undefined) {
    const p = parseTaskPriority(priority)
    if (!p) {
      res.status(400).json({ error: 'priority must be LOW, MEDIUM, or HIGH' })
      return
    }
    where.priority = p
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    include: taskInclude,
  })
  res.json({ tasks })
})

router.post('/', async (req: AuthedRequest, res) => {
  const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId : ''
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!projectId || !title) {
    res.status(400).json({ error: 'projectId and title are required' })
    return
  }
  const owned = await assertProjectOwned(projectId, req.userId!)
  if (!owned) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const description =
    typeof req.body?.description === 'string' ? req.body.description.trim() || null : null
  const status = parseTaskStatus(req.body?.status) ?? TaskStatus.TODO
  const priority = parseTaskPriority(req.body?.priority) ?? TaskPriority.MEDIUM
  let dueDate: Date | null = null
  if (req.body?.dueDate !== undefined && req.body?.dueDate !== null) {
    const d = parseISODate(req.body.dueDate)
    if (!d) {
      res.status(400).json({ error: 'dueDate must be a valid ISO date string' })
      return
    }
    dueDate = d
  }
  let assignedToId: string | null | undefined = undefined
  if (req.body?.assignedToId !== undefined) {
    if (req.body.assignedToId === null || req.body.assignedToId === '') {
      assignedToId = null
    } else if (typeof req.body.assignedToId === 'string') {
      const assigneeUser = await prisma.user.findUnique({
        where: { id: req.body.assignedToId },
        select: { id: true },
      })
      if (!assigneeUser) {
        res.status(400).json({ error: 'assignee user not found' })
        return
      }
      assignedToId = req.body.assignedToId
    } else {
      res.status(400).json({ error: 'assignedToId must be a string or null' })
      return
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status,
      priority,
      dueDate,
      projectId,
      assignedToId: assignedToId === undefined ? null : assignedToId,
    },
    include: taskInclude,
  })
  res.status(201).json({ task })
})

async function updateTaskById(req: AuthedRequest, res: Response) {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid task id' })
    return
  }
  const existing = await prisma.task.findFirst({
    where: { id, project: { ownerId: req.userId! } },
  })
  if (!existing) {
    res.status(404).json({ error: 'Task not found' })
    return
  }

  const data: Prisma.TaskUpdateInput = {}

  if (req.body?.title !== undefined) {
    if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
      res.status(400).json({ error: 'title must be a non-empty string' })
      return
    }
    data.title = req.body.title.trim()
  }
  if (req.body?.description !== undefined) {
    data.description =
      typeof req.body.description === 'string' ? req.body.description.trim() || null : null
  }
  if (req.body?.status !== undefined) {
    const s = parseTaskStatus(req.body.status)
    if (!s) {
      res.status(400).json({ error: 'status must be TODO, IN_PROGRESS, or DONE' })
      return
    }
    data.status = s
    if (s === TaskStatus.DONE && !req.body?.completedAt) {
      data.completedAt = new Date()
    }
    if (s !== TaskStatus.DONE) {
      data.completedAt = null
    }
  }
  if (req.body?.priority !== undefined) {
    const p = parseTaskPriority(req.body.priority)
    if (!p) {
      res.status(400).json({ error: 'priority must be LOW, MEDIUM, or HIGH' })
      return
    }
    data.priority = p
  }
  if (req.body?.dueDate !== undefined) {
    if (req.body.dueDate === null) {
      data.dueDate = null
    } else {
      const d = parseISODate(req.body.dueDate)
      if (!d) {
        res.status(400).json({ error: 'dueDate must be a valid ISO date string or null' })
        return
      }
      data.dueDate = d
    }
  }
  if (req.body?.projectId !== undefined) {
    const pid = typeof req.body.projectId === 'string' ? req.body.projectId : ''
    if (!pid) {
      res.status(400).json({ error: 'projectId must be non-empty' })
      return
    }
    const owned = await assertProjectOwned(pid, req.userId!)
    if (!owned) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    data.project = { connect: { id: pid } }
  }
  if (req.body?.assignedToId !== undefined) {
    if (req.body.assignedToId === null || req.body.assignedToId === '') {
      data.assignee = { disconnect: true }
    } else if (typeof req.body.assignedToId === 'string') {
      const assigneeUser = await prisma.user.findUnique({
        where: { id: req.body.assignedToId },
        select: { id: true },
      })
      if (!assigneeUser) {
        res.status(400).json({ error: 'assignee user not found' })
        return
      }
      data.assignee = { connect: { id: req.body.assignedToId } }
    } else {
      res.status(400).json({ error: 'assignedToId must be a string or null' })
      return
    }
  }
  if (req.body?.completedAt !== undefined) {
    if (req.body.completedAt === null) {
      data.completedAt = null
    } else {
      const d = parseISODate(req.body.completedAt)
      if (!d) {
        res.status(400).json({ error: 'completedAt must be a valid ISO date string or null' })
        return
      }
      data.completedAt = d
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude,
  })
  res.json({ task })
}

router.put('/:id', updateTaskById)
router.patch('/:id', updateTaskById)

router.delete('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid task id' })
    return
  }
  const deleted = await prisma.task.deleteMany({
    where: { id, project: { ownerId: req.userId! } },
  })
  if (deleted.count === 0) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  res.status(204).send()
})

router.patch('/:id/complete', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid task id' })
    return
  }
  const existing = await prisma.task.findFirst({
    where: { id, project: { ownerId: req.userId! } },
  })
  if (!existing) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  const task = await prisma.task.update({
    where: { id },
    data: {
      status: TaskStatus.DONE,
      completedAt: new Date(),
    },
    include: taskInclude,
  })
  res.json({ task })
})

export default router
