import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Settings Page
 *
 * Main settings hub with links to different settings sections
 */
export default function SettingsPage() {
  const settingsSections = [
    {
      title: 'Profile',
      description: 'Manage your account information and preferences',
      href: '/settings/profile',
      available: false,
    },
    {
      title: 'Subscription',
      description: 'Manage your billing and subscription plan',
      href: '/settings/subscription',
      available: true,
    },
    {
      title: 'Notifications',
      description: 'Configure email and push notifications',
      href: '/settings/notifications',
      available: false,
    },
    {
      title: 'Email Integration',
      description: 'Connect your email accounts (IMAP/SMTP)',
      href: '/settings/integrations/email',
      available: true,
    },
    {
      title: 'Security',
      description: 'Password, two-factor authentication, and security settings',
      href: '/settings/security',
      available: false,
    },
  ]

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => (
          <Card
            key={section.href}
            className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black"
          >
            <CardHeader>
              <CardTitle className="text-black dark:text-white">
                {section.title}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {section.available ? (
                <Link href={section.href}>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    Manage
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  disabled
                  className="w-full border-gray-300 dark:border-gray-700"
                >
                  Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
