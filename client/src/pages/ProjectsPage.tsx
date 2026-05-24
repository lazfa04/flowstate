import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, X } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'
import { PROJECT_COLOR_OPTIONS } from '../lib/projectColors'
import { toastError, toastSuccess } from '../lib/toast'
import { useAuthStore, type AuthState } from '../stores/authStore'
import type { ProjectStatus, ProjectSummary } from '../types/projects'

function statusBadgeClass(s: ProjectStatus): string {
  return s === 'ACTIVE'
    ? 'border border-accent2/40 bg-accent2/15 text-accent2'
    : 'border border-border bg-surface2 text-text-muted'
}

export default function ProjectsPage() {
  const token = useAuthStore((s: AuthState) => s.token)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📁')
  const [color, setColor] = useState<string>(PROJECT_COLOR_OPTIONS[0])
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE')

  const load = useCallback(async () => {
    if (!token) {
      setProjects([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api<{ projects: ProjectSummary[] }>('/api/projects', { token })
      setProjects(res.projects)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load projects'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  function openModal() {
    setName('')
    setDescription('')
    setEmoji('📁')
    setColor(PROJECT_COLOR_OPTIONS[0])
    setStatus('ACTIVE')
    setModalOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api<{ project: ProjectSummary }>('/api/projects', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          emoji: emoji.trim() || null,
          color,
          status,
        }),
      })
      setModalOpen(false)
      await load()
      toastSuccess('Project created')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create project'
      setError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fs-eyebrow">Workspaces</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">Projects</h1>
          <p className="mt-2 max-w-xl text-text-muted">
            Organize work by project. Open a board to manage tasks on a Kanban.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          disabled={!token}
          className="inline-flex items-center gap-2 rounded-lg bg-accent1 px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-accent1/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + New Project
        </button>
      </div>

      {!token && (
        <p className="rounded-lg border border-border bg-surface2 px-4 py-3 text-sm text-text-muted">
          Sign in to view and create projects.
        </p>
      )}

      {error && token && (
        <p className="rounded-lg border border-accent3/40 bg-accent3/10 px-4 py-2 text-sm text-accent3" role="alert">
          {error}
        </p>
      )}

      {token && loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl border border-border" />
          ))}
        </div>
      )}

      {token && !loading && projects.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to organize tasks and track progress across boards."
          action={{ label: '+ New project', onClick: openModal }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => {
          const total = p.taskTotal
          const done = p.taskCompleted
          const pct = total === 0 ? 0 : Math.round((done / total) * 100)
          return (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
            >
              <div className="h-1 w-full shrink-0" style={{ backgroundColor: p.color }} aria-hidden />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-2">
                  <span className="text-2xl leading-none" aria-hidden>
                    {p.emoji || '📁'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-text-primary">{p.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                      {p.description || 'No description'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Progress</span>
                    <span>
                      {done}/{total} tasks
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(p.status)}`}
                  >
                    {p.status === 'ACTIVE' ? 'Active' : 'Archived'}
                  </span>
                  <Link
                    to={`/projects/${p.id}`}
                    className="inline-flex rounded-lg border border-border bg-surface2 px-3 py-1.5 text-sm font-medium text-accent1 transition hover:bg-accent1/10"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-text-muted hover:bg-surface2 hover:text-text-primary"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary">New project</h2>
            <form className="mt-4 space-y-4" onSubmit={handleCreate}>
              <label className="block text-sm">
                <span className="text-text-muted">Name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none ring-accent1/30 focus:ring-2"
                  placeholder="e.g. Website redesign"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none ring-accent1/30 focus:ring-2"
                  placeholder="Optional"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Emoji</span>
                <input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none ring-accent1/30 focus:ring-2"
                  placeholder="📁"
                />
              </label>
              <div>
                <span className="text-sm text-text-muted">Color</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROJECT_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => setColor(c)}
                      className={[
                        'h-9 w-9 rounded-full border-2 transition',
                        color === c ? 'border-text-primary ring-2 ring-accent1' : 'border-transparent hover:opacity-90',
                      ].join(' ')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <label className="block text-sm">
                <span className="text-text-muted">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none ring-accent1/30 focus:ring-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-lg bg-accent1 px-4 py-2 text-sm font-semibold text-background hover:bg-accent1/90 disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
