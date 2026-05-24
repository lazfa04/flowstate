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
  Zap,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../lib/cn'

function navClass(isActive: boolean, collapsed: boolean) {
  return [
    'flex items-center gap-3 rounded-full py-2.5 text-sm font-medium transition-colors duration-200',
    collapsed ? 'justify-center px-2' : 'px-3',
    isActive
      ? 'bg-accent1/25 text-accent1 shadow-[inset_0_0_0_1px_rgba(108,99,255,0.35)]'
      : 'text-text-muted hover:bg-surface2 hover:text-text-primary',
  ].join(' ')
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

  return (
    <div className="flex min-h-svh bg-background">
      {mobileOpen && !isMd && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-border bg-surface',
          'fixed inset-y-0 left-0 z-40 w-[240px] transition-transform duration-200 ease-out md:static md:z-0 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'md:transition-[width] md:duration-200 md:ease-out',
          showCollapsed ? 'md:w-[72px]' : 'md:w-[240px]',
        )}
      >
        <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-1 transition-colors',
                showCollapsed ? 'justify-center' : '',
                isActive ? 'text-accent1' : 'text-text-primary hover:text-accent1',
              )
            }
            end
            title="FlowState home"
            onClick={() => setMobileOpen(false)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent1/20 text-accent1">
              <Zap className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            {!showCollapsed && (
              <span className="truncate font-semibold tracking-tight text-text-primary">FlowState</span>
            )}
          </NavLink>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted transition hover:bg-surface2 hover:text-text-primary md:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          <NavLink
            to="/"
            end
            title="Dashboard"
            className={({ isActive }) => navClass(isActive, showCollapsed)}
            onClick={() => setMobileOpen(false)}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {!showCollapsed && <span className="truncate">Dashboard</span>}
          </NavLink>
          <NavLink
            to="/projects"
            title="Projects"
            className={({ isActive }) => navClass(isActive, showCollapsed)}
            onClick={() => setMobileOpen(false)}
          >
            <FolderKanban className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {!showCollapsed && <span className="truncate">Projects</span>}
          </NavLink>
          <NavLink
            to="/habits"
            title="Habits"
            className={({ isActive }) => navClass(isActive, showCollapsed)}
            onClick={() => setMobileOpen(false)}
          >
            <Repeat className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {!showCollapsed && <span className="truncate">Habits</span>}
          </NavLink>
          <NavLink
            to="/mindset"
            title="Mindset"
            className={({ isActive }) => navClass(isActive, showCollapsed)}
            onClick={() => setMobileOpen(false)}
          >
            <Brain className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {!showCollapsed && <span className="truncate">Mindset</span>}
          </NavLink>
          <NavLink
            to="/goals"
            title="Weekly Goals"
            className={({ isActive }) => navClass(isActive, showCollapsed)}
            onClick={() => setMobileOpen(false)}
          >
            <Target className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {!showCollapsed && <span className="truncate">Weekly Goals</span>}
          </NavLink>
          <NavLink
            to="/settings"
            title="Settings"
            className={({ isActive }) => navClass(isActive, showCollapsed)}
            onClick={() => setMobileOpen(false)}
          >
            <Settings className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {!showCollapsed && <span className="truncate">Settings</span>}
          </NavLink>
        </nav>

        <div className="border-t border-border p-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-surface2/80 py-2.5 transition-all duration-200',
              showCollapsed ? 'justify-center px-0' : 'px-3',
            )}
            title={displayName}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent1 text-xs font-bold text-background"
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
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-primary transition hover:bg-surface2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold tracking-tight text-text-primary">FlowState</span>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div
            key={location.pathname}
            className={cn(
              'animate-page-in mx-auto w-full py-5',
              location.pathname === '/' || location.pathname === '/habits' || location.pathname === '/mindset'
                ? 'max-w-[min(100%,1920px)] px-6 py-2'
                : 'max-w-[1600px] px-3 py-4 md:px-5 md:py-5',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
