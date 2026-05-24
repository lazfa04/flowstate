type SummaryCardProps = {
  title: string
  value: string
  accent: 'violet' | 'amber' | 'mint' | 'sky'
  loading: boolean
}

const leftAccent = {
  violet: 'border-l-accent1',
  amber: 'border-l-accent4',
  mint: 'border-l-accent2',
  sky: 'border-l-accent5',
} as const

const topAccent = {
  violet: 'bg-accent1',
  amber: 'bg-accent4',
  mint: 'bg-accent2',
  sky: 'bg-accent5',
} as const

export function SummaryCard({ title, value, accent, loading }: SummaryCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface2 shadow-sm">
      <div className={`h-1 w-full ${topAccent[accent]}`} aria-hidden />
      <div
        className={[
          'min-h-[7.5rem] border-l-4 px-5 py-5',
          leftAccent[accent],
        ].join(' ')}
      >
        <p className="fs-eyebrow">{title}</p>
        {loading ? (
          <div className="mt-4 h-10 w-28 animate-pulse rounded-md bg-surface/80" />
        ) : (
          <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-text-primary sm:text-4xl">{value}</p>
        )}
      </div>
    </div>
  )
}
