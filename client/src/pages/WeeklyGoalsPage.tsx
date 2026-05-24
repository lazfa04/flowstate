import { ChevronLeft, ChevronRight, Target, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { api, resolveApiUrl } from '../lib/api'
import { toastError, toastSuccess } from '../lib/toast'
import {
  addLocalDays,
  formatShortWeekLabel,
  formatWeekHeading,
  mondayOfWeekContaining,
  toWeekStartKey,
} from '../lib/week'
import { useAuthStore, type AuthState } from '../stores/authStore'

type WeeklyGoalDto = {
  id: string
  title: string
  completed: boolean
  weekStart: string
  createdAt: string
}

type Insights = {
  bestWeek: { weekStart: string; completed: number; total: number } | null
  currentStreak: number
  calendarWeeks: { weekStart: string; completed: number; total: number }[]
}

const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

function dotTier(total: number, completed: number): 'gray' | 'red' | 'amber' | 'green' {
  if (total === 0) return 'gray'
  const pct = (completed / total) * 100
  if (pct > 75) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

function dotClass(tier: ReturnType<typeof dotTier>): string {
  switch (tier) {
    case 'green':
      return 'bg-accent2'
    case 'amber':
      return 'bg-accent4'
    case 'red':
      return 'bg-accent3'
    default:
      return 'bg-text-muted/35'
  }
}

const RING_STROKE = 9

function WeekProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  const dash = RING_C * (1 - (total === 0 ? 0 : completed / total))

  const strokeClass = pct < 50 ? 'stroke-accent1' : pct <= 75 ? 'stroke-accent4' : 'stroke-accent2'

  return (
    <div className="relative flex h-[168px] w-[168px] items-center justify-center">
      <svg
        width={168}
        height={168}
        viewBox="0 0 120 120"
        className="absolute inset-0 shrink-0"
        aria-hidden
      >
        <circle cx="60" cy="60" r={RING_R} fill="none" className="stroke-surface2" strokeWidth={RING_STROKE} />
        <circle
          cx="60"
          cy="60"
          r={RING_R}
          fill="none"
          className={strokeClass}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={dash}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tabular-nums text-text-primary">{pct}%</span>
        <span className="mt-0.5 text-xs text-text-muted">
          {completed}/{total} goals
        </span>
      </div>
    </div>
  )
}

export default function WeeklyGoalsPage() {
  const token = useAuthStore((s: AuthState) => s.token)
  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeekContaining(new Date()))
  const [goals, setGoals] = useState<WeeklyGoalDto[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const newGoalInputRef = useRef<HTMLInputElement>(null)

  const weekKey = toWeekStartKey(weekMonday)

  const loadGoals = useCallback(async () => {
    if (!token) {
      setGoals([])
      return
    }
    const res = await api<{ goals: WeeklyGoalDto[] }>(
      `/api/goals?weekStart=${encodeURIComponent(weekKey)}`,
      { token },
    )
    setGoals(res.goals)
  }, [token, weekKey])

  const loadInsights = useCallback(async () => {
    if (!token) {
      setInsights(null)
      return
    }
    const res = await api<Insights>(
      `/api/goals/insights?anchorWeekStart=${encodeURIComponent(weekKey)}`,
      { token },
    )
    setInsights(res)
  }, [token, weekKey])

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadGoals(), loadInsights()])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load goals'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }, [token, loadGoals, loadInsights])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const completedCount = goals.filter((g) => g.completed).length
  const totalCount = goals.length

  function shiftWeek(delta: number) {
    setWeekMonday((m) => addLocalDays(m, delta * 7))
  }

  async function toggleGoal(id: string) {
    if (!token) return
    setError(null)
    try {
      const res = await api<{ goal: WeeklyGoalDto }>(`/api/goals/${id}/toggle`, {
        method: 'PATCH',
        token,
      })
      setGoals((cur) => cur.map((g) => (g.id === id ? res.goal : g)))
      await loadInsights()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Toggle failed'
      setError(msg)
      toastError(msg)
    }
  }

  async function deleteGoal(id: string) {
    if (!token) return
    setError(null)
    try {
      const res = await fetch(resolveApiUrl(`/api/goals/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || res.statusText)
      }
      setGoals((cur) => cur.filter((g) => g.id !== id))
      await loadInsights()
      toastSuccess('Goal deleted')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed'
      setError(msg)
      toastError(msg)
    }
  }

  async function addGoal() {
    const title = newTitle.trim()
    if (!token || !title) return
    setAdding(true)
    setError(null)
    try {
      const res = await api<{ goal: WeeklyGoalDto }>('/api/goals', {
        method: 'POST',
        token,
        body: JSON.stringify({ title, weekStart: weekKey }),
      })
      setGoals((cur) => [...cur, res.goal])
      setNewTitle('')
      await loadInsights()
      toastSuccess('Goal added')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not add goal'
      setError(msg)
      toastError(msg)
    } finally {
      setAdding(false)
    }
  }

  function handleNewKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void addGoal()
    }
  }

  const bestWeekLabel =
    insights?.bestWeek &&
    (() => {
      const [y, mo, d] = insights.bestWeek.weekStart.split('-').map(Number)
      const dt = new Date(y, mo - 1, d)
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    })()

  return (
    <div className="space-y-8">
      <div>
        <p className="fs-eyebrow">Planning</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">Weekly Goals</h1>
        <p className="mt-2 max-w-xl text-text-muted">
          Plan a few outcomes for each week and track how consistently you hit them.
        </p>
      </div>

      {!token && (
        <p className="rounded-lg border border-border bg-surface2 px-4 py-3 text-sm text-text-muted">
          Sign in to manage weekly goals.
        </p>
      )}

      {token && error && (
        <p className="rounded-lg border border-accent3/40 bg-accent3/10 px-4 py-2 text-sm text-accent3" role="alert">
          {error}
        </p>
      )}

      {token && (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => shiftWeek(-1)}
                  className="rounded-lg border border-border bg-surface2 p-2 text-text-muted transition hover:bg-surface hover:text-text-primary"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="min-w-[12rem] text-center text-lg font-semibold text-text-primary sm:min-w-[16rem]">
                  {formatWeekHeading(weekMonday)}
                </h2>
                <button
                  type="button"
                  onClick={() => shiftWeek(1)}
                  className="rounded-lg border border-border bg-surface2 p-2 text-text-muted transition hover:bg-surface hover:text-text-primary"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex justify-center border-b border-border pb-8">
              <WeekProgressRing completed={completedCount} total={totalCount} />
            </div>

            <div>
              <h3 className="fs-eyebrow mb-3">This week</h3>
              {loading && goals.length === 0 ? (
                <ul className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-xl border border-border" />
                  ))}
                </ul>
              ) : goals.length === 0 ? (
                <EmptyState
                  className="mb-4 border-dashed py-10"
                  icon={Target}
                  title="No goals this week"
                  description="Start tracking your first weekly goal — add one below, then check it off as you go."
                  action={{ label: 'Add a goal', onClick: () => newGoalInputRef.current?.focus() }}
                />
              ) : (
                <ul className="space-y-2">
                  {goals.map((g) => (
                    <li
                      key={g.id}
                      className={[
                        'flex items-center gap-3 rounded-xl border border-border bg-surface2 p-5 transition border-l-4',
                        g.completed ? 'border-l-accent1 bg-accent1/[0.06]' : 'border-l-transparent',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={g.completed}
                        onClick={() => void toggleGoal(g.id)}
                        className={[
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition',
                          g.completed
                            ? 'border-accent1 bg-accent1 text-background'
                            : 'border-border bg-background hover:border-accent1/50',
                        ].join(' ')}
                      >
                        {g.completed ? (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </button>
                      <span
                        className={[
                          'min-w-0 flex-1 text-sm font-medium text-text-primary',
                          g.completed ? 'line-through' : '',
                        ].join(' ')}
                      >
                        {g.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteGoal(g.id)}
                        className="shrink-0 rounded-lg p-2 text-text-muted transition hover:bg-accent3/15 hover:text-accent3"
                        aria-label={`Delete ${g.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-surface/50 px-3 py-2">
                <span className="text-sm font-medium text-accent1">+ Add Goal</span>
                <input
                  ref={newGoalInputRef}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleNewKeyDown}
                  placeholder="What will you finish this week?"
                  className="min-w-[12rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none ring-accent1/30 focus:ring-2"
                  disabled={adding}
                />
                <button
                  type="button"
                  onClick={() => void addGoal()}
                  disabled={adding || !newTitle.trim()}
                  className="rounded-lg bg-accent1 px-3 py-2 text-sm font-semibold text-background hover:bg-accent1/90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-6 lg:pt-2">
            <div className="rounded-xl border border-border bg-surface2 p-5">
              <h3 className="fs-eyebrow">Momentum</h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs text-text-muted">Best week</dt>
                  <dd className="mt-1 text-sm font-semibold text-text-primary">
                    {insights?.bestWeek ? (
                      <>
                        {bestWeekLabel} — {insights.bestWeek.completed} goal
                        {insights.bestWeek.completed === 1 ? '' : 's'} completed
                      </>
                    ) : (
                      <span className="font-normal text-text-muted">No history yet</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Current streak</dt>
                  <dd className="mt-1 text-sm font-semibold text-text-primary">
                    {insights !== null ? (
                      <>
                        {insights.currentStreak} week{insights.currentStreak === 1 ? '' : 's'} over 50%
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                  <p className="mt-1 text-[11px] leading-snug text-text-muted">
                    Consecutive weeks (from this week backward) where more than half of your goals were completed.
                  </p>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-surface2 p-5">
              <h3 className="fs-eyebrow">Last 4 weeks</h3>
              <p className="mt-1 text-[11px] text-text-muted">Relative to the week you are viewing.</p>
              <ul className="mt-4 space-y-3">
                {(insights?.calendarWeeks ?? []).map((w) => {
                  const mon = (() => {
                    const [y, mo, d] = w.weekStart.split('-').map(Number)
                    return new Date(y, mo - 1, d, 0, 0, 0, 0)
                  })()
                  const tier = dotTier(w.total, w.completed)
                  return (
                    <li key={w.weekStart} className="flex items-center gap-3 text-sm">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full ${dotClass(tier)}`}
                        title={
                          w.total === 0
                            ? 'No goals'
                            : `${Math.round((w.completed / w.total) * 100)}% (${w.completed}/${w.total})`
                        }
                      />
                      <span className="text-text-muted">{formatShortWeekLabel(mon)}</span>
                      <span className="ml-auto tabular-nums text-text-muted">
                        {w.total === 0 ? '—' : `${w.completed}/${w.total}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent2" /> &gt;75%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent4" /> 50–75%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent3" /> &lt;50%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-text-muted/35" /> No data
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
