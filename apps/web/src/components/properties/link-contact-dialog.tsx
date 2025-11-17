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
import { Input } from '@/components/ui/input'
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
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyRole } from '@/types/crm'

interface LinkContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
}

const linkContactSchema = z.object({
  contactId: z.string().uuid('Please select a contact'),
  role: z.enum(['owner', 'buyer', 'seller', 'tenant']),
})

type LinkContactInput = z.infer<typeof linkContactSchema>

/**
 * Link Contact Dialog Component
 * Dialog to link a contact to a property with a specific role
 */
export function LinkContactDialog({ open, onOpenChange, propertyId }: LinkContactDialogProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const utils = trpc.useUtils()

  const form = useForm<LinkContactInput>({
    resolver: zodResolver(linkContactSchema),
    defaultValues: {
      contactId: '',
      role: 'buyer',
    },
  })

  // Search contacts
  const { data: searchResults = [] } = trpc.contacts.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  )

  // Link mutation
  const linkMutation = trpc.properties.linkToContact.useMutation({
    onSuccess: () => {
      toast({
        title: 'Contact linked',
        description: 'The contact has been successfully linked to this property.',
      })
      utils.properties.getContacts.invalidate({ propertyId })
      form.reset()
      onOpenChange(false)
    },
    onError: (error) => {
      toast({
        title: 'Error linking contact',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: LinkContactInput) => {
    await linkMutation.mutateAsync({
      propertyId,
      contactId: data.contactId,
      role: data.role as PropertyRole,
    })
  }

  const selectedContact = searchResults.find((c: any) => c.id === form.watch('contactId'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Contact to Property</DialogTitle>
          <DialogDescription>
            Select a contact and assign their role for this property.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Contact Search/Select */}
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contact *</FormLabel>
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
                          {selectedContact
                            ? `${selectedContact.firstName} ${selectedContact.lastName}`
                            : 'Search for a contact...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search contacts by name, email, or phone..."
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {searchQuery.length === 0
                              ? 'Start typing to search contacts...'
                              : 'No contacts found.'}
                          </CommandEmpty>
                          {searchResults.length > 0 && (
                            <CommandGroup>
                              {searchResults.map((contact: any) => (
                                <CommandItem
                                  key={contact.id}
                                  value={contact.id}
                                  onSelect={() => {
                                    field.onChange(contact.id)
                                    setComboboxOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      contact.id === field.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {contact.firstName} {contact.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {contact.email || contact.phone || 'No contact info'}
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
                {linkMutation.isPending ? 'Linking...' : 'Link Contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
