import { Link } from 'react-router-dom'
import { Repeat } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { addLocalDays, formatDateKey, isSameLocalDay, parseLogDate, startOfLocalDay } from '../../lib/dates'
import type { HabitDto, HabitLogDto } from '../../types/dashboard'
import { habitStreakCount } from '../../lib/habitStreak'

type Props = {
  habits: HabitDto[]
  logs: HabitLogDto[]
}

function lastSevenDays(): Date[] {
  const out: Date[] = []
  for (let i = 6; i >= 0; i--) {
    out.push(addLocalDays(startOfLocalDay(new Date()), -i))
  }
  return out
}

export function HabitStreakPanel({ habits, logs }: Props) {
  const days = lastSevenDays()
  const active = habits.filter((h) => h.isActive)

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface2 p-5 shadow-sm">
        <p className="fs-eyebrow">Habits</p>
        <h2 className="mt-1 text-lg font-semibold text-text-primary">Streak overview</h2>
        <EmptyState
          className="mt-4 border-0 bg-transparent px-4 py-8"
          icon={Repeat}
          title="No habits yet"
          description="Start tracking your first habit to see streaks and daily completion here."
          action={{ label: 'Open Habits', to: '/habits' }}
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface2 p-5 shadow-sm">
      <p className="fs-eyebrow">Habits</p>
      <h2 className="mt-1 text-lg font-semibold text-text-primary">Streak overview</h2>
      <p className="mt-1 text-sm text-text-muted">
        Last 7 days · mint = done ·{' '}
        <Link to="/habits" className="text-accent1 hover:underline">
          Habits
        </Link>
      </p>
      <div className="mt-5 space-y-4">
        {active.map((habit) => {
          const streak = habitStreakCount(habit.id, logs)
          return (
            <div key={habit.id} className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-text-primary">{habit.name}</p>
                <span className="shrink-0 text-xs font-semibold text-accent2">{streak} streak</span>
              </div>
              <div className="mt-2 flex justify-between gap-1">
                {days.map((d) => {
                  const log = logs.find((l) => l.habitId === habit.id && isSameLocalDay(parseLogDate(l.date), d))
                  const done = !!log?.completed
                  return (
                    <div
                      key={formatDateKey(d)}
                      title={formatDateKey(d)}
                      className={[
                        'h-8 w-8 shrink-0 rounded-full border transition-colors',
                        done
                          ? 'border-accent2/50 bg-accent2/25 shadow-[0_0_0_1px_rgba(0,212,170,0.25)]'
                          : 'border-border bg-surface2',
                      ].join(' ')}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
