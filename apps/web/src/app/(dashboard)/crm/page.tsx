'use client'

import { useState, useCallback } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ContactList } from '@/components/crm/contact-list'
import { ContactDetail } from '@/components/crm/contact-detail'
import { ContactForm } from '@/components/crm/contact-form'
import type {
  CreateContactInput,
  QuickCreateContactInput,
  ContactsFilterParams,
} from '@/types/crm'
import { useToast } from '@/hooks/use-toast'

/**
 * CRM Contacts Page
 * Phone-book style layout: Contact list (left) + Contact detail (right)
 */
export default function CRMPage() {
  const { toast } = useToast()
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [isFullCreateOpen, setIsFullCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [filters, setFilters] = useState<ContactsFilterParams>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 50,
    offset: 0,
  })

  // Queries
  const { data: contactsData, isLoading: isLoadingContacts } = trpc.contacts.list.useQuery(
    filters
  )
  const { data: selectedContact, isLoading: isLoadingContact } = trpc.contacts.getById.useQuery(
    { id: selectedContactId! },
    { enabled: !!selectedContactId }
  )

  // Mutations
  const utils = trpc.useUtils()
  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: (newContact) => {
      toast({
        title: 'Contact created',
        description: `${newContact.firstName} ${newContact.lastName} has been added to your contacts.`,
      })
      utils.contacts.list.invalidate()
      setSelectedContactId(newContact.id)
    },
    onError: (error) => {
      toast({
        title: 'Error creating contact',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const quickCreateMutation = trpc.contacts.quickCreate.useMutation({
    onSuccess: (newContact) => {
      toast({
        title: 'Contact created',
        description: `${newContact.firstName} ${newContact.lastName} has been added to your contacts.`,
      })
      utils.contacts.list.invalidate()
      setSelectedContactId(newContact.id)
    },
    onError: (error) => {
      toast({
        title: 'Error creating contact',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: (updatedContact) => {
      toast({
        title: 'Contact updated',
        description: `${updatedContact.firstName} ${updatedContact.lastName} has been updated.`,
      })
      utils.contacts.list.invalidate()
      utils.contacts.getById.invalidate({ id: updatedContact.id })
    },
    onError: (error) => {
      toast({
        title: 'Error updating contact',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Contact deleted',
        description: 'The contact has been removed from your list.',
      })
      utils.contacts.list.invalidate()
      setSelectedContactId(null)
    },
    onError: (error) => {
      toast({
        title: 'Error deleting contact',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Handlers
  const handleQuickCreate = useCallback(async (data: QuickCreateContactInput) => {
    await quickCreateMutation.mutateAsync(data)
    setIsQuickCreateOpen(false)
  }, [])

  const handleFullCreate = useCallback(async (data: CreateContactInput) => {
    await createMutation.mutateAsync(data)
    setIsFullCreateOpen(false)
  }, [])

  const handleUpdate = useCallback(
    async (data: CreateContactInput) => {
      if (!selectedContactId) return
      await updateMutation.mutateAsync({ ...data, id: selectedContactId })
      setIsEditOpen(false)
    },
    [selectedContactId]
  )

  const handleDelete = useCallback(async () => {
    if (!selectedContactId) return

    if (window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      await deleteMutation.mutateAsync({ id: selectedContactId })
    }
  }, [selectedContactId])

  const handleFilterChange = useCallback((newFilters: ContactsFilterParams) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const contacts = contactsData?.contacts || []
  const totalContacts = contactsData?.total || 0

  return (
    <>
      <div className="h-full flex">
        {/* Left Panel - Contact List (Phone-book style) */}
        <div className="w-96 flex-shrink-0">
          <ContactList
            contacts={contacts as any}
            selectedContactId={selectedContactId || undefined}
            onContactSelect={setSelectedContactId}
            onQuickCreate={() => setIsQuickCreateOpen(true)}
            onFullCreate={() => setIsFullCreateOpen(true)}
            onFilterChange={handleFilterChange}
            isLoading={isLoadingContacts}
          />
        </div>

        {/* Right Panel - Contact Detail */}
        <div className="flex-1">
          {selectedContact && !isLoadingContact ? (
            <ContactDetail
              contact={selectedContact as any}
              onEdit={() => setIsEditOpen(true)}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ) : isLoadingContact ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-500">Loading contact...</p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                  No contact selected
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {totalContacts > 0
                    ? 'Select a contact from the list to view details'
                    : 'Create your first contact to get started'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Create Dialog */}
      <ContactForm
        open={isQuickCreateOpen}
        onOpenChange={setIsQuickCreateOpen}
        onSubmit={handleQuickCreate}
        isQuickCreate
        isSubmitting={quickCreateMutation.isPending}
      />

      {/* Full Create Dialog */}
      <ContactForm
        open={isFullCreateOpen}
        onOpenChange={setIsFullCreateOpen}
        onSubmit={handleFullCreate}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit Dialog */}
      {selectedContact && (
        <ContactForm
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSubmit={handleUpdate}
          initialData={selectedContact as any}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </>
  )
}
