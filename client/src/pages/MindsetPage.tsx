import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatDateKey, startOfLocalDay } from '../lib/dates'
import { toastError } from '../lib/toast'
import { useAuthStore, type AuthState } from '../stores/authStore'
import { MindsetChartsPanel } from './mindset/MindsetChartsPanel'
import { MindsetWeekScoreRow } from './mindset/MindsetWeekScoreRow'
import { TodayCheckInCard } from './mindset/TodayCheckInCard'
import { useMindsetData } from './mindset/useMindsetData'

export default function MindsetPage() {
  const token = useAuthStore((s: AuthState) => s.token)
  const data = useMindsetData(token)
  const todayKey = formatDateKey(startOfLocalDay(new Date()))

  useEffect(() => {
    if (data.error) toastError(data.error)
  }, [data.error])

  return (
    <div className="flex h-[calc(100dvh-5.25rem)] max-h-[calc(100dvh-5.25rem)] flex-col gap-0 overflow-hidden text-sm">
      {!token && (
        <p className="shrink-0 text-text-muted">
          <Link to="/settings" className="font-medium text-[#6C63FF] hover:underline">
            Sign in
          </Link>{' '}
          to save check-ins.
        </p>
      )}

      {token && (
        <>
          <div className="flex h-1/4 min-h-0 shrink-0 flex-col">
            <TodayCheckInCard
              token={token}
              todayKey={todayKey}
              todayLog={data.todayLog}
              loading={data.loading}
              onSaved={() => void data.refetch()}
            />
          </div>
          <div className="flex h-1/4 min-h-0 shrink-0 flex-col">
            <MindsetWeekScoreRow logs={data.rangeLogs} loading={data.loading} />
          </div>
          <div className="flex h-1/2 min-h-0 flex-1 flex-col">
            <MindsetChartsPanel
              monthLogs={data.monthLogs}
              rangeLogs={data.rangeLogs}
              year={data.period?.year ?? new Date().getFullYear()}
              month={data.period?.month ?? new Date().getMonth() + 1}
              loading={data.loading}
            />
          </div>
        </>
      )}
    </div>
  )
}
