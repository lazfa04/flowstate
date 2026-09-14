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
    <div className="fs-card p-6">
      <p className="fs-eyebrow">Welcome</p>
      <h2 className="mt-1 text-xl font-semibold text-text-primary">Account</h2>
      <p className="mt-1 text-sm text-text-muted">Sign in with email and password.</p>

      <div className="mt-5 flex gap-1 rounded-xl bg-background p-1 text-sm font-medium">
        <button
          type="button"
          className={`flex-1 rounded-lg py-2 transition ${mode === 'login' ? 'bg-accent1 text-background shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          onClick={() => setMode('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`flex-1 rounded-lg py-2 transition ${mode === 'register' ? 'bg-accent1 text-background shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        {mode === 'register' && (
          <label className="block text-sm text-text-muted">
            Name
            <input
              className="fs-input"
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
            className="fs-input"
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
            className="fs-input"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={loading} className="fs-btn-mint w-full py-2.5">
          {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {user && (
        <div className="mt-5 rounded-xl border border-border bg-background px-3 py-3 text-sm text-text-muted">
          <p>
            Signed in as{' '}
            <span className="font-medium text-text-primary">
              {user.name ? `${user.name} (${user.email})` : user.email}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void verifySession()} className="fs-btn text-xs">
              Verify session
            </button>
            <button
              type="button"
              onClick={() => {
                clearSession()
                toastSuccess('Signed out')
              }}
              className="fs-btn-danger text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
