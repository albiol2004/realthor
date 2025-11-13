import { Users } from 'lucide-react'

/**
 * CRM Page (Placeholder)
 *
 * Will include: Contacts, Messages, Deals, Timeline
 * Phase 2: Core CRM implementation
 */
export default function CRMPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          CRM
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Contacts, Messages, Deals & Timeline
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            CRM Module Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 2: Contacts, Unified Messages, Deals Pipeline, Activity Timeline
          </p>
        </div>
      </div>
    </div>
  )
}
