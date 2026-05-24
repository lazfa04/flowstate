import { Skeleton } from '../../components/ui/Skeleton'

export function DashboardSkeletonTopRow() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[3fr_2fr]">
      <Skeleton className="h-[200px] rounded-xl border border-[#2A2F47]" style={{ backgroundColor: '#141726' }} />
      <Skeleton className="h-[200px] rounded-xl border border-[#2A2F47]" style={{ backgroundColor: '#141726' }} />
    </div>
  )
}

export function DashboardSkeletonColumns() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-[320px] rounded-lg border border-[#2A2F47]"
          style={{ backgroundColor: '#141726' }}
        />
      ))}
    </div>
  )
}
