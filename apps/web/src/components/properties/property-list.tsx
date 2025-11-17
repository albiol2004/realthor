'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PropertyCard } from './property-card'
import { Search, Plus, Filter } from 'lucide-react'
import type { PropertyWithRelations, PropertiesFilterParams } from '@/types/crm'
import { cn } from '@/lib/utils'

interface PropertyListProps {
  properties: PropertyWithRelations[]
  selectedPropertyId?: string
  onPropertySelect: (propertyId: string) => void
  onCreate: () => void
  onFilterChange: (filters: PropertiesFilterParams) => void
  isLoading?: boolean
}

/**
 * Property List Component
 * Left panel showing searchable, filterable list of properties
 */
export function PropertyList({
  properties,
  selectedPropertyId,
  onPropertySelect,
  onCreate,
  onFilterChange,
  isLoading,
}: PropertyListProps) {
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
        <h2 className="text-lg font-bold text-black dark:text-white mb-3">Properties</h2>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800"
          />
        </div>

        {/* Action Button */}
        <Button
          onClick={onCreate}
          size="sm"
          className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>

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

      {/* Property List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-500">
              Loading properties...
            </div>
          )}

          {!isLoading && properties.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-2">No properties yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Click "Add Property" to create your first property'}
              </p>
            </div>
          )}

          {!isLoading &&
            properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={selectedPropertyId === property.id}
                onClick={() => onPropertySelect(property.id)}
              />
            ))}
        </div>
      </ScrollArea>

      {/* Footer - Property Count */}
      {!isLoading && properties.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}
            {searchQuery && ' found'}
          </p>
        </div>
      )}
    </div>
  )
}
