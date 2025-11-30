"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { X, Download, Trash2, FileText, Brain, Search, Loader2, Edit, Tag, CalendarIcon, Check, ChevronsUpDown } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { Document, DocumentType } from "@/types/crm"
import { invalidateDocumentQueries } from "@/lib/trpc/cache-invalidation"
import { DOCUMENT_TYPES_BY_CATEGORY } from "@/lib/config/document-categories"

// Document types are imported from the centralized config
// These match the compliance/risk assessment categories

interface DocumentDetailProps {
  document: Document
  onClose: () => void
  onUpdate: (document: Document) => void
}

export function DocumentDetail({ document, onClose, onUpdate }: DocumentDetailProps) {
  const [activeTab, setActiveTab] = useState("viewer")
  const utils = trpc.useUtils()

  // AI labeling state
  const [isAILabelingInProgress, setIsAILabelingInProgress] = useState(false)
  const [aiLabelingStartTime, setAiLabelingStartTime] = useState<number | null>(null)

  // Editable metadata state
  const [displayName, setDisplayName] = useState(document.displayName || document.filename)
  const [documentType, setDocumentType] = useState<DocumentType | undefined>(document.documentType)
  const [documentDate, setDocumentDate] = useState<Date | undefined>(document.documentDate)
  const [dueDate, setDueDate] = useState<Date | undefined>(document.dueDate)
  const [tags, setTags] = useState((document.tags || []).join(", "))
  const [description, setDescription] = useState(document.description || "")

  // Contact and Property fuzzy search state
  const [contactSearch, setContactSearch] = useState("")
  const [propertySearch, setPropertySearch] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<Array<{ id: string; firstName: string; lastName: string; email?: string }>>([])
  const [selectedProperties, setSelectedProperties] = useState<Array<{ id: string; title: string; address?: string }>>([])
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [propertiesLoaded, setPropertiesLoaded] = useState(false)

  // Popover states
  const [contactOpen, setContactOpen] = useState(false)
  const [propertyOpen, setPropertyOpen] = useState(false)

  // Poll for AI labeling completion
  // This query only runs when AI labeling is in progress
  const { data: polledDocument } = trpc.documents.getById.useQuery(
    { id: document.id },
    {
      enabled: isAILabelingInProgress,
      refetchInterval: 3000, // Poll every 3 seconds
    }
  )

  // Watch for AI labeling completion
  useEffect(() => {
    if (!isAILabelingInProgress || !polledDocument) return

    // Check if AI processing completed
    if (polledDocument.aiProcessedAt) {
      setIsAILabelingInProgress(false)
      setAiLabelingStartTime(null)
      toast.success("AI labeling completed!")

      // Directly update the cache with the polled document
      utils.documents.getById.setData({ id: polledDocument.id }, polledDocument)

      // Invalidate lists to show updated data
      utils.documents.search.invalidate()
      utils.documents.listByEntity.invalidate()
    }

    // Timeout after 2 minutes
    if (aiLabelingStartTime && Date.now() - aiLabelingStartTime > 120000) {
      setIsAILabelingInProgress(false)
      setAiLabelingStartTime(null)
      toast.warning("AI labeling is taking longer than expected. Check back in a few minutes.")
    }
  }, [polledDocument, isAILabelingInProgress, aiLabelingStartTime, utils])

  // Sync local state when document prop changes
  useEffect(() => {
    setDisplayName(document.displayName || document.filename)
    setDocumentType(document.documentType)
    setDocumentDate(document.documentDate)
    setDueDate(document.dueDate)
    setTags((document.tags || []).join(", "))
    setDescription(document.description || "")

    // Reset contacts/properties loaded state to trigger refetch if needed
    setContactsLoaded(false)
    setPropertiesLoaded(false)
  }, [document])

  // Update local state when AI processing completes (polledDocument)
  useEffect(() => {
    if (polledDocument && polledDocument.aiProcessedAt) {
      // Only update if the values were empty or default, or if we want to overwrite?
      // For now, let's overwrite if the user hasn't modified them yet (hard to track)
      // Or just update the fields that AI usually fills
      if (polledDocument.documentType) setDocumentType(polledDocument.documentType)
      if (polledDocument.tags) setTags((polledDocument.tags || []).join(", "))
      if (polledDocument.description && !description) setDescription(polledDocument.description)
      if (polledDocument.documentDate && !documentDate) setDocumentDate(polledDocument.documentDate)

      // Also update the AI metadata display if we had it
    }
  }, [polledDocument])

  // Fetch contact details for relatedContactIds (efficient batch fetch)
  const { data: relatedContacts } = trpc.contacts.getByIds.useQuery(
    { ids: document.relatedContactIds },
    {
      enabled: !contactsLoaded && document.relatedContactIds.length > 0,
      staleTime: 1000 * 60, // Cache for 1 minute
    }
  )

  // Fetch property details for relatedPropertyIds (efficient batch fetch)
  const { data: relatedProperties } = trpc.properties.getByIds.useQuery(
    { ids: document.relatedPropertyIds },
    {
      enabled: !propertiesLoaded && document.relatedPropertyIds.length > 0,
      staleTime: 1000 * 60, // Cache for 1 minute
    }
  )

  // Initialize selectedContacts from document.relatedContactIds
  useEffect(() => {
    if (relatedContacts && document.relatedContactIds.length > 0 && !contactsLoaded) {
      const mappedContacts = relatedContacts.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
      }))
      setSelectedContacts(mappedContacts)
      setContactsLoaded(true)
    } else if (document.relatedContactIds.length === 0 && !contactsLoaded) {
      setSelectedContacts([])
      setContactsLoaded(true)
    }
  }, [relatedContacts, document.relatedContactIds, contactsLoaded])

  // Initialize selectedProperties from document.relatedPropertyIds
  useEffect(() => {
    if (relatedProperties && document.relatedPropertyIds.length > 0 && !propertiesLoaded) {
      const mappedProperties = relatedProperties.map(p => ({
        id: p.id,
        title: p.title,
        address: p.address,
      }))
      setSelectedProperties(mappedProperties)
      setPropertiesLoaded(true)
    } else if (document.relatedPropertyIds.length === 0 && !propertiesLoaded) {
      setSelectedProperties([])
      setPropertiesLoaded(true)
    }
  }, [relatedProperties, document.relatedPropertyIds, propertiesLoaded])

  // Update mutation
  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: async (updated) => {
      toast.success("Document updated successfully")

      // Directly update the cache with server response
      utils.documents.getById.setData({ id: updated.id }, updated)

      // Also invalidate lists to ensure they refresh
      await utils.documents.search.invalidate()
      await utils.documents.listByEntity.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update document")
    },
  })

  // Delete mutation
  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully")

      // Use specific instance invalidation
      invalidateDocumentQueries(utils, {
        documentId: document.id,
        entityType: document.entityType as any,
        entityId: document.entityId
      })

      onClose()
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete document")
    },
  })

  // Label with AI mutation
  const labelWithAIMutation = trpc.documents.labelWithAI.useMutation({
    onSuccess: async (result) => {
      if (result.success) {
        // Dismiss the "Queueing..." toast and show success
        toast.success("AI labeling queued! Processing in background...")

        // Force immediate refetch to get the queued status
        await utils.documents.getById.refetch({ id: document.id })

        // Polling state already set in handleLabelWithAI
      } else {
        toast.warning(result.message)
        setIsAILabelingInProgress(false)
        setAiLabelingStartTime(null)
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to trigger AI labeling")
      setIsAILabelingInProgress(false)
      setAiLabelingStartTime(null)
    },
  })

  // Handle label with AI
  const handleLabelWithAI = () => {
    // Show immediate visual feedback BEFORE the network request
    setIsAILabelingInProgress(true)
    setAiLabelingStartTime(Date.now())
    toast.info("Queueing AI labeling job...")

    labelWithAIMutation.mutate({ id: document.id })
  }

  // Contact search query
  const { data: contactResults, isLoading: isLoadingContacts, error: contactError } = trpc.contacts.search.useQuery(
    { query: contactSearch, limit: 10 },
    { enabled: contactSearch.length > 0 }
  )

  // Property search query
  const { data: propertyResults, isLoading: isLoadingProperties, error: propertyError } = trpc.properties.search.useQuery(
    { query: propertySearch, limit: 10 },
    { enabled: propertySearch.length > 0 }
  )

  // Debug logging
  useEffect(() => {
    if (contactResults) {
      console.log('📞 Contact search results for "' + contactSearch + '":', contactResults)
    }
    if (contactError) {
      console.error('❌ Contact search error:', contactError)
    }
  }, [contactResults, contactError, contactSearch])

  useEffect(() => {
    if (propertyResults) {
      console.log('🏠 Property search results for "' + propertySearch + '":', propertyResults)
    }
    if (propertyError) {
      console.error('❌ Property search error:', propertyError)
    }
  }, [propertyResults, propertyError, propertySearch])

  // Handle save metadata
  const handleSaveMetadata = () => {
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    updateMutation.mutate({
      id: document.id,
      displayName: displayName.trim() || document.filename, // Save displayName or fall back to filename
      documentType: documentType || "otro", // Default to "otro" if empty
      documentDate: documentDate,
      dueDate: dueDate,
      tags: tagsArray,
      description: description || undefined,
      relatedContactIds: selectedContacts.map((c) => c.id),
      relatedPropertyIds: selectedProperties.map((p) => p.id),
    })
  }

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
    if (!confirm(`Are you sure you want to delete "${document.filename}"? This action cannot be undone.`)) {
      return
    }
    deleteMutation.mutate({ id: document.id })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{document.displayName || document.filename}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{document.fileType}</span>
              <span>•</span>
              <span>{formatFileSize(document.fileSize)}</span>
              {document.documentType && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    {document.documentType}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Label with AI button - only show if OCR is completed */}
            {document.ocrStatus === "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLabelWithAI}
                disabled={labelWithAIMutation.isPending || isAILabelingInProgress || deleteMutation.isPending}
                className="gap-2"
              >
                {labelWithAIMutation.isPending || isAILabelingInProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isAILabelingInProgress ? "Processing..." : "Label with AI"}
                </span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={deleteMutation.isPending}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={deleteMutation.isPending}>
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
            <TabsTrigger value="details" className="gap-2">
              <Edit className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="ocr" className="gap-2">
              <FileText className="h-4 w-4" />
              OCR Text
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Brain className="h-4 w-4" />
              AI Analysis
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

          {/* Details Tab */}
          <TabsContent value="details" className="p-4 m-0">
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-6">
                {/* Document Display Name - Editable */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nombre del Documento</Label>
                  <Input
                    id="displayName"
                    placeholder="Nombre friendly para este documento"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este nombre se mostrará en lugar del nombre de archivo original
                    {document.filename !== document.displayName && (
                      <span className="block mt-1">Archivo original: {document.filename}</span>
                    )}
                  </p>
                </div>

                {/* Document Type - Comprehensive Spanish Types */}
                <div className="space-y-2">
                  <Label htmlFor="documentType">Tipo de Documento</Label>
                  <Select
                    value={documentType || "none"}
                    onValueChange={(val) => setDocumentType(val === "none" ? undefined : (val as DocumentType))}
                  >
                    <SelectTrigger id="documentType">
                      <SelectValue placeholder="Selecciona tipo de documento" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      <SelectItem value="none">Sin tipo</SelectItem>
                      {Object.entries(DOCUMENT_TYPES_BY_CATEGORY).map(([category, types]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {category}
                          </div>
                          {types.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  {document.aiMetadata?.documentType && (
                    <p className="text-xs text-muted-foreground">
                      💡 AI sugiere: {document.aiMetadata.documentType}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Document Date */}
                  <div className="space-y-2">
                    <Label>Fecha del Documento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !documentDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {documentDate ? format(documentDate, "PPP") : "Selecciona fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={documentDate}
                          onSelect={setDocumentDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Fecha de creación o firma
                    </p>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <Label>Fecha de Vencimiento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "Selecciona fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Fecha de expiración o vencimiento
                    </p>
                  </div>
                </div>

                {/* Contact Fuzzy Search */}
                <div className="space-y-2">
                  <Label>Contactos Relacionados</Label>
                  <Popover open={contactOpen} onOpenChange={setContactOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={contactOpen}
                        className="w-full justify-between"
                      >
                        {selectedContacts.length > 0
                          ? `${selectedContacts.length} contacto(s) seleccionado(s)`
                          : "Buscar contacto..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar contacto..."
                          value={contactSearch}
                          onValueChange={setContactSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingContacts ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Buscando...
                              </div>
                            ) : contactError ? (
                              <div className="text-destructive py-6">
                                Error: {contactError.message}
                              </div>
                            ) : contactSearch.length > 0 ? (
                              "No se encontraron contactos."
                            ) : (
                              "Escribe para buscar contactos"
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {contactResults?.map((contact: any) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.id}
                                onSelect={() => {
                                  const isSelected = selectedContacts.some((c) => c.id === contact.id)
                                  if (isSelected) {
                                    setSelectedContacts((prev) => prev.filter((c) => c.id !== contact.id))
                                  } else {
                                    setSelectedContacts((prev) => [...prev, {
                                      id: contact.id,
                                      firstName: contact.firstName,
                                      lastName: contact.lastName,
                                      email: contact.email,
                                    }])
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedContacts.some((c) => c.id === contact.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {contact.firstName} {contact.lastName}
                                {contact.email && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {contact.email}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedContacts && selectedContacts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedContacts.map((contact) => (
                        <Badge key={contact.id} variant="secondary">
                          {contact.firstName} {contact.lastName}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() =>
                              setSelectedContacts((prev) =>
                                prev.filter((c) => c.id !== contact.id)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Personas mencionadas o relacionadas con este documento
                  </p>
                </div>

                {/* Property Fuzzy Search */}
                <div className="space-y-2">
                  <Label>Propiedades Relacionadas</Label>
                  <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={propertyOpen}
                        className="w-full justify-between"
                      >
                        {selectedProperties.length > 0
                          ? `${selectedProperties.length} propiedad(es) seleccionada(s)`
                          : "Buscar propiedad..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar propiedad..."
                          value={propertySearch}
                          onValueChange={setPropertySearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingProperties ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Buscando...
                              </div>
                            ) : propertyError ? (
                              <div className="text-destructive py-6">
                                Error: {propertyError.message}
                              </div>
                            ) : propertySearch.length > 0 ? (
                              "No se encontraron propiedades."
                            ) : (
                              "Escribe para buscar propiedades"
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {propertyResults?.map((property: any) => (
                              <CommandItem
                                key={property.id}
                                value={property.id}
                                onSelect={() => {
                                  const isSelected = selectedProperties.some((p) => p.id === property.id)
                                  if (isSelected) {
                                    setSelectedProperties((prev) => prev.filter((p) => p.id !== property.id))
                                  } else {
                                    setSelectedProperties((prev) => [...prev, {
                                      id: property.id,
                                      title: property.title,
                                      address: property.address,
                                    }])
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProperties.some((p) => p.id === property.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {property.title}
                                {property.address && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {property.address}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedProperties && selectedProperties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProperties.map((property) => (
                        <Badge key={property.id} variant="secondary">
                          {property.title}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() =>
                              setSelectedProperties((prev) =>
                                prev.filter((p) => p.id !== property.id)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Inmuebles mencionados o relacionados con este documento
                  </p>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Etiquetas</Label>
                  <Input
                    id="tags"
                    placeholder="Etiquetas separadas por comas (ej: urgente, firmado, revisado)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separa múltiples etiquetas con comas
                  </p>
                </div>

                {/* Description - Editable */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción del documento"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Añade notas o descripción para este documento
                  </p>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveMetadata}
                  disabled={updateMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>Guardar Detalles</>
                  )}
                </Button>
              </div>
            </div>
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
