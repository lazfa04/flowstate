/** Local calendar day at 00:00:00.000 */
export function startOfLocalDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** First instant of calendar month (local). `month` is 1–12. */
export function startOfLocalMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0)
}

/** First instant of the month after `year`/`month` (local), exclusive upper bound. */
export function startOfNextLocalMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0)
}

export function parseISODate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

/** `YYYY-MM-DD` interpreted as local calendar date at 00:00. */
export function parseLocalDateString(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

export function addLocalDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Local calendar date as `YYYY-MM-DD` (no timezone shift in JSON). */
export function formatDateKey(d: Date): string {
  const x = startOfLocalDay(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
