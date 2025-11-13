import { LeftSidebar } from '@/components/layout/left-sidebar'
import { RightSidebar } from '@/components/layout/right-sidebar'

/**
 * Dashboard Layout
 *
 * Three-column layout with left navigation, main content, and right user panel
 * Phase 1: Left sidebar (main nav) + Right sidebar (user/subscription)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Left Sidebar - Main Navigation */}
      <LeftSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>

      {/* Right Sidebar - User Profile & Subscription */}
      <RightSidebar />
    </div>
  )
}
