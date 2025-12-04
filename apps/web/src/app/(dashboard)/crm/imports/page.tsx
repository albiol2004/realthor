'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Plus,
  Upload,
  MoreHorizontal,
  Trash2,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getContactImportStatusLabel,
  getContactImportStatusColor,
  getContactImportModeLabel,
  formatFileSize,
  type ContactImportStatus,
} from '@/types/crm'
import { NewImportModal } from '@/components/crm/imports/new-import-modal'

type TabValue = 'all' | 'pending_review' | 'processing' | 'completed'

export default function ContactImportsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [isNewImportOpen, setIsNewImportOpen] = useState(false)

  // Query for import jobs
  const statusFilter = activeTab === 'all' ? undefined :
    activeTab === 'pending_review' ? 'pending_review' :
    activeTab === 'processing' ? ['pending', 'analyzing', 'processing'] :
    'completed'

  const { data: jobs, isLoading, refetch } = trpc.contactImports.list.useQuery(
    { status: statusFilter as any },
    { refetchInterval: 5000 } // Poll every 5s for status updates
  )

  const { data: stats } = trpc.contactImports.getStats.useQuery(undefined, {
    refetchInterval: 5000,
  })

  const deleteMutation = trpc.contactImports.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Import deleted', description: 'The import job has been removed.' })
      refetch()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleDelete = (jobId: string) => {
    if (confirm('Are you sure you want to delete this import? This cannot be undone.')) {
      deleteMutation.mutate({ id: jobId })
    }
  }

  const getStatusIcon = (status: ContactImportStatus) => {
    switch (status) {
      case 'pending':
      case 'analyzing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'pending_review':
        return <AlertCircle className="h-4 w-4" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/crm">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-white">Contact Imports</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Import contacts from CSV files
              </p>
            </div>
          </div>
          <Button onClick={() => setIsNewImportOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Import
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="h-12">
            <TabsTrigger value="all" className="gap-2">
              All
              {stats && <Badge variant="secondary">{stats.total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pending_review" className="gap-2">
              Pending Review
              {stats && stats.pendingReview > 0 && (
                <Badge variant="destructive">{stats.pendingReview}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-2">
              Processing
              {stats && (stats.pending + stats.analyzing + stats.processing) > 0 && (
                <Badge variant="secondary">
                  {stats.pending + stats.analyzing + stats.processing}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed
              {stats && <Badge variant="secondary">{stats.completed}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              No imports yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
              Import your existing contacts from a CSV file. We'll help you map the columns
              and detect duplicates.
            </p>
            <Button onClick={() => setIsNewImportOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload CSV
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                    onClick={() => {
                      if (job.status === 'pending_review') {
                        router.push(`/crm/imports/${job.id}/review`)
                      } else if (job.status === 'completed' || job.status === 'failed') {
                        router.push(`/crm/imports/${job.id}`)
                      }
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-black dark:text-white">
                            {job.fileName}
                          </p>
                          {job.fileSizeBytes && (
                            <p className="text-xs text-gray-500">
                              {formatFileSize(job.fileSizeBytes)}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getContactImportModeLabel(job.mode)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <Badge className={getContactImportStatusColor(job.status)}>
                          {getContactImportStatusLabel(job.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {job.totalRows > 0 ? (
                        <div className="text-sm">
                          <span className="text-green-600">{job.newCount} new</span>
                          {job.duplicateCount > 0 && (
                            <span className="text-yellow-600 ml-2">
                              {job.duplicateCount} dup
                            </span>
                          )}
                          {job.conflictCount > 0 && (
                            <span className="text-red-600 ml-2">
                              {job.conflictCount} conflict
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {job.status === 'completed' ? (
                        <div className="text-sm">
                          <span className="text-green-600">{job.createdCount} created</span>
                          {job.updatedCount > 0 && (
                            <span className="text-blue-600 ml-2">
                              {job.updatedCount} updated
                            </span>
                          )}
                          {job.skippedCount > 0 && (
                            <span className="text-gray-500 ml-2">
                              {job.skippedCount} skipped
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {job.status === 'pending_review' && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/crm/imports/${job.id}/review`)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review & Import
                            </DropdownMenuItem>
                          )}
                          {(job.status === 'completed' || job.status === 'failed') && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/crm/imports/${job.id}`)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(job.id)
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* New Import Modal */}
      <NewImportModal
        open={isNewImportOpen}
        onOpenChange={setIsNewImportOpen}
        onSuccess={() => {
          refetch()
          setIsNewImportOpen(false)
        }}
      />
    </div>
  )
}
