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
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent1/15 text-accent1">
        <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">{description}</p>
      {action && (
        <div className="mt-6">
          {'to' in action ? (
            <Link to={action.to} className="fs-btn-primary">
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className="fs-btn-primary">
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
