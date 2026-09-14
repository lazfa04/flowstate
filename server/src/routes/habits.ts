import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  addLocalDays,
  parseISODate,
  parseLocalDateString,
  startOfLocalDay,
  startOfLocalMonth,
  startOfNextLocalMonth,
} from '../lib/dates.js'
import { firstQuery, paramId } from '../lib/params.js'

const router = Router()
router.use(requireAuth)

async function assertCategoryOwned(categoryId: string, userId: string) {
  return prisma.habitCategory.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  })
}

const DEFAULT_CATEGORY_NAME = 'General'

async function getOrCreateDefaultCategoryId(userId: string): Promise<string> {
  const existing = await prisma.habitCategory.findFirst({
    where: { userId, name: DEFAULT_CATEGORY_NAME },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.habitCategory.create({
    data: {
      userId,
      name: DEFAULT_CATEGORY_NAME,
      color: '#6C63FF',
      emoji: null,
    },
    select: { id: true },
  })
  return created.id
}

router.get('/logs', async (req: AuthedRequest, res) => {
  const fromStr = firstQuery(req.query.from)
  const toStr = firstQuery(req.query.to)

  if (fromStr?.trim() && toStr?.trim()) {
    const fromDay = parseLocalDateString(fromStr)
    const toDay = parseLocalDateString(toStr)
    if (!fromDay || !toDay) {
      res.status(400).json({ error: 'from and to must be YYYY-MM-DD when used together' })
      return
    }
    const rangeStart = startOfLocalDay(fromDay)
    const rangeEndExclusive = addLocalDays(startOfLocalDay(toDay), 1)
    if (rangeEndExclusive.getTime() <= rangeStart.getTime()) {
      res.status(400).json({ error: 'to must be on or after from' })
      return
    }
    const logs = await prisma.habitLog.findMany({
      where: {
        userId: req.userId!,
        date: { gte: rangeStart, lt: rangeEndExclusive },
      },
      orderBy: [{ date: 'asc' }, { habitId: 'asc' }],
    })
    res.json({ logs })
    return
  }

  const monthRaw = firstQuery(req.query.month)
  const yearRaw = firstQuery(req.query.year)
  const month = monthRaw ? Number.parseInt(monthRaw, 10) : Number.NaN
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : Number.NaN
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ error: 'month query must be an integer 1–12 (or use from & to as YYYY-MM-DD)' })
    return
  }
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    res.status(400).json({ error: 'year query must be a valid integer' })
    return
  }

  const from = startOfLocalMonth(year, month)
  const to = startOfNextLocalMonth(year, month)

  const logs = await prisma.habitLog.findMany({
    where: {
      userId: req.userId!,
      date: { gte: from, lt: to },
    },
    orderBy: [{ date: 'asc' }, { habitId: 'asc' }],
  })
  res.json({ logs })
})

router.get('/', async (req: AuthedRequest, res) => {
  const habits = await prisma.habit.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  })
  res.json({ habits })
})

router.post('/', async (req: AuthedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const color = typeof req.body?.color === 'string' ? req.body.color.trim() : ''
  if (!name || !color) {
    res.status(400).json({ error: 'name and color are required' })
    return
  }

  const categoryIdRaw = typeof req.body?.categoryId === 'string' ? req.body.categoryId.trim() : ''
  const categoryId = categoryIdRaw
    ? categoryIdRaw
    : await getOrCreateDefaultCategoryId(req.userId!)

  if (categoryIdRaw) {
    const cat = await assertCategoryOwned(categoryId, req.userId!)
    if (!cat) {
      res.status(404).json({ error: 'Habit category not found' })
      return
    }
  }
  const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() || null : null
  const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : true

  const habit = await prisma.habit.create({
    data: {
      name,
      color,
      emoji,
      categoryId,
      userId: req.userId!,
      isActive,
    },
    include: { category: true },
  })
  res.status(201).json({ habit })
})

router.post('/:id/log', async (req: AuthedRequest, res) => {
  const habitId = paramId(req.params.id)
  if (!habitId) {
    res.status(400).json({ error: 'Invalid habit id' })
    return
  }
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: req.userId! },
    select: { id: true },
  })
  if (!habit) {
    res.status(404).json({ error: 'Habit not found' })
    return
  }

  let day = startOfLocalDay(new Date())
  if (req.body?.date !== undefined && req.body?.date !== null && req.body?.date !== '') {
    const raw = req.body.date
    if (typeof raw !== 'string' || !raw.trim()) {
      res.status(400).json({ error: 'date must be a non-empty string' })
      return
    }
    const t = raw.trim()
    const parsed = parseLocalDateString(t) ?? parseISODate(t)
    if (!parsed) {
      res.status(400).json({ error: 'date must be a valid YYYY-MM-DD or ISO string' })
      return
    }
    day = startOfLocalDay(parsed)
  }

  const completed =
    typeof req.body?.completed === 'boolean' ? req.body.completed : true
  const note =
    typeof req.body?.note === 'string' ? req.body.note.trim() || null : undefined

  const log = await prisma.habitLog.upsert({
    where: {
      habitId_date: { habitId, date: day },
    },
    create: {
      habitId,
      userId: req.userId!,
      date: day,
      completed,
      note: note ?? null,
    },
    update: {
      completed,
      ...(note !== undefined ? { note } : {}),
    },
  })
  res.status(200).json({ log })
})

router.put('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid habit id' })
    return
  }
  const existing = await prisma.habit.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!existing) {
    res.status(404).json({ error: 'Habit not found' })
    return
  }

  const data: {
    name?: string
    emoji?: string | null
    color?: string
    categoryId?: string
    isActive?: boolean
  } = {}

  if (req.body?.name !== undefined) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
      res.status(400).json({ error: 'name must be a non-empty string' })
      return
    }
    data.name = req.body.name.trim()
  }
  if (req.body?.emoji !== undefined) {
    data.emoji = typeof req.body.emoji === 'string' ? req.body.emoji.trim() || null : null
  }
  if (req.body?.color !== undefined) {
    if (typeof req.body.color !== 'string' || !req.body.color.trim()) {
      res.status(400).json({ error: 'color must be a non-empty string' })
      return
    }
    data.color = req.body.color.trim()
  }
  if (req.body?.categoryId !== undefined) {
    const cid = typeof req.body.categoryId === 'string' ? req.body.categoryId : ''
    if (!cid) {
      res.status(400).json({ error: 'categoryId must be non-empty' })
      return
    }
    const cat = await assertCategoryOwned(cid, req.userId!)
    if (!cat) {
      res.status(404).json({ error: 'Habit category not found' })
      return
    }
    data.categoryId = cid
  }
  if (req.body?.isActive !== undefined) {
    if (typeof req.body.isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive must be a boolean' })
      return
    }
    data.isActive = req.body.isActive
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const habit = await prisma.habit.update({
    where: { id },
    data,
    include: { category: true },
  })
  res.json({ habit })
})

router.delete('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid habit id' })
    return
  }
  const deleted = await prisma.habit.deleteMany({
    where: { id, userId: req.userId! },
  })
  if (deleted.count === 0) {
    res.status(404).json({ error: 'Habit not found' })
    return
  }
  res.status(204).send()
})

export default router
