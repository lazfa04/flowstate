import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { firstQuery } from '../lib/params.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  addLocalDays,
  parseISODate,
  parseLocalDateString,
  startOfLocalDay,
  startOfLocalMonth,
  startOfNextLocalMonth,
} from '../lib/dates.js'

const router = Router()
router.use(requireAuth)

function parseScore(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10) return v
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
    const n = Number.parseInt(v.trim(), 10)
    if (n >= 1 && n <= 10) return n
  }
  return null
}

router.get('/', async (req: AuthedRequest, res) => {
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
    const logs = await prisma.mindsetLog.findMany({
      where: {
        userId: req.userId!,
        date: { gte: rangeStart, lt: rangeEndExclusive },
      },
      orderBy: { date: 'asc' },
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

  const logs = await prisma.mindsetLog.findMany({
    where: {
      userId: req.userId!,
      date: { gte: from, lt: to },
    },
    orderBy: { date: 'asc' },
  })
  res.json({ logs })
})

router.post('/', async (req: AuthedRequest, res) => {
  const dateRaw = req.body?.date
  let dayStart: Date | null = null
  if (typeof dateRaw === 'string') {
    const s = dateRaw.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      dayStart = parseLocalDateString(s)
    } else {
      const parsed = parseISODate(s)
      if (parsed) dayStart = startOfLocalDay(parsed)
    }
  }
  if (!dayStart) {
    res.status(400).json({ error: 'date is required (YYYY-MM-DD or ISO datetime)' })
    return
  }
  const day = dayStart

  const mood = parseScore(req.body?.mood)
  const energy = parseScore(req.body?.energy)
  const focus = parseScore(req.body?.focus)
  const motivation = parseScore(req.body?.motivation)
  if (mood === null || energy === null || focus === null || motivation === null) {
    res.status(400).json({ error: 'mood, energy, focus, and motivation must be integers from 1 to 10' })
    return
  }
  const note =
    typeof req.body?.note === 'string' ? req.body.note.trim() || null : null

  const log = await prisma.mindsetLog.upsert({
    where: {
      userId_date: { userId: req.userId!, date: day },
    },
    create: {
      userId: req.userId!,
      date: day,
      mood,
      energy,
      focus,
      motivation,
      note,
    },
    update: {
      mood,
      energy,
      focus,
      motivation,
      note,
    },
  })

  res.status(200).json({ log })
})

export default router
