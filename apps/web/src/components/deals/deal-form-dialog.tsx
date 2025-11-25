"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { DealStage, DealType } from "@/types/crm"
import { Loader2, ChevronsUpDown, Check, X } from "lucide-react"
import { toast } from "sonner"
import { invalidateDealQueries } from "@/lib/trpc/cache-invalidation"
import { cn } from "@/lib/utils"

interface DealFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultContactId?: string
  defaultPropertyId?: string
}

const DEAL_STAGES: { value: DealStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'showing', label: 'Showing' },
  { value: 'offer', label: 'Offer' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
]

const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: 'residential_resale', label: 'Residential Resale (Second Hand)' },
  { value: 'new_development', label: 'New Development' },
  { value: 'residential_rental', label: 'Residential Rental (LAU)' },
  { value: 'commercial', label: 'Commercial & Retail' },
  { value: 'rural_land', label: 'Rural & Land' },
]

export function DealFormDialog({ open, onOpenChange, defaultContactId, defaultPropertyId }: DealFormDialogProps) {
  const [selectedContacts, setSelectedContacts] = useState<Array<{ id: string; firstName: string; lastName: string; email?: string }>>([])
  const [selectedProperties, setSelectedProperties] = useState<Array<{ id: string; title: string; address?: string }>>([])
  const [title, setTitle] = useState('')
  const [dealType, setDealType] = useState<DealType>('residential_resale')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState<DealStage>('lead')
  const [probability, setProbability] = useState('')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [notes, setNotes] = useState('')

  // Search state
  const [contactSearch, setContactSearch] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const [propertyOpen, setPropertyOpen] = useState(false)

  const utils = trpc.useUtils()

  // Search contacts
  const { data: contactResults, isLoading: isLoadingContacts } = trpc.contacts.search.useQuery(
    { query: contactSearch, limit: 10 },
    { enabled: contactSearch.length > 0 }
  )

  // Search properties
  const { data: propertyResults, isLoading: isLoadingProperties } = trpc.properties.search.useQuery(
    { query: propertySearch, limit: 10 },
    { enabled: propertySearch.length > 0 }
  )

  // Create mutation
  const createMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      toast.success('Deal created successfully')
      invalidateDealQueries(utils)
      handleClose()
    },
    onError: (error) => {
      toast.error(error.message || 'Error creating deal')
    },
  })

  // Fetch default contact if provided
  const { data: defaultContact } = trpc.contacts.getById.useQuery(
    { id: defaultContactId! },
    { enabled: !!defaultContactId && selectedContacts.length === 0 }
  )

  // Fetch default property if provided
  const { data: defaultProperty } = trpc.properties.getById.useQuery(
    { id: defaultPropertyId! },
    { enabled: !!defaultPropertyId && selectedProperties.length === 0 }
  )

  useEffect(() => {
    if (defaultContact && selectedContacts.length === 0) {
      setSelectedContacts([{
        id: defaultContact.id,
        firstName: defaultContact.firstName,
        lastName: defaultContact.lastName,
        email: defaultContact.email,
      }])
    }
  }, [defaultContact])

  useEffect(() => {
    if (defaultProperty && selectedProperties.length === 0) {
      setSelectedProperties([{
        id: defaultProperty.id,
        title: defaultProperty.title || '',
        address: defaultProperty.address,
      }])
    }
  }, [defaultProperty])

  const handleClose = () => {
    setSelectedContacts([])
    setSelectedProperties([])
    setTitle('')
    setDealType('residential_resale')
    setValue('')
    setStage('lead')
    setProbability('')
    setExpectedCloseDate('')
    setNotes('')
    setContactSearch('')
    setPropertySearch('')
    onOpenChange(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    if (selectedContacts.length === 0) {
      toast.error('At least one contact is required')
      return
    }

    createMutation.mutate({
      contactIds: selectedContacts.map(c => c.id),
      propertyIds: selectedProperties.length > 0 ? selectedProperties.map(p => p.id) : undefined,
      title: title.trim(),
      dealType,
      value: value ? parseFloat(value) : undefined,
      stage,
      probability: probability ? parseInt(probability) : undefined,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>
            Create a new deal and track it through the sales pipeline
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Apartment sale in Madrid"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Contacts - Multi-Select */}
          <div className="space-y-2">
            <Label>Contacts *</Label>
            <Popover open={contactOpen} onOpenChange={setContactOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={contactOpen}
                  className="w-full justify-between"
                >
                  {selectedContacts.length > 0
                    ? `${selectedContacts.length} contact(s) selected`
                    : "Search contacts..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onValueChange={setContactSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingContacts ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Searching...
                        </div>
                      ) : contactSearch.length > 0 ? (
                        "No contacts found."
                      ) : (
                        "Type to search contacts"
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
            {selectedContacts.length > 0 && (
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
          </div>

          {/* Properties - Multi-Select (Optional) */}
          <div className="space-y-2">
            <Label>Properties (optional)</Label>
            <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={propertyOpen}
                  className="w-full justify-between"
                >
                  {selectedProperties.length > 0
                    ? `${selectedProperties.length} property(ies) selected`
                    : "Search properties..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search properties..."
                    value={propertySearch}
                    onValueChange={setPropertySearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingProperties ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Searching...
                        </div>
                      ) : propertySearch.length > 0 ? (
                        "No properties found."
                      ) : (
                        "Type to search properties"
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
                                title: property.title || '',
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
                          {property.title || property.address}
                          {property.address && property.title && (
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
            {selectedProperties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedProperties.map((property) => (
                  <Badge key={property.id} variant="secondary">
                    {property.title || property.address}
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
          </div>

          {/* Deal Type */}
          <div>
            <Label htmlFor="dealType">Deal Type *</Label>
            <Select value={dealType} onValueChange={(val) => setDealType(val as DealType)} required>
              <SelectTrigger id="dealType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div>
            <Label htmlFor="stage">Stage</Label>
            <Select value={stage} onValueChange={(val) => setStage(val as DealStage)}>
              <SelectTrigger id="stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div>
            <Label htmlFor="value">Value (€)</Label>
            <Input
              id="value"
              type="number"
              placeholder="250000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          {/* Probability */}
          <div>
            <Label htmlFor="probability">Probability (%)</Label>
            <Input
              id="probability"
              type="number"
              min="0"
              max="100"
              placeholder="75"
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
            />
          </div>

          {/* Expected Close Date */}
          <div>
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this deal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Deal'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
