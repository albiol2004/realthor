import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiExtractionService } from '@/server/services/ai-extraction.service'

/**
 * OCR Webhook Handler
 *
 * This endpoint receives callbacks from the VPS OCR Service
 * when document processing is completed.
 *
 * Payload from VPS:
 * {
 *   "document_id": "uuid",
 *   "queue_id": "uuid",
 *   "status": "completed" | "failed",
 *   "ocr_text": "extracted text...",
 *   "error_message": "error if failed",
 *   "secret": "webhook-secret-key"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()

    // Verify webhook secret
    const expectedSecret = process.env.OCR_WEBHOOK_SECRET
    if (expectedSecret && body.secret !== expectedSecret) {
      console.error('❌ Invalid webhook secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { document_id, queue_id, status, ocr_text, error_message } = body

    console.log(`📄 OCR webhook received for document ${document_id}: ${status}`)

    // Create server client
    const supabase = await createClient()

    if (status === 'completed' && ocr_text) {
      // Step 1: Get document details
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', document_id)
        .single()

      if (docError || !document) {
        console.error(`❌ Document not found: ${document_id}`)
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      // Step 2: Update document with OCR text
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          ocr_text: ocr_text,
          ocr_status: 'completed',
          ocr_processed_at: new Date().toISOString(),
        })
        .eq('id', document_id)

      if (updateError) {
        console.error('❌ Failed to update document with OCR text:', updateError)
        return NextResponse.json(
          { error: 'Failed to update document' },
          { status: 500 }
        )
      }

      console.log(`✅ Document ${document_id} updated with OCR text`)

      // Step 3: Extract AI metadata (async - don't block webhook response)
      // We use setImmediate/setTimeout to run this in background
      setTimeout(async () => {
        try {
          console.log(`🤖 Starting AI metadata extraction for ${document_id}`)

          const { metadata, confidence } = await aiExtractionService.extractMetadata(
            document.user_id,
            ocr_text,
            document.category
          )

          // Update document with AI metadata
          const { error: aiError } = await supabase
            .from('documents')
            .update({
              ai_metadata: metadata,
              ai_confidence: confidence,
              ai_processed_at: new Date().toISOString(),
              // Update extracted fields for easy querying
              extracted_names: metadata.names?.map((n) => n.name) || [],
              extracted_dates:
                metadata.dates?.map((d) => d.date.toISOString().split('T')[0]) || [],
              has_signature: metadata.hasSignature || false,
              signature_status: metadata.hasSignature
                ? metadata.signatureCount && metadata.signatureCount > 0
                  ? 'fully_signed'
                  : 'unsigned'
                : null,
              importance_score: calculateImportanceScore(metadata),
              related_contact_ids:
                metadata.suggestedContacts?.map((c) => c.contactId) || [],
              related_property_ids:
                metadata.suggestedProperties?.map((p) => p.propertyId) || [],
            })
            .eq('id', document_id)

          if (aiError) {
            console.error('❌ Failed to update AI metadata:', aiError)
          } else {
            console.log(
              `✅ AI metadata extracted for ${document_id} (confidence: ${confidence.toFixed(2)})`
            )
          }
        } catch (error) {
          console.error('❌ AI extraction failed:', error)
        }
      }, 100)

      return NextResponse.json({
        success: true,
        message: 'OCR completed, AI extraction queued',
      })
    } else if (status === 'failed') {
      // OCR failed
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          ocr_status: 'failed',
          ocr_processed_at: new Date().toISOString(),
        })
        .eq('id', document_id)

      if (updateError) {
        console.error('❌ Failed to update document status:', updateError)
      }

      console.error(`❌ OCR failed for document ${document_id}: ${error_message}`)

      return NextResponse.json({
        success: false,
        message: 'OCR processing failed',
        error: error_message,
      })
    }

    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Calculate importance score from AI metadata
 */
function calculateImportanceScore(metadata: any): number {
  // If AI already provided a score, use it
  if (metadata.importanceScore) {
    return metadata.importanceScore
  }

  // Otherwise, calculate based on metadata
  let score = 3 // Default: moderate importance

  // Increase score for contracts and legal documents
  if (
    metadata.documentType &&
    ['purchase_agreement', 'rental_contract', 'deed', 'title'].includes(
      metadata.documentType
    )
  ) {
    score += 1
  }

  // Increase score if fully signed
  if (
    metadata.hasSignature &&
    metadata.signatureCount &&
    metadata.signatureCount >= 2
  ) {
    score += 1
  }

  // Increase score if has important dates
  if (metadata.dates && metadata.dates.length > 0) {
    const hasClosingDate = metadata.dates.some((d: any) => d.type === 'closing_date')
    if (hasClosingDate) {
      score += 1
    }
  }

  // Cap at 5
  return Math.min(score, 5)
}

// Allow POST requests only
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
