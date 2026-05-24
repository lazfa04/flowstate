import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateKey, parseLogDate } from '../../lib/dates'
import {
  DASHBOARD_CARD_BG,
  formatDayChartLabel,
  getWeekDaysSunToSat,
} from '../../lib/dashboardWeek'
import type { MindsetLogDto } from '../../types/dashboard'

type Props = {
  logs: MindsetLogDto[]
  weekDays?: Date[]
}

export function MindsetTrackerChart({ logs, weekDays: weekDaysProp }: Props) {
  const weekDays = weekDaysProp ?? getWeekDaysSunToSat(new Date())

  const data = useMemo(() => {
    const byDay = new Map<string, MindsetLogDto>()
    for (const l of logs) {
      byDay.set(formatDateKey(parseLogDate(l.date)), l)
    }
    return weekDays.map((day) => {
      const key = formatDateKey(day)
      const log = byDay.get(key)
      return {
        label: formatDayChartLabel(day),
        energy: log?.energy ?? null,
        focus: log?.focus ?? null,
        motivation: log?.motivation ?? null,
      }
    })
  }, [logs, weekDays])

  return (
    <div
      className="flex h-full min-h-[200px] flex-col rounded-xl border border-[#2A2F47] p-5"
      style={{ backgroundColor: DASHBOARD_CARD_BG }}
    >
      <h2 className="text-base font-semibold text-text-primary">Mindset Tracker</h2>
      <div className="mt-2 min-h-[160px] flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#2A2F47" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#2A2F47' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              width={24}
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1d2e',
                border: '1px solid #2A2F47',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
              formatter={(value) => (
                <span style={{ color: '#9CA3AF' }}>{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="energy"
              name="Energy"
              stroke="#FF6B9D"
              strokeWidth={2}
              dot={{ r: 3, fill: '#FF6B9D', strokeWidth: 0 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="focus"
              name="Focus"
              stroke="#00D4AA"
              strokeWidth={2}
              dot={{ r: 3, fill: '#00D4AA', strokeWidth: 0 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="motivation"
              name="Motivation"
              stroke="#6C63FF"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6C63FF', strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
