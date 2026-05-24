import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  addLocalDays,
  parseISODate,
  parseLocalDateString,
  startOfLocalDay,
} from '../lib/dates.js'
import { paramId } from '../lib/params.js'

const router = Router()
router.use(requireAuth)

/** Local Monday 00:00 of the calendar week containing `d`. */
function mondayOfWeekContaining(d: Date): Date {
  const x = startOfLocalDay(d)
  const dow = x.getDay()
  const sinceMonday = (dow + 6) % 7
  x.setDate(x.getDate() - sinceMonday)
  return x
}

function weekKeyString(d: Date): string {
  const x = startOfLocalDay(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type WeekAgg = { total: number; completed: number }

function aggregateByWeek(
  rows: { weekStart: Date; completed: boolean }[],
): Map<number, WeekAgg> {
  const m = new Map<number, WeekAgg>()
  for (const g of rows) {
    const t = startOfLocalDay(new Date(g.weekStart)).getTime()
    const cur = m.get(t) ?? { total: 0, completed: 0 }
    cur.total += 1
    if (g.completed) cur.completed += 1
    m.set(t, cur)
  }
  return m
}

/** GET /api/goals/insights — best week, streak, 4-week snapshot for mini calendar. */
router.get('/insights', async (req: AuthedRequest, res) => {
  const anchorRaw = req.query.anchorWeekStart
  let anchorMonday: Date
  if (typeof anchorRaw === 'string' && anchorRaw.trim()) {
    const parsed =
      /^\d{4}-\d{2}-\d{2}$/.test(anchorRaw.trim()) ? parseLocalDateString(anchorRaw) : parseISODate(anchorRaw)
    if (!parsed) {
      res.status(400).json({ error: 'anchorWeekStart must be a valid date' })
      return
    }
    anchorMonday = mondayOfWeekContaining(parsed)
  } else {
    anchorMonday = mondayOfWeekContaining(new Date())
  }

  const all = await prisma.weeklyGoal.findMany({
    where: { userId: req.userId! },
    select: { weekStart: true, completed: true },
  })
  const agg = aggregateByWeek(all)

  let bestWeek: { weekStart: string; completed: number; total: number } | null = null
  let bestWeekTime: number | null = null
  for (const [t, a] of agg) {
    if (a.total === 0) continue
    if (
      !bestWeek ||
      a.completed > bestWeek.completed ||
      (a.completed === bestWeek.completed && a.total > bestWeek.total) ||
      (a.completed === bestWeek.completed &&
        a.total === bestWeek.total &&
        bestWeekTime !== null &&
        t > bestWeekTime)
    ) {
      bestWeek = {
        weekStart: weekKeyString(new Date(t)),
        completed: a.completed,
        total: a.total,
      }
      bestWeekTime = t
    }
  }

  let currentStreak = 0
  let cursor = mondayOfWeekContaining(new Date())
  for (let i = 0; i < 520; i++) {
    const t = startOfLocalDay(cursor).getTime()
    const a = agg.get(t)
    if (!a || a.total === 0) break
    const ratio = a.completed / a.total
    if (ratio <= 0.5) break
    currentStreak += 1
    cursor = addLocalDays(cursor, -7)
  }

  const calendarWeeks: { weekStart: string; completed: number; total: number }[] = []
  for (let i = 3; i >= 0; i--) {
    const mon = addLocalDays(anchorMonday, -7 * i)
    const t = startOfLocalDay(mon).getTime()
    const a = agg.get(t) ?? { total: 0, completed: 0 }
    calendarWeeks.push({
      weekStart: weekKeyString(mon),
      completed: a.completed,
      total: a.total,
    })
  }

  res.json({ bestWeek, currentStreak, calendarWeeks })
})

router.get('/', async (req: AuthedRequest, res) => {
  const weekStartRaw = req.query.weekStart
  if (weekStartRaw === undefined || typeof weekStartRaw !== 'string' || !weekStartRaw.trim()) {
    res.status(400).json({ error: 'weekStart query is required (ISO date string)' })
    return
  }
  const parsed =
    /^\d{4}-\d{2}-\d{2}$/.test(weekStartRaw.trim()) ? parseLocalDateString(weekStartRaw) : parseISODate(weekStartRaw)
  if (!parsed) {
    res.status(400).json({ error: 'weekStart must be a valid ISO date or YYYY-MM-DD' })
    return
  }
  const weekStart = mondayOfWeekContaining(parsed)

  const goals = await prisma.weeklyGoal.findMany({
    where: {
      userId: req.userId!,
      weekStart,
    },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ goals })
})

router.post('/', async (req: AuthedRequest, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    res.status(400).json({ error: 'title is required' })
    return
  }
  const wsRaw = req.body?.weekStart
  const parsed =
    typeof wsRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(wsRaw.trim())
      ? parseLocalDateString(wsRaw)
      : parseISODate(wsRaw)
  if (!parsed) {
    res.status(400).json({ error: 'weekStart is required and must be a valid ISO or YYYY-MM-DD date' })
    return
  }
  const weekStart = startOfLocalDay(mondayOfWeekContaining(parsed))
  const completed = typeof req.body?.completed === 'boolean' ? req.body.completed : false

  const goal = await prisma.weeklyGoal.create({
    data: {
      userId: req.userId!,
      weekStart,
      title,
      completed,
    },
  })
  res.status(201).json({ goal })
})

router.patch('/:id/toggle', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid goal id' })
    return
  }
  const existing = await prisma.weeklyGoal.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!existing) {
    res.status(404).json({ error: 'Goal not found' })
    return
  }
  const goal = await prisma.weeklyGoal.update({
    where: { id },
    data: { completed: !existing.completed },
  })
  res.json({ goal })
})

router.delete('/:id', async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: 'Invalid goal id' })
    return
  }
  const deleted = await prisma.weeklyGoal.deleteMany({
    where: { id, userId: req.userId! },
  })
  if (deleted.count === 0) {
    res.status(404).json({ error: 'Goal not found' })
    return
  }
  res.status(204).send()
})

export default router
