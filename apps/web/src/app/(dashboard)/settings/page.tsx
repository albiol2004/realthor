/**
 * Settings Page
 *
 * User settings, preferences, etc.
 * Phase 1: Basic structure
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <p className="text-sm text-muted-foreground">
            Profile settings will be implemented in Phase 1
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Email, WhatsApp, and other integrations (Phase 4)
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Subscription and billing settings (Future)
          </p>
        </div>
      </div>
    </div>
  )
}
