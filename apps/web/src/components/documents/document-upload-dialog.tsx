"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import type { DocumentType } from "@/types/crm"

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId?: string // Auto-link to contact if provided
  propertyId?: string // Auto-link to property if provided
}

export function DocumentUploadDialog({ open, onOpenChange, contactId, propertyId }: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentType>("otro")
  const [isUploading, setIsUploading] = useState(false)

  const utils = trpc.useUtils()

  // File dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/tiff": [".tiff", ".tif"],
    },
    maxFiles: 1,
    multiple: false,
  })

  // Handle upload
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file")
      return
    }

    setIsUploading(true)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)

      // Add entity linking if provided
      if (contactId) {
        formData.append("entityType", "contact")
        formData.append("entityId", contactId)
      } else if (propertyId) {
        formData.append("entityType", "property")
        formData.append("entityId", propertyId)
      }

      // Upload to API route
      const response = await fetch("/api/upload/document", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = error.details
          ? `${error.error}: ${error.details}`
          : error.error || "Upload failed"
        throw new Error(errorMessage)
      }

      const data = await response.json()

      toast.success("Document uploaded successfully!", {
        description: "OCR processing will begin shortly",
      })

      // Invalidate documents queries to refresh list
      await utils.documents.listAll.invalidate()

      // Also invalidate entity-specific query if linked to contact/property
      if (contactId) {
        await utils.documents.listByEntity.invalidate({ entityType: 'contact', entityId: contactId })
      } else if (propertyId) {
        await utils.documents.listByEntity.invalidate({ entityType: 'property', entityId: propertyId })
      }

      // Close dialog and reset
      handleClose()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload document")
    } finally {
      setIsUploading(false)
    }
  }

  // Handle close
  const handleClose = () => {
    setFile(null)
    setCategory("otro")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            {contactId || propertyId
              ? 'Upload a PDF or image file. This document will be automatically linked to this ' + (contactId ? 'contact' : 'property') + '.'
              : 'Upload a PDF or image file for OCR processing and AI analysis'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Dropzone */}
          <div>
            <Label>File</Label>
            <div
              {...getRootProps()}
              className={`
                mt-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : "border-border hover:border-purple-400"}
              `}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-12 w-12 text-purple-500" />
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="font-medium">
                    {isDragActive ? "Drop the file here" : "Click to upload or drag and drop"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    PDF, PNG, JPG, TIFF (max 50MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category (Optional)</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as DocumentType)}>
              <SelectTrigger id="category" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="appraisal">Appraisal</SelectItem>
                <SelectItem value="disclosure">Disclosure</SelectItem>
                <SelectItem value="escritura_propiedad">Escritura Propiedad</SelectItem>
                <SelectItem value="contrato_compraventa">Contrato Compraventa</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg text-sm">
            <p className="text-purple-900 dark:text-purple-100">
              <strong>What happens next:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 mt-2 text-purple-800 dark:text-purple-200">
              <li>Document is uploaded to secure storage</li>
              <li>VPS OCR service processes the document (~30-60 seconds)</li>
              <li>Text is extracted and indexed for search</li>
              <li>AI analyzes content and extracts metadata</li>
              <li>Semantic embeddings are generated</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
