import { Share2 } from 'lucide-react'

/**
 * Social Page (Placeholder)
 *
 * Will include: Instagram/Facebook integration, Lead Stream, Auto-response, Qualification
 * Phase 2/3: Social lead capture implementation
 */
export default function SocialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Social
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Lead Capture & Auto-Response
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <Share2 className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            Social Module Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 3: Instagram/Facebook Integration, Lead Stream, Auto-qualification
          </p>
        </div>
      </div>
    </div>
  )
}
