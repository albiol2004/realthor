"use client"

import { useState, useEffect } from "react"
import { DealList } from "@/components/deals/deal-list"
import { DealDetail } from "@/components/deals/deal-detail"
import { DealFormDialog } from "@/components/deals/deal-form-dialog"
import type { Deal } from "@/types/crm"
import { useSearchParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"

export default function DealsPage() {
  // Store only the selected deal ID, not the full deal
  // This allows the query to automatically refetch when invalidated
  const [selectedDealId, setSelectedDealId] = useState<string | undefined>(undefined)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const searchParams = useSearchParams()

  // Support deep linking to a specific deal via ?id=uuid
  const dealIdFromUrl = searchParams.get('id')

  // Fetch the selected deal reactively
  // When queries are invalidated, this automatically refetches
  const { data: selectedDeal } = trpc.deals.getById.useQuery(
    { id: selectedDealId! },
    {
      enabled: !!selectedDealId,
      // Refetch when window regains focus (desktop-app behavior)
      refetchOnWindowFocus: true,
    }
  )

  // Auto-select deal from URL on mount
  useEffect(() => {
    if (dealIdFromUrl && !selectedDealId) {
      setSelectedDealId(dealIdFromUrl)
    }
  }, [dealIdFromUrl, selectedDealId])

  return (
    <div className="flex h-full">
      {/* Left Panel - Deal List */}
      <DealList
        selectedDealId={selectedDealId}
        onSelectDeal={(deal) => setSelectedDealId(deal.id)}
        onCreateClick={() => setIsCreateDialogOpen(true)}
      />

      {/* Right Panel - Deal Detail */}
      <div className="flex-1 border-l">
        {selectedDeal ? (
          <DealDetail
            deal={selectedDeal as Deal}
            onClose={() => setSelectedDealId(undefined)}
            onUpdate={() => {
              // No need to manually update state
              // The query will automatically refetch when invalidated
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Select a deal to view details</p>
              <p className="text-sm mt-2">or create a new deal to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <DealFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
