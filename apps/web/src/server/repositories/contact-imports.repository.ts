import { createClient } from '@/lib/supabase/server'
import type {
  ContactImportJob,
  ContactImportRow,
  ContactImportStatus,
  ContactImportMode,
  ContactImportRowStatus,
  ContactImportDecision,
} from '@/types/crm'

/**
 * Contact Imports Repository
 * Handles database operations for contact CSV imports
 */
export class ContactImportsRepository {
  /**
   * List import jobs for a user
   */
  async list(
    userId: string,
    status?: ContactImportStatus | ContactImportStatus[]
  ): Promise<ContactImportJob[]> {
    const supabase = await createClient()

    let query = supabase
      .from('contact_import_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status)
      } else {
        query = query.eq('status', status)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('[ContactImportsRepository] Error listing jobs:', error)
      throw new Error(`Failed to list import jobs: ${error.message}`)
    }

    return (data || []).map(this.mapToJob)
  }

  /**
   * Get a single import job by ID
   */
  async findById(userId: string, jobId: string): Promise<ContactImportJob | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_import_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[ContactImportsRepository] Error finding job:', error)
      throw new Error(`Failed to find import job: ${error.message}`)
    }

    return this.mapToJob(data)
  }

  /**
   * Create a new import job
   */
  async create(
    userId: string,
    input: {
      mode: ContactImportMode
      fileName: string
      fileUrl: string
      fileSizeBytes?: number
    }
  ): Promise<ContactImportJob> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_import_jobs')
      .insert({
        user_id: userId,
        mode: input.mode,
        file_name: input.fileName,
        file_url: input.fileUrl,
        file_size_bytes: input.fileSizeBytes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('[ContactImportsRepository] Error creating job:', error)
      throw new Error(`Failed to create import job: ${error.message}`)
    }

    return this.mapToJob(data)
  }

  /**
   * Delete an import job
   */
  async delete(userId: string, jobId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('contact_import_jobs')
      .delete()
      .eq('id', jobId)
      .eq('user_id', userId)

    if (error) {
      console.error('[ContactImportsRepository] Error deleting job:', error)
      throw new Error(`Failed to delete import job: ${error.message}`)
    }
  }

  /**
   * Get rows for a job with optional status filter
   */
  async getRows(
    jobId: string,
    options?: {
      status?: ContactImportRowStatus | ContactImportRowStatus[]
      limit?: number
      offset?: number
    }
  ): Promise<ContactImportRow[]> {
    const supabase = await createClient()

    let query = supabase
      .from('contact_import_rows')
      .select('*')
      .eq('job_id', jobId)
      .order('row_number', { ascending: true })

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status)
      } else {
        query = query.eq('status', options.status)
      }
    }

    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ContactImportsRepository] Error getting rows:', error)
      throw new Error(`Failed to get import rows: ${error.message}`)
    }

    return (data || []).map(this.mapToRow)
  }

  /**
   * Get rows that need review (duplicates and conflicts without decision)
   */
  async getRowsNeedingReview(jobId: string): Promise<ContactImportRow[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_import_rows')
      .select('*')
      .eq('job_id', jobId)
      .in('status', ['duplicate', 'conflict'])
      .is('decision', null)
      .order('row_number', { ascending: true })

    if (error) {
      console.error('[ContactImportsRepository] Error getting review rows:', error)
      throw new Error(`Failed to get rows needing review: ${error.message}`)
    }

    return (data || []).map(this.mapToRow)
  }

  /**
   * Update row decision
   */
  async updateRowDecision(
    rowId: string,
    decision: ContactImportDecision,
    overwriteFields?: string[]
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('contact_import_rows')
      .update({
        decision,
        overwrite_fields: overwriteFields || null,
      })
      .eq('id', rowId)

    if (error) {
      console.error('[ContactImportsRepository] Error updating row decision:', error)
      throw new Error(`Failed to update row decision: ${error.message}`)
    }
  }

  /**
   * Bulk update row decisions by status
   */
  async bulkUpdateDecision(
    jobId: string,
    status: ContactImportRowStatus,
    decision: ContactImportDecision,
    overwriteAll?: boolean
  ): Promise<number> {
    const supabase = await createClient()

    const updateData: any = { decision }

    // For update decisions with overwriteAll, set all fields to be overwritten
    if (decision === 'update' && overwriteAll) {
      // Get the column mapping to know which fields were mapped
      const { data: job } = await supabase
        .from('contact_import_jobs')
        .select('column_mapping')
        .eq('id', jobId)
        .single()

      if (job?.column_mapping) {
        updateData.overwrite_fields = Object.values(job.column_mapping)
      }
    }

    const { data, error } = await supabase
      .from('contact_import_rows')
      .update(updateData)
      .eq('job_id', jobId)
      .eq('status', status)
      .is('decision', null)
      .select('id')

    if (error) {
      console.error('[ContactImportsRepository] Error bulk updating decisions:', error)
      throw new Error(`Failed to bulk update decisions: ${error.message}`)
    }

    return data?.length || 0
  }

  /**
   * Trigger job execution (set status to processing)
   */
  async triggerExecution(userId: string, jobId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('contact_import_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)
      .eq('user_id', userId)
      .eq('status', 'pending_review')

    if (error) {
      console.error('[ContactImportsRepository] Error triggering execution:', error)
      throw new Error(`Failed to trigger import execution: ${error.message}`)
    }
  }

  /**
   * Get count of rows pending review
   */
  async countPendingReview(jobId: string): Promise<number> {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('contact_import_rows')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .in('status', ['duplicate', 'conflict'])
      .is('decision', null)

    if (error) {
      console.error('[ContactImportsRepository] Error counting pending review:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Get matched contact details for rows
   */
  async hydrateRowsWithContacts(rows: ContactImportRow[]): Promise<ContactImportRow[]> {
    const supabase = await createClient()

    // Get unique contact IDs
    const contactIds = [...new Set(
      rows.map(r => r.matchedContactId).filter(Boolean)
    )] as string[]

    if (contactIds.length === 0) return rows

    // Fetch contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .in('id', contactIds)

    if (!contacts) return rows

    // Create lookup
    const contactMap = new Map(contacts.map(c => [c.id, {
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone,
    }]))

    // Hydrate rows
    return rows.map(row => ({
      ...row,
      matchedContact: row.matchedContactId ? contactMap.get(row.matchedContactId) : undefined,
    }))
  }

  /**
   * Map database row to ContactImportJob type
   */
  private mapToJob(row: any): ContactImportJob {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      mode: row.mode,
      fileName: row.file_name,
      fileUrl: row.file_url,
      fileSizeBytes: row.file_size_bytes,
      columnMapping: row.column_mapping,
      csvHeaders: row.csv_headers,
      totalRows: row.total_rows || 0,
      newCount: row.new_count || 0,
      duplicateCount: row.duplicate_count || 0,
      conflictCount: row.conflict_count || 0,
      createdCount: row.created_count || 0,
      updatedCount: row.updated_count || 0,
      skippedCount: row.skipped_count || 0,
      createdAt: new Date(row.created_at),
      analyzedAt: row.analyzed_at ? new Date(row.analyzed_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message,
    }
  }

  /**
   * Map database row to ContactImportRow type
   */
  private mapToRow(row: any): ContactImportRow {
    return {
      id: row.id,
      jobId: row.job_id,
      rowNumber: row.row_number,
      rawData: row.raw_data || {},
      mappedData: row.mapped_data,
      status: row.status,
      matchedContactId: row.matched_contact_id,
      matchConfidence: row.match_confidence,
      conflicts: row.conflicts,
      decision: row.decision,
      overwriteFields: row.overwrite_fields,
      createdContactId: row.created_contact_id,
      importError: row.import_error,
      createdAt: new Date(row.created_at),
    }
  }
}

export const contactImportsRepository = new ContactImportsRepository()
