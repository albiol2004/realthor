"use client"

import { useState } from "react"
import { DocumentList } from "@/components/documents/document-list"
import { DocumentDetail } from "@/components/documents/document-detail"
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog"
import type { Document } from "@/types/crm"

export default function DocumentsPage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

  return (
    <div className="flex h-full">
      {/* Left Panel - Document List */}
      <DocumentList
        selectedDocumentId={selectedDocument?.id}
        onSelectDocument={setSelectedDocument}
        onUploadClick={() => setIsUploadDialogOpen(true)}
      />

      {/* Right Panel - Document Detail */}
      <div className="flex-1 border-l">
        {selectedDocument ? (
          <DocumentDetail
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onUpdate={(updated) => setSelectedDocument(updated)}
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
