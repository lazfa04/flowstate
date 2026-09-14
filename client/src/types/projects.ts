import type { TaskPriority, TaskStatus } from './dashboard'

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED'

export type ProjectSummary = {
  id: string
  name: string
  description: string | null
  color: string
  emoji: string | null
  status: ProjectStatus
  createdAt: string
  taskTotal: number
  taskCompleted: number
}

export type ProjectTask = {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  completedAt: string | null
  projectId: string
  project: { id: string; name: string; status: string }
  assignee: { id: string; email: string; name: string } | null
}

export type UserOption = {
  id: string
  email: string
  name: string
}
