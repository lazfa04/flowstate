import type { DailyTask } from '@prisma/client'
import { formatDateKey, startOfLocalDay } from './dates.js'

/** API shape: `dueDate` is always `YYYY-MM-DD` (calendar day, not UTC instant). */
export function serializeDailyTask(task: DailyTask) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: formatDateKey(startOfLocalDay(task.dueDate)),
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
  }
}
