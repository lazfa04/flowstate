import { addLocalDays, formatDateKey, isSameLocalDay, parseLogDate, startOfLocalDay, startOfWeekSunday } from './dates'
import type { DailyTask } from '../types/dailyTask'

export const DASHBOARD_CARD_BG = '#141726'
export const BAR_TRACK = '#2A2F47'

export const PROGRESS_COLORS = {
  coral: '#FF6B9D',
  amber: '#FFB84C',
  sky: '#4FC3F7',
  mint: '#00D4AA',
  empty: '#2A2F47',
  ringIdle: '#6B7280',
} as const

/** Subtle column background tints Sun → Sat */
export const DAY_COLUMN_TINTS = [
  '#6C63FF15',
  '#4FC3F715',
  '#00D4AA15',
  '#FF6B9D15',
  '#FFB84C15',
  '#4FC3F715',
  '#00D4AA15',
] as const

/** Day column ring + accent colors Sun → Sat (fixed per weekday). */
export const DAY_RING_COLORS = [
  '#6C63FF', // Sunday — violet
  '#4FC3F7', // Monday — sky blue
  '#00D4AA', // Tuesday — mint
  '#FF6B9D', // Wednesday — coral
  '#FFB84C', // Thursday — amber
  '#6C63FF', // Friday — violet
  '#00D4AA', // Saturday — mint
] as const

export function ringColorForDayIndex(dayIndex: number, hasTasks: boolean): string {
  if (!hasTasks) return BAR_TRACK
  return DAY_RING_COLORS[dayIndex] ?? DAY_RING_COLORS[0]
}

/** Sun 00:00 through Sat 23:59:59.999 for the week containing `ref`. */
export function getWeekBoundsSunToSat(ref: Date = new Date()) {
  const start = startOfWeekSunday(ref)
  const end = addLocalDays(start, 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Seven dates, Sunday → Saturday. */
export function getWeekDaysSunToSat(ref: Date = new Date()): Date[] {
  const start = startOfWeekSunday(ref)
  return Array.from({ length: 7 }, (_, i) => addLocalDays(start, i))
}

export function weekRangeQueryParams(ref: Date = new Date()): { from: string; to: string } {
  const { start, end } = getWeekBoundsSunToSat(ref)
  return { from: formatDateKey(start), to: formatDateKey(end) }
}

/** Bar / filled segment color by completion %. */
export function progressColorForPct(pct: number): string {
  if (pct >= 100) return PROGRESS_COLORS.mint
  if (pct >= 75) return PROGRESS_COLORS.sky
  if (pct >= 50) return PROGRESS_COLORS.amber
  if (pct >= 1) return PROGRESS_COLORS.coral
  return PROGRESS_COLORS.empty
}

export type DayTaskStats = {
  dateKey: string
  total: number
  completed: number
  notCompleted: number
  pct: number | null
  allTasks: DailyTask[]
}

export type WeekTaskStats = {
  total: number
  completed: number
  pct: number | null
}

export function tasksDueOnDay(tasks: DailyTask[], day: Date): DailyTask[] {
  return tasks.filter((t) => isSameLocalDay(parseLogDate(t.dueDate), day))
}

function sortDayTasks(a: DailyTask, b: DailyTask): number {
  const doneA = a.status === 'DONE' ? 1 : 0
  const doneB = b.status === 'DONE' ? 1 : 0
  if (doneA !== doneB) return doneA - doneB
  const order = { IN_PROGRESS: 0, TODO: 1, DONE: 2 }
  return order[a.status] - order[b.status] || a.title.localeCompare(b.title)
}

export function computeDayStats(tasks: DailyTask[], day: Date): DayTaskStats {
  const due = tasksDueOnDay(tasks, day)
  const total = due.length
  const completed = due.filter((t) => t.status === 'DONE').length
  const pct = total === 0 ? null : Math.round((completed / total) * 100)
  return {
    dateKey: formatDateKey(day),
    total,
    completed,
    notCompleted: total - completed,
    pct,
    allTasks: [...due].sort(sortDayTasks),
  }
}

export function computeWeekStats(tasks: DailyTask[], weekDays: Date[]): WeekTaskStats {
  let total = 0
  let completed = 0
  for (const day of weekDays) {
    const s = computeDayStats(tasks, day)
    total += s.total
    completed += s.completed
  }
  const pct = total === 0 ? null : Math.round((completed / total) * 100)
  return { total, completed, pct }
}

export function filterWeekDailyTasks(tasks: DailyTask[], ref: Date = new Date()): DailyTask[] {
  const { start, end } = getWeekBoundsSunToSat(ref)
  return tasks.filter((t) => {
    const due = startOfLocalDay(parseLogDate(t.dueDate))
    return due >= start && due <= end
  })
}

/** Short label for charts: Sun, Mon, … */
export function formatDayChartLabel(day: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day)
}

/** Column header: Sunday + 10 May 2026 */
export function formatDayColumnHeader(day: Date): { weekday: string; dateLine: string } {
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(day)
  const dateLine = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(day)
  return { weekday, dateLine }
}

/** Week-start badge: 04.01.2026 */
export function formatWeekStartBadge(monday: Date): string {
  const d = monday.getDate().toString().padStart(2, '0')
  const m = (monday.getMonth() + 1).toString().padStart(2, '0')
  const y = monday.getFullYear()
  return `${d}.${m}.${y}`
}
