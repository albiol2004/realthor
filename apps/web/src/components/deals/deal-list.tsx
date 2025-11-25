"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DealCard } from "./deal-card"
import { Plus, Search } from "lucide-react"
import type { Deal, DealWithRelations } from "@/types/crm"

interface DealListProps {
  selectedDealId?: string
  onSelectDeal: (deal: DealWithRelations) => void
  onCreateClick: () => void
}

export function DealList({
  selectedDealId,
  onSelectDeal,
  onCreateClick,
}: DealListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch all deals (with relations loaded)
  const { data: deals, isLoading } = trpc.deals.list.useQuery({
    search: debouncedQuery || undefined,
    limit: 100,
  })

  // Extract all unique contact IDs from deals
  const contactIds = [...new Set(deals?.flatMap(d => (d as DealWithRelations).contactIds || []) || [])]
  const { data: contacts } = trpc.contacts.list.useQuery(
    { limit: 100 },
    { enabled: contactIds.length > 0 }
  )

  // Extract all unique property IDs from deals
  const propertyIds = [...new Set(deals?.flatMap(d => (d as DealWithRelations).propertyIds || []) || [])]
  const { data: properties } = trpc.properties.list.useQuery(
    { limit: 100 },
    { enabled: propertyIds.length > 0 }
  )

  // TODO: Fetch compliance scores for each deal
  // For now, we'll show a placeholder or calculate it later

  // Auto-select deal if provided via URL
  useEffect(() => {
    if (selectedDealId && deals) {
      const deal = deals.find(d => d.id === selectedDealId)
      if (deal) {
        onSelectDeal(deal)
      }
    }
  }, [selectedDealId, deals])

  // Enrich deals with contact names and property addresses
  const enrichedDeals = deals?.map(deal => {
    const dealWithRelations = deal as DealWithRelations
    // Get the first contact and property (primary)
    const primaryContactId = dealWithRelations.contactIds?.[0]
    const primaryPropertyId = dealWithRelations.propertyIds?.[0]

    const contact = primaryContactId
      ? contacts?.contacts?.find(c => c.id === primaryContactId)
      : undefined
    const property = primaryPropertyId
      ? properties?.properties?.find((p: any) => p.id === primaryPropertyId)
      : undefined

    return {
      ...deal,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : undefined,
      propertyAddress: property?.address,
      complianceScore: undefined, // TODO: Calculate compliance
    }
  })

  return (
    <div className="w-96 flex flex-col border-r">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deals</h2>
          <Button onClick={onCreateClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Deal List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading deals...
          </div>
        ) : enrichedDeals && enrichedDeals.length > 0 ? (
          <div className="p-2 space-y-2">
            {enrichedDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                isSelected={deal.id === selectedDealId}
                onClick={() => onSelectDeal(deal)}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? "No deals found" : "No deals yet"}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        {enrichedDeals?.length || 0} deal{enrichedDeals?.length !== 1 ? "s" : ""}
      </div>
    </div>
  )
}
