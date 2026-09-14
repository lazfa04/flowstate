type Props = {
  kicker?: string
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ kicker, title, description, actions }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker ? <p className="fs-eyebrow">{kicker}</p> : null}
        <h1 className={`${kicker ? 'mt-1.5' : ''} text-[1.75rem] font-semibold tracking-tight text-text-primary`}>
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
