import type { TaskStatus } from '../types/dashboard'

/** Calendar due date is before local today and task is not complete. */
export function isTaskOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'DONE') return false
  const due = new Date(dueDate)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return due < today
}

export function isoDateFromInput(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  if (!y || !m || !d) return new Date(yyyyMmDd).toISOString()
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString()
}

export function inputDateFromIso(iso: string | null): string {
  if (!iso) return ''
  const x = new Date(iso)
  const y = x.getFullYear()
  const mo = String(x.getMonth() + 1).padStart(2, '0')
  const da = String(x.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}
