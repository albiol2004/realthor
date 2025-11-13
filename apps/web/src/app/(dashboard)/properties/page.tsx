import { Building2 } from 'lucide-react'

/**
 * Properties Page (Placeholder)
 *
 * Will include: Property Workspace, Buyers Tab, Offers, Deadlines, Docs
 * Phase 2: Property management implementation
 */
export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Properties
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Property Workspace, Buyers & Offers
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <Building2 className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            Properties Module Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 2: Property Workspace, Buyer Matching, Offers, Deadlines
          </p>
        </div>
      </div>
    </div>
  )
}
