import { addLocalDays, formatDateKey, parseLogDate, startOfLocalDay, startOfWeekSunday } from '../../lib/dates'

export type MindsetLog = {
  id: string
  date: string
  mood: number
  energy: number
  focus: number
  motivation: number
  note?: string | null
}

export function getLogForDay(logs: MindsetLog[], day: Date): MindsetLog | undefined {
  const key = formatDateKey(startOfLocalDay(day))
  return logs.find((l) => formatDateKey(startOfLocalDay(parseLogDate(l.date))) === key)
}

export function aggregateLogsInRange(
  weekStart: Date,
  logs: MindsetLog[],
): {
  mood: number | null
  energy: number | null
  focus: number | null
  motivation: number | null
  mindsetScorePct: number | null
} {
  const end = addLocalDays(weekStart, 7)
  const slice = logs.filter((l) => {
    const t = startOfLocalDay(parseLogDate(l.date))
    return t.getTime() >= weekStart.getTime() && t.getTime() < end.getTime()
  })
  if (!slice.length) {
    return { mood: null, energy: null, focus: null, motivation: null, mindsetScorePct: null }
  }
  const n = slice.length
  const mood = slice.reduce((a, l) => a + l.mood, 0) / n
  const energy = slice.reduce((a, l) => a + l.energy, 0) / n
  const focus = slice.reduce((a, l) => a + l.focus, 0) / n
  const motivation = slice.reduce((a, l) => a + l.motivation, 0) / n
  const dailyAvg = (mood + energy + focus + motivation) / 4
  const mindsetScorePct = (dailyAvg / 10) * 100
  return { mood, energy, focus, motivation, mindsetScorePct }
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const a = addLocalDays(weekStart, 0)
  const b = addLocalDays(weekStart, 6)
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${fmt(a)} – ${fmt(b)}`
}

export function buildMonthLineData(year: number, month: number, logs: MindsetLog[]) {
  const byKey = new Map<string, MindsetLog>()
  for (const l of logs) {
    byKey.set(formatDateKey(startOfLocalDay(parseLogDate(l.date))), l)
  }
  const daysInMonth = new Date(year, month, 0).getDate()
  const rows: {
    key: string
    label: string
    mood: number | null
    energy: number | null
    focus: number | null
    motivation: number | null
  }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d)
    const key = formatDateKey(dt)
    const log = byKey.get(key)
    rows.push({
      key,
      label: String(d),
      mood: log?.mood ?? null,
      energy: log?.energy ?? null,
      focus: log?.focus ?? null,
      motivation: log?.motivation ?? null,
    })
  }
  return rows
}

export function buildFiveWeekStarts(reference = new Date()): Date[] {
  const sun = startOfWeekSunday(reference)
  return [4, 3, 2, 1, 0].map((i) => addLocalDays(sun, -i * 7))
}

/** Mindset score 0–100: average of four 1–10 metrics, scaled to percentage. */
export function mindsetScoreFromLog(log: MindsetLog): number {
  const avg = (log.mood + log.energy + log.focus + log.motivation) / 4
  return Math.round((avg / 10) * 100)
}
