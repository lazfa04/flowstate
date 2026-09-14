import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { addLocalDays, formatDateKey, startOfLocalDay, startOfWeekSunday } from '../../lib/dates'
import type { MindsetLog } from './mindsetAggregates'

export function useMindsetData(token: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [todayLogs, setTodayLogs] = useState<MindsetLog[]>([])
  const [monthLogs, setMonthLogs] = useState<MindsetLog[]>([])
  const [rangeLogs, setRangeLogs] = useState<MindsetLog[]>([])
  const [period, setPeriod] = useState<{ year: number; month: number } | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setTodayLogs([])
      setMonthLogs([])
      setRangeLogs([])
      setPeriod(null)
      setError(null)
      setLoading(false)
      return
    }
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const todayKey = formatDateKey(startOfLocalDay(now))
    const fiveFrom = formatDateKey(addLocalDays(startOfWeekSunday(now), -28))

    setLoading(true)
    setError(null)
    try {
      const [tRes, moRes, rRes] = await Promise.all([
        api<{ logs: MindsetLog[] }>(`/api/mindset?from=${todayKey}&to=${todayKey}`, { token }),
        api<{ logs: MindsetLog[] }>(`/api/mindset?month=${month}&year=${year}`, { token }),
        api<{ logs: MindsetLog[] }>(`/api/mindset?from=${fiveFrom}&to=${todayKey}`, { token }),
      ])
      setTodayLogs(tRes.logs)
      setMonthLogs(moRes.logs)
      setRangeLogs(rRes.logs)
      setPeriod({ year, month })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load mindset data')
      setTodayLogs([])
      setMonthLogs([])
      setRangeLogs([])
      setPeriod(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const todayLog = todayLogs[0]

  return {
    loading,
    error,
    todayLog,
    monthLogs,
    rangeLogs,
    period,
    refetch: load,
  }
}
