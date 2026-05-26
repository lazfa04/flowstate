import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight, Repeat, X } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateKey } from '../lib/dates'
import {
  buildWeekBandSpans,
  weekBandBorderHex,
  weekBandColorForDay,
  weekdayInitialForDay,
} from '../lib/habitWeekBands'
import { PROJECT_COLOR_OPTIONS } from '../lib/projectColors'
import { THEME } from '../lib/themeColors'
import { toastError, toastSuccess } from '../lib/toast'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuthStore, type AuthState } from '../stores/authStore'

const HABIT_EMOJI_OPTIONS = [
  '✨',
  '🎯',
  '📚',
  '🏃',
  '💧',
  '🧘',
  '💤',
  '🍎',
  '💪',
  '📝',
  '🌱',
  '🧠',
  '❤️',
  '☀️',
  '🌙',
  '🔥',
] as const

const INCOMPLETE_CELL_BASE = 'bg-[#1C2035] text-transparent'
const HABIT_COL_CLASS =
  'sticky left-0 z-20 w-[160px] max-w-[160px] border-r border-[#2A2F47] bg-[#141726] px-2'
const DAY_COL_CLASS = 'w-6 min-w-[24px] max-w-[24px]'
const HABIT_DATA_ROW_CLASS = 'border-b border-[#2A2F47]/60'
const HABIT_ROW_CELL_PY = 'py-2.5'
const CELL_CLASS =
  'mx-auto flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border border-solid text-[8px] font-semibold leading-none'

type HabitRow = {
  id: string
  name: string
  emoji: string | null
  color: string
  isActive: boolean
}

type HabitLogRow = {
  id: string
  habitId: string
  date: string
  completed: boolean
}

function daysInMonth(year: number, month1To12: number): number {
  return new Date(year, month1To12, 0).getDate()
}

function monthLabel(year: number, month1To12: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(year, month1To12 - 1, 1),
  )
}

function todayKey(): string {
  return formatDateKey(new Date())
}

function logInViewMonth(log: HabitLogRow, year: number, month: number): boolean {
  const d = new Date(log.date)
  return d.getFullYear() === year && d.getMonth() + 1 === month
}

export default function HabitsPage() {
  const token = useAuthStore((s: AuthState) => s.token)
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [logs, setLogs] = useState<HabitLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>(HABIT_EMOJI_OPTIONS[0])
  const [color, setColor] = useState<string>(PROJECT_COLOR_OPTIONS[0])

  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  const loadHabits = useCallback(async () => {
    if (!token) {
      setHabits([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api<{ habits: HabitRow[] }>('/api/habits', { token })
      setHabits(res.habits)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load habits'
      setError(msg)
      toastError(msg)
      setHabits([])
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadLogs = useCallback(async () => {
    if (!token) {
      setLogs([])
      return
    }
    setLogsLoading(true)
    try {
      const qs = new URLSearchParams({
        month: String(viewMonth),
        year: String(viewYear),
      })
      const res = await api<{ logs: HabitLogRow[] }>(`/api/habits/logs?${qs.toString()}`, { token })
      setLogs(res.logs)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load habit logs')
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }, [token, viewMonth, viewYear])

  useEffect(() => {
    void loadHabits()
  }, [loadHabits])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const completedByHabitAndDay = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const log of logs) {
      const dayKey = formatDateKey(new Date(log.date))
      m.set(`${log.habitId}:${dayKey}`, log.completed)
    }
    return m
  }, [logs])

  const dayNumbers = useMemo(
    () => Array.from({ length: daysInMonth(viewYear, viewMonth) }, (_, i) => i + 1),
    [viewYear, viewMonth],
  )

  const weekBandSpans = useMemo(() => buildWeekBandSpans(dayNumbers), [dayNumbers])

  const dailyStats = useMemo(() => {
    return dayNumbers.map((d) => {
      const dateKey = formatDateKey(new Date(viewYear, viewMonth - 1, d))
      const eligible = dateKey <= todayKey()
      if (!eligible || habits.length === 0) {
        return { dateKey, day: d, progress: null as number | null, done: null as number | null, notDone: null as number | null }
      }
      let done = 0
      for (const h of habits) {
        if (completedByHabitAndDay.get(`${h.id}:${dateKey}`) === true) done++
      }
      const total = habits.length
      return {
        dateKey,
        day: d,
        progress: Math.round((done / total) * 100),
        done,
        notDone: total - done,
      }
    })
  }, [dayNumbers, viewYear, viewMonth, habits, completedByHabitAndDay])

  const chartData = useMemo(
    () =>
      dailyStats.map((s) => ({
        day: String(s.day),
        pct: s.progress === null ? null : s.progress,
      })),
    [dailyStats],
  )

  const habitAnalysis = useMemo(() => {
    return habits.map((h) => {
      let done = 0
      let eligible = 0
      for (const d of dayNumbers) {
        const dk = formatDateKey(new Date(viewYear, viewMonth - 1, d))
        if (dk > todayKey()) continue
        eligible++
        if (completedByHabitAndDay.get(`${h.id}:${dk}`) === true) done++
      }
      const pct = eligible > 0 ? Math.round((done / eligible) * 100) : 0
      return { habit: h, pct }
    })
  }, [habits, dayNumbers, viewYear, viewMonth, completedByHabitAndDay])

  const { totalCompletions, overallPct } = useMemo(() => {
    const habitIds = new Set(habits.map((h) => h.id))
    const completions = logs.filter(
      (l) => l.completed && habitIds.has(l.habitId) && logInViewMonth(l, viewYear, viewMonth),
    ).length
    const eligibleDays = dayNumbers.filter((d) => {
      const dk = formatDateKey(new Date(viewYear, viewMonth - 1, d))
      return dk <= todayKey()
    }).length
    const slots = habits.length * eligibleDays
    const pct = slots > 0 ? Math.round((completions / slots) * 100) : 0
    return { totalCompletions: completions, overallPct: pct }
  }, [logs, habits, viewYear, viewMonth, dayNumbers])

  function openModal() {
    setName('')
    setEmoji(HABIT_EMOJI_OPTIONS[0])
    setColor(PROJECT_COLOR_OPTIONS[0])
    setModalOpen(true)
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth() + 1)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api<{ habit: HabitRow }>('/api/habits', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: name.trim(),
          color,
          emoji: emoji.trim() || null,
        }),
      })
      setModalOpen(false)
      await loadHabits()
      await loadLogs()
      toastSuccess('Habit created')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create habit'
      setError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function toggleDay(habitId: string, dateKey: string) {
    if (!token) return
    const key = `${habitId}:${dateKey}`
    if (togglingKey === key) return
    const t = todayKey()
    if (dateKey > t) {
      toastError('You cannot log future days yet.')
      return
    }
    const current = completedByHabitAndDay.get(`${habitId}:${dateKey}`) === true
    setTogglingKey(key)
    try {
      await api<{ log: HabitLogRow }>(`/api/habits/${habitId}/log`, {
        method: 'POST',
        token,
        body: JSON.stringify({ date: dateKey, completed: !current }),
      })
      await loadLogs()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not update habit')
    } finally {
      setTogglingKey(null)
    }
  }

  const headerMonth = monthLabel(viewYear, viewMonth)

  return (
    <div className="flex h-[calc(100dvh-5.25rem)] max-h-[calc(100dvh-5.25rem)] flex-col gap-1 overflow-hidden text-sm">
      {!token && (
        <p className="shrink-0 text-text-muted">Sign in under Settings to load habits from the server.</p>
      )}

      {error && token && (
        <p className="shrink-0 rounded border border-accent3/40 bg-accent3/10 px-2 py-1 text-xs text-accent3" role="alert">
          {error}
        </p>
      )}

      {token && (
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[#2A2F47] bg-[#141726] px-3 py-2">
          <div
            className="flex min-w-0 items-center gap-1"
          >
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded p-1 text-text-muted hover:bg-surface2 hover:text-text-primary"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="whitespace-nowrap text-sm font-semibold capitalize text-text-primary">
              {headerMonth} — Habit Tracker
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded p-1 text-text-muted hover:bg-surface2 hover:text-text-primary"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden h-5 w-px bg-[#2A2F47] sm:block" aria-hidden />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <Stat label="Habits" value={String(habits.length)} />
            <Stat label="Completed" value={String(totalCompletions)} />
            <div className="flex min-w-[8rem] items-center gap-2">
              <span className="text-text-muted">Progress</span>
              <div
                className="h-2 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-[#0c0e18]"
              >
                <div
                  className="h-full rounded-full bg-[#FFB84C] transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
            <Stat label="Progress %" value={`${overallPct}%`} accent />
          </div>

          <button
            type="button"
            onClick={openModal}
            className="ml-auto shrink-0 rounded-lg bg-accent1 px-3 py-1.5 text-xs font-semibold text-background hover:bg-accent1/90"
          >
            + Add Habit
          </button>
        </header>
      )}

      {token && loading && (
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_200px] gap-2">
          <Skeleton className="rounded-lg border border-[#2A2F47]" style={{ backgroundColor: '#141726' }} />
          <Skeleton className="rounded-lg border border-[#2A2F47]" style={{ backgroundColor: '#141726' }} />
        </div>
      )}

      {token && !loading && habits.length === 0 && (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            icon={Repeat}
            title="No habits yet"
            description="Create your first habit to see the monthly grid."
            action={{ label: '+ Add Habit', onClick: openModal }}
          />
        </div>
      )}

      {token && !loading && habits.length > 0 && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-1 lg:grid-cols-[minmax(0,1fr)_200px]">
          <div className="flex min-h-0 min-w-0 flex-col gap-1">
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#2A2F47] bg-[#141726]">
              <table className="w-max min-w-full border-collapse text-xs">
                <thead className="sticky top-0 z-30">
                  <tr>
                    <th
                      scope="col"
                      rowSpan={2}
                      className={`${HABIT_COL_CLASS} align-bottom pb-1 text-left text-[10px] font-medium text-text-muted`}
                    >
                      My Habits
                      {logsLoading && <span className="ml-1 opacity-60">…</span>}
                    </th>
                    {weekBandSpans.map((band) => (
                      <th
                        key={`${band.weekIndex}-${band.label}`}
                        colSpan={band.colspan}
                        scope="colgroup"
                        className="h-6 border-b border-[#2A2F47] px-0 text-center text-[10px] font-semibold leading-6 text-white"
                        style={{ backgroundColor: band.color }}
                      >
                        {band.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-[#2A2F47]">
                    {dayNumbers.map((d) => {
                      const dateKey = formatDateKey(new Date(viewYear, viewMonth - 1, d))
                      const band = weekBandColorForDay(d)
                      const isToday = dateKey === todayKey()
                      const isFuture = dateKey > todayKey()
                      return (
                        <th
                          key={d}
                          scope="col"
                          className={`${DAY_COL_CLASS} px-0 py-0.5 text-center font-normal`}
                          style={{
                            backgroundColor: `${band}22`,
                            opacity: isFuture ? 0.45 : 1,
                          }}
                        >
                          <span
                            className="block text-[9px] leading-none text-text-muted"
                            style={{ color: isToday ? THEME.accent1 : undefined }}
                          >
                            {weekdayInitialForDay(viewYear, viewMonth, d)}
                          </span>
                          <span
                            className="block text-[10px] font-semibold tabular-nums leading-tight"
                            style={{ color: isToday ? THEME.accent1 : THEME.textPrimary }}
                          >
                            {d}
                          </span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => (
                    <tr key={h.id} className={HABIT_DATA_ROW_CLASS}>
                      <th scope="row" className={`${HABIT_COL_CLASS} ${HABIT_ROW_CELL_PY} text-left font-normal`}>
                        <div
                          className="flex items-center gap-1"
                          title={h.name}
                        >
                          <span className="shrink-0 text-sm leading-none" aria-hidden>
                            {h.emoji || '○'}
                          </span>
                          <span className="min-w-0 truncate text-text-primary">{h.name}</span>
                        </div>
                      </th>
                      {dayNumbers.map((d) => {
                        const dateKey = formatDateKey(new Date(viewYear, viewMonth - 1, d))
                        const done = completedByHabitAndDay.get(`${h.id}:${dateKey}`) === true
                        const isFuture = dateKey > todayKey()
                        const busy = togglingKey === `${h.id}:${dateKey}`
                        const weekHex = weekBandColorForDay(d)
                        const incompleteBorder = weekBandBorderHex(weekHex, '4D')
                        return (
                          <td key={d} className={`${DAY_COL_CLASS} ${HABIT_ROW_CELL_PY} px-0 text-center align-middle`}>
                            <button
                              type="button"
                              disabled={isFuture || busy}
                              onClick={() => void toggleDay(h.id, dateKey)}
                              className={[
                                CELL_CLASS,
                                'transition',
                                done ? 'text-background' : `${INCOMPLETE_CELL_BASE} hover:brightness-110`,
                                isFuture ? 'cursor-not-allowed opacity-25' : '',
                                busy ? 'opacity-60' : '',
                              ].join(' ')}
                              style={
                                done
                                  ? { backgroundColor: weekHex, borderColor: weekHex }
                                  : {
                                      backgroundColor: '#1C2035',
                                      borderColor: isFuture ? '#2A2F47' : incompleteBorder,
                                    }
                              }
                              aria-label={`${h.name} on ${dateKey}: ${done ? 'completed' : 'not completed'}`}
                            >
                              {busy ? '…' : done ? '✓' : ''}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <StatsRow label="Progress %" dailyStats={dailyStats} format={(s) => (s.progress === null ? '—' : `${s.progress}%`)} />
                  <StatsRow label="Done" dailyStats={dailyStats} format={(s) => (s.done === null ? '—' : String(s.done))} className="text-accent2" />
                  <StatsRow label="Not done" dailyStats={dailyStats} format={(s) => (s.notDone === null ? '—' : String(s.notDone))} />
                </tbody>
              </table>
            </div>

            <div className="h-[160px] max-h-[160px] shrink-0 rounded-lg border border-[#2A2F47] bg-[#141726] p-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Daily completion trend</p>
              <div className="mt-1 h-[132px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="habitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#2A2F47" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis
                      domain={[0, 100]}
                      width={28}
                      tick={{ fill: '#9CA3AF', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(x) => `${x}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141726',
                        border: '1px solid #2A2F47',
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pct"
                      name="Completion"
                      stroke="#00D4AA"
                      strokeWidth={2}
                      fill="url(#habitFill)"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#2A2F47] bg-[#141726] p-2 lg:max-h-none">
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Analysis</p>
            <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {habitAnalysis.map(({ habit: h, pct }) => (
                <li key={h.id}>
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="flex min-w-0 items-center gap-1" title={h.name}>
                      <span aria-hidden>{h.emoji || '○'}</span>
                      <span className="truncate text-text-primary">{h.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-text-primary">{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#0c0e18]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: h.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="habit-modal-title"
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-text-muted transition hover:bg-surface2 hover:text-text-primary"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="habit-modal-title" className="text-lg font-semibold text-text-primary">
              New habit
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleCreate}>
              <label className="block text-sm">
                <span className="text-text-muted">Habit name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-text-primary outline-none ring-accent1/30 focus:ring-2"
                  placeholder="e.g. Morning run"
                  autoFocus
                />
              </label>
              <div>
                <span className="text-sm text-text-muted">Emoji</span>
                <div className="mt-2 grid grid-cols-8 gap-2">
                  {HABIT_EMOJI_OPTIONS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setEmoji(ch)}
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition',
                        emoji === ch
                          ? 'border-accent1 bg-accent1/15 ring-2 ring-accent1/40'
                          : 'border-border bg-surface2 hover:border-accent1/40',
                      ].join(' ')}
                      aria-label={`Select ${ch}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
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
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted transition hover:bg-surface2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-lg bg-accent1 px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent1/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-text-muted">{label}</span>
      <span className={accent ? 'font-bold tabular-nums text-[#00D4AA]' : 'font-bold tabular-nums text-text-primary'}>
        {value}
      </span>
    </div>
  )
}

type DailyStat = {
  dateKey: string
  progress: number | null
  done: number | null
  notDone: number | null
}

function StatsRow({
  label,
  dailyStats,
  format,
  className = 'text-text-primary',
}: {
  label: string
  dailyStats: DailyStat[]
  format: (s: DailyStat) => string
  className?: string
}) {
  return (
    <tr className="border-t border-[#2A2F47]/80 bg-[#0c0e18]/40">
      <th scope="row" className={`${HABIT_COL_CLASS} py-0.5 text-left text-[10px] font-medium text-text-muted`}>
        {label}
      </th>
      {dailyStats.map((s) => (
        <td
          key={`${label}-${s.dateKey}`}
          className={`${DAY_COL_CLASS} px-0 py-0.5 text-center text-[9px] tabular-nums leading-none ${className}`}
        >
          {format(s)}
        </td>
      ))}
    </tr>
  )
}
