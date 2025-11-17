'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { LinkContactDialog } from './link-contact-dialog'
import { Users, Phone, Mail, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { PropertyRole } from '@/types/crm'

interface PropertyContactsTabProps {
  propertyId: string
}

/**
 * Property Contacts Tab Component
 * Shows contacts linked to a property with their roles
 */
export function PropertyContactsTab({ propertyId }: PropertyContactsTabProps) {
  const { toast } = useToast()
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const utils = trpc.useUtils()

  // Query linked contacts
  const { data: contacts = [], isLoading } = trpc.properties.getContacts.useQuery({
    propertyId,
  })

  // Unlink mutation
  const unlinkMutation = trpc.properties.unlinkFromContact.useMutation({
    onSuccess: () => {
      toast({
        title: 'Contact unlinked',
        description: 'The contact has been unlinked from this property.',
      })
      utils.properties.getContacts.invalidate({ propertyId })
    },
    onError: (error) => {
      toast({
        title: 'Error unlinking contact',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleUnlink = async (contactId: string, role: PropertyRole) => {
    if (window.confirm('Are you sure you want to unlink this contact?')) {
      await unlinkMutation.mutateAsync({ propertyId, contactId, role })
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
        <p className="text-gray-500 dark:text-gray-500">Loading contacts...</p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">Linked Contacts</h3>
            <Button
              onClick={() => setIsLinkDialogOpen(true)}
              size="sm"
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Link Contact
            </Button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No contacts linked</p>
              <p className="text-sm mt-1">Link contacts to track who's involved with this property</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact: any) => (
                <div
                  key={`${contact.id}-${contact.role}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-black dark:text-white">
                        {contact.firstName} {contact.lastName}
                      </h4>
                      <Badge variant="outline" className={getRoleBadgeColor(contact.role)}>
                        {getRoleLabel(contact.role)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      {contact.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>

                    {contact.company && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {contact.company}
                        {contact.jobTitle && ` · ${contact.jobTitle}`}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                      Linked {new Date(contact.linkedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <Button
                    onClick={() => handleUnlink(contact.id, contact.role)}
                    size="sm"
                    variant="outline"
                    disabled={unlinkMutation.isPending}
                    className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Link Contact Dialog */}
      <LinkContactDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        propertyId={propertyId}
      />
    </>
  )
}
