import { NextResponse } from 'next/server'

/**
 * File Upload API Route
 *
 * Phase 1: Placeholder
 * Phase 3: Will handle document uploads to Supabase Storage
 *
 * TODO: Implement file upload with:
 * - File validation (type, size)
 * - Upload to Supabase Storage
 * - Generate embeddings for documents
 * - Return file URL and metadata
 */
export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'File upload not yet implemented' },
    { status: 501 }
  )
}
