import { formatDateKey, parseLogDate, startOfLocalDay } from './dates'
import type { DailyTask } from '../types/dailyTask'

/** Normalize API task payloads so `dueDate` is always `YYYY-MM-DD`. */
export function normalizeDailyTask(raw: DailyTask): DailyTask {
  return {
    ...raw,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    dueDate: formatDateKey(parseLogDate(raw.dueDate)),
  }
}

export function sortDailyTasksByDue(tasks: DailyTask[]): DailyTask[] {
  return [...tasks].sort(
    (a, b) => parseLogDate(a.dueDate).getTime() - parseLogDate(b.dueDate).getTime(),
  )
}

export function dueDateFromDay(day: Date): string {
  return formatDateKey(startOfLocalDay(day))
}
