export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type TaskWithProject = {
  id: string
  title: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  completedAt: string | null
  projectId: string
  project: { id: string; name: string; status: string }
  description?: string | null
  assignee?: { id: string; email: string; name: string } | null
}

export type ProjectDto = {
  id: string
  name: string
  status: string
}

export type HabitDto = {
  id: string
  name: string
  isActive: boolean
}

export type HabitLogDto = {
  id: string
  habitId: string
  date: string
  completed: boolean
}

export type MindsetLogDto = {
  id: string
  date: string
  mood: number
  energy: number
  focus: number
  motivation: number
}

export type WeeklyGoalDto = {
  id: string
  title: string
  completed: boolean
}
