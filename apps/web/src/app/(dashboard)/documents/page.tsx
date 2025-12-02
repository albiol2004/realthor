"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { DocumentList } from "@/components/documents/document-list"
import { DocumentDetail } from "@/components/documents/document-detail"
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog"
import { trpc } from "@/lib/trpc/client"
import type { Document } from "@/types/crm"

export default function DocumentsPage() {
  // Store only the selected document ID, not the full document
  // This allows the query to automatically refetch when invalidated
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(undefined)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const searchParams = useSearchParams()

  // Get document ID from URL parameter for deep linking
  const documentIdFromUrl = searchParams.get('id')

  // Fetch the selected document reactively
  // When queries are invalidated, this automatically refetches
  const { data: selectedDocument } = trpc.documents.getById.useQuery(
    { id: selectedDocumentId! },
    {
      enabled: !!selectedDocumentId,
      // Refetch when window regains focus (desktop-app behavior)
      refetchOnWindowFocus: true,
      // Aggressive caching for documents
      staleTime: 1000 * 60 * 3, // 3 minutes - document metadata doesn't change often
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
    }
  )

  // Auto-select document from URL on mount
  useEffect(() => {
    if (documentIdFromUrl && !selectedDocumentId) {
      setSelectedDocumentId(documentIdFromUrl)
    }
  }, [documentIdFromUrl, selectedDocumentId])

  return (
    <div className="flex h-full">
      {/* Left Panel - Document List */}
      <DocumentList
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={(doc) => setSelectedDocumentId(doc.id)}
        onUploadClick={() => setIsUploadDialogOpen(true)}
      />

      {/* Right Panel - Document Detail */}
      <div className="flex-1 border-l">
        {selectedDocument ? (
          <DocumentDetail
            document={selectedDocument as Document}
            onClose={() => setSelectedDocumentId(undefined)}
            onUpdate={() => {
              // No need to manually update state
              // The query will automatically refetch when invalidated
              // But we keep the callback for compatibility
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Select a document to view details</p>
              <p className="text-sm mt-2">or upload a new document to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
      />
    </div>
  )
}
