import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, resolveApiUrl } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { useAuthStore } from '../../stores/authStore'

export function SettingsProfileForm() {
  const { token, user, setSession, clearSession } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
    }
  }, [user])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !user) return
    setSaving(true)
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      }
      if (newPassword.trim()) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword.trim()
      }
      const res = await api<{ user: { id: string; email: string; name: string }; token: string }>(
        '/api/auth/me',
        { method: 'PUT', token, body: JSON.stringify(body) },
      )
      setSession(res.token, res.user)
      setCurrentPassword('')
      setNewPassword('')
      toastSuccess('Profile updated')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (!token || !user) return null

  return (
    <form onSubmit={onSave} className="rounded-xl border border-border bg-surface p-5 shadow-lg shadow-black/20">
      <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
      <p className="mt-1 text-sm text-text-muted">Update your name, email, or password.</p>

      <div className="mt-4 space-y-4">
        <label className="block text-sm text-text-muted">
          Name
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm text-text-muted">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Change password</p>
          <p className="mt-1 text-xs text-text-muted">Leave new password blank to keep your current password.</p>
          <label className="mt-3 block text-sm text-text-muted">
            Current password
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="mt-3 block text-sm text-text-muted">
            New password
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent1 px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-accent1/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearSession()
            toastSuccess('Signed out')
          }}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface2 hover:text-text-primary"
        >
          Sign out
        </button>
      </div>
    </form>
  )
}

export function DangerZoneDeleteAccount() {
  const { token, clearSession } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirmDelete() {
    if (!token || !password) return
    setBusy(true)
    try {
      const res = await fetch(resolveApiUrl('/api/auth/me'), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password }),
        },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || res.statusText)
      }
      clearSession()
      toastSuccess('Account deleted')
      setOpen(false)
      navigate('/')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not delete account')
    } finally {
      setBusy(false)
    }
  }

  if (!token) return null

  return (
    <div className="rounded-xl border border-accent3/40 bg-accent3/5 p-5">
      <h2 className="text-lg font-semibold text-accent3">Danger zone</h2>
      <p className="mt-1 text-sm text-text-muted">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-lg border border-accent3/50 bg-accent3/10 px-4 py-2 text-sm font-semibold text-accent3 transition hover:bg-accent3/20"
      >
        Delete account
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text-primary">Delete your account?</h3>
            <p className="mt-2 text-sm text-text-muted">
              Enter your password to confirm. All projects, tasks, habits, and logs will be removed.
            </p>
            <input
              type="password"
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary outline-none ring-accent1/40 focus:ring-2"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setPassword('')
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !password}
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-accent3 px-4 py-2 text-sm font-semibold text-background hover:bg-accent3/90 disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
