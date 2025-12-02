"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Upload, FileText, X, Loader2, CheckCircle2, XCircle } from "lucide-react"
import type { DocumentType } from "@/types/crm"

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId?: string // Auto-link to contact if provided
  propertyId?: string // Auto-link to property if provided
}

type UploadMode = 'single' | 'bulk'

interface UploadProgress {
  total: number
  current: number
  succeeded: number
  failed: number
  currentFile?: string
}

export function DocumentUploadDialog({ open, onOpenChange, contactId, propertyId }: DocumentUploadDialogProps) {
  const [uploadMode, setUploadMode] = useState<UploadMode>('single')
  const [files, setFiles] = useState<File[]>([])
  const [customName, setCustomName] = useState("")
  const [category, setCategory] = useState<DocumentType>("otro")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const utils = trpc.useUtils()

  // File dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles(acceptedFiles)
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
    maxFiles: uploadMode === 'single' ? 1 : undefined,
    multiple: uploadMode === 'bulk',
  })

  // Upload single file
  const uploadSingleFile = async (file: File, displayName?: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("category", category)

    if (displayName?.trim()) {
      formData.append("displayName", displayName.trim())
    }

    if (contactId) {
      formData.append("entityType", "contact")
      formData.append("entityId", contactId)
    } else if (propertyId) {
      formData.append("entityType", "property")
      formData.append("entityId", propertyId)
    }

    const response = await fetch("/api/upload/document", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      // Check if response is JSON before trying to parse it
      // VPS sometimes returns HTML error pages instead of JSON
      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        try {
          const error = await response.json()
          const errorMessage = error.details
            ? `${error.error}: ${error.details}`
            : error.error || "Upload failed"
          throw new Error(errorMessage)
        } catch (jsonError) {
          // If JSON parsing fails, fall back to generic error
          throw new Error(`Upload failed with status ${response.status}`)
        }
      } else {
        // Non-JSON response (likely HTML error page from server)
        const errorText = await response.text()
        console.error("Server error response:", errorText)
        throw new Error(`Upload failed: Server returned ${response.status} error`)
      }
    }

    return response.json()
  }

  // Handle single upload
  const handleSingleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select a file")
      return
    }

    setIsUploading(true)

    try {
      await uploadSingleFile(files[0], customName)

      toast.success("Document uploaded successfully!", {
        description: "OCR processing will begin shortly",
      })

      await invalidateQueries()
      handleClose()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload document")
    } finally {
      setIsUploading(false)
    }
  }

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select files")
      return
    }

    setIsUploading(true)
    setUploadProgress({
      total: files.length,
      current: 0,
      succeeded: 0,
      failed: 0,
    })

    const results = {
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      setUploadProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentFile: file.name,
      } : null)

      try {
        await uploadSingleFile(file)
        results.succeeded++
        setUploadProgress(prev => prev ? { ...prev, succeeded: prev.succeeded + 1 } : null)
      } catch (error) {
        results.failed++
        results.errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`)
        setUploadProgress(prev => prev ? { ...prev, failed: prev.failed + 1 } : null)
      }
    }

    // Show results
    if (results.failed === 0) {
      toast.success(`Successfully uploaded ${results.succeeded} documents!`, {
        description: "OCR processing will begin shortly",
      })
    } else if (results.succeeded === 0) {
      toast.error(`Failed to upload all ${results.failed} documents`, {
        description: results.errors[0],
      })
    } else {
      toast.warning(`Uploaded ${results.succeeded} of ${files.length} documents`, {
        description: `${results.failed} failed. Check console for details.`,
      })
      console.error("Upload errors:", results.errors)
    }

    await invalidateQueries()
    setIsUploading(false)
    setUploadProgress(null)
    handleClose()
  }

  // Invalidate queries
  const invalidateQueries = async () => {
    // Invalidate all document queries to show new uploads immediately
    await utils.documents.listAll.invalidate()
    await utils.documents.search.invalidate() // For the main document list

    if (contactId) {
      await utils.documents.listByEntity.invalidate({ entityType: 'contact', entityId: contactId })
    } else if (propertyId) {
      await utils.documents.listByEntity.invalidate({ entityType: 'property', entityId: propertyId })
    }
  }

  // Handle upload based on mode
  const handleUpload = () => {
    if (uploadMode === 'single') {
      handleSingleUpload()
    } else {
      handleBulkUpload()
    }
  }

  // Handle close
  const handleClose = () => {
    setFiles([])
    setCustomName("")
    setCategory("otro")
    setUploadMode('single')
    setUploadProgress(null)
    onOpenChange(false)
  }

  // Remove file from list
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Document{uploadMode === 'bulk' ? 's' : ''}</DialogTitle>
          <DialogDescription>
            {contactId || propertyId
              ? 'Upload PDF or image files. Documents will be automatically linked to this ' + (contactId ? 'contact' : 'property') + '.'
              : 'Upload PDF or image files for OCR processing and AI analysis'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Mode Selection */}
          <div>
            <Label>Upload Mode</Label>
            <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as UploadMode)} className="mt-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single File</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* File Dropzone */}
          <div>
            <Label>File{uploadMode === 'bulk' ? 's' : ''}</Label>
            <div
              {...getRootProps()}
              className={`
                mt-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : "border-border hover:border-purple-400"}
              `}
            >
              <input {...getInputProps()} />
              {files.length > 0 ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-12 w-12 text-purple-500" />
                  {uploadMode === 'single' ? (
                    <>
                      <div className="font-medium">{files[0].name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(files[0].size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFiles([])
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">{files.length} files selected</div>
                      <div className="text-sm text-muted-foreground">
                        Total: {(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFiles([])
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="font-medium">
                    {isDragActive ? "Drop the file here" : `Click to upload or drag and drop`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    PDF, PNG, JPG, TIFF (max 50MB per file)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File List for Bulk Mode */}
          {uploadMode === 'bulk' && files.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 hover:bg-accent rounded">
                  <span className="truncate flex-1">{file.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom Document Name (Single Mode Only) */}
          {uploadMode === 'single' && (
            <div>
              <Label htmlFor="customName">Document Name (Optional)</Label>
              <Input
                id="customName"
                placeholder="e.g., John's Passport, Property Title Deed"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a friendly name for this document. If left blank, the original filename will be used.
              </p>
            </div>
          )}

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

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Uploading {uploadProgress.current} of {uploadProgress.total}
                </span>
                <span className="text-muted-foreground">
                  {uploadProgress.succeeded} succeeded, {uploadProgress.failed} failed
                </span>
              </div>
              {uploadProgress.currentFile && (
                <div className="text-xs text-muted-foreground truncate">
                  Current: {uploadProgress.currentFile}
                </div>
              )}
              <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Info Box */}
          {!uploadProgress && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg text-sm">
              <p className="text-purple-900 dark:text-purple-100">
                <strong>What happens next:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-purple-800 dark:text-purple-200">
                <li>Document{uploadMode === 'bulk' ? 's are' : ' is'} uploaded to secure storage</li>
                <li>VPS OCR service processes {uploadMode === 'bulk' ? 'each document' : 'the document'} (~30-60 seconds{uploadMode === 'bulk' ? ' each' : ''})</li>
                <li>Text is extracted and indexed for search</li>
                <li>AI analyzes content and extracts metadata</li>
                <li>Semantic embeddings are generated</li>
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {uploadMode === 'bulk' && files.length > 1 ? `${files.length} Files` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
