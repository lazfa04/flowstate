import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Repeat,
  Settings,
  Target,
  CalendarRange,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../lib/cn'

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/habits', label: 'Habits', icon: Repeat },
  { to: '/mindset', label: 'Mindset', icon: Brain },
  { to: '/goals', label: 'Weekly Goals', icon: Target },
  { to: '/year-in-progress', label: 'Year in Progress', icon: CalendarRange },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function navClass(isActive: boolean, collapsed: boolean) {
  return cn(
    'group relative flex items-center gap-3 rounded-xl py-2 text-[13px] font-medium transition-colors',
    collapsed ? 'justify-center px-2' : 'px-3',
    isActive
      ? 'bg-white/[0.06] text-text-primary'
      : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
  )
}

export default function AppShell() {
  const location = useLocation()
  const isMd = useMediaQuery('(min-width: 768px)')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (isMd) setMobileOpen(false)
  }, [isMd])

  const showCollapsed = collapsed && isMd

  const displayName = user?.name?.trim() || user?.email || 'Guest'
  const initials = (() => {
    const n = user?.name?.trim()
    if (n) {
      const parts = n.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
      return n.slice(0, 2).toUpperCase()
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase()
    return '?'
  })()

  const pageTitle = NAV.find((item) =>
    item.end ? location.pathname === '/' : location.pathname.startsWith(item.to),
  )?.label ?? 'FlowState'

  return (
    <div className="flex min-h-svh bg-background">
      {mobileOpen && !isMd && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-border/70 bg-surface/90 backdrop-blur-xl',
          'fixed inset-y-0 left-0 z-40 w-[252px] transition-transform duration-200 ease-out md:static md:z-0 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'md:transition-[width] md:duration-200 md:ease-out',
          showCollapsed ? 'md:w-[76px]' : 'md:w-[252px]',
        )}
      >
        <div className={cn('flex items-center gap-2 px-3 py-4', showCollapsed ? 'justify-center' : 'justify-between')}>
          <NavLink
            to="/"
            className="flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1"
            end
            title="FlowState home"
            onClick={() => setMobileOpen(false)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent1 to-accent5 text-xs font-bold text-background shadow-[0_0_20px_-6px_rgba(139,133,255,0.9)]">
              FS
            </span>
            {!showCollapsed && (
              <span className="truncate text-[15px] font-semibold tracking-tight">FlowState</span>
            )}
          </NavLink>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/[0.06] hover:text-text-primary md:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <p className={cn('px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted/70', showCollapsed && 'sr-only')}>
          Workspace
        </p>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) => navClass(isActive, showCollapsed)}
              onClick={() => setMobileOpen(false)}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent1" />
                  )}
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-accent1' : 'opacity-80')} aria-hidden />
                  {!showCollapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/70 p-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-white/[0.03] py-2.5',
              showCollapsed ? 'justify-center px-0' : 'px-3',
            )}
            title={displayName}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent1/90 to-accent2/70 text-[11px] font-bold text-background"
              aria-hidden
            >
              {initials}
            </div>
            {!showCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
                {user?.email && displayName !== user.email && (
                  <p className="truncate text-xs text-text-muted">{user.email}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text-primary transition hover:bg-surface2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold tracking-tight text-text-primary">{pageTitle}</span>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div
            key={location.pathname}
            className={cn(
              'animate-page-in mx-auto w-full',
              location.pathname === '/' ||
                location.pathname === '/habits' ||
                location.pathname === '/mindset' ||
                location.pathname === '/year-in-progress'
                ? 'max-w-[min(100%,1920px)] px-5 py-5 md:px-7'
                : 'max-w-[1600px] px-4 py-5 md:px-6 md:py-6',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
