'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { DocumentCard } from '@/components/documents/document-card'
import { DocumentUploadDialog } from '@/components/documents/document-upload-dialog'
import { FileText, Upload } from 'lucide-react'
import type { Document } from '@/types/crm'

interface ContactDocumentsTabProps {
  contactId: string
}

/**
 * Contact Documents Tab Component
 * Shows all documents linked to this contact with upload functionality
 */
export function ContactDocumentsTab({ contactId }: ContactDocumentsTabProps) {
  const router = useRouter()
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // Fetch documents for this contact
  const { data: documents, isLoading } = trpc.documents.listByEntity.useQuery({
    entityType: 'contact',
    entityId: contactId,
  })

  const handleDocumentClick = (document: Document) => {
    // Navigate to Documents page with this document selected
    router.push(`/documents?id=${document.id}`)
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header with Upload Button */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black dark:text-white">Documents</h3>
          <Button onClick={() => setIsUploadOpen(true)} size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {/* Documents List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-500">Loading documents...</p>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="p-4 space-y-2">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document as any}
                  isSelected={false}
                  onClick={() => handleDocumentClick(document as any)}
                />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No documents yet</p>
                <p className="text-sm mt-1">Upload documents for this contact</p>
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  size="sm"
                  className="mt-4 gap-2"
                  variant="outline"
                >
                  <Upload className="h-4 w-4" />
                  Upload First Document
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer with count */}
        {documents && documents.length > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-500 text-center">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        contactId={contactId}
      />
    </>
  )
}
