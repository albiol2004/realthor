'use client'

import { useState, useCallback } from 'react'
import { trpc } from '@/lib/trpc/client'
import { PropertyList } from '@/components/properties/property-list'
import { PropertyDetail } from '@/components/properties/property-detail'
import { PropertyForm } from '@/components/properties/property-form'
import type { CreatePropertyInput, PropertiesFilterParams } from '@/types/crm'
import { useToast } from '@/hooks/use-toast'

/**
 * Properties Page
 * List/detail layout for property management
 */
export default function PropertiesPage() {
  const { toast } = useToast()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [filters, setFilters] = useState<PropertiesFilterParams>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 50,
    offset: 0,
  })

  // Queries
  const { data: propertiesData, isLoading: isLoadingProperties } = trpc.properties.list.useQuery(
    filters
  )
  const { data: selectedProperty, isLoading: isLoadingProperty } = trpc.properties.getById.useQuery(
    { id: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  )

  // Mutations
  const utils = trpc.useUtils()
  const createMutation = trpc.properties.create.useMutation({
    onSuccess: (newProperty) => {
      toast({
        title: 'Property created',
        description: `${newProperty.title} has been added to your properties.`,
      })
      utils.properties.list.invalidate()
      setSelectedPropertyId(newProperty.id)
    },
    onError: (error) => {
      toast({
        title: 'Error creating property',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateMutation = trpc.properties.update.useMutation({
    onSuccess: (updatedProperty) => {
      toast({
        title: 'Property updated',
        description: `${updatedProperty.title} has been updated.`,
      })
      utils.properties.list.invalidate()
      utils.properties.getById.invalidate({ id: updatedProperty.id })
    },
    onError: (error) => {
      toast({
        title: 'Error updating property',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = trpc.properties.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Property deleted',
        description: 'The property has been removed from your list.',
      })
      utils.properties.list.invalidate()
      setSelectedPropertyId(null)
    },
    onError: (error) => {
      toast({
        title: 'Error deleting property',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Handlers
  const handleCreate = useCallback(async (data: CreatePropertyInput) => {
    await createMutation.mutateAsync(data)
    setIsCreateOpen(false)
  }, [])

  const handleUpdate = useCallback(
    async (data: CreatePropertyInput) => {
      if (!selectedPropertyId) return
      await updateMutation.mutateAsync({ ...data, id: selectedPropertyId })
      setIsEditOpen(false)
    },
    [selectedPropertyId]
  )

  const handleDelete = useCallback(async () => {
    if (!selectedPropertyId) return

    if (
      window.confirm('Are you sure you want to delete this property? This action cannot be undone.')
    ) {
      await deleteMutation.mutateAsync({ id: selectedPropertyId })
    }
  }, [selectedPropertyId])

  const handleFilterChange = useCallback((newFilters: PropertiesFilterParams) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const properties = propertiesData?.properties || []
  const totalProperties = propertiesData?.total || 0

  return (
    <>
      <div className="h-full flex">
        {/* Left Panel - Property List */}
        <div className="w-96 flex-shrink-0">
          <PropertyList
            properties={properties as any}
            selectedPropertyId={selectedPropertyId || undefined}
            onPropertySelect={setSelectedPropertyId}
            onCreate={() => setIsCreateOpen(true)}
            onFilterChange={handleFilterChange}
            isLoading={isLoadingProperties}
          />
        </div>

        {/* Right Panel - Property Detail */}
        <div className="flex-1">
          {selectedProperty && !isLoadingProperty ? (
            <PropertyDetail
              property={selectedProperty as any}
              onEdit={() => setIsEditOpen(true)}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ) : isLoadingProperty ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-500">Loading property...</p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                  No property selected
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {totalProperties > 0
                    ? 'Select a property from the list to view details'
                    : 'Create your first property to get started'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <PropertyForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit Dialog */}
      {selectedProperty && (
        <PropertyForm
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSubmit={handleUpdate}
          initialData={selectedProperty as any}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </>
  )
}
