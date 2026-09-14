import { BAR_TRACK } from '../../lib/dashboardWeek'

const BASE_SIZE = 140
const R = 54
const STROKE = 10

type Props = {
  pct: number | null
  ringColor: string
  size?: number
}

export function DayProgressRing({ pct, ringColor, size = BASE_SIZE }: Props) {
  const hasTasks = pct !== null
  const value = hasTasks ? pct : 0
  const scale = size / BASE_SIZE
  const cx = size / 2
  const cy = size / 2
  const r = R * scale
  const strokeW = STROKE * scale
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - value / 100)
  const trackStroke = hasTasks ? `${ringColor}40` : BAR_TRACK
  const progressStroke = hasTasks ? ringColor : BAR_TRACK

  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackStroke} strokeWidth={strokeW} />
        {hasTasks ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={progressStroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-bold tabular-nums text-text-primary"
          style={{ fontSize: `${Math.round(20 * scale)}px` }}
        >
          {hasTasks ? `${value}%` : '—'}
        </span>
      </div>
    </div>
  )
}
