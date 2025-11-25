'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  FileText,
  Share2,
  UserCog,
  Settings,
} from 'lucide-react'

/**
 * Navigation items based on MVP_FEATURES.md
 */
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Action Center & AI Command Bar',
  },
  {
    name: 'CRM',
    href: '/crm',
    icon: Users,
    description: 'Contacts, Messages, Deals, Timeline',
  },
  {
    name: 'Deals',
    href: '/deals',
    icon: Briefcase,
    description: 'Sales Pipeline & Compliance',
  },
  {
    name: 'Properties',
    href: '/properties',
    icon: Building2,
    description: 'Property Workspace & Buyers',
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FileText,
    description: 'Document Library & Search',
  },
  {
    name: 'Social',
    href: '/social',
    icon: Share2,
    description: 'Lead Capture & Auto-Response',
  },
  {
    name: 'Client Portal',
    href: '/client-portal',
    icon: UserCog,
    description: 'Client Communication',
  },
  {
    name: 'Account',
    href: '/settings',
    icon: Settings,
    description: 'Settings & Subscription',
  },
]

/**
 * Left Sidebar Component
 *
 * Main navigation sidebar with MVP feature pages
 * Sticky positioning with modern minimalist design
 */
export function LeftSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard">
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Kairo
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Real Estate OS
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive
                    ? 'text-white dark:text-black'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                )}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">
                  {item.name}
                </span>
                {!isActive && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.description}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          v0.3.0 • Phase 1
        </p>
      </div>
    </aside>
  )
}
