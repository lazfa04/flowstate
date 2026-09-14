import { cn } from '../../lib/cn'

type Props = React.HTMLAttributes<HTMLDivElement>

/** Pulsing block for loading placeholders. */
export function Skeleton({ className, ...rest }: Props) {
  return <div className={cn('animate-pulse rounded-md bg-surface2', className)} {...rest} />
}
