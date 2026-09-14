import { Router } from 'express'
import { TaskStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { addLocalDays, formatDateKey, startOfLocalDay } from '../lib/dates.js'
import { firstQuery } from '../lib/params.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

/** Days with any completed habit, mindset check-in, or done daily task. */
router.get('/', async (req: AuthedRequest, res) => {
  const yearRaw = firstQuery(req.query.year)
  const year = yearRaw ? Number(yearRaw) : new Date().getFullYear()
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    res.status(400).json({ error: 'year must be a valid integer' })
    return
  }

  const rangeStart = startOfLocalDay(new Date(year, 0, 1))
  const rangeEndExclusive = addLocalDays(startOfLocalDay(new Date(year, 11, 31)), 1)
  const userId = req.userId!

  const [habitLogs, mindsetLogs, dailyTasks] = await Promise.all([
    prisma.habitLog.findMany({
      where: {
        userId,
        completed: true,
        date: { gte: rangeStart, lt: rangeEndExclusive },
      },
      select: { date: true },
    }),
    prisma.mindsetLog.findMany({
      where: {
        userId,
        date: { gte: rangeStart, lt: rangeEndExclusive },
      },
      select: { date: true },
    }),
    prisma.dailyTask.findMany({
      where: {
        userId,
        status: TaskStatus.DONE,
        dueDate: { gte: rangeStart, lt: rangeEndExclusive },
      },
      select: { dueDate: true },
    }),
  ])

  const completed = new Set<string>()
  for (const log of habitLogs) completed.add(formatDateKey(log.date))
  for (const log of mindsetLogs) completed.add(formatDateKey(log.date))
  for (const task of dailyTasks) completed.add(formatDateKey(task.dueDate))

  res.json({
    year,
    completedDates: [...completed].sort(),
  })
})

export default router
