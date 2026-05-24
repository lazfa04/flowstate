import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { normalizeDailyTask, sortDailyTasksByDue } from '../lib/dailyTaskNormalize'
import { formatWeekStartBadge, getWeekDaysSunToSat, weekRangeQueryParams } from '../lib/dashboardWeek'
import { parseLogDate, startOfLocalDay, startOfWeekMonday } from '../lib/dates'
import { toastError, toastSuccess } from '../lib/toast'
import { useAuthStore, type AuthState } from '../stores/authStore'
import type { DailyTask } from '../types/dailyTask'
import {
  DashboardSkeletonColumns,
  DashboardSkeletonTopRow,
} from './dashboard/DashboardSkeletons'
import { DailyTaskModal } from './dashboard/DailyTaskModal'
import { MindsetTrackerChart } from './dashboard/MindsetTrackerChart'
import { OverallProgressChart } from './dashboard/OverallProgressChart'
import { WeeklyTaskView } from './dashboard/WeeklyTaskView'
import { useDashboardData } from './dashboard/useDashboardData'

function WeeklyPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-[#2A2F47] bg-[#141726] px-4 py-10 text-center text-sm text-text-muted">
      Sign in under{' '}
      <Link to="/settings" className="font-medium text-[#00D4AA] hover:underline">
        Settings
      </Link>{' '}
      to load your week planner.
    </div>
  )
}

export default function DashboardPage() {
  const token = useAuthStore((s: AuthState) => s.token)
  const dashboard = useDashboardData(token)
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDueDate, setModalDueDate] = useState(() => startOfLocalDay(new Date()))
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null)
  const [clearing, setClearing] = useState(false)
  const weekDays = useMemo(() => getWeekDaysSunToSat(new Date()), [])
  const weekStartLabel = useMemo(
    () => formatWeekStartBadge(startOfWeekMonday(new Date())),
    [],
  )

  useEffect(() => {
    setDailyTasks(dashboard.dailyTasksWeek)
  }, [dashboard.dailyTasksWeek])

  useEffect(() => {
    if (dashboard.error) toastError(dashboard.error)
  }, [dashboard.error])

  const loading = dashboard.loading && !!token

  function openAddModal(forDay: Date = startOfLocalDay(new Date())) {
    setEditingTask(null)
    setModalDueDate(forDay)
    setModalOpen(true)
  }

  function openEditModal(task: DailyTask) {
    setEditingTask(task)
    setModalDueDate(parseLogDate(task.dueDate))
    setModalOpen(true)
  }

  function handleTaskSaved(task: DailyTask) {
    const normalized = normalizeDailyTask(task)
    setDailyTasks((cur) => {
      const next = cur.some((t) => t.id === normalized.id)
        ? cur.map((t) => (t.id === normalized.id ? normalized : t))
        : [...cur, normalized]
      return sortDailyTasksByDue(next)
    })
    void dashboard.refetch()
  }

  async function clearWeekTasks() {
    if (!token) return
    if (
      !window.confirm(
        'Delete all daily tasks for this week (Sun–Sat)? This cannot be undone.',
      )
    ) {
      return
    }
    setClearing(true)
    const { from, to } = weekRangeQueryParams()
    try {
      const res = await api<{ deleted: number }>(
        `/api/daily-tasks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { method: 'DELETE', token },
      )
      setDailyTasks([])
      toastSuccess(`Cleared ${res.deleted} task${res.deleted === 1 ? '' : 's'}`)
      void dashboard.refetch()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not clear tasks')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-5 text-base">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">FlowState</h1>
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Week Start Date</p>
          <p
            className="mt-1 inline-block rounded px-3 py-1 text-sm font-bold text-[#0c0e18]"
            style={{ backgroundColor: '#00D4AA' }}
          >
            {weekStartLabel}
          </p>
        </div>
      </header>

      {!token && (
        <p className="text-sm text-text-muted">
          <Link to="/settings" className="font-medium text-[#00D4AA] hover:underline">
            Sign in
          </Link>{' '}
          to sync daily tasks and mindset.
        </p>
      )}
      {dashboard.error && (
        <p className="text-sm text-[#FF6B9D]" role="alert">
          {dashboard.error}
        </p>
      )}

      {loading ? (
        <>
          <DashboardSkeletonTopRow />
          <DashboardSkeletonColumns />
        </>
      ) : !token ? (
        <WeeklyPlaceholder />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
            <OverallProgressChart weekDays={weekDays} tasks={dailyTasks} />
            <MindsetTrackerChart logs={dashboard.mindsetLogs} weekDays={weekDays} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void dashboard.refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2F47] px-3 py-1.5 text-xs font-medium text-text-muted hover:border-[#4FC3F7]/50 hover:text-text-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void clearWeekTasks()}
              disabled={clearing || dailyTasks.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6B9D]/40 px-3 py-1.5 text-xs font-medium text-[#FF6B9D] hover:bg-[#FF6B9D]/10 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearing ? 'Clearing…' : 'Clear week'}
            </button>
            <button
              type="button"
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00D4AA] px-3 py-1.5 text-xs font-semibold text-[#0c0e18] hover:bg-[#00D4AA]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add daily task
            </button>
          </div>

          <WeeklyTaskView
            tasks={dailyTasks}
            token={token}
            onTasksChange={setDailyTasks}
            onAddForDay={openAddModal}
            onEditTask={openEditModal}
          />
        </>
      )}

      <DailyTaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingTask(null)
        }}
        token={token}
        defaultDueDate={modalDueDate}
        task={editingTask}
        onSaved={handleTaskSaved}
      />
    </div>
  )
}
