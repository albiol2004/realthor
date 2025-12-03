'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  type Contact,
  getContactInitials,
  getContactFullName,
  getContactStatusColor,
  getContactStatusLabel,
  formatContactBudget,
} from '@/types/crm'
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  DollarSign,
  Edit,
  Trash2,
  MessageSquare,
  FileText,
  Home,
  Activity,
  Briefcase,
  X,
  RefreshCw,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContactPropertiesTab } from './contact-properties-tab'
import { ContactOverviewTab } from './contact-overview-tab'
import { ContactDocumentsTab } from './contact-documents-tab'
import { ContactDealsTab } from './contact-deals-tab'
import { EmailComposer } from '@/components/messaging/email/email-composer'
import { EmailThreadList } from '@/components/messaging/email/email-thread-list'

interface ContactDetailProps {
  contact: Contact
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  isDeleting?: boolean
}

/**
 * Contact Detail Component
 * Right panel showing full contact info with tabs
 * Default tab: Overview
 */
export function ContactDetail({ contact, onEdit, onDelete, onClose, isDeleting }: ContactDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showComposer, setShowComposer] = useState(false)
  const statusColors = getContactStatusColor(contact.status)
  const budget = formatContactBudget(contact)
  const utils = trpc.useUtils()

  // Get email accounts
  const { data: emailAccounts } = trpc.emailSettings.list.useQuery()

  // Sync mutation
  const syncEmails = trpc.emailSettings.syncNow.useMutation({
    onSuccess: () => {
      toast.success('Email sync started')
      utils.messaging.getContactEmails.invalidate()
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`)
    },
  })

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        {/* Close Button */}
        <div className="flex justify-end mb-2">
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={contact.profilePictureUrl} alt={getContactFullName(contact)} />
            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-lg font-medium">
              {getContactInitials(contact)}
            </AvatarFallback>
          </Avatar>

          {/* Name & Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {getContactFullName(contact)}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  statusColors.bg,
                  statusColors.text,
                  statusColors.border
                )}
              >
                {getContactStatusLabel(contact.status)}
              </Badge>
            </div>
            {contact.jobTitle && contact.company && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {contact.jobTitle} at {contact.company}
              </p>
            )}
            {contact.company && !contact.jobTitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{contact.company}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={onEdit}
              size="sm"
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={onDelete}
              size="sm"
              variant="outline"
              disabled={isDeleting}
              className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {contact.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b border-gray-200 dark:border-gray-800 rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger value="overview" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="info" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <FileText className="h-4 w-4 mr-2" />
            Contact Info
          </TabsTrigger>
          <TabsTrigger value="properties" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <Home className="h-4 w-4 mr-2" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="deals" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <Briefcase className="h-4 w-4 mr-2" />
            Deals
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab (Default) */}
        <TabsContent value="overview" className="flex-1 m-0">
          <ContactOverviewTab contact={contact} onTabChange={setActiveTab} />
        </TabsContent>

        {/* Contact Info Tab */}
        <TabsContent value="info" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Contact Details */}
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                  Contact Details
                </h3>
                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Email</p>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm text-black dark:text-white hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Phone</p>
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-sm text-black dark:text-white hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Company</p>
                        <p className="text-sm text-black dark:text-white">{contact.company}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {(contact.addressStreet || contact.addressCity || contact.addressState) && (
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                    Address
                  </h3>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {contact.addressStreet && <p>{contact.addressStreet}</p>}
                      {(contact.addressCity || contact.addressState || contact.addressZip) && (
                        <p>
                          {contact.addressCity}
                          {contact.addressCity && contact.addressState && ', '}
                          {contact.addressState} {contact.addressZip}
                        </p>
                      )}
                      {contact.addressCountry && contact.addressCountry !== 'US' && (
                        <p>{contact.addressCountry}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Budget */}
              {budget && (
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                    Budget
                  </h3>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-black dark:text-white">{budget}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Source */}
              {contact.source && (
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Source</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {contact.source.replace('_', ' ')}
                  </p>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Notes</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {contact.notes}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="flex-1 m-0">
          <ContactPropertiesTab contactId={contact.id} />
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Action Bar */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-black dark:text-white">
                  Email Conversation
                </h3>
                <div className="flex gap-2">
                  {emailAccounts && emailAccounts.length > 0 && (
                    <Button
                      onClick={() => {
                        emailAccounts.forEach(account => {
                          syncEmails.mutate({ id: account.id })
                        })
                      }}
                      variant="outline"
                      size="sm"
                      disabled={syncEmails.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncEmails.isPending ? 'animate-spin' : ''}`} />
                      Sync
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowComposer(!showComposer)}
                    variant="default"
                    size="sm"
                    disabled={!contact.email}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Compose
                  </Button>
                </div>
              </div>

              {/* Composer (collapsible) */}
              {showComposer && contact.email && (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <EmailComposer
                    defaultTo={contact.email}
                    onClose={() => setShowComposer(false)}
                  />
                </div>
              )}

              {/* No email warning */}
              {!contact.email && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No email address for this contact</p>
                  <p className="text-sm mt-1">Add an email address to start messaging</p>
                </div>
              )}

              {/* Email History */}
              {contact.email && (
                <div>
                  <EmailThreadList contactEmails={[contact.email]} />
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
                WhatsApp Messages
              </h3>
              <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm mt-1">WhatsApp messages will appear here</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="flex-1 m-0">
          <ContactDocumentsTab contactId={contact.id} />
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="flex-1 m-0">
          <ContactDealsTab contactId={contact.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
