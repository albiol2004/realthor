"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DocumentCard } from "./document-card"
import { Upload, Search } from "lucide-react"
import type { Document } from "@/types/crm"

interface DocumentListProps {
  selectedDocumentId?: string
  onSelectDocument: (document: Document) => void
  onUploadClick: () => void
}

export function DocumentList({
  selectedDocumentId,
  onSelectDocument,
  onUploadClick,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch all documents
  const { data: documents, isLoading } = trpc.documents.listAll.useQuery()

  // Filter documents by search query
  const filteredDocuments = documents?.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-96 flex flex-col border-r">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documents</h2>
          <Button onClick={onUploadClick} size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading documents...
          </div>
        ) : filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="p-2 space-y-1">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document as any}
                isSelected={document.id === selectedDocumentId}
                onClick={() => onSelectDocument(document as any)}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? "No documents found" : "No documents yet"}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        {filteredDocuments?.length || 0} document{filteredDocuments?.length !== 1 ? "s" : ""}
      </div>
    </div>
  )
}
