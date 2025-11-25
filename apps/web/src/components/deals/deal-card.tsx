"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Deal } from "@/types/crm"
import { getDealTypeLabel, getDealTypeColor, getDealStageLabel, getDealStageColor, formatDealValue } from "@/types/crm"
import { Briefcase, User, MapPin, FileCheck } from "lucide-react"

interface DealCardProps {
  deal: Deal & {
    contactName?: string
    propertyAddress?: string
    complianceScore?: number
  }
  isSelected: boolean
  onClick: () => void
}

export function DealCard({ deal, isSelected, onClick }: DealCardProps) {
  const complianceColor =
    deal.complianceScore === undefined ? 'text-gray-500' :
    deal.complianceScore >= 80 ? 'text-green-600' :
    deal.complianceScore >= 50 ? 'text-yellow-600' :
    'text-red-600'

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary bg-accent"
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Title and Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold text-sm truncate">{deal.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-xs font-medium', getDealTypeColor(deal.dealType))}>
                {getDealTypeLabel(deal.dealType)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getDealStageLabel(deal.stage)}
              </Badge>
            </div>
          </div>

          {/* Compliance Score */}
          {deal.complianceScore !== undefined && (
            <div className="flex flex-col items-end">
              <FileCheck className={cn("h-5 w-5", complianceColor)} />
              <span className={cn("text-xs font-semibold", complianceColor)}>
                {deal.complianceScore}%
              </span>
            </div>
          )}
        </div>

        {/* Contact and Property */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {deal.contactName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              <span className="truncate">{deal.contactName}</span>
            </div>
          )}
          {deal.propertyAddress && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{deal.propertyAddress}</span>
            </div>
          )}
        </div>

        {/* Value */}
        {deal.value && (
          <div className="text-sm font-semibold text-primary">
            {formatDealValue(deal.value)}
          </div>
        )}
      </div>
    </Card>
  )
}
