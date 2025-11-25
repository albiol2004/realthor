"use client"

import { useState, useEffect } from "react"
import { DealList } from "@/components/deals/deal-list"
import { DealDetail } from "@/components/deals/deal-detail"
import { DealFormDialog } from "@/components/deals/deal-form-dialog"
import type { Deal } from "@/types/crm"
import { useSearchParams } from "next/navigation"

export default function DealsPage() {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const searchParams = useSearchParams()

  // Support deep linking to a specific deal via ?id=uuid
  const dealIdFromUrl = searchParams.get('id')

  useEffect(() => {
    if (dealIdFromUrl && !selectedDeal) {
      // We'll handle this in DealList component by auto-selecting the deal
    }
  }, [dealIdFromUrl])

  return (
    <div className="flex h-full">
      {/* Left Panel - Deal List */}
      <DealList
        selectedDealId={selectedDeal?.id || dealIdFromUrl || undefined}
        onSelectDeal={setSelectedDeal}
        onCreateClick={() => setIsCreateDialogOpen(true)}
      />

      {/* Right Panel - Deal Detail */}
      <div className="flex-1 border-l">
        {selectedDeal ? (
          <DealDetail
            deal={selectedDeal}
            onClose={() => setSelectedDeal(null)}
            onUpdate={(updated) => setSelectedDeal(updated)}
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
