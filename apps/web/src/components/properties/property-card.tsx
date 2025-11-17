import { Badge } from '@/components/ui/badge'
import {
  type Property,
  type PropertyWithRelations,
  formatPropertyPrice,
  formatPropertyDetails,
  getPropertyStatusColor,
  getPropertyStatusLabel,
  getPropertyTypeLabel,
} from '@/types/crm'
import { Home, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropertyCardProps {
  property: Property | PropertyWithRelations
  isSelected?: boolean
  onClick?: () => void
}

/**
 * Property Card Component
 * Displays property info in a compact card format (used in property list)
 */
export function PropertyCard({ property, isSelected, onClick }: PropertyCardProps) {
  const statusColors = getPropertyStatusColor(property.status)
  const primaryImage = property.images[0]

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-900',
        isSelected
          ? 'bg-gray-100 dark:bg-gray-800 border-black dark:border-white'
          : 'bg-white dark:bg-black border-gray-200 dark:border-gray-800'
      )}
    >
      {/* Property Image */}
      <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Property Info */}
      <div className="flex-1 min-w-0">
        {/* Title & Status */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-black dark:text-white truncate">
            {property.title}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium flex-shrink-0',
              statusColors.bg,
              statusColors.text,
              statusColors.border
            )}
          >
            {getPropertyStatusLabel(property.status)}
          </Badge>
        </div>

        {/* Address */}
        {property.address && (
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {property.address}
              {property.city && `, ${property.city}`}
            </span>
          </div>
        )}

        {/* Price & Details */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-black dark:text-white">
            {formatPropertyPrice(property)}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatPropertyDetails(property)}
          </span>
        </div>

        {/* Property Type */}
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {getPropertyTypeLabel(property.propertyType)}
          </span>
        </div>
      </div>
    </div>
  )
}
