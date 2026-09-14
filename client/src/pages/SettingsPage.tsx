import { useAuthStore } from '../stores/authStore'
import { AuthCard } from '../components/auth/AuthCard'
import { DangerZoneDeleteAccount, SettingsProfileForm } from '../components/settings/SettingsProfileForm'
import { PageHeader } from '../components/ui/PageHeader'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Account"
        title="Settings"
        description="Profile, session, and account controls."
      />

      {!user ? (
        <div className="max-w-md">
          <AuthCard />
        </div>
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <SettingsProfileForm />
          <DangerZoneDeleteAccount />
        </div>
      )}
    </div>
  )
}
