"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import type { Deal, DealStage, DealType } from "@/types/crm"
import { getDealTypeLabel, getDealTypeColor, getDealStageLabel, getDealStageColor, formatDealValue } from "@/types/crm"
import { X, Save, Trash2, FileCheck, User, MapPin, Calendar, Loader2, TrendingUp, Plus, Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { invalidateDealQueries } from "@/lib/trpc/cache-invalidation"

interface DealDetailProps {
  deal: Deal
  onClose: () => void
  onUpdate: (deal: Deal) => void
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

export function DealDetail({ deal, onClose, onUpdate }: DealDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(deal.title)
  const [dealType, setDealType] = useState(deal.dealType)
  const [value, setValue] = useState(deal.value?.toString() || '')
  const [stage, setStage] = useState(deal.stage)
  const [probability, setProbability] = useState(deal.probability?.toString() || '')
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : ''
  )
  const [notes, setNotes] = useState(deal.notes || '')

  // Search state for adding contacts/properties
  const [contactSearch, setContactSearch] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const [propertyOpen, setPropertyOpen] = useState(false)

  const utils = trpc.useUtils()

  // Fetch related contact IDs
  const { data: contactIds } = trpc.deals.getRelatedContactIds.useQuery(
    { dealId: deal.id }
  )

  // Fetch related property IDs
  const { data: propertyIds } = trpc.deals.getRelatedPropertyIds.useQuery(
    { dealId: deal.id }
  )

  // Fetch all contacts for this deal
  const { data: allContactsData } = trpc.contacts.list.useQuery(
    { limit: 100 },
    { enabled: (contactIds?.length ?? 0) > 0 }
  )
  const allContacts = allContactsData?.contacts?.filter(c => contactIds?.includes(c.id)) || []

  // Fetch all properties for this deal
  const { data: allPropertiesData } = trpc.properties.list.useQuery(
    { limit: 100 },
    { enabled: (propertyIds?.length ?? 0) > 0 }
  )
  const allProperties = allPropertiesData?.properties?.filter((p: any) => propertyIds?.includes(p.id)) || []

  // Search for contacts to add
  const { data: contactResults, isLoading: isLoadingContacts } = trpc.contacts.search.useQuery(
    { query: contactSearch, limit: 10 },
    { enabled: contactSearch.length > 0 }
  )

  // Search for properties to add
  const { data: propertyResults, isLoading: isLoadingProperties } = trpc.properties.search.useQuery(
    { query: propertySearch, limit: 10 },
    { enabled: propertySearch.length > 0 }
  )

  // Fetch compliance data
  const { data: compliance, isLoading: complianceLoading } = trpc.deals.getCompliance.useQuery(
    { dealId: deal.id }
  )

  // Update mutation
  const updateMutation = trpc.deals.update.useMutation({
    onSuccess: (updated) => {
      toast.success('Deal updated successfully')
      invalidateDealQueries(utils)
      onUpdate(updated)
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Error updating deal')
    },
  })

  // Delete mutation
  const deleteMutation = trpc.deals.delete.useMutation({
    onSuccess: () => {
      toast.success('Deal deleted')
      invalidateDealQueries(utils)
      onClose()
    },
    onError: (error) => {
      toast.error(error.message || 'Error deleting deal')
    },
  })

  // Add contact mutation
  const addContactMutation = trpc.deals.addContact.useMutation({
    onSuccess: () => {
      toast.success('Contact added to deal')
      invalidateDealQueries(utils)
      setContactSearch('')
      setContactOpen(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Error adding contact')
    },
  })

  // Remove contact mutation
  const removeContactMutation = trpc.deals.removeContact.useMutation({
    onSuccess: () => {
      toast.success('Contact removed from deal')
      invalidateDealQueries(utils)
    },
    onError: (error) => {
      toast.error(error.message || 'Error removing contact')
    },
  })

  // Add property mutation
  const addPropertyMutation = trpc.deals.addProperty.useMutation({
    onSuccess: () => {
      toast.success('Property added to deal')
      invalidateDealQueries(utils)
      setPropertySearch('')
      setPropertyOpen(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Error adding property')
    },
  })

  // Remove property mutation
  const removePropertyMutation = trpc.deals.removeProperty.useMutation({
    onSuccess: () => {
      toast.success('Property removed from deal')
      invalidateDealQueries(utils)
    },
    onError: (error) => {
      toast.error(error.message || 'Error removing property')
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      id: deal.id,
      title: title.trim(),
      dealType,
      value: value ? parseFloat(value) : undefined,
      stage,
      probability: probability ? parseInt(probability) : undefined,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      notes: notes.trim() || undefined,
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this deal?')) {
      deleteMutation.mutate({ id: deal.id })
    }
  }

  const handleCancel = () => {
    setTitle(deal.title)
    setDealType(deal.dealType)
    setValue(deal.value?.toString() || '')
    setStage(deal.stage)
    setProbability(deal.probability?.toString() || '')
    setExpectedCloseDate(
      deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : ''
    )
    setNotes(deal.notes || '')
    setIsEditing(false)
  }

  const handleAddContact = (contactId: string) => {
    addContactMutation.mutate({
      dealId: deal.id,
      contactId,
    })
  }

  const handleRemoveContact = (contactId: string) => {
    if (contactIds && contactIds.length <= 1) {
      toast.error('Cannot remove the last contact from a deal')
      return
    }
    if (confirm('Remove this contact from the deal?')) {
      removeContactMutation.mutate({
        dealId: deal.id,
        contactId,
      })
    }
  }

  const handleAddProperty = (propertyId: string) => {
    addPropertyMutation.mutate({
      dealId: deal.id,
      propertyId,
    })
  }

  const handleRemoveProperty = (propertyId: string) => {
    if (confirm('Remove this property from the deal?')) {
      removePropertyMutation.mutate({
        dealId: deal.id,
        propertyId,
      })
    }
  }

  const complianceColor =
    !compliance ? 'text-gray-500' :
    compliance.score >= 80 ? 'text-green-600' :
    compliance.score >= 50 ? 'text-yellow-600' :
    'text-red-600'

  const complianceBg =
    !compliance ? 'bg-gray-600' :
    compliance.score >= 80 ? 'bg-green-600' :
    compliance.score >= 50 ? 'bg-yellow-600' :
    'bg-red-600'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold mb-2"
              placeholder="Deal title"
            />
          ) : (
            <h2 className="text-lg font-semibold mb-2 truncate">{deal.title}</h2>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-xs font-medium', getDealTypeColor(deal.dealType))}>
              {getDealTypeLabel(deal.dealType)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getDealStageLabel(deal.stage)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
              Edit
            </Button>
          )}
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Compliance Score */}
          {compliance && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn("text-3xl font-bold", complianceColor)}>
                    {compliance.score}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {compliance.dealTypeLabel}
                  </span>
                </div>
                <Progress value={compliance.score} className={complianceBg} />

                <div className="grid grid-cols-3 gap-3 text-sm pt-2">
                  <div>
                    <div className="text-muted-foreground">Critical</div>
                    <div className="font-semibold">
                      {compliance.critical.completed}/{compliance.critical.total}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Recommended</div>
                    <div className="font-semibold">
                      {compliance.legallyRecommended.completed}/{compliance.legallyRecommended.total}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Advised</div>
                    <div className="font-semibold">
                      {compliance.advised.completed}/{compliance.advised.total}
                    </div>
                  </div>
                </div>

                {compliance.missingCritical.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium text-red-600 mb-1">
                      Missing Critical Documents:
                    </div>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                      {compliance.missingCritical.map((doc, i) => (
                        <li key={i}>{doc.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Related Contacts
                  {allContacts.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {allContacts.length}
                    </Badge>
                  )}
                </CardTitle>
                <Popover open={contactOpen} onOpenChange={setContactOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Contact
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
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
                          {contactResults?.filter(c => !contactIds?.includes(c.id)).map((contact: any) => (
                            <CommandItem
                              key={contact.id}
                              value={contact.id}
                              onSelect={() => handleAddContact(contact.id)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
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
              </div>
            </CardHeader>
            <CardContent>
              {allContacts.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No contacts linked to this deal
                </div>
              ) : (
                <div className="space-y-2">
                  {allContacts.map((contact, index) => (
                    <div key={contact.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {contact.firstName} {contact.lastName}
                            {index === 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                            )}
                          </div>
                          {contact.email && (
                            <div className="text-xs text-muted-foreground">{contact.email}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveContact(contact.id)}
                        disabled={removeContactMutation.isPending}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Properties */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Related Properties
                  {allProperties.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {allProperties.length}
                    </Badge>
                  )}
                </CardTitle>
                <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Property
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
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
                          {propertyResults?.filter((p: any) => !propertyIds?.includes(p.id)).map((property: any) => (
                            <CommandItem
                              key={property.id}
                              value={property.id}
                              onSelect={() => handleAddProperty(property.id)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
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
              </div>
            </CardHeader>
            <CardContent>
              {allProperties.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No properties linked to this deal
                </div>
              ) : (
                <div className="space-y-2">
                  {allProperties.map((property: any, index) => (
                    <div key={property.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {property.title || property.address}
                            {index === 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                            )}
                          </div>
                          {property.address && property.title && (
                            <div className="text-xs text-muted-foreground">{property.address}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProperty(property.id)}
                        disabled={removePropertyMutation.isPending}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deal Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deal Type */}
              <div>
                <Label>Deal Type</Label>
                {isEditing ? (
                  <Select value={dealType} onValueChange={(val) => setDealType(val as DealType)}>
                    <SelectTrigger>
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
                ) : (
                  <div className="text-sm mt-1">{getDealTypeLabel(deal.dealType)}</div>
                )}
              </div>

              {/* Stage */}
              <div>
                <Label>Stage</Label>
                {isEditing ? (
                  <Select value={stage} onValueChange={(val) => setStage(val as DealStage)}>
                    <SelectTrigger>
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
                ) : (
                  <div className="text-sm mt-1">{getDealStageLabel(deal.stage)}</div>
                )}
              </div>

              {/* Value */}
              <div>
                <Label>Value (€)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="250000"
                  />
                ) : (
                  <div className="text-sm mt-1">
                    {deal.value ? formatDealValue(deal.value) : 'Not specified'}
                  </div>
                )}
              </div>

              {/* Probability */}
              <div>
                <Label>Probability (%)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    placeholder="75"
                  />
                ) : (
                  <div className="text-sm mt-1">
                    {deal.probability !== undefined ? `${deal.probability}%` : 'Not specified'}
                  </div>
                )}
              </div>

              {/* Expected Close Date */}
              <div>
                <Label>Expected Close Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={expectedCloseDate}
                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                  />
                ) : (
                  <div className="text-sm mt-1">
                    {deal.expectedCloseDate
                      ? new Date(deal.expectedCloseDate).toLocaleDateString('es-ES')
                      : 'Not specified'}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                {isEditing ? (
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this deal..."
                    rows={4}
                  />
                ) : (
                  <div className="text-sm mt-1 whitespace-pre-wrap">
                    {deal.notes || 'No notes'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={deleteMutation.isPending}
                className="w-full"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Deal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
