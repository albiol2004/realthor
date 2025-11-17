'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { LinkPropertyDialog } from './link-property-dialog'
import { Home, MapPin, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { PropertyRole } from '@/types/crm'
import { formatPropertyPrice, getPropertyStatusColor, getPropertyStatusLabel } from '@/types/crm'
import { cn } from '@/lib/utils'

interface ContactPropertiesTabProps {
  contactId: string
}

/**
 * Contact Properties Tab Component
 * Shows properties linked to a contact with their roles
 */
export function ContactPropertiesTab({ contactId }: ContactPropertiesTabProps) {
  const { toast } = useToast()
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const utils = trpc.useUtils()

  // Query linked properties
  const { data: properties = [], isLoading } = trpc.contacts.getProperties.useQuery({
    contactId,
  })

  // Unlink mutation
  const unlinkMutation = trpc.contacts.unlinkFromProperty.useMutation({
    onSuccess: () => {
      toast({
        title: 'Property unlinked',
        description: 'The property has been unlinked from this contact.',
      })
      utils.contacts.getProperties.invalidate({ contactId })
    },
    onError: (error) => {
      toast({
        title: 'Error unlinking property',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleUnlink = async (propertyId: string, role: PropertyRole) => {
    if (window.confirm('Are you sure you want to unlink this property?')) {
      await unlinkMutation.mutateAsync({ contactId, propertyId, role })
    }
  }

  const getRoleBadgeColor = (role: PropertyRole) => {
    switch (role) {
      case 'owner':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'buyer':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'seller':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      case 'tenant':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    }
  }

  const getRoleLabel = (role: PropertyRole) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-500">Loading properties...</p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">Linked Properties</h3>
            <Button
              onClick={() => setIsLinkDialogOpen(true)}
              size="sm"
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Link Property
            </Button>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-500">
              <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No properties linked</p>
              <p className="text-sm mt-1">
                Link properties to track what this contact is interested in or owns
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {properties.map((property: any) => {
                const statusColors = getPropertyStatusColor(property.status)
                const primaryImage = property.images?.[0]

                return (
                  <div
                    key={`${property.id}-${property.role}`}
                    className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-black dark:text-white truncate">
                          {property.title}
                        </h4>
                        <Badge variant="outline" className={getRoleBadgeColor(property.role)}>
                          {getRoleLabel(property.role)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-medium',
                            statusColors.bg,
                            statusColors.text,
                            statusColors.border
                          )}
                        >
                          {getPropertyStatusLabel(property.status)}
                        </Badge>
                      </div>

                      {property.address && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {property.address}
                            {property.city && `, ${property.city}`}
                            {property.state && `, ${property.state}`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-black dark:text-white">
                          {formatPropertyPrice(property)}
                        </span>
                        {(property.bedrooms || property.bathrooms || property.squareFeet) && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {property.bedrooms && `${property.bedrooms} bed`}
                            {property.bedrooms && property.bathrooms && ' · '}
                            {property.bathrooms && `${property.bathrooms} bath`}
                            {(property.bedrooms || property.bathrooms) &&
                              property.squareFeet &&
                              ' · '}
                            {property.squareFeet && `${property.squareFeet.toLocaleString()} sqft`}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        Linked {new Date(property.linkedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <Button
                      onClick={() => handleUnlink(property.id, property.role)}
                      size="sm"
                      variant="outline"
                      disabled={unlinkMutation.isPending}
                      className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 flex-shrink-0 self-start"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Link Property Dialog */}
      <LinkPropertyDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        contactId={contactId}
      />
    </>
  )
}
