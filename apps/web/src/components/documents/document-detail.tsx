"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Download, Trash2, FileText, Brain, Search } from "lucide-react"
import type { Document } from "@/types/crm"

interface DocumentDetailProps {
  document: Document
  onClose: () => void
  onUpdate: (document: Document) => void
}

export function DocumentDetail({ document, onClose, onUpdate }: DocumentDetailProps) {
  const [activeTab, setActiveTab] = useState("viewer")

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown"
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  // Handle download
  const handleDownload = () => {
    if (document.fileUrl) {
      window.open(document.fileUrl, "_blank")
    }
  }

  // Handle delete
  const handleDelete = () => {
    // TODO: Implement delete confirmation
    alert("Delete functionality coming soon")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{document.filename}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{document.fileType}</span>
              <span>•</span>
              <span>{formatFileSize(document.fileSize)}</span>
              {document.category && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    {document.category}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-12 w-full justify-start">
            <TabsTrigger value="viewer" className="gap-2">
              <FileText className="h-4 w-4" />
              Viewer
            </TabsTrigger>
            <TabsTrigger value="ocr" className="gap-2">
              <FileText className="h-4 w-4" />
              OCR Text
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Brain className="h-4 w-4" />
              AI Metadata
            </TabsTrigger>
            <TabsTrigger value="embeddings" className="gap-2">
              <Search className="h-4 w-4" />
              Embeddings
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Viewer Tab */}
          <TabsContent value="viewer" className="p-4 m-0">
            {document.fileType === "application/pdf" ? (
              <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                <iframe
                  src={document.fileUrl}
                  className="w-full h-full"
                  title={document.filename}
                />
              </div>
            ) : document.fileType?.startsWith("image/") ? (
              <div className="flex justify-center">
                <img
                  src={document.fileUrl}
                  alt={document.filename}
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Preview not available for this file type
              </div>
            )}
          </TabsContent>

          {/* OCR Text Tab */}
          <TabsContent value="ocr" className="p-4 m-0">
            {document.ocrStatus === "completed" && document.ocrText ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Extracted Text</h3>
                  <Badge variant="outline">{document.ocrText.length} characters</Badge>
                </div>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap">
                  {document.ocrText}
                </div>
              </div>
            ) : document.ocrStatus === "processing" ? (
              <div className="text-center text-muted-foreground">
                OCR processing in progress...
              </div>
            ) : document.ocrStatus === "failed" ? (
              <div className="text-center text-destructive">
                OCR processing failed. Please try re-uploading the document.
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                OCR processing has not started yet
              </div>
            )}
          </TabsContent>

          {/* AI Metadata Tab */}
          <TabsContent value="ai" className="p-4 m-0">
            {document.aiMetadata ? (
              <div className="space-y-6">
                {/* Names */}
                {document.aiMetadata.names && document.aiMetadata.names.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Extracted Names</h3>
                    <div className="space-y-2">
                      {document.aiMetadata.names.map((name, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <div className="font-medium">{name.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Role: {name.context} • Confidence: {(name.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                {document.aiMetadata.dates && document.aiMetadata.dates.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Important Dates</h3>
                    <div className="space-y-2">
                      {document.aiMetadata.dates.map((date, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <div className="font-medium">
                            {new Date(date.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Type: {date.type} • Confidence: {(date.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Type */}
                {document.aiMetadata.documentType && (
                  <div>
                    <h3 className="font-medium mb-2">Document Type</h3>
                    <Badge>{document.aiMetadata.documentType}</Badge>
                  </div>
                )}

                {/* Importance Score */}
                {document.importanceScore !== null && document.importanceScore !== undefined && (
                  <div>
                    <h3 className="font-medium mb-2">Importance Score</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${document.importanceScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {(document.importanceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Signature Status */}
                {document.aiMetadata.hasSignature && (
                  <div>
                    <h3 className="font-medium mb-2">Signature Detection</h3>
                    <Badge variant="outline">
                      {document.aiMetadata.signatureCount || 1} signature(s) detected
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                AI metadata will appear here after OCR processing completes
              </div>
            )}
          </TabsContent>

          {/* Embeddings Tab */}
          <TabsContent value="embeddings" className="p-4 m-0">
            <div className="text-center text-muted-foreground">
              <p>Semantic search embeddings are generated automatically</p>
              <p className="text-sm mt-2">384-dimensional vectors for similarity search</p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
