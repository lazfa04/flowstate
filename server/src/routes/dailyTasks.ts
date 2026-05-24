import { Router } from 'express'
import type { Response } from 'express'
import type { Prisma } from '@prisma/client'
import { TaskPriority, TaskStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { serializeDailyTask } from '../lib/dailyTaskDto.js'
import { addLocalDays, parseLocalDateString, startOfLocalDay } from '../lib/dates.js'
import { firstQuery, paramId } from '../lib/params.js'

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

router.get('/', async (req: AuthedRequest, res) => {
  const where: Prisma.DailyTaskWhereInput = { userId: req.userId! }

  const dueTodayFlag = firstQuery(req.query.dueToday)
  if (dueTodayFlag === '1' || dueTodayFlag === 'true') {
    const start = startOfLocalDay(new Date())
    const end = addLocalDays(start, 1)
    where.dueDate = { gte: start, lt: end }
  }

  const fromStr = firstQuery(req.query.from)
  const toStr = firstQuery(req.query.to)
  if (fromStr?.trim() && toStr?.trim()) {
    const fromDay = parseLocalDateString(fromStr)
    const toDay = parseLocalDateString(toStr)
    if (!fromDay || !toDay) {
      res.status(400).json({ error: 'from and to must be YYYY-MM-DD' })
      return
    }
    const rangeStart = startOfLocalDay(fromDay)
    const rangeEndExclusive = addLocalDays(startOfLocalDay(toDay), 1)
    if (rangeEndExclusive.getTime() <= rangeStart.getTime()) {
      res.status(400).json({ error: 'to must be on or after from' })
      return
    }
    where.dueDate = { gte: rangeStart, lt: rangeEndExclusive }
  }

  const statusRaw = firstQuery(req.query.status)
  if (statusRaw) {
    const s = parseTaskStatus(statusRaw)
    if (!s) {
      res.status(400).json({ error: 'status must be TODO, IN_PROGRESS, or DONE' })
      return
    }
    where.status = s
  }

  const tasks = await prisma.dailyTask.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  })
  res.json({ tasks: tasks.map(serializeDailyTask) })
})

/** Delete all daily tasks in an inclusive `from`–`to` date range (YYYY-MM-DD). */
router.delete('/', async (req: AuthedRequest, res) => {
  const fromStr = firstQuery(req.query.from)
  const toStr = firstQuery(req.query.to)
  if (!fromStr?.trim() || !toStr?.trim()) {
    res.status(400).json({ error: 'from and to query params are required (YYYY-MM-DD)' })
    return
  }
  const fromDay = parseLocalDateString(fromStr)
  const toDay = parseLocalDateString(toStr)
  if (!fromDay || !toDay) {
    res.status(400).json({ error: 'from and to must be YYYY-MM-DD' })
    return
  }
  const rangeStart = startOfLocalDay(fromDay)
  const rangeEndExclusive = addLocalDays(startOfLocalDay(toDay), 1)
  if (rangeEndExclusive.getTime() <= rangeStart.getTime()) {
    res.status(400).json({ error: 'to must be on or after from' })
    return
  }
  const result = await prisma.dailyTask.deleteMany({
    where: {
      userId: req.userId!,
      dueDate: { gte: rangeStart, lt: rangeEndExclusive },
    },
  })
  res.json({ deleted: result.count })
})

router.post('/', async (req: AuthedRequest, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    res.status(400).json({ error: 'title is required' })
    return
  }

  let dueDate: Date
  if (req.body?.dueDate !== undefined && req.body?.dueDate !== null) {
    const raw = typeof req.body.dueDate === 'string' ? req.body.dueDate.trim() : ''
    const parsed = parseLocalDateString(raw)
    if (!parsed) {
      res.status(400).json({ error: 'dueDate must be YYYY-MM-DD' })
      return
    }
    dueDate = parsed
  } else {
    dueDate = startOfLocalDay(new Date())
  }

  const status = parseTaskStatus(req.body?.status) ?? TaskStatus.TODO
  const priority = parseTaskPriority(req.body?.priority) ?? TaskPriority.MEDIUM
  const description =
    typeof req.body?.description === 'string' ? req.body.description.trim() || null : null

  const task = await prisma.dailyTask.create({
    data: {
      userId: req.userId!,
      title,
      description,
      status,
      priority,
      dueDate,
    },
  })
  res.status(201).json({ task: serializeDailyTask(task) })
})

async function updateDailyTaskById(req: AuthedRequest, res: Response) {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid task id' })
    return
  }
  const existing = await prisma.dailyTask.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!existing) {
    res.status(404).json({ error: 'Daily task not found' })
    return
  }

  const data: Prisma.DailyTaskUpdateInput = {}

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
    const raw = typeof req.body.dueDate === 'string' ? req.body.dueDate.trim() : ''
    const parsed = parseLocalDateString(raw)
    if (!parsed) {
      res.status(400).json({ error: 'dueDate must be YYYY-MM-DD' })
      return
    }
    data.dueDate = parsed
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const task = await prisma.dailyTask.update({ where: { id }, data })
  res.json({ task: serializeDailyTask(task) })
}

router.patch('/:id', updateDailyTaskById)
router.put('/:id', updateDailyTaskById)

router.delete('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid task id' })
    return
  }
  const deleted = await prisma.dailyTask.deleteMany({
    where: { id, userId: req.userId! },
  })
  if (deleted.count === 0) {
    res.status(404).json({ error: 'Daily task not found' })
    return
  }
  res.status(204).send()
})

export default router
