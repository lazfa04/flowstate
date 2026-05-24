import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  BAR_TRACK,
  computeDayStats,
  computeWeekStats,
  DASHBOARD_CARD_BG,
  formatDayChartLabel,
  PROGRESS_COLORS,
  progressColorForPct,
} from '../../lib/dashboardWeek'
import type { DailyTask } from '../../types/dailyTask'
import { DayProgressRing } from './DayProgressRing'

type Props = {
  weekDays: Date[]
  tasks: DailyTask[]
}

export function OverallProgressChart({ weekDays, tasks }: Props) {
  const weekStats = useMemo(() => computeWeekStats(tasks, weekDays), [tasks, weekDays])

  const data = useMemo(
    () =>
      weekDays.map((day) => {
        const stats = computeDayStats(tasks, day)
        const label = formatDayChartLabel(day)
        const pct = stats.pct ?? 0
        const remaining = stats.total - stats.completed
        const fill = stats.total === 0 ? BAR_TRACK : progressColorForPct(pct)
        return {
          label,
          completed: stats.completed,
          remaining,
          total: stats.total,
          pct,
          fill,
        }
      }),
    [weekDays, tasks],
  )

  const maxY = useMemo(() => Math.max(4, ...data.map((d) => d.total)), [data])

  return (
    <div
      className="flex h-full min-h-[200px] flex-col rounded-xl border border-[#2A2F47] p-5"
      style={{ backgroundColor: DASHBOARD_CARD_BG }}
    >
      <h2 className="text-base font-semibold text-text-primary">Overall Progress</h2>
      <div className="mt-3 flex min-h-[160px] flex-1 items-stretch gap-4">
        <div className="min-w-0 flex-[3]">
          <ResponsiveContainer width="100%" height="100%" minHeight={160}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid stroke="#2A2F47" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={{ stroke: '#2A2F47' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, maxY]}
                width={24}
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: '#1a1d2e',
                  border: '1px solid #2A2F47',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(_v, name, item) => {
                  const p = item.payload as { completed: number; total: number; pct: number }
                  if (name === 'remaining') return null
                  if (p.total === 0) return ['No tasks', 'Due']
                  return [`${p.completed}/${p.total} (${p.pct}%)`, 'Completed']
                }}
              />
              <Bar dataKey="completed" stackId="day" radius={[0, 0, 0, 0]} maxBarSize={36}>
                {data.map((entry) => (
                  <Cell key={`c-${entry.label}`} fill={entry.fill} />
                ))}
              </Bar>
              <Bar dataKey="remaining" stackId="day" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {data.map((entry) => (
                  <Cell key={`r-${entry.label}`} fill={BAR_TRACK} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-[2] flex-col items-center justify-center border-l border-[#2A2F47] pl-4">
          <DayProgressRing
            pct={weekStats.pct}
            ringColor={weekStats.total > 0 ? PROGRESS_COLORS.mint : BAR_TRACK}
            size={140}
          />
          <p className="mt-2 text-center text-sm text-text-muted">
            <span className="font-semibold text-text-primary">{weekStats.completed}</span>
            {' / '}
            <span className="font-semibold text-text-primary">{weekStats.total}</span> Completed
          </p>
        </div>
      </div>
    </div>
  )
}
