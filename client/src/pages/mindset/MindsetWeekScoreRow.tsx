import { addLocalDays, formatDateKey, isSameLocalDay, startOfLocalDay, startOfWeekSunday } from '../../lib/dates'
import { Skeleton } from '../../components/ui/Skeleton'
import { getLogForDay, mindsetScoreFromLog } from './mindsetAggregates'
import type { MindsetLog } from './mindsetAggregates'

function scoreColor(score: number): string {
  if (score >= 75) return '#00D4AA'
  if (score >= 50) return '#FFB84C'
  return '#FF6B9D'
}

type Props = {
  logs: MindsetLog[]
  loading: boolean
}

export function MindsetWeekScoreRow({ logs, loading }: Props) {
  const sun = startOfWeekSunday(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addLocalDays(sun, i))
  const today = startOfLocalDay(new Date())

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <Skeleton className="mb-1 h-3 w-16 shrink-0" />
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-1">
          {days.map((d) => (
            <Skeleton key={formatDateKey(d)} className="min-h-0 rounded-md border border-[#2A2F47]" style={{ backgroundColor: '#141726' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h2 className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">This Week</h2>
      <div className="grid min-h-0 flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const log = getLogForDay(logs, d)
          const isToday = isSameLocalDay(d, today)
          const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d)
          const dateLine = new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric' }).format(d)
          const score = log ? mindsetScoreFromLog(log) : null
          return (
            <div
              key={formatDateKey(d)}
              className={`flex flex-col items-center justify-center rounded-md border bg-[#141726] px-0.5 py-1 ${
                isToday ? 'border-[#6C63FF] ring-1 ring-[#6C63FF]/40' : 'border-[#2A2F47]'
              }`}
            >
              <span className="text-[10px] font-semibold text-text-primary">{dayName}</span>
              <span className="text-[9px] text-text-muted">{dateLine}</span>
              <span
                className="mt-0.5 text-lg font-bold tabular-nums leading-none"
                style={{ color: score === null ? '#6B7280' : scoreColor(score) }}
              >
                {score === null ? '—' : score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
