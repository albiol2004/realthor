'use client'

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Users,
  RefreshCw,
  SkipForward,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import {
  getContactImportStatusLabel,
  getContactImportStatusColor,
  getContactImportModeLabel,
  getContactImportRowStatusLabel,
  getContactImportRowStatusColor,
  formatFileSize,
  type ContactImportRowStatus,
} from '@/types/crm'
import { useState } from 'react'

type TabValue = 'all' | 'imported' | 'skipped'

export default function ImportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  // Fetch job details
  const { data: job, isLoading: isLoadingJob } = trpc.contactImports.getById.useQuery(
    { id: jobId }
  )

  // Fetch rows
  const statusFilter: ContactImportRowStatus[] | undefined = activeTab === 'all' ? undefined :
    activeTab === 'imported' ? ['imported'] :
    ['skipped']

  const { data: rows, isLoading: isLoadingRows } = trpc.contactImports.getRows.useQuery(
    {
      jobId,
      status: statusFilter,
      includeContacts: true,
      limit: 500,
    },
    { enabled: !!job }
  )

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
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

  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'

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
                Import Details
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {job.fileName}
              </p>
            </div>
          </div>
          <Badge className={getContactImportStatusColor(job.status)}>
            {job.status === 'completed' && <CheckCircle2 className="h-4 w-4 mr-1" />}
            {job.status === 'failed' && <XCircle className="h-4 w-4 mr-1" />}
            {getContactImportStatusLabel(job.status)}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex-shrink-0 p-6 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* File Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>File</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]" title={job.fileName}>
                    {job.fileName}
                  </p>
                  {job.fileSizeBytes && (
                    <p className="text-xs text-gray-500">{formatFileSize(job.fileSizeBytes)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mode */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Import Mode</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{getContactImportModeLabel(job.mode)}</p>
            </CardContent>
          </Card>

          {/* Results */}
          {isCompleted && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Created</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-2xl text-green-600">
                      {job.createdCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Updated</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-2xl text-blue-600">
                      {job.updatedCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Error */}
          {isFailed && (
            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardDescription>Error</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-600">{job.errorMessage || 'Unknown error'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
          <div>
            <span className="font-medium">Started:</span> {formatDate(job.createdAt)}
          </div>
          {job.completedAt && (
            <div>
              <span className="font-medium">Completed:</span> {formatDate(job.completedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Rows */}
      {isCompleted && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col">
            <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6">
              <TabsList className="h-12">
                <TabsTrigger value="all">
                  All ({job.totalRows})
                </TabsTrigger>
                <TabsTrigger value="imported">
                  Imported ({job.createdCount + job.updatedCount})
                </TabsTrigger>
                <TabsTrigger value="skipped">
                  Skipped ({job.skippedCount})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {isLoadingRows ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : !rows || rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <CheckCircle2 className="h-12 w-12 text-gray-400 mb-4" />
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
                        <TableHead>Result</TableHead>
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
                            {row.importError && (
                              <p className="text-xs text-red-500 mt-1">{row.importError}</p>
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
      )}
    </div>
  )
}
