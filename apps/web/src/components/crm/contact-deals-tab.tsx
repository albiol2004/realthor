'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Briefcase, Plus, Trash2, Loader2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import type { Deal, DealStage } from '@/types/crm'

interface ContactDealsTabProps {
  contactId: string
}

const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-500' },
  { value: 'qualification', label: 'Qualification', color: 'bg-blue-500' },
  { value: 'meeting', label: 'Meeting', color: 'bg-indigo-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'under_contract', label: 'Under Contract', color: 'bg-yellow-500' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
]

function formatCurrency(value?: number): string {
  if (!value) return 'No valor'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getStageColor(stage: DealStage): string {
  return DEAL_STAGES.find((s) => s.value === stage)?.color || 'bg-gray-500'
}

function getStageLabel(stage: DealStage): string {
  return DEAL_STAGES.find((s) => s.value === stage)?.label || stage
}

/**
 * Contact Deals Tab Component
 * Shows all deals linked to this contact with create functionality
 */
export function ContactDealsTab({ contactId }: ContactDealsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState<DealStage>('lead')
  const [probability, setProbability] = useState('')
  const [notes, setNotes] = useState('')

  const utils = trpc.useUtils()

  // Fetch deals for this contact
  const { data: deals, isLoading } = trpc.deals.list.useQuery({
    contactId,
  })

  // Create mutation
  const createMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      toast.success('Deal creado exitosamente')
      utils.deals.list.invalidate()
      handleCloseCreate()
    },
    onError: (error) => {
      toast.error(error.message || 'Error al crear deal')
    },
  })

  // Delete mutation
  const deleteMutation = trpc.deals.delete.useMutation({
    onSuccess: () => {
      toast.success('Deal eliminado')
      utils.deals.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Error al eliminar deal')
    },
  })

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('El título es requerido')
      return
    }

    createMutation.mutate({
      contactId,
      title: title.trim(),
      value: value ? parseFloat(value) : undefined,
      stage,
      probability: probability ? parseInt(probability) : undefined,
      notes: notes.trim() || undefined,
    })
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    setTitle('')
    setValue('')
    setStage('lead')
    setProbability('')
    setNotes('')
  }

  const handleDelete = (dealId: string) => {
    if (!confirm('¿Eliminar este deal?')) return
    deleteMutation.mutate({ id: dealId })
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black dark:text-white">Deals</h3>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Deal
          </Button>
        </div>

        {/* Deals List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-500">Cargando deals...</p>
            </div>
          ) : deals && deals.length > 0 ? (
            <div className="p-4 space-y-3">
              {deals.map((deal) => (
                <Card
                  key={deal.id}
                  className="p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
                  onClick={() => setSelectedDeal(deal)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-black dark:text-white truncate">
                          {deal.title}
                        </h4>
                        <Badge className={`${getStageColor(deal.stage)} text-white text-xs`}>
                          {getStageLabel(deal.stage)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{formatCurrency(deal.value)}</span>
                        </div>

                        {deal.probability !== undefined && deal.probability !== null && (
                          <span>{deal.probability}% prob.</span>
                        )}

                        {deal.expectedCloseDate && (
                          <span>
                            Cierre: {new Date(deal.expectedCloseDate).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>

                      {deal.notes && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500 line-clamp-2">
                          {deal.notes}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(deal.id)
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No hay deals aún</p>
                <p className="text-sm mt-1">Crea un deal para este contacto</p>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  size="sm"
                  className="mt-4 gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Crear Primer Deal
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {deals && deals.length > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-500 text-center">
            {deals.length} deal{deals.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Create Deal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Deal</DialogTitle>
            <DialogDescription>
              Crea un nuevo deal para este contacto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="ej: Venta apartamento Madrid"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Value */}
            <div>
              <Label htmlFor="value">Valor (€)</Label>
              <Input
                id="value"
                type="number"
                placeholder="250000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            {/* Stage */}
            <div>
              <Label htmlFor="stage">Etapa</Label>
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

            {/* Probability */}
            <div>
              <Label htmlFor="probability">Probabilidad (%)</Label>
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

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre este deal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseCreate}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Deal'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
