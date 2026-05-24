import { useEffect, useState, type CSSProperties } from 'react'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { toastError, toastSuccess } from '../../lib/toast'
import type { MindsetLog } from './mindsetAggregates'

const MOOD = '#FF6B9D'
const ENERGY = '#FFB84C'
const FOCUS = '#4FC3F7'
const MOTIVATION = '#6C63FF'

type Props = {
  token: string | null
  todayKey: string
  todayLog: MindsetLog | undefined
  loading: boolean
  onSaved: () => void
}

export function TodayCheckInCard({ token, todayKey, todayLog, loading, onSaved }: Props) {
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [focus, setFocus] = useState(5)
  const [motivation, setMotivation] = useState(5)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (todayLog) {
      setMood(todayLog.mood)
      setEnergy(todayLog.energy)
      setFocus(todayLog.focus)
      setMotivation(todayLog.motivation)
    } else if (!loading) {
      setMood(5)
      setEnergy(5)
      setFocus(5)
      setMotivation(5)
    }
  }, [todayLog, loading])

  async function save() {
    if (!token) return
    setSaveError(null)
    setSaving(true)
    try {
      await api('/api/mindset', {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: todayKey,
          mood,
          energy,
          focus,
          motivation,
          note: null,
        }),
      })
      onSaved()
      toastSuccess('Check-in saved')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      setSaveError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 gap-3 rounded-lg border border-[#2A2F47] bg-[#141726] p-2">
        <div className="min-h-0 min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 rounded" />
            ))}
          </div>
        </div>
        <Skeleton className="h-9 w-24 shrink-0 self-center" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-hidden rounded-lg border border-[#2A2F47] bg-[#141726] px-3 py-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-text-muted">Today&apos;s Check-in</h2>
        <div className="mt-1 grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2">
          <SliderRow label="Mood" color={MOOD} value={mood} onChange={setMood} disabled={!token} />
          <SliderRow label="Energy" color={ENERGY} value={energy} onChange={setEnergy} disabled={!token} />
          <SliderRow label="Focus" color={FOCUS} value={focus} onChange={setFocus} disabled={!token} />
          <SliderRow label="Motivation" color={MOTIVATION} value={motivation} onChange={setMotivation} disabled={!token} />
        </div>
        {saveError && <p className="mt-0.5 truncate text-[10px] text-[#FF6B9D]">{saveError}</p>}
      </div>
      <div className="flex shrink-0 items-center self-stretch border-l border-[#2A2F47]/80 pl-3">
        {todayLog ? (
          <span className="whitespace-nowrap rounded-md bg-[#00D4AA]/15 px-2 py-1 text-xs font-semibold text-[#00D4AA]">
            Saved today ✓
          </span>
        ) : (
          <button
            type="button"
            disabled={!token || saving}
            onClick={() => void save()}
            className="whitespace-nowrap rounded-lg bg-[#6C63FF] px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Check-in'}
          </button>
        )}
      </div>
    </div>
  )
}

function SliderRow({
  label,
  color,
  value,
  onChange,
  disabled,
}: {
  label: string
  color: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const fillPct = ((value - 1) / 9) * 100
  return (
    <div
      className="grid min-h-0 grid-cols-[3.25rem_minmax(0,1fr)_1.25rem] items-center gap-1"
      style={{ ['--accent' as string]: color, ['--fill' as string]: `${fillPct}%` } as CSSProperties}
    >
      <span className="truncate text-[11px] font-semibold" style={{ color }}>
        {label}
      </span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="metric-slider-input h-5 min-w-0"
      />
      <span className="text-right text-[11px] font-bold tabular-nums text-text-primary">{value}</span>
    </div>
  )
}
