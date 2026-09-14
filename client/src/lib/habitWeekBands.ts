/** Week-within-month (calendar chunks, not ISO weeks):
 *  Week 1: days 1–7   → violet
 *  Week 2: days 8–14  → sky
 *  Week 3: days 15–21 → mint
 *  Week 4: days 22–28 → coral
 *  Week 5: days 29–31 → amber
 */
export const HABIT_WEEK_BAND_HEX = ['#8b85ff', '#5cb8ff', '#3dd6b0', '#ff6b9d', '#f0b429'] as const

/** 1-based day-of-month → band index 0..4 */
export function weekBandIndexFromDayOfMonth(day: number): number {
  return Math.min(4, Math.floor((day - 1) / 7))
}

export function weekBandColorForDay(day: number): string {
  return HABIT_WEEK_BAND_HEX[weekBandIndexFromDayOfMonth(day)]!
}

/** 8-digit hex with alpha for subtle borders on incomplete cells */
export function weekBandBorderHex(weekHex: string, alphaHex: string = '45'): string {
  return `${weekHex}${alphaHex}`
}

export type WeekBandSpan = {
  weekIndex: number
  label: string
  color: string
  colspan: number
}

/** Consecutive day columns grouped by calendar week band (1–7, 8–14, …). */
export function buildWeekBandSpans(dayNumbers: number[]): WeekBandSpan[] {
  const spans: WeekBandSpan[] = []
  for (const d of dayNumbers) {
    const weekIndex = weekBandIndexFromDayOfMonth(d)
    const last = spans[spans.length - 1]
    if (last && last.weekIndex === weekIndex) {
      last.colspan += 1
    } else {
      spans.push({
        weekIndex,
        label: `Week ${weekIndex + 1}`,
        color: HABIT_WEEK_BAND_HEX[weekIndex]!,
        colspan: 1,
      })
    }
  }
  return spans
}

export function weekdayInitialForDay(year: number, month1To12: number, day: number): string {
  const d = new Date(year, month1To12 - 1, day)
  return new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(d)
}

