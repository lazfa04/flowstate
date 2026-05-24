import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, X, ListTodo } from 'lucide-react'
import { api, resolveApiUrl } from '../lib/api'
import { PROJECT_COLOR_OPTIONS } from '../lib/projectColors'
import { inputDateFromIso, isoDateFromInput } from '../lib/taskDates'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { ProjectKanban } from './projects/ProjectKanban'
import { toastError, toastSuccess } from '../lib/toast'
import { useAuthStore, type AuthState } from '../stores/authStore'
import type { TaskPriority, TaskStatus } from '../types/dashboard'
import type { ProjectStatus, ProjectSummary, ProjectTask, UserOption } from '../types/projects'

function projectStatusBadgeClass(s: ProjectStatus): string {
  return s === 'ACTIVE'
    ? 'border border-accent2/40 bg-accent2/15 text-accent2'
    : 'border border-border bg-surface2 text-text-muted'
}

export default function ProjectDetailPage() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s: AuthState) => s.token)

  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [projectSaving, setProjectSaving] = useState(false)

  const [epName, setEpName] = useState('')
  const [epDescription, setEpDescription] = useState('')
  const [epEmoji, setEpEmoji] = useState('')
  const [epColor, setEpColor] = useState<string>(PROJECT_COLOR_OPTIONS[0])
  const [epStatus, setEpStatus] = useState<ProjectStatus>('ACTIVE')

  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addTaskStatus, setAddTaskStatus] = useState<TaskStatus>('TODO')
  const [atTitle, setAtTitle] = useState('')
  const [atDescription, setAtDescription] = useState('')
  const [atPriority, setAtPriority] = useState<TaskPriority>('MEDIUM')
  const [atDue, setAtDue] = useState('')
  const [atAssignee, setAtAssignee] = useState('')
  const [taskSaving, setTaskSaving] = useState(false)

  const [drawerTask, setDrawerTask] = useState<ProjectTask | null>(null)
  const [dfTitle, setDfTitle] = useState('')
  const [dfDescription, setDfDescription] = useState('')
  const [dfPriority, setDfPriority] = useState<TaskPriority>('MEDIUM')
  const [dfDue, setDfDue] = useState('')
  const [dfAssignee, setDfAssignee] = useState('')
  const [dfStatus, setDfStatus] = useState<TaskStatus>('TODO')
  const [drawerSaving, setDrawerSaving] = useState(false)

  const load = useCallback(async () => {
    if (!token || !routeId) {
      setProject(null)
      setTasks([])
      setUsers([])
      setLoading(false)
      setNotFound(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    setError(null)
    try {
      const [pRes, tRes, uRes] = await Promise.all([
        api<{ project: ProjectSummary }>(`/api/projects/${routeId}`, { token }),
        api<{ tasks: ProjectTask[] }>(`/api/tasks?projectId=${encodeURIComponent(routeId)}`, { token }),
        api<{ users: UserOption[] }>('/api/users', { token }),
      ])
      setProject(pRes.project)
      setTasks(tRes.tasks)
      setUsers(uRes.users)
    } catch {
      toastError('Could not load project')
      setNotFound(true)
      setProject(null)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [token, routeId])

  useEffect(() => {
    void load()
  }, [load])

  function openEditProject() {
    if (!project) return
    setEpName(project.name)
    setEpDescription(project.description ?? '')
    setEpEmoji(project.emoji ?? '📁')
    setEpColor(project.color)
    setEpStatus(project.status)
    setEditProjectOpen(true)
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !routeId || !epName.trim()) return
    setProjectSaving(true)
    setError(null)
    try {
      const res = await api<{ project: ProjectSummary }>(`/api/projects/${routeId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name: epName.trim(),
          description: epDescription.trim() || null,
          emoji: epEmoji.trim() || null,
          color: epColor,
          status: epStatus,
        }),
      })
      setProject(res.project)
      setEditProjectOpen(false)
      toastSuccess('Project updated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed'
      setError(msg)
      toastError(msg)
    } finally {
      setProjectSaving(false)
    }
  }

  async function deleteProject() {
    if (!token || !routeId) return
    setProjectSaving(true)
    setError(null)
    try {
      const res = await fetch(resolveApiUrl(`/api/projects/${routeId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || res.statusText)
      }
      toastSuccess('Project deleted')
      navigate('/projects')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      setError(msg)
      toastError(msg)
    } finally {
      setProjectSaving(false)
      setDeleteConfirm(false)
    }
  }

  function openAddTask(status: TaskStatus) {
    setAddTaskStatus(status)
    setAtTitle('')
    setAtDescription('')
    setAtPriority('MEDIUM')
    setAtDue('')
    setAtAssignee(users[0]?.id ?? '')
    setAddTaskOpen(true)
  }

  async function submitAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !routeId || !atTitle.trim()) return
    setTaskSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        projectId: routeId,
        title: atTitle.trim(),
        description: atDescription.trim() || null,
        priority: atPriority,
        status: addTaskStatus,
        dueDate: atDue ? isoDateFromInput(atDue) : null,
        assignedToId: atAssignee || null,
      }
      const res = await api<{ task: ProjectTask }>('/api/tasks', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      })
      setTasks((cur) => [res.task, ...cur])
      setAddTaskOpen(false)
      toastSuccess('Task added')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add task'
      setError(msg)
      toastError(msg)
    } finally {
      setTaskSaving(false)
    }
  }

  function openDrawer(task: ProjectTask) {
    setDrawerTask(task)
    setDfTitle(task.title)
    setDfDescription(task.description ?? '')
    setDfPriority(task.priority)
    setDfDue(inputDateFromIso(task.dueDate))
    setDfAssignee(task.assignee?.id ?? '')
    setDfStatus(task.status)
  }

  async function saveDrawer(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !drawerTask || !dfTitle.trim()) return
    setDrawerSaving(true)
    setError(null)
    try {
      const res = await api<{ task: ProjectTask }>(`/api/tasks/${drawerTask.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          title: dfTitle.trim(),
          description: dfDescription.trim() || null,
          priority: dfPriority,
          status: dfStatus,
          dueDate: dfDue ? isoDateFromInput(dfDue) : null,
          assignedToId: dfAssignee || null,
        }),
      })
      setTasks((cur) => cur.map((t) => (t.id === res.task.id ? res.task : t)))
      setDrawerTask(res.task)
      toastSuccess('Task saved')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save task'
      setError(msg)
      toastError(msg)
    } finally {
      setDrawerSaving(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="text-sm text-accent1 hover:underline">
          ← Projects
        </Link>
        <p className="text-text-muted">Sign in to view this project.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-28 rounded" />
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-10 w-full max-w-md rounded-lg" />
            <Skeleton className="h-4 w-full max-w-xl rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="min-h-[320px] rounded-xl border border-border" />
          <Skeleton className="min-h-[320px] rounded-xl border border-border" />
          <Skeleton className="min-h-[320px] rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (notFound || !project || !routeId) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="text-sm text-accent1 hover:underline">
          ← Projects
        </Link>
        <h1 className="text-xl font-semibold text-text-primary">Project not found</h1>
        <p className="text-text-muted">This project may have been deleted or you may not have access.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <Link to="/projects" className="text-accent1 hover:underline">
          ← Projects
        </Link>
        <span className="text-border">/</span>
        <span className="truncate text-text-primary">{project.name}</span>
      </div>

      {error && (
        <p className="rounded-lg border border-accent3/40 bg-accent3/10 px-4 py-2 text-sm text-accent3" role="alert">
          {error}
        </p>
      )}

      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl leading-none" aria-hidden>
              {project.emoji || '📁'}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{project.name}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${projectStatusBadgeClass(project.status)}`}
            >
              {project.status === 'ACTIVE' ? 'Active' : 'Archived'}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            {project.description || 'No description yet.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={openEditProject}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-accent3/40 bg-accent3/10 px-3 py-2 text-sm font-medium text-accent3 transition hover:bg-accent3/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Task board</h2>
        {tasks.length === 0 && (
          <EmptyState
            className="mb-4 border-dashed py-10"
            icon={ListTodo}
            title="No tasks yet"
            description="Add your first task to this board, then drag cards between columns as you make progress."
            action={{ label: '+ Add task', onClick: () => openAddTask('TODO') }}
          />
        )}
        <ProjectKanban
          tasks={tasks}
          token={token}
          onTasksChange={setTasks}
          onTaskOpen={openDrawer}
          onAddTaskForStatus={openAddTask}
        />
      </section>

      {editProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-text-muted hover:bg-surface2"
              onClick={() => setEditProjectOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary">Edit project</h2>
            <form className="mt-4 space-y-4" onSubmit={saveProject}>
              <label className="block text-sm">
                <span className="text-text-muted">Name</span>
                <input
                  required
                  value={epName}
                  onChange={(e) => setEpName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Description</span>
                <textarea
                  value={epDescription}
                  onChange={(e) => setEpDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Emoji</span>
                <input
                  value={epEmoji}
                  onChange={(e) => setEpEmoji(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                />
              </label>
              <div>
                <span className="text-sm text-text-muted">Color</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROJECT_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEpColor(c)}
                      className={[
                        'h-9 w-9 rounded-full border-2 transition',
                        epColor === c ? 'border-text-primary ring-2 ring-accent1' : 'border-transparent hover:opacity-90',
                      ].join(' ')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <label className="block text-sm">
                <span className="text-text-muted">Status</span>
                <select
                  value={epStatus}
                  onChange={(e) => setEpStatus(e.target.value as ProjectStatus)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProjectOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectSaving}
                  className="rounded-lg bg-accent1 px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
                >
                  {projectSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary">Delete project?</h2>
            <p className="mt-2 text-sm text-text-muted">
              All tasks in this project will be removed. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteProject()}
                disabled={projectSaving}
                className="rounded-lg bg-accent3 px-4 py-2 text-sm font-semibold text-background hover:bg-accent3/90 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {addTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-text-muted hover:bg-surface2"
              onClick={() => setAddTaskOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary">Add task</h2>
            <p className="mt-1 text-xs text-text-muted">
              New task in column:{' '}
              <span className="font-medium text-text-primary">
                {addTaskStatus === 'TODO' ? 'To Do' : addTaskStatus === 'IN_PROGRESS' ? 'In Progress' : 'Done'}
              </span>
            </p>
            <form className="mt-4 space-y-4" onSubmit={submitAddTask}>
              <label className="block text-sm">
                <span className="text-text-muted">Title</span>
                <input
                  required
                  value={atTitle}
                  onChange={(e) => setAtTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Description</span>
                <textarea
                  value={atDescription}
                  onChange={(e) => setAtDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Priority</span>
                <select
                  value={atPriority}
                  onChange={(e) => setAtPriority(e.target.value as TaskPriority)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Due date</span>
                <input
                  type="date"
                  value={atDue}
                  onChange={(e) => setAtDue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Assign to</span>
                <select
                  value={atAssignee}
                  onChange={(e) => setAtAssignee(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name?.trim() ? u.name : u.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddTaskOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSaving || !atTitle.trim()}
                  className="rounded-lg bg-accent1 px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
                >
                  {taskSaving ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {drawerTask && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/40"
            aria-label="Close drawer"
            onClick={() => setDrawerTask(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold text-text-primary">Task</h2>
              <button
                type="button"
                className="rounded-lg p-2 text-text-muted hover:bg-surface2"
                onClick={() => setDrawerTask(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="flex flex-1 flex-col overflow-y-auto p-4" onSubmit={saveDrawer}>
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="text-text-muted">Title</span>
                  <input
                    required
                    value={dfTitle}
                    onChange={(e) => setDfTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-text-muted">Description</span>
                  <textarea
                    value={dfDescription}
                    onChange={(e) => setDfDescription(e.target.value)}
                    rows={5}
                    className="mt-1 w-full resize-none rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-text-muted">Priority</span>
                  <select
                    value={dfPriority}
                    onChange={(e) => setDfPriority(e.target.value as TaskPriority)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-text-muted">Due date</span>
                  <input
                    type="date"
                    value={dfDue}
                    onChange={(e) => setDfDue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-text-muted">Assign to</span>
                  <select
                    value={dfAssignee}
                    onChange={(e) => setDfAssignee(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name?.trim() ? u.name : u.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-text-muted">Status</span>
                  <select
                    value={dfStatus}
                    onChange={(e) => setDfStatus(e.target.value as TaskStatus)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent1/40"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </label>
                <p className="text-xs text-text-muted">You can also drag the card between columns on the board.</p>
              </div>
              <div className="mt-auto flex gap-2 border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={drawerSaving || !dfTitle.trim()}
                  className="flex-1 rounded-lg bg-accent1 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
                >
                  {drawerSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </div>
  )
}
