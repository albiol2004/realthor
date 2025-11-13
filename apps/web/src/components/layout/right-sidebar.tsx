'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc/client'
import {
  Settings,
  CreditCard,
  Phone,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

/**
 * Right Sidebar Component
 *
 * User profile, subscription status, and account navigation
 * Displays trial countdown and subscription management
 */
export function RightSidebar() {
  const router = useRouter()
  const { data: session } = trpc.auth.getSession.useQuery()
  const { data: subscriptionStatus } = trpc.subscription.checkStatus.useQuery()
  const signOutMutation = trpc.auth.signOut.useMutation({
    onSuccess: () => {
      router.push('/login')
      router.refresh()
    },
  })

  // Get user initials for avatar
  const getInitials = (name?: string | null) => {
    if (!name) return '?'
    const names = name.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const userName = session?.profile?.name || session?.user?.email || 'User'
  const userEmail = session?.user?.email || ''

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
  }

  return (
    <aside className="w-64 h-screen sticky top-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex flex-col">
      {/* User Profile Section */}
      <div className="p-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-16 w-16 mb-3">
            <AvatarFallback className="bg-black dark:bg-white text-white dark:text-black text-lg font-semibold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-black dark:text-white truncate w-full">
            {userName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate w-full mt-1">
            {userEmail}
          </p>
        </div>
      </div>

      <Separator className="bg-gray-200 dark:bg-gray-800" />

      {/* Subscription Status */}
      {subscriptionStatus && (
        <div className="p-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
            {subscriptionStatus.subscription.status === 'trial' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-black dark:text-white">
                    Free Trial
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {subscriptionStatus.daysRemaining} {subscriptionStatus.daysRemaining === 1 ? 'day' : 'days'} remaining
                </p>
                <Link href="/subscribe">
                  <Button
                    size="sm"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600 mt-2"
                  >
                    Upgrade Now
                  </Button>
                </Link>
              </div>
            )}

            {subscriptionStatus.subscription.status === 'active' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-black dark:text-white">
                    Pro Plan
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {subscriptionStatus.subscription.planType || 'Active'}
                </p>
              </div>
            )}

            {subscriptionStatus.subscription.status === 'expired' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Subscription Expired
                  </span>
                </div>
                <Link href="/subscribe">
                  <Button
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 mt-2"
                  >
                    Renew Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <Separator className="bg-gray-200 dark:bg-gray-800" />

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        <Link href="/settings">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </Button>
        </Link>

        <Link href="/settings/subscription">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <CreditCard className="h-4 w-4 mr-3" />
            Subscription
          </Button>
        </Link>

        <Link href="/contact">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <Phone className="h-4 w-4 mr-3" />
            Contact Us
          </Button>
        </Link>
      </nav>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="outline"
          className="w-full justify-start border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800"
          onClick={handleSignOut}
          disabled={signOutMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-3" />
          {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>
    </aside>
  )
}
