'use client'

import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Users,
  FileText,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculateContactCompliance } from '@/lib/config/contact-compliance'
import type { Document } from '@/types/crm'

/**
 * Dashboard Page - Real Data
 *
 * Shows actual metrics and actionable insights from the CRM
 */

export default function DashboardPage() {
  const router = useRouter()

  // Fetch contacts with compliance data
  const { data: contactsData, isLoading: contactsLoading } = trpc.contacts.list.useQuery({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 1000, // Fetch all contacts for compliance calculation
    offset: 0,
  })

  // Fetch deals
  const { data: deals, isLoading: dealsLoading } = trpc.deals.list.useQuery({
    limit: 100,
    offset: 0,
  })

  // Fetch ALL documents to calculate compliance
  const { data: allDocuments, isLoading: allDocsLoading } = trpc.documents.search.useQuery({
    limit: 1000, // Fetch all documents
  })

  // Fetch recent documents for display
  const { data: documents, isLoading: documentsLoading } = trpc.documents.search.useQuery({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 10,
  })

  const contacts = contactsData?.contacts || []
  const dealsArray = deals || []
  const documentsArray = documents || []
  const allDocsArray = allDocuments || []

  // Group documents by contact ID
  const documentsByContact = new Map<string, Document[]>()
  allDocsArray.forEach((doc) => {
    // Check if document is linked to a contact via entity
    if (doc.entityType === 'contact' && doc.entityId) {
      if (!documentsByContact.has(doc.entityId)) {
        documentsByContact.set(doc.entityId, [])
      }
      documentsByContact.get(doc.entityId)!.push(doc)
    }
    // Check if document is linked via related_contact_ids array
    if (doc.relatedContactIds && Array.isArray(doc.relatedContactIds)) {
      doc.relatedContactIds.forEach((contactId) => {
        if (!documentsByContact.has(contactId)) {
          documentsByContact.set(contactId, [])
        }
        documentsByContact.get(contactId)!.push(doc)
      })
    }
  })

  // Calculate real compliance for each contact with a role
  const contactsWithCompliance = contacts
    .filter((c) => c.role) // Only contacts with roles
    .map((contact) => {
      const contactDocs = documentsByContact.get(contact.id) || []
      const compliance = calculateContactCompliance(contact.role as any, contactDocs)
      return { contact, compliance }
    })

  // Calculate REAL average compliance
  const avgCompliance = contactsWithCompliance.length > 0
    ? Math.round(
        contactsWithCompliance.reduce((sum, c) => sum + c.compliance.score, 0) /
          contactsWithCompliance.length
      )
    : 0

  // Find contacts with low compliance (< 50%) for action center
  const lowComplianceContacts = contactsWithCompliance
    .filter((c) => c.compliance.score < 50)
    .sort((a, b) => a.compliance.score - b.compliance.score)
    .slice(0, 5)

  // Find contacts that need attention (no role assigned = can't calculate compliance)
  const contactsNeedingRole = contacts
    .filter((c) => !c.role)
    .slice(0, 5)

  // Find upcoming deal deadlines (within 7 days)
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingDeals = dealsArray
    .filter((deal) => {
      if (!deal.expectedCloseDate) return false
      const closeDate = new Date(deal.expectedCloseDate)
      return closeDate >= now && closeDate <= sevenDaysFromNow
    })
    .sort((a, b) =>
      new Date(a.expectedCloseDate!).getTime() - new Date(b.expectedCloseDate!).getTime()
    )
    .slice(0, 5)

  // Recent contacts (last 5)
  const recentContacts = contacts.slice(0, 5)

  // Recent documents (last 5)
  const recentDocuments = documentsArray.slice(0, 5)

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getComplianceBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-950/20'
    if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-950/20'
    return 'bg-red-50 dark:bg-red-950/20'
  }

  const isLoading = contactsLoading || dealsLoading || documentsLoading || allDocsLoading

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of your business
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Contacts */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Contacts
              </CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black dark:text-white">
              {isLoading ? '...' : contactsData?.total || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Active in your CRM
            </p>
          </CardContent>
        </Card>

        {/* Deals */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Deals
              </CardTitle>
              <Briefcase className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black dark:text-white">
              {isLoading ? '...' : dealsArray.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              In your pipeline
            </p>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black dark:text-white">
              {isLoading ? '...' : documentsArray.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Uploaded and processed
            </p>
          </CardContent>
        </Card>

        {/* Average Compliance */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Compliance
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(avgCompliance)}`}>
              {isLoading ? '...' : `${avgCompliance}%`}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Across all contacts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Action Center - Low Compliance or Needing Roles */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Needs Attention
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {lowComplianceContacts.length > 0
                    ? 'Contacts with low compliance scores'
                    : 'Contacts missing role assignment'}
                </CardDescription>
              </div>
              <Link href="/crm">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : lowComplianceContacts.length > 0 ? (
                // Show low compliance contacts (priority)
                lowComplianceContacts.map(({ contact, compliance }) => (
                  <button
                    key={contact.id}
                    onClick={() => router.push(`/crm?contact=${contact.id}`)}
                    className={`w-full p-4 rounded-lg border transition-all hover:shadow-md ${getComplianceBgColor(
                      compliance.score
                    )} border-gray-200 dark:border-gray-800 text-left`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {contact.email || contact.phone || 'No contact info'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getComplianceColor(compliance.score)}`}>
                          {compliance.score}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {compliance.critical.completed}/{compliance.critical.total} critical
                        </p>
                      </div>
                    </div>
                    {compliance.missingCritical.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Missing: {compliance.missingCritical.map(d => d.name).join(', ')}
                      </div>
                    )}
                  </button>
                ))
              ) : contactsNeedingRole.length > 0 ? (
                // Show contacts needing roles (fallback)
                contactsNeedingRole.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => router.push(`/crm?contact=${contact.id}`)}
                    className="w-full p-4 rounded-lg border transition-all hover:shadow-md bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {contact.email || contact.phone || 'No contact info'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          No Role
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Assign a role to enable compliance tracking
                    </div>
                  </button>
                ))
              ) : (
                // All good!
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-600" />
                  <p>All contacts are compliant!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deal Deadlines */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Deals closing in the next 7 days
                </CardDescription>
              </div>
              <Link href="/deals">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : upcomingDeals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No upcoming deadlines</p>
                </div>
              ) : (
                upcomingDeals.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => router.push(`/deals?deal=${deal.id}`)}
                    className="w-full p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 transition-all hover:shadow-md text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">
                          {deal.title}
                        </p>
                        {deal.value && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            €{deal.value.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {new Date(deal.expectedCloseDate!).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.ceil(
                            (new Date(deal.expectedCloseDate!).getTime() - now.getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Contacts */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-black dark:text-white">Recent Contacts</CardTitle>
              <Link href="/crm">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : recentContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No contacts yet</p>
                  <Link href="/crm">
                    <Button variant="outline" size="sm" className="mt-2">
                      Add First Contact
                    </Button>
                  </Link>
                </div>
              ) : (
                recentContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => router.push(`/crm?contact=${contact.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-all text-left"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-black dark:text-white">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {contact.email || contact.phone || 'No contact info'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-black dark:text-white">Recent Documents</CardTitle>
              <Link href="/documents">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : recentDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No documents yet</p>
                  <Link href="/documents">
                    <Button variant="outline" size="sm" className="mt-2">
                      Upload First Document
                    </Button>
                  </Link>
                </div>
              ) : (
                recentDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/documents?id=${doc.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-all text-left"
                  >
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium text-black dark:text-white truncate">
                        {doc.displayName || doc.filename}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {doc.fileType?.split('/')[1]?.toUpperCase() || 'File'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
