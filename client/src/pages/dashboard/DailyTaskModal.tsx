import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import { dueDateFromDay } from '../../lib/dailyTaskNormalize'
import { formatDayColumnHeader } from '../../lib/dashboardWeek'
import { toastError, toastSuccess } from '../../lib/toast'
import type { DailyTask } from '../../types/dailyTask'

type Props = {
  open: boolean
  onClose: () => void
  token: string | null
  defaultDueDate: Date
  task?: DailyTask | null
  onSaved: (task: DailyTask) => void
}

export function DailyTaskModal({ open, onClose, token, defaultDueDate, task, onSaved }: Props) {
  const isEdit = !!task
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const { weekday, dateLine } = formatDayColumnHeader(defaultDueDate)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
  }, [open, task])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !title.trim()) return
    setSaving(true)
    const dueDate = dueDateFromDay(defaultDueDate)
    try {
      if (isEdit && task) {
        const res = await api<{ task: DailyTask }>(`/api/daily-tasks/${task.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ title: title.trim() }),
        })
        onSaved(res.task)
        toastSuccess('Task updated')
      } else {
        const res = await api<{ task: DailyTask }>('/api/daily-tasks', {
          method: 'POST',
          token,
          body: JSON.stringify({ title: title.trim(), dueDate }),
        })
        onSaved(res.task)
        toastSuccess('Daily task added')
      }
      onClose()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-task-modal-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-text-muted hover:bg-surface2 hover:text-text-primary"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="fs-eyebrow">Dashboard</p>
        <h2 id="daily-task-modal-title" className="mt-1 text-lg font-semibold text-text-primary">
          {isEdit ? 'Edit task' : 'Add task'}
        </h2>
        {!isEdit && (
          <p className="mt-1 text-sm text-text-muted">
            {weekday}, {dateLine}
          </p>
        )}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="text-text-muted">Title</span>
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning workout"
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none ring-accent1/30 focus:ring-2"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-lg bg-accent1 px-4 py-2 text-sm font-semibold text-background hover:bg-accent1/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
