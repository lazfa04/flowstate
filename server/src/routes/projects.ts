import { Router } from 'express'
import { ProjectStatus } from '@prisma/client'
import { paramId } from '../lib/params.js'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function parseProjectStatus(v: unknown): ProjectStatus | null {
  if (v === 'ACTIVE' || v === 'ARCHIVED') return v as ProjectStatus
  return null
}

router.get('/', async (req: AuthedRequest, res) => {
  const rows = await prisma.project.findMany({
    where: { ownerId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: {
      tasks: { select: { status: true } },
    },
  })
  const projects = rows.map(({ tasks, ...p }) => ({
    ...p,
    taskTotal: tasks.length,
    taskCompleted: tasks.filter((t) => t.status === 'DONE').length,
  }))
  res.json({ projects })
})

router.post('/', async (req: AuthedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const color = typeof req.body?.color === 'string' ? req.body.color.trim() : ''
  if (!name || !color) {
    res.status(400).json({ error: 'name and color are required' })
    return
  }
  const description =
    typeof req.body?.description === 'string' ? req.body.description.trim() || null : null
  const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() || null : null
  const status = parseProjectStatus(req.body?.status) ?? ProjectStatus.ACTIVE

  const project = await prisma.project.create({
    data: {
      name,
      description,
      color,
      emoji,
      status,
      ownerId: req.userId!,
    },
  })
  res.status(201).json({
    project: {
      ...project,
      taskTotal: 0,
      taskCompleted: 0,
    },
  })
})

router.get('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid project id' })
    return
  }
  const row = await prisma.project.findFirst({
    where: { id, ownerId: req.userId! },
    include: {
      tasks: { select: { status: true } },
    },
  })
  if (!row) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  const { tasks, ...p } = row
  res.json({
    project: {
      ...p,
      taskTotal: tasks.length,
      taskCompleted: tasks.filter((t) => t.status === 'DONE').length,
    },
  })
})

router.put('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid project id' })
    return
  }
  const existing = await prisma.project.findFirst({
    where: { id, ownerId: req.userId! },
  })
  if (!existing) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const data: {
    name?: string
    description?: string | null
    color?: string
    emoji?: string | null
    status?: ProjectStatus
  } = {}

  if (req.body?.name !== undefined) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
      res.status(400).json({ error: 'name must be a non-empty string' })
      return
    }
    data.name = req.body.name.trim()
  }
  if (req.body?.description !== undefined) {
    data.description =
      typeof req.body.description === 'string' ? req.body.description.trim() || null : null
  }
  if (req.body?.color !== undefined) {
    if (typeof req.body.color !== 'string' || !req.body.color.trim()) {
      res.status(400).json({ error: 'color must be a non-empty string' })
      return
    }
    data.color = req.body.color.trim()
  }
  if (req.body?.emoji !== undefined) {
    data.emoji = typeof req.body.emoji === 'string' ? req.body.emoji.trim() || null : null
  }
  if (req.body?.status !== undefined) {
    const s = parseProjectStatus(req.body.status)
    if (!s) {
      res.status(400).json({ error: 'status must be ACTIVE or ARCHIVED' })
      return
    }
    data.status = s
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const project = await prisma.project.update({
    where: { id },
    data,
  })
  res.json({ project })
})

router.delete('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid project id' })
    return
  }
  const deleted = await prisma.project.deleteMany({
    where: { id, ownerId: req.userId! },
  })
  if (deleted.count === 0) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.status(204).send()
})

export default router
