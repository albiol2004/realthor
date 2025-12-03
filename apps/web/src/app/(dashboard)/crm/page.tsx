'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ContactDetail } from '@/components/crm/contact-detail'
import { ContactForm } from '@/components/crm/contact-form'
import { ContactCard } from '@/components/crm/contact-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  CreateContactInput,
  QuickCreateContactInput,
  ContactsFilterParams,
  ContactCategory,
} from '@/types/crm'
import { useToast } from '@/hooks/use-toast'
import { Search, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getContactCategoryLabel } from '@/types/crm'
import { invalidateContactQueries } from '@/lib/trpc/cache-invalidation'

const CATEGORIES: (ContactCategory | 'all')[] = [
  'all',
  'potential_buyer',
  'potential_seller',
  'signed_buyer',
  'signed_seller',
  'potential_lender',
  'potential_tenant',
]

/**
 * CRM Contacts Page - New Category-Based Layout
 *
 * Layout:
 * - Top: Large search bar (center)
 * - Below: Category tabs
 * - Main: Contact cards grid (left) + Contact detail (right when selected)
 */
export default function CRMPage() {
  const { toast } = useToast()
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [isFullCreateOpen, setIsFullCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Auto-close contact detail when search changes
  useEffect(() => {
    if (searchQuery) {
      setSelectedContactId(null)
    }
  }, [searchQuery])

  // Build filters based on search and selected category
  const filters: ContactsFilterParams = useMemo(() => {
    const baseFilters: ContactsFilterParams = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 100,
      offset: 0,
    }

    if (searchQuery.trim()) {
      baseFilters.search = searchQuery.trim()
    }

    if (selectedCategory !== 'all') {
      baseFilters.category = [selectedCategory]
    }

    return baseFilters
  }, [searchQuery, selectedCategory])

  // Queries - Aggressive caching for contacts (they don't change often)
  const { data: contactsData, isLoading: isLoadingContacts } = trpc.contacts.list.useQuery(
    filters,
    {
      staleTime: 1000 * 60 * 5, // 5 minutes - contacts don't change frequently
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
    }
  )

  // Fetch ALL contacts without category filter for accurate counts
  const { data: allContactsData } = trpc.contacts.list.useQuery(
    {
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 1000, // High limit to get all contacts for counting
      offset: 0,
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
    }
  )

  const { data: selectedContact, isLoading: isLoadingContact } = trpc.contacts.getById.useQuery(
    { id: selectedContactId! },
    {
      enabled: !!selectedContactId,
      staleTime: 1000 * 60 * 5, // 5 minutes - individual contacts cached long
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
    }
  )

  // Mutations
  const utils = trpc.useUtils()
  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: (newContact) => {
      toast({
        title: 'Contact created',
        description: `${newContact.firstName} ${newContact.lastName} has been added to your contacts.`,
      })
      invalidateContactQueries(utils)
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
      invalidateContactQueries(utils)
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
      invalidateContactQueries(utils)
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
      invalidateContactQueries(utils)
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

  const contacts = contactsData?.contacts || []
  const totalContacts = contactsData?.total || 0
  const allContacts = allContactsData?.contacts || []

  // Get category counts from ALL contacts, not filtered ones
  const getCategoryCount = (category: ContactCategory | 'all') => {
    if (category === 'all') return allContactsData?.total || 0
    return allContacts.filter((c) => c.category === category).length
  }

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Top Bar - Search */}
        <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search contacts by name, email, phone, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-12 text-base"
              />
            </div>

            {/* Add Contact Button */}
            <Button onClick={() => setIsFullCreateOpen(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Contact
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category
              const count = getCategoryCount(category)
              const label = category === 'all' ? 'All Contacts' : getContactCategoryLabel(category)

              return (
                <Button
                  key={category}
                  variant={isSelected ? 'default' : 'ghost'}
                  onClick={() => {
                    setSelectedCategory(category)
                    setSelectedContactId(null) // Close any open contact when switching categories
                  }}
                  className={cn(
                    'gap-2 whitespace-nowrap',
                    isSelected && 'bg-black dark:bg-white text-white dark:text-black'
                  )}
                >
                  <Users className="h-4 w-4" />
                  {label}
                  {!searchQuery && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      isSelected
                        ? 'bg-white/20 dark:bg-black/20'
                        : 'bg-gray-100 dark:bg-gray-800'
                    )}>
                      {count}
                    </span>
                  )}
                </Button>
              )
            })}

          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Contact Cards Grid - Hide when contact is selected */}
          {!selectedContactId && (
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                {isLoadingContacts ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-500">Loading contacts...</p>
                  </div>
                ) : contacts.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {contacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact as any}
                        isSelected={contact.id === selectedContactId}
                        onClick={() => setSelectedContactId(contact.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                      {searchQuery ? 'No contacts found' : 'No contacts in this category'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {searchQuery
                        ? 'Try adjusting your search terms'
                        : 'Get started by creating your first contact'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setIsFullCreateOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Contact
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Width Contact Detail - Shows when contact is selected */}
          {selectedContactId && (
            <div className="flex-1 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              {selectedContact && !isLoadingContact ? (
                <ContactDetail
                  contact={selectedContact as any}
                  onEdit={() => setIsEditOpen(true)}
                  onDelete={handleDelete}
                  onClose={() => setSelectedContactId(null)}
                  isDeleting={deleteMutation.isPending}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-500">Loading contact...</p>
                </div>
              )}
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
