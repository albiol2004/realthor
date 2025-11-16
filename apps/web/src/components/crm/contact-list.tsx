'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ContactCard } from './contact-card'
import { Search, Plus, UserPlus, Filter } from 'lucide-react'
import type { ContactWithRelations, ContactsFilterParams } from '@/types/crm'
import { cn } from '@/lib/utils'

interface ContactListProps {
  contacts: ContactWithRelations[]
  selectedContactId?: string
  onContactSelect: (contactId: string) => void
  onQuickCreate: () => void
  onFullCreate: () => void
  onFilterChange: (filters: ContactsFilterParams) => void
  isLoading?: boolean
}

/**
 * Contact List Component
 * Left panel showing searchable, filterable list of contacts (phone-book style)
 */
export function ContactList({
  contacts,
  selectedContactId,
  onContactSelect,
  onQuickCreate,
  onFullCreate,
  onFilterChange,
  isLoading,
}: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onFilterChange({ search: value })
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-black dark:text-white mb-3">Contacts</h2>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onQuickCreate}
            size="sm"
            variant="outline"
            className="flex-1 border-gray-300 dark:border-gray-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
          <Button
            onClick={onFullCreate}
            size="sm"
            className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Filter Toggle */}
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="ghost"
          size="sm"
          className="w-full mt-2"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>

        {/* Filters (TODO: Implement filter UI) */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Advanced filters coming soon...
            </p>
          </div>
        )}
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-500">
              Loading contacts...
            </div>
          )}

          {!isLoading && contacts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-2">No contacts yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Click "Add Contact" to create your first contact'}
              </p>
            </div>
          )}

          {!isLoading &&
            contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                isSelected={selectedContactId === contact.id}
                onClick={() => onContactSelect(contact.id)}
              />
            ))}
        </div>
      </ScrollArea>

      {/* Footer - Contact Count */}
      {!isLoading && contacts.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            {searchQuery && ' found'}
          </p>
        </div>
      )}
    </div>
  )
}
