import type { TaskPriority, TaskStatus } from './dashboard'

export type DailyTask = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  completedAt: string | null
  createdAt: string
}
