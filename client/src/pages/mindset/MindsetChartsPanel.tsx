import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from '../../components/ui/Skeleton'
import { aggregateLogsInRange, buildFiveWeekStarts, buildMonthLineData } from './mindsetAggregates'
import type { MindsetLog } from './mindsetAggregates'

const LINE_COLORS = {
  energy: '#FFB84C',
  focus: '#4FC3F7',
  mood: '#FF6B9D',
  motivation: '#6C63FF',
} as const

const WEEK_BAR_COLORS = ['#6C63FF', '#4FC3F7', '#00D4AA', '#FF6B9D', '#FFB84C'] as const

const CHART_BG = '#141726'
const GRID = '#2A2F47'

type Props = {
  monthLogs: MindsetLog[]
  rangeLogs: MindsetLog[]
  year: number
  month: number
  loading: boolean
}

export function MindsetChartsPanel({ monthLogs, rangeLogs, year, month, loading }: Props) {
  const lineData = useMemo(() => buildMonthLineData(year, month, monthLogs), [year, month, monthLogs])

  const barData = useMemo(() => {
    const starts = buildFiveWeekStarts()
    return starts.map((ws, i) => {
      const agg = aggregateLogsInRange(ws, rangeLogs)
      const score = agg.mindsetScorePct != null ? Math.round(agg.mindsetScorePct) : null
      return {
        name: `W${i + 1}`,
        score: score ?? 0,
        hasData: score != null,
        fill: WEEK_BAR_COLORS[i] ?? WEEK_BAR_COLORS[0],
      }
    })
  }, [rangeLogs])

  if (loading) {
    return (
      <div className="flex h-full min-h-0 gap-2">
        <Skeleton className="min-h-0 w-[55%] rounded-lg border border-[#2A2F47]" style={{ backgroundColor: CHART_BG }} />
        <Skeleton className="min-h-0 w-[45%] rounded-lg border border-[#2A2F47]" style={{ backgroundColor: CHART_BG }} />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 gap-2">
      <div className="flex min-h-0 w-[55%] min-w-0 flex-col rounded-lg border border-[#2A2F47] p-2" style={{ backgroundColor: CHART_BG }}>
        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Daily metrics (this month)</p>
        <div className="mt-1 min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 4, right: 4, left: -12, bottom: 28 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={{ stroke: GRID }} />
              <YAxis domain={[0, 10]} width={22} tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: CHART_BG,
                  border: `1px solid ${GRID}`,
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                formatter={(v) => <span style={{ color: '#9CA3AF' }}>{v}</span>}
              />
              <Line
                type="monotone"
                dataKey="energy"
                name="Energy"
                stroke={LINE_COLORS.energy}
                strokeWidth={2}
                dot={{ r: 2, fill: LINE_COLORS.energy }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="focus"
                name="Focus"
                stroke={LINE_COLORS.focus}
                strokeWidth={2}
                dot={{ r: 2, fill: LINE_COLORS.focus }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="mood"
                name="Mood"
                stroke={LINE_COLORS.mood}
                strokeWidth={2}
                dot={{ r: 2, fill: LINE_COLORS.mood }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="motivation"
                name="Motivation"
                stroke={LINE_COLORS.motivation}
                strokeWidth={2}
                dot={{ r: 2, fill: LINE_COLORS.motivation }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex min-h-0 w-[45%] min-w-0 flex-col rounded-lg border border-[#2A2F47] p-2" style={{ backgroundColor: CHART_BG }}>
        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Weekly mindset score</p>
        <div className="mt-1 min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={{ stroke: GRID }} />
              <YAxis domain={[0, 100]} width={28} tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: CHART_BG,
                  border: `1px solid ${GRID}`,
                  borderRadius: 6,
                  fontSize: 11,
                }}
                formatter={(v, _n, item) => {
                  const has = (item?.payload as { hasData?: boolean } | undefined)?.hasData
                  const num = typeof v === 'number' ? v : Number(v)
                  return [has ? `${num}` : '—', 'Score']
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40} activeBar={false}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hasData ? entry.fill : GRID} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
