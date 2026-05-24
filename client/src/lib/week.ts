/** Local midnight copy of `d`. */
export function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Local Monday 00:00 of the calendar week containing `d` (week starts Monday). */
export function mondayOfWeekContaining(d: Date): Date {
  const x = startOfLocalDay(d)
  const sinceMonday = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - sinceMonday)
  return x
}

export function addLocalDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return startOfLocalDay(x)
}

/** `YYYY-MM-DD` for API weekStart / anchor params. */
export function toWeekStartKey(monday: Date): string {
  const x = startOfLocalDay(monday)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** e.g. "Week of May 12, 2026" */
export function formatWeekHeading(monday: Date): string {
  const x = startOfLocalDay(monday)
  const label = x.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  return `Week of ${label}`
}

export function formatShortWeekLabel(monday: Date): string {
  return startOfLocalDay(monday).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
