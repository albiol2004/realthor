import { FileCheck } from 'lucide-react'

/**
 * Compliance Page (Placeholder)
 *
 * Will include: Document checklists, Upload, Auto-reminders, Compliance %
 * Phase 2/3: Compliance & documents implementation
 */
export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Compliance
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Documents, Checklists & Auto-Reminders
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <FileCheck className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            Compliance Module Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 3: Document Checklists, Auto-chase Missing Documents, Compliance Tracking
          </p>
        </div>
      </div>
    </div>
  )
}
