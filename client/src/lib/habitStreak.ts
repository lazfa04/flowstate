import { addLocalDays, isSameLocalDay, parseLogDate, startOfLocalDay } from './dates'
import type { HabitLogDto } from '../types/dashboard'

export function habitStreakCount(habitId: string, logs: HabitLogDto[]): number {
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const day = addLocalDays(startOfLocalDay(new Date()), -i)
    const hit = logs.find((l) => l.habitId === habitId && isSameLocalDay(parseLogDate(l.date), day))
    if (hit?.completed) streak += 1
    else break
  }
  return streak
}
