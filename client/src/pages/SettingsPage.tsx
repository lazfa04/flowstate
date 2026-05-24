import { useAuthStore } from '../stores/authStore'
import { AuthCard } from '../components/auth/AuthCard'
import { DangerZoneDeleteAccount, SettingsProfileForm } from '../components/settings/SettingsProfileForm'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1 text-text-muted">Account and preferences.</p>
      </div>

      {!user ? (
        <div className="max-w-md">
          <AuthCard />
        </div>
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-8">
          <SettingsProfileForm />
          <DangerZoneDeleteAccount />
        </div>
      )}
    </div>
  )
}
