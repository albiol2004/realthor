'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { type Contact } from '@/types/crm'
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  DollarSign,
  Briefcase,
  MessageSquare,
  FileCheck,
  ArrowRight,
  HandshakeIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContactOverviewTabProps {
  contact: Contact
  onTabChange?: (tab: string) => void
}

/**
 * Contact Overview Tab Component
 * Shows: Deals, Recent Conversations, Compliance Score, and Quick Contact Info
 */
export function ContactOverviewTab({ contact, onTabChange }: ContactOverviewTabProps) {
  // Calculate compliance score (placeholder logic - will be based on documents later)
  const complianceScore = 0 // TODO: Calculate from documents
  const complianceColor = complianceScore >= 80 ? 'text-green-600' : complianceScore >= 50 ? 'text-yellow-600' : 'text-red-600'
  const complianceBg = complianceScore >= 80 ? 'bg-green-600' : complianceScore >= 50 ? 'bg-yellow-600' : 'bg-red-600'

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Deals Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
              <HandshakeIcon className="h-5 w-5" />
              Deals
            </h3>
          </div>
          <Card className="border-gray-200 dark:border-gray-800">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No deals yet</p>
                <p className="text-xs mt-1">Deals will appear here when created</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Conversations Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Conversations
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Email Card */}
            <Card
              className="border-gray-200 dark:border-gray-800 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              onClick={() => onTabChange?.('email')}
            >
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-black dark:text-white">Email</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">No emails yet</p>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Card */}
            <Card
              className="border-gray-200 dark:border-gray-800 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              onClick={() => onTabChange?.('whatsapp')}
            >
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-black dark:text-white">WhatsApp</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">No messages yet</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compliance Score Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Compliance Score
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTabChange?.('documents')}
              className="text-xs"
            >
              View Documents
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <Card
            className="border-gray-200 dark:border-gray-800 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
            onClick={() => onTabChange?.('documents')}
          >
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Document Completion</span>
                  <span className={cn('text-2xl font-bold', complianceColor)}>{complianceScore}%</span>
                </div>
                <Progress value={complianceScore} className="h-2" />
                <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                  {complianceScore === 0
                    ? 'No documents uploaded yet'
                    : complianceScore < 50
                    ? 'More documents needed'
                    : complianceScore < 80
                    ? 'Good progress'
                    : 'Excellent compliance'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Contact Info Section */}
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-white mb-3">Quick Info</h3>
          <Card className="border-gray-200 dark:border-gray-800">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Email */}
                {contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Email</p>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-sm text-black dark:text-white hover:underline truncate block"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Phone</p>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-sm text-black dark:text-white hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Company & Job Title */}
                {(contact.company || contact.jobTitle) && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Work</p>
                      <p className="text-sm text-black dark:text-white">
                        {contact.jobTitle && contact.company
                          ? `${contact.jobTitle} at ${contact.company}`
                          : contact.jobTitle || contact.company}
                      </p>
                    </div>
                  </div>
                )}

                {/* Address */}
                {(contact.addressStreet || contact.addressCity || contact.addressState) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Address</p>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {contact.addressStreet && <p>{contact.addressStreet}</p>}
                        {(contact.addressCity || contact.addressState || contact.addressZip) && (
                          <p>
                            {contact.addressCity}
                            {contact.addressCity && contact.addressState && ', '}
                            {contact.addressState} {contact.addressZip}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Budget */}
                {(contact.budgetMin || contact.budgetMax) && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Budget</p>
                      <p className="text-sm text-black dark:text-white">
                        {contact.budgetMin && contact.budgetMax
                          ? `$${contact.budgetMin.toLocaleString()} - $${contact.budgetMax.toLocaleString()}`
                          : contact.budgetMin
                          ? `From $${contact.budgetMin.toLocaleString()}`
                          : `Up to $${contact.budgetMax?.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* View Full Details Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => onTabChange?.('info')}
              >
                View Full Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
