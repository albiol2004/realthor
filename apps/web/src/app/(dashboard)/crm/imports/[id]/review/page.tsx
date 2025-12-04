'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  SkipForward,
  Loader2,
  Play,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import {
  getContactImportRowStatusLabel,
  getContactImportRowStatusColor,
  type ContactImportRow,
  type ContactImportDecision,
  type ContactImportRowStatus,
} from '@/types/crm'
import { cn } from '@/lib/utils'

type TabValue = 'all' | 'new' | 'duplicate' | 'conflict'

export default function ImportReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const jobId = params.id as string

  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)
  const [localDecisions, setLocalDecisions] = useState<Record<string, ContactImportDecision>>({})

  // Fetch job details
  const { data: job, isLoading: isLoadingJob } = trpc.contactImports.getById.useQuery(
    { id: jobId },
    { refetchInterval: 5000 }
  )

  // Fetch rows
  const statusFilter = activeTab === 'all' ? undefined : [activeTab] as ContactImportRowStatus[]
  const { data: rows, isLoading: isLoadingRows, refetch: refetchRows } = trpc.contactImports.getRows.useQuery(
    {
      jobId,
      status: statusFilter,
      includeContacts: true,
      limit: 500,
    },
    { enabled: !!job }
  )

  // Get pending review count
  const { data: pendingRows } = trpc.contactImports.getRowsNeedingReview.useQuery(
    { jobId },
    { enabled: !!job }
  )

  const pendingCount = pendingRows?.length || 0

  // Mutations
  const utils = trpc.useUtils()

  const updateDecisionMutation = trpc.contactImports.updateRowDecision.useMutation({
    onSuccess: () => {
      refetchRows()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const bulkUpdateMutation = trpc.contactImports.bulkUpdateDecision.useMutation({
    onSuccess: (result) => {
      toast({
        title: 'Decisions updated',
        description: `Updated ${result.updatedCount} rows`,
      })
      refetchRows()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const executeMutation = trpc.contactImports.execute.useMutation({
    onSuccess: () => {
      toast({
        title: 'Import started',
        description: 'Your contacts are being imported. This may take a moment.',
      })
      router.push('/crm/imports')
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  // Handle individual row decision
  const handleDecision = (rowId: string, decision: ContactImportDecision) => {
    setLocalDecisions((prev) => ({ ...prev, [rowId]: decision }))
    updateDecisionMutation.mutate({ rowId, decision })
  }

  // Handle bulk actions
  const handleBulkAction = (status: 'new' | 'duplicate' | 'conflict', decision: ContactImportDecision, overwriteAll?: boolean) => {
    bulkUpdateMutation.mutate({
      jobId,
      status,
      decision,
      overwriteAll,
    })
  }

  // Handle execute
  const handleExecute = () => {
    executeMutation.mutate({ jobId })
    setShowExecuteDialog(false)
  }

  const getDecisionIcon = (decision?: ContactImportDecision) => {
    switch (decision) {
      case 'create':
        return <UserPlus className="h-4 w-4 text-green-600" />
      case 'update':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'skip':
        return <SkipForward className="h-4 w-4 text-gray-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  if (isLoadingJob) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-gray-500">Import job not found</p>
        <Button asChild>
          <Link href="/crm/imports">Go back</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/crm/imports">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-white">
                Review Import
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {job.fileName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Badge variant="destructive">
                {pendingCount} pending review
              </Badge>
            )}
            <Button
              onClick={() => setShowExecuteDialog(true)}
              disabled={pendingCount > 0 || executeMutation.isPending}
              className="gap-2"
            >
              {executeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Execute Import
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Total:</span>
            <span className="font-semibold">{job.totalRows}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-600">New:</span>
            <span className="font-semibold text-green-600">{job.newCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-yellow-600">Duplicates:</span>
            <span className="font-semibold text-yellow-600">{job.duplicateCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Conflicts:</span>
            <span className="font-semibold text-red-600">{job.conflictCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col">
          <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6">
            <div className="flex items-center justify-between">
              <TabsList className="h-12">
                <TabsTrigger value="all">All ({job.totalRows})</TabsTrigger>
                <TabsTrigger value="new">New ({job.newCount})</TabsTrigger>
                <TabsTrigger value="duplicate">Duplicates ({job.duplicateCount})</TabsTrigger>
                <TabsTrigger value="conflict">Conflicts ({job.conflictCount})</TabsTrigger>
              </TabsList>

              {/* Bulk actions */}
              {activeTab !== 'all' && (
                <div className="flex items-center gap-2">
                  {activeTab === 'new' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('new', 'create')}
                      disabled={bulkUpdateMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                      Create All
                    </Button>
                  )}
                  {activeTab === 'duplicate' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('duplicate', 'update', false)}
                        disabled={bulkUpdateMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                        Enrich All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('duplicate', 'skip')}
                        disabled={bulkUpdateMutation.isPending}
                      >
                        <SkipForward className="h-4 w-4 mr-2 text-gray-500" />
                        Skip All
                      </Button>
                    </>
                  )}
                  {activeTab === 'conflict' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('conflict', 'update', true)}
                        disabled={bulkUpdateMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                        Overwrite All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('conflict', 'update', false)}
                        disabled={bulkUpdateMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                        Enrich All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('conflict', 'skip')}
                        disabled={bulkUpdateMutation.isPending}
                      >
                        <SkipForward className="h-4 w-4 mr-2 text-gray-500" />
                        Skip All
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-6">
            {isLoadingRows ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !rows || rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                  No rows in this category
                </h3>
              </div>
            ) : (
              <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead className="w-[200px]">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-gray-500">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {row.mappedData?.first_name} {row.mappedData?.last_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {row.mappedData?.email || '-'}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {row.mappedData?.phone || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getContactImportRowStatusColor(row.status)}>
                            {getContactImportRowStatusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.matchedContact ? (
                            <div className="text-sm">
                              <span className="font-medium">
                                {row.matchedContact.firstName} {row.matchedContact.lastName}
                              </span>
                              {row.matchConfidence && (
                                <span className="text-gray-500 ml-2">
                                  ({Math.round(row.matchConfidence * 100)}%)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.status === 'new' ? (
                            <div className="flex items-center gap-2">
                              {getDecisionIcon(row.decision || localDecisions[row.id])}
                              <span className="text-sm text-gray-500">
                                Will create
                              </span>
                            </div>
                          ) : (
                            <Select
                              value={row.decision || localDecisions[row.id] || ''}
                              onValueChange={(v) => handleDecision(row.id, v as ContactImportDecision)}
                              disabled={updateDecisionMutation.isPending}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Choose action" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="update">
                                  <div className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 text-blue-600" />
                                    Update
                                  </div>
                                </SelectItem>
                                <SelectItem value="create">
                                  <div className="flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-green-600" />
                                    Create New
                                  </div>
                                </SelectItem>
                                <SelectItem value="skip">
                                  <div className="flex items-center gap-2">
                                    <SkipForward className="h-4 w-4 text-gray-500" />
                                    Skip
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Execute Confirmation Dialog */}
      <AlertDialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute Import</AlertDialogTitle>
            <AlertDialogDescription>
              This will create and update contacts based on your decisions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute}>
              Execute Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
