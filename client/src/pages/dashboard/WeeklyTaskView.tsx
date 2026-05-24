import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { normalizeDailyTask } from '../../lib/dailyTaskNormalize'
import { cn } from '../../lib/cn'
import {
  computeDayStats,
  DAY_COLUMN_TINTS,
  formatDayColumnHeader,
  getWeekDaysSunToSat,
  ringColorForDayIndex,
} from '../../lib/dashboardWeek'
import { formatDateKey, isSameLocalDay, startOfLocalDay } from '../../lib/dates'
import { toastError, toastSuccess } from '../../lib/toast'
import type { DailyTask } from '../../types/dailyTask'
import { DayProgressRing } from './DayProgressRing'

type Props = {
  tasks: DailyTask[]
  token: string | null
  onTasksChange: Dispatch<SetStateAction<DailyTask[]>>
  onAddForDay: (day: Date) => void
  onEditTask: (task: DailyTask) => void
}

export function WeeklyTaskView({ tasks, token, onTasksChange, onAddForDay, onEditTask }: Props) {
  const weekDays = useMemo(() => getWeekDaysSunToSat(new Date()), [])
  const today = startOfLocalDay(new Date())

  async function toggleComplete(task: DailyTask) {
    if (!token) return
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
    const prev = tasks
    const optimistic = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            status: nextStatus as DailyTask['status'],
            completedAt: nextStatus === 'DONE' ? new Date().toISOString() : null,
          }
        : t,
    )
    onTasksChange(optimistic)
    try {
      const res = await api<{ task: DailyTask }>(`/api/daily-tasks/${task.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: nextStatus }),
      })
      onTasksChange((cur) => cur.map((t) => (t.id === task.id ? normalizeDailyTask(res.task) : t)))
    } catch (e) {
      onTasksChange(prev)
      toastError(e instanceof Error ? e.message : 'Could not update task')
    }
  }

  async function deleteTask(task: DailyTask) {
    if (!token) return
    if (!window.confirm(`Delete "${task.title}"?`)) return
    const prev = tasks
    onTasksChange((cur) => cur.filter((t) => t.id !== task.id))
    try {
      await api(`/api/daily-tasks/${task.id}`, { method: 'DELETE', token })
      toastSuccess('Task deleted')
    } catch (e) {
      onTasksChange(prev)
      toastError(e instanceof Error ? e.message : 'Could not delete task')
    }
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[80rem] grid-cols-7 gap-3">
        {weekDays.map((day, index) => (
          <DayColumn
            key={formatDateKey(day)}
            day={day}
            dayIndex={index}
            tasks={tasks}
            today={today}
            token={token}
            onToggle={toggleComplete}
            onAddForDay={onAddForDay}
            onEditTask={onEditTask}
            onDeleteTask={deleteTask}
          />
        ))}
      </div>
    </div>
  )
}

function taskDisplayTitle(task: DailyTask): string {
  const raw = task.title
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return 'Untitled task'
}

function DayColumn({
  day,
  dayIndex,
  tasks,
  today,
  token,
  onToggle,
  onAddForDay,
  onEditTask,
  onDeleteTask,
}: {
  day: Date
  dayIndex: number
  tasks: DailyTask[]
  today: Date
  token: string | null
  onToggle: (task: DailyTask) => void
  onAddForDay: (day: Date) => void
  onEditTask: (task: DailyTask) => void
  onDeleteTask: (task: DailyTask) => void
}) {
  const stats = computeDayStats(tasks, day)
  const isToday = isSameLocalDay(day, today)
  const { weekday, dateLine } = formatDayColumnHeader(day)
  const hasTasks = stats.total > 0
  const dayColor = ringColorForDayIndex(dayIndex, hasTasks)
  const tint = DAY_COLUMN_TINTS[dayIndex] ?? DAY_COLUMN_TINTS[0]

  return (
    <article
      className={cn(
        'flex min-h-[320px] min-w-[10.5rem] flex-col rounded-lg border p-5',
        isToday ? 'border-[#6C63FF] ring-1 ring-[#6C63FF]/50' : 'border-[#2A2F47]',
      )}
      style={{ backgroundColor: tint }}
    >
      <header className="text-center">
        <p
          className={cn('font-bold leading-tight', isToday ? 'text-[#6C63FF]' : 'text-text-primary')}
          style={{ fontSize: '22px' }}
        >
          {weekday}
        </p>
        <p className="mt-0.5 text-text-muted" style={{ fontSize: '13px' }}>
          {dateLine}
        </p>
      </header>

      <div className="my-3 flex justify-center">
        <DayProgressRing pct={stats.pct} ringColor={dayColor} size={140} />
      </div>

      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Tasks</p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {stats.allTasks.length === 0 ? (
          <p className="py-3 text-center text-xs text-text-muted">No tasks</p>
        ) : (
          <ul className="space-y-1">
            {stats.allTasks.map((task) => {
              const done = task.status === 'DONE'
              return (
                <li key={task.id} className="group rounded">
                  <div
                    className={cn(
                      'flex items-start gap-1 rounded px-1 py-1.5 text-xs',
                      done ? 'text-text-primary' : 'border-l-2 bg-[#141726]/80 text-text-primary',
                    )}
                    style={
                      done
                        ? { backgroundColor: `${dayColor}40` }
                        : { borderLeftColor: dayColor }
                    }
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-1.5">
                      <input
                        type="checkbox"
                        checked={done}
                        disabled={!token}
                        onChange={() => void onToggle(task)}
                        className="dashboard-task-checkbox mt-0.5 shrink-0"
                      />
                      <span
                        className={cn(
                          'min-w-0 flex-1 whitespace-normal break-words text-left leading-snug',
                          done && 'line-through opacity-80',
                        )}
                        title={taskDisplayTitle(task)}
                      >
                        {taskDisplayTitle(task)}
                      </span>
                    </label>
                    {token && (
                      <div className="flex shrink-0 gap-0.5 opacity-70 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className="rounded p-0.5 text-[#4FC3F7] hover:bg-[#4FC3F7]/15"
                          title="Edit task"
                          aria-label={`Edit ${taskDisplayTitle(task)}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteTask(task)}
                          className="rounded p-0.5 text-[#FF6B9D] hover:bg-[#FF6B9D]/15"
                          title="Delete task"
                          aria-label={`Delete ${taskDisplayTitle(task)}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        disabled={!token}
        onClick={() => onAddForDay(day)}
        className="mt-2 flex w-full items-center justify-center gap-0.5 rounded border border-[#2A2F47] bg-[#141726]/80 py-1.5 text-xs text-[#4FC3F7] hover:border-[#4FC3F7]/50 hover:bg-[#141726] disabled:opacity-40"
        title="Add task"
      >
        <Plus className="h-3 w-3" />
      </button>

      <footer className="mt-2 border-t border-[#2A2F47]/80 pt-2 text-center text-xs leading-snug text-text-muted">
        <span className="font-medium text-text-primary">{stats.completed}</span> Completed
        <br />
        <span className="font-medium text-text-primary">{stats.notCompleted}</span> Not Completed
      </footer>
    </article>
  )
}
