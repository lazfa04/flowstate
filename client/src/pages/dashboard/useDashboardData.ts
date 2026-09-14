import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { weekRangeQueryParams } from '../../lib/dashboardWeek'
import type { MindsetLogDto } from '../../types/dashboard'
import { normalizeDailyTask } from '../../lib/dailyTaskNormalize'
import type { DailyTask } from '../../types/dailyTask'

export type DashboardState = {
  loading: boolean
  error: string | null
  dailyTasksWeek: DailyTask[]
  mindsetLogs: MindsetLogDto[]
  refetch: () => void
}

const empty: Omit<DashboardState, 'loading' | 'error' | 'refetch'> = {
  dailyTasksWeek: [],
  mindsetLogs: [],
}

export function useDashboardData(token: string | null): DashboardState {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState(empty)

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setPayload(empty)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const today = new Date()
    const { from, to } = weekRangeQueryParams(today)

    try {
      const [weekTasksRes, mindRes] = await Promise.all([
        api<{ tasks: DailyTask[] }>(
          `/api/daily-tasks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { token },
        ),
        api<{ logs: MindsetLogDto[] }>(
          `/api/mindset?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { token },
        ),
      ])

      setPayload({
        dailyTasksWeek: weekTasksRes.tasks.map(normalizeDailyTask),
        mindsetLogs: mindRes.logs,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      setPayload(empty)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  return {
    loading,
    error,
    refetch: load,
    ...payload,
  }
}
