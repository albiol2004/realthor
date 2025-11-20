'use client'

import { usePathname } from 'next/navigation'
import { LeftSidebar } from '@/components/layout/left-sidebar'
import { RightSidebar } from '@/components/layout/right-sidebar'

/**
 * Dashboard Layout
 *
 * Three-column layout with left navigation, main content, and optional right user panel
 * Right sidebar only shows on settings/account pages
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isSettingsPage = pathname.startsWith('/settings')

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Left Sidebar - Main Navigation */}
      <LeftSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Right Sidebar - User Profile & Subscription (Settings pages only) */}
      {isSettingsPage && <RightSidebar />}
    </div>
  )
}
