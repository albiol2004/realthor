'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { Check, ChevronsUpDown, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyRole } from '@/types/crm'

interface LinkPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
}

const linkPropertySchema = z.object({
  propertyId: z.string().uuid('Please select a property'),
  role: z.enum(['owner', 'buyer', 'seller', 'tenant']),
})

type LinkPropertyInput = z.infer<typeof linkPropertySchema>

/**
 * Link Property Dialog Component
 * Dialog to link a property to a contact with a specific role
 */
export function LinkPropertyDialog({ open, onOpenChange, contactId }: LinkPropertyDialogProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const utils = trpc.useUtils()

  const form = useForm<LinkPropertyInput>({
    resolver: zodResolver(linkPropertySchema),
    defaultValues: {
      propertyId: '',
      role: 'buyer',
    },
  })

  // Search properties
  const { data: searchResults = [] } = trpc.properties.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  )

  // Link mutation
  const linkMutation = trpc.contacts.linkToProperty.useMutation({
    onSuccess: () => {
      toast({
        title: 'Property linked',
        description: 'The property has been successfully linked to this contact.',
      })
      utils.contacts.getProperties.invalidate({ contactId })
      form.reset()
      onOpenChange(false)
    },
    onError: (error) => {
      toast({
        title: 'Error linking property',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: LinkPropertyInput) => {
    await linkMutation.mutateAsync({
      contactId,
      propertyId: data.propertyId,
      role: data.role as PropertyRole,
    })
  }

  const selectedProperty = searchResults.find((p: any) => p.id === form.watch('propertyId'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Property to Contact</DialogTitle>
          <DialogDescription>
            Select a property and assign the contact's role for this property.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Property Search/Select */}
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Property *</FormLabel>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {selectedProperty ? selectedProperty.title : 'Search for a property...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search properties by title, address..."
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {searchQuery.length === 0
                              ? 'Start typing to search properties...'
                              : 'No properties found.'}
                          </CommandEmpty>
                          {searchResults.length > 0 && (
                            <CommandGroup>
                              {searchResults.map((property: any) => (
                                <CommandItem
                                  key={property.id}
                                  value={property.id}
                                  onSelect={() => {
                                    field.onChange(property.id)
                                    setComboboxOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      property.id === field.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex gap-3 flex-1">
                                    {/* Property Image */}
                                    <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
                                      {property.images?.[0] ? (
                                        <img
                                          src={property.images[0]}
                                          alt={property.title}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Home className="h-5 w-5 text-gray-400" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Property Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{property.title}</div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {property.address || 'No address'}
                                        {property.city && `, ${property.city}`}
                                      </div>
                                      {property.price && (
                                        <div className="text-xs font-semibold text-black dark:text-white mt-0.5">
                                          ${property.price.toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Selection */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={linkMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={linkMutation.isPending}
                className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                {linkMutation.isPending ? 'Linking...' : 'Link Property'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
