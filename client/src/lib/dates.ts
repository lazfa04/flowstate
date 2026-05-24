export function startOfLocalDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addLocalDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Monday 00:00 local time for the week containing `d`. */
export function startOfWeekMonday(d: Date = new Date()): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Sunday 00:00 local time for the week containing `d` (US-style week). */
export function startOfWeekSunday(d: Date = new Date()): Date {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfWeekSunday(d: Date = new Date()): Date {
  const mon = startOfWeekMonday(d)
  const sun = new Date(mon)
  sun.setDate(sun.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return formatDateKey(a) === formatDateKey(b)
}

/** Parse API `dueDate` as a local calendar day (never UTC-shifted). */
export function parseLogDate(s: string): Date {
  const trimmed = s.trim()
  const local = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (local) {
    const y = Number(local[1])
    const mo = Number(local[2])
    const d = Number(local[3])
    return new Date(y, mo - 1, d, 0, 0, 0, 0)
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return startOfLocalDay(new Date())
  return startOfLocalDay(parsed)
}
