"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FileText, FileImage, File, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { Document, OCRStatus } from "@/types/crm"

interface DocumentCardProps {
  document: Document
  isSelected: boolean
  onClick: () => void
}

export function DocumentCard({ document, isSelected, onClick }: DocumentCardProps) {
  // Get appropriate icon based on mime type
  const getFileIcon = () => {
    if (document.fileType?.startsWith("image/")) {
      return <FileImage className="h-4 w-4" />
    }
    if (document.fileType === "application/pdf") {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  // Get status badge
  const getStatusBadge = () => {
    const status = document.ocrStatus || "pending"

    const statusConfig: Record<OCRStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: {
        label: "Pending",
        variant: "secondary",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      processing: {
        label: "Processing",
        variant: "default",
        icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
      },
      completed: {
        label: "Completed",
        variant: "outline",
        icon: <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />,
      },
      failed: {
        label: "Failed",
        variant: "destructive",
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
    }

    const config = statusConfig[status]

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        "hover:bg-accent/50",
        isSelected && "bg-accent border-purple-500"
      )}
    >
      <div className="space-y-2">
        {/* Filename and Icon */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-muted-foreground">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{document.displayName || document.filename}</p>
            {document.documentType && (
              <p className="text-xs text-muted-foreground">{document.documentType}</p>
            )}
          </div>
        </div>

        {/* Status and File Size */}
        <div className="flex items-center justify-between gap-2">
          {getStatusBadge()}
          {document.fileSize && (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(document.fileSize)}
            </span>
          )}
        </div>

        {/* Upload Date */}
        <div className="text-xs text-muted-foreground">
          {new Date(document.createdAt).toLocaleDateString()}
        </div>

        {/* Related Contact Card */}
        {document.relatedContacts && document.relatedContacts.length > 0 && (
          <div className="mt-2 pt-2 border-t flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {document.relatedContacts[0].profilePictureUrl ? (
                <img
                  src={document.relatedContacts[0].profilePictureUrl}
                  alt={document.relatedContacts[0].firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-medium text-primary">
                  {document.relatedContacts[0].firstName[0]}
                  {document.relatedContacts[0].lastName[0]}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {document.relatedContacts[0].firstName} {document.relatedContacts[0].lastName}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
