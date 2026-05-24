import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addLocalDays, formatDateKey, parseLogDate, startOfLocalDay } from '../../lib/dates'
import { THEME } from '../../lib/themeColors'
import type { MindsetLogDto } from '../../types/dashboard'

type Props = {
  logs: MindsetLogDto[]
}

function buildChartRows(logs: MindsetLogDto[]) {
  const byDay = new Map<string, MindsetLogDto>()
  for (const l of logs) {
    const key = formatDateKey(parseLogDate(l.date))
    byDay.set(key, l)
  }
  const rows: { key: string; label: string; mood: number | null; energy: number | null; focus: number | null }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = addLocalDays(startOfLocalDay(new Date()), -i)
    const key = formatDateKey(d)
    const log = byDay.get(key)
    rows.push({
      key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      mood: log ? log.mood : null,
      energy: log ? log.energy : null,
      focus: log ? log.focus : null,
    })
  }
  return rows
}

export function MindsetTrendChart({ logs }: Props) {
  const data = useMemo(() => buildChartRows(logs), [logs])

  return (
    <div className="rounded-xl border border-border bg-surface2 p-5 shadow-sm">
      <p className="fs-eyebrow">Wellbeing</p>
      <h2 className="mt-1 text-lg font-semibold text-text-primary">Mindset</h2>
      <p className="mt-1 text-sm text-text-muted">Last 14 days · mood, energy, focus</p>
      <div className="mt-5 h-72 w-full rounded-lg border border-border bg-[#0c0e18] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={THEME.border} strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={{ stroke: THEME.border }} />
            <YAxis domain={[0, 10]} width={32} tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={{ stroke: THEME.border }} />
            <Tooltip
              contentStyle={{
                backgroundColor: THEME.surface2,
                border: `1px solid ${THEME.border}`,
                borderRadius: '8px',
                color: THEME.textPrimary,
              }}
              labelStyle={{ color: THEME.textPrimary }}
            />
            <Legend wrapperStyle={{ color: THEME.textMuted, fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="mood"
              name="Mood"
              stroke={THEME.accent3}
              strokeWidth={2}
              fill={THEME.accent3}
              fillOpacity={0.14}
              dot={{ r: 3, fill: THEME.accent3 }}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="energy"
              name="Energy"
              stroke={THEME.accent4}
              strokeWidth={2}
              fill={THEME.accent4}
              fillOpacity={0.12}
              dot={{ r: 3, fill: THEME.accent4 }}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="focus"
              name="Focus"
              stroke={THEME.accent5}
              strokeWidth={2}
              fill={THEME.accent5}
              fillOpacity={0.12}
              dot={{ r: 3, fill: THEME.accent5 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
