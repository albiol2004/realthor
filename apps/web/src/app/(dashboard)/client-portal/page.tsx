import { UserCog } from 'lucide-react'

/**
 * Client Portal Page (Placeholder)
 *
 * Will include: Deal progress, Document upload for clients, Chat, Deadline reminders
 * Phase 3/4: Client portal implementation
 */
export default function ClientPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Client Portal
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Client Communication & Document Sharing
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <UserCog className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            Client Portal Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 4: Deal Progress Bar, Document Upload, Client Chat, Reminders
          </p>
        </div>
      </div>
    </div>
  )
}
