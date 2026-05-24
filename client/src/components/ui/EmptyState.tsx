import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

type Action =
  | { label: string; to: string }
  | { label: string; onClick: () => void }

type Props = {
  icon: LucideIcon
  title: string
  description: string
  action?: Action
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-border bg-surface2/50 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent2/15 text-accent2">
        <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-text-muted">{description}</p>
      {action && (
        <div className="mt-6">
          {'to' in action ? (
            <Link
              to={action.to}
              className="inline-flex rounded-lg bg-accent1 px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-accent1/90"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex rounded-lg bg-accent1 px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-accent1/90"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
