import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { useAuthStore } from '../../stores/authStore'

export function AuthCard() {
  const { token, user, setSession, clearSession } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body =
        mode === 'register'
          ? { email, password, name: name.trim() || undefined }
          : { email, password }
      const res = await api<{ token: string; user: { id: string; email: string; name: string } }>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setSession(res.token, res.user)
      toastSuccess(mode === 'login' ? 'Signed in' : 'Account created')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function verifySession() {
    if (!token) return
    setLoading(true)
    try {
      const me = await api<{ user: { id: string; email: string; name: string } }>('/api/auth/me', {
        token,
      })
      setSession(token, me.user)
      toastSuccess('Session verified')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Request failed')
      clearSession()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-lg shadow-black/20">
      <h2 className="text-lg font-semibold text-text-primary">Account</h2>
      <p className="mt-1 text-sm text-text-muted">Email and password (JWT)</p>

      <div className="mt-4 flex gap-2 rounded-lg bg-surface2 p-1 text-sm font-medium">
        <button
          type="button"
          className={`flex-1 rounded-md py-2 transition ${mode === 'login' ? 'bg-accent1 text-background' : 'text-text-muted hover:text-text-primary'}`}
          onClick={() => setMode('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-2 transition ${mode === 'register' ? 'bg-accent1 text-background' : 'text-text-muted hover:text-text-primary'}`}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        {mode === 'register' && (
          <label className="block text-sm text-text-muted">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should we greet you?"
            />
          </label>
        )}
        <label className="block text-sm text-text-muted">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm text-text-muted">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent2 px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {user && (
        <div className="mt-4 rounded-lg border border-border bg-surface2 px-3 py-3 text-sm text-text-muted">
          <p>
            Signed in as{' '}
            <span className="font-medium text-text-primary">
              {user.name ? `${user.name} (${user.email})` : user.email}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void verifySession()}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface"
            >
              Verify session
            </button>
            <button
              type="button"
              onClick={() => {
                clearSession()
                toastSuccess('Signed out')
              }}
              className="rounded-md border border-accent3/50 px-3 py-1.5 text-xs font-semibold text-accent3 hover:bg-accent3/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
