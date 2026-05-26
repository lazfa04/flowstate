import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateKey, startOfLocalDay } from '../lib/dates'
import { toastError } from '../lib/toast'
import {
  buildYearProgressGrid,
  eligibleDaysInYear,
  yearCalendarProgress,
  type YearDayCell,
} from '../lib/yearProgressGrid'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuthStore, type AuthState } from '../stores/authStore'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const GAP_PX = 6
const ROWS = 7

type ApiResponse = {
  year: number
  completedDates: string[]
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(y!, m! - 1, d!))
}

/** Fit square cells inside the chart area (avoids stretched vertical bars). */
function useCellSize(weekCount: number, containerRef: RefObject<HTMLDivElement | null>) {
  const [cellPx, setCellPx] = useState(12)

  useEffect(() => {
    const el = containerRef.current
    if (!el || weekCount < 1) return

    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width < 8 || height < 8) return
      const cellW = (width - GAP_PX * (weekCount - 1)) / weekCount
      const cellH = (height - GAP_PX * (ROWS - 1)) / ROWS
      setCellPx(Math.max(6, Math.floor(Math.min(cellW, cellH))))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [weekCount, containerRef])

  return cellPx
}

export default function YearInProgressPage() {
  const token = useAuthStore((s: AuthState) => s.token)
  const currentYear = new Date().getFullYear()
  const [viewYear, setViewYear] = useState(currentYear)
  const [completedDates, setCompletedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const todayKey = formatDateKey(startOfLocalDay(new Date()))
  const chartAreaRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!token) {
      setCompletedDates([])
      return
    }
    setLoading(true)
    try {
      const res = await api<ApiResponse>(`/api/year-progress?year=${viewYear}`, { token })
      setCompletedDates(res.completedDates)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load year progress')
      setCompletedDates([])
    } finally {
      setLoading(false)
    }
  }, [token, viewYear])

  useEffect(() => {
    void load()
  }, [load])

  const grid = useMemo(
    () => buildYearProgressGrid(viewYear, completedDates, todayKey),
    [viewYear, completedDates, todayKey],
  )

  const weekCount = grid.weeks.length
  const cellPx = useCellSize(weekCount, chartAreaRef)

  const matrixWidth = weekCount * cellPx + (weekCount - 1) * GAP_PX
  const matrixHeight = ROWS * cellPx + (ROWS - 1) * GAP_PX

  const calendar = useMemo(() => yearCalendarProgress(viewYear, todayKey), [viewYear, todayKey])

  const { activeDays, eligible, pct } = useMemo(() => {
    const eligibleCount = eligibleDaysInYear(viewYear, todayKey)
    const active = completedDates.filter((d) => d <= todayKey && d.startsWith(`${viewYear}-`)).length
    const p = eligibleCount > 0 ? Math.round((active / eligibleCount) * 100) : 0
    return { activeDays: active, eligible: eligibleCount, pct: p }
  }, [completedDates, viewYear, todayKey])

  const remainingLabel =
    calendar.daysRemaining === 1 ? '1 day left' : `${calendar.daysRemaining} days left`

  return (
    <div className="flex h-[calc(100dvh-5.25rem)] max-h-[calc(100dvh-5.25rem)] min-h-0 flex-col gap-2 overflow-hidden text-sm">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">Year in Progress</h1>
          <p className="text-xs text-text-muted">
            Activity rings — filled when you log a habit, daily task, or mindset check-in.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <InlineStat label="Year complete" value={`${calendar.yearCompletePct}%`} />
            <InlineStat label="Remaining" value={remainingLabel} />
            {token && (
              <>
                <InlineStat label="Active" value={String(activeDays)} />
                <InlineStat label="Days" value={String(eligible)} />
                <InlineStat label="Rate" value={`${pct}%`} accent />
              </>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#2A2F47] bg-[#141726] px-2 py-1">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="rounded p-1 text-text-muted hover:bg-surface2 hover:text-text-primary"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4rem] text-center text-sm font-semibold tabular-nums text-text-primary">{viewYear}</span>
            <button
              type="button"
              disabled={viewYear >= currentYear}
              onClick={() => setViewYear((y) => y + 1)}
              className="rounded p-1 text-text-muted hover:bg-surface2 hover:text-text-primary disabled:opacity-40"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {!token && (
        <p className="shrink-0 rounded-lg border border-[#2A2F47] bg-[#141726] px-4 py-3 text-text-muted">
          <Link to="/settings" className="font-medium text-[#6C63FF] hover:underline">
            Sign in
          </Link>{' '}
          to see your activity.
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#2A2F47] bg-[#0c0e18]/50 p-3">
        {loading ? (
          <Skeleton className="min-h-0 flex-1 rounded-lg" style={{ backgroundColor: '#141726' }} />
        ) : (
          <div ref={chartAreaRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <div className="flex max-h-full max-w-full items-start gap-3">
              <div
                className="flex shrink-0 flex-col justify-between text-[10px] font-medium text-text-muted"
                style={{ width: 28, height: matrixHeight, marginTop: 20 }}
              >
                {DAY_LABELS.map((label, i) => (
                  <span key={label} className="leading-none" style={{ visibility: i % 2 === 0 ? 'visible' : 'hidden' }}>
                    {label}
                  </span>
                ))}
              </div>

              <div className="flex min-w-0 flex-col items-start">
                <div
                  className="relative mb-2 shrink-0"
                  style={{ width: matrixWidth, height: 16, marginLeft: 0 }}
                >
                  {grid.monthLabels.map((m) => (
                    <span
                      key={`${m.label}-${m.weekIndex}`}
                      className="absolute bottom-0 text-[10px] font-medium text-text-muted"
                      style={{ left: m.weekIndex * (cellPx + GAP_PX) }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>

                <div
                  className="grid shrink-0"
                  style={{
                    width: matrixWidth,
                    height: matrixHeight,
                    gridTemplateColumns: `repeat(${weekCount}, ${cellPx}px)`,
                    gridTemplateRows: `repeat(${ROWS}, ${cellPx}px)`,
                    gap: GAP_PX,
                  }}
                >
                  {DAY_LABELS.map((_, di) =>
                    grid.weeks.map((week, wi) => (
                      <DayDot key={`${wi}-${di}`} cell={week[di]!} size={cellPx} />
                    )),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-6 border-t border-[#2A2F47]/80 pt-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-2">
            <span className="inline-block rounded-full bg-gradient-to-br from-[#00D4AA] to-[#6C63FF] shadow-[0_0_8px_rgba(0,212,170,0.45)]" style={{ width: 12, height: 12 }} aria-hidden />
            Active day
          </span>
          <span className="flex items-center gap-2">
            <span
              className="inline-block rounded-full border-2 border-[#3d4466] bg-transparent"
              style={{ width: 12, height: 12 }}
              aria-hidden
            />
            No activity
          </span>
          <span className="flex items-center gap-2">
            <span
              className="inline-block rounded-full border border-dashed border-[#2A2F47] bg-[#141726]/60"
              style={{ width: 12, height: 12 }}
              aria-hidden
            />
            Upcoming
          </span>
        </div>
      </div>
    </div>
  )
}

function InlineStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="rounded-md border border-[#2A2F47] bg-[#141726] px-2 py-1 tabular-nums">
      <span className="text-text-muted">{label} </span>
      <span className={accent ? 'font-bold text-[#00D4AA]' : 'font-bold text-text-primary'}>{value}</span>
    </span>
  )
}

function DayDot({ cell, size }: { cell: YearDayCell; size: number }) {
  const [hover, setHover] = useState(false)

  if (!cell.inYear) {
    return <span style={{ width: size, height: size }} aria-hidden />
  }

  const title = cell.dateKey
    ? `${formatDayLabel(cell.dateKey)} — ${cell.completed ? 'Activity logged' : cell.isFuture ? 'Upcoming' : 'No activity'}`
    : ''

  const dotSize = Math.max(4, Math.round(size * 0.72))

  let className = 'rounded-full transition-all duration-150 '
  if (cell.completed) {
    className +=
      'bg-gradient-to-br from-[#00D4AA] to-[#6C63FF] shadow-[0_0_12px_rgba(0,212,170,0.5)] ring-2 ring-[#00D4AA]/30'
  } else if (cell.isFuture) {
    className += 'border border-dashed border-[#2A2F47] bg-[#141726]/50'
  } else {
    className += 'border-2 border-[#3d4466] bg-[#141726]/80'
  }

  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <button
        type="button"
        className={className + (hover ? ' z-10 scale-125' : '')}
        style={{ width: dotSize, height: dotSize }}
        title={title}
        aria-label={title}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      />
    </div>
  )
}
