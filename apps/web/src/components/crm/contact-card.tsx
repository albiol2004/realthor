import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  type Contact,
  type ContactWithRelations,
  getContactInitials,
  getContactDisplayInfo,
  getContactStatusColor,
  getContactStatusLabel,
} from '@/types/crm'
import { Mail, Phone, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContactCardProps {
  contact: Contact | ContactWithRelations
  isSelected?: boolean
  onClick?: () => void
}

/**
 * Contact Card Component
 * Displays contact info in a compact card format (used in contact list)
 */
export function ContactCard({ contact, isSelected, onClick }: ContactCardProps) {
  const statusColors = getContactStatusColor(contact.status)

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-900',
        isSelected
          ? 'bg-gray-100 dark:bg-gray-800 border-black dark:border-white'
          : 'bg-white dark:bg-black border-gray-200 dark:border-gray-800'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={contact.profilePictureUrl} alt={`${contact.firstName} ${contact.lastName}`} />
        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
          {getContactInitials(contact)}
        </AvatarFallback>
      </Avatar>

      {/* Contact Info */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-black dark:text-white truncate">
            {contact.firstName} {contact.lastName}
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
            {getContactStatusLabel(contact.status)}
          </Badge>
        </div>

        {/* Secondary info */}
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          {contact.company && (
            <div className="flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{contact.company}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-1 truncate">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{contact.phone}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {contact.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                +{contact.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
