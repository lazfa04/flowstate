import { addLocalDays, formatDateKey, startOfLocalDay } from './dates'

export type YearDayCell = {
  dateKey: string | null
  inYear: boolean
  completed: boolean
  isFuture: boolean
}

export type YearProgressGrid = {
  weeks: YearDayCell[][]
  monthLabels: { label: string; weekIndex: number }[]
}

export function buildYearProgressGrid(
  year: number,
  completedDates: Iterable<string>,
  todayKey: string = formatDateKey(startOfLocalDay(new Date())),
): YearProgressGrid {
  const completed = new Set(completedDates)
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const gridStart = addLocalDays(yearStart, -yearStart.getDay())
  const gridEnd = addLocalDays(yearEnd, 6 - yearEnd.getDay())

  const weeks: YearDayCell[][] = []
  let week: YearDayCell[] = []

  for (let d = new Date(gridStart); d.getTime() <= gridEnd.getTime(); d = addLocalDays(d, 1)) {
    const dateKey = formatDateKey(d)
    const inYear = d.getFullYear() === year
    const isFuture = inYear && dateKey > todayKey
    week.push({
      dateKey: inYear ? dateKey : null,
      inYear,
      completed: inYear && !isFuture && completed.has(dateKey),
      isFuture,
    })
    if (d.getDay() === 6) {
      weeks.push(week)
      week = []
    }
  }

  const monthLabels: { label: string; weekIndex: number }[] = []
  for (let m = 0; m < 12; m++) {
    const firstKey = formatDateKey(new Date(year, m, 1))
    const weekIndex = weeks.findIndex((w) => w.some((c) => c.dateKey === firstKey))
    if (weekIndex >= 0) {
      monthLabels.push({
        label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(year, m, 1)),
        weekIndex,
      })
    }
  }

  return { weeks, monthLabels }
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

/** Calendar days elapsed in `year` up to and including `todayKey` (local). */
export function eligibleDaysInYear(year: number, todayKey: string): number {
  const [y, m, d] = todayKey.split('-').map(Number)
  const todayYear = y!
  if (year < todayYear) return daysInYear(year)
  if (year > todayYear) return 0
  const jan1 = new Date(year, 0, 1)
  const today = new Date(todayYear, m! - 1, d!)
  return Math.floor((today.getTime() - jan1.getTime()) / 86_400_000) + 1
}

/** How far through the calendar year we are (vs. today), and days left in the year. */
export function yearCalendarProgress(year: number, todayKey: string) {
  const totalDays = daysInYear(year)
  const [y] = todayKey.split('-').map(Number)
  const todayYear = y!

  if (year < todayYear) {
    return { yearCompletePct: 100, daysRemaining: 0, daysElapsed: totalDays, totalDays }
  }
  if (year > todayYear) {
    return { yearCompletePct: 0, daysRemaining: totalDays, daysElapsed: 0, totalDays }
  }

  const daysElapsed = eligibleDaysInYear(year, todayKey)
  const daysRemaining = Math.max(0, totalDays - daysElapsed)
  const yearCompletePct = Math.round((daysElapsed / totalDays) * 100)
  return { yearCompletePct, daysRemaining, daysElapsed, totalDays }
}
