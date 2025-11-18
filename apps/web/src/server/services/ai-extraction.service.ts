import type { AIMetadata, Contact, Property } from '@/types/crm'
import { contactsService } from './contacts.service'
import { propertiesService } from './properties.service'

/**
 * AI Metadata Extraction Service
 * Uses Deepseek AI to extract structured metadata from OCR text
 *
 * Extracts:
 * - Names and their roles (buyer, seller, agent, witness)
 * - Important dates (closing, inspection, expiration)
 * - Document type classification
 * - Signature detection and status
 * - Importance scoring (1-5)
 * - Auto-linking suggestions to contacts/properties
 */
export class AIExtractionService {
  private deepseekApiKey: string
  private deepseekApiUrl: string = 'https://api.deepseek.com/v1/chat/completions'

  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || ''

    if (!this.deepseekApiKey) {
      console.warn('⚠️ DEEPSEEK_API_KEY not set. AI extraction will be disabled.')
    }
  }

  /**
   * Extract metadata from OCR text
   *
   * @param userId - User ID (for context loading)
   * @param ocrText - Extracted text from document
   * @param documentType - Optional document category hint
   * @returns Structured AI metadata
   */
  async extractMetadata(
    userId: string,
    ocrText: string,
    documentType?: string
  ): Promise<{
    metadata: AIMetadata
    confidence: number
  }> {
    if (!this.deepseekApiKey) {
      // Return empty metadata if API key not configured
      return {
        metadata: {},
        confidence: 0,
      }
    }

    // Load user's contacts and properties for context
    const [contacts, properties] = await Promise.all([
      this.loadUserContacts(userId),
      this.loadUserProperties(userId),
    ])

    // Build prompt with context
    const prompt = this.buildExtractionPrompt(ocrText, contacts, properties, documentType)

    // Call Deepseek API
    try {
      const response = await fetch(this.deepseekApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat', // Much cheaper than GPT-4
          messages: [
            {
              role: 'system',
              content:
                'You are a real estate document analyzer. Extract structured metadata from documents and return ONLY valid JSON. No explanation, just JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1, // Low temperature for consistent extraction
          max_tokens: 2000,
          response_format: { type: 'json_object' }, // Force JSON response
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Deepseek API error:', response.status, errorText)
        throw new Error(`Deepseek API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('Empty response from Deepseek API')
      }

      // Parse JSON response
      const extracted = JSON.parse(content)

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(extracted)

      // Map to AIMetadata type
      const metadata: AIMetadata = {
        names: extracted.names || [],
        dates: (extracted.dates || []).map((d: any) => ({
          ...d,
          date: new Date(d.date),
        })),
        documentType: extracted.document_type,
        hasSignature: extracted.has_signature || false,
        signatureCount: extracted.signature_count || 0,
        importanceReasons: extracted.importance_reasons || [],
        suggestedContacts: extracted.suggested_contacts || [],
        suggestedProperties: extracted.suggested_properties || [],
      }

      return {
        metadata,
        confidence,
      }
    } catch (error) {
      console.error('AI extraction failed:', error)
      // Return empty metadata on failure
      return {
        metadata: {},
        confidence: 0,
      }
    }
  }

  /**
   * Build extraction prompt with context
   */
  private buildExtractionPrompt(
    ocrText: string,
    contacts: Contact[],
    properties: Property[],
    documentType?: string
  ): string {
    // Build contact context (names for matching)
    const contactContext = contacts
      .slice(0, 50) // Limit to avoid token overflow
      .map(
        (c) =>
          `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ''}${c.company ? ` - ${c.company}` : ''} [ID: ${c.id}]`
      )
      .join('\n')

    // Build property context (addresses for matching)
    const propertyContext = properties
      .slice(0, 50)
      .map((p) => `${p.title} - ${p.address}, ${p.city} [ID: ${p.id}]`)
      .join('\n')

    return `
Analyze this real estate document and extract structured metadata.

DOCUMENT TEXT:
${ocrText.slice(0, 4000)} ${ocrText.length > 4000 ? '...(truncated)' : ''}

${documentType ? `DOCUMENT TYPE HINT: ${documentType}` : ''}

USER'S CONTACTS (for name matching):
${contactContext || 'No contacts available'}

USER'S PROPERTIES (for address matching):
${propertyContext || 'No properties available'}

Extract the following information and return as JSON:

{
  "names": [
    {
      "name": "Full Name",
      "context": "buyer|seller|agent|witness|landlord|tenant|other",
      "confidence": 0.95
    }
  ],
  "dates": [
    {
      "date": "2025-02-15",
      "type": "closing_date|inspection_date|expiration_date|signing_date|move_in_date|other",
      "confidence": 0.90
    }
  ],
  "document_type": "purchase_agreement|rental_contract|inspection_report|id_document|power_of_attorney|deed|title|other",
  "has_signature": true,
  "signature_count": 2,
  "importance_score": 5,
  "importance_reasons": [
    "Contains closing date",
    "Fully executed contract",
    "High monetary value"
  ],
  "suggested_contacts": [
    {
      "contactId": "uuid-from-context",
      "confidence": 0.88
    }
  ],
  "suggested_properties": [
    {
      "propertyId": "uuid-from-context",
      "confidence": 0.92
    }
  ]
}

INSTRUCTIONS:
- Match names to contacts if confidence > 0.8
- Match addresses to properties if confidence > 0.8
- Importance score: 1=routine, 2=minor, 3=moderate, 4=important, 5=critical
- Only include fields you can confidently extract
- Return ONLY valid JSON, no markdown or explanation
`
  }

  /**
   * Load user contacts for context
   */
  private async loadUserContacts(userId: string): Promise<Contact[]> {
    try {
      return await contactsService.list(userId, {})
    } catch (error) {
      console.error('Failed to load contacts for AI context:', error)
      return []
    }
  }

  /**
   * Load user properties for context
   */
  private async loadUserProperties(userId: string): Promise<Property[]> {
    try {
      return await propertiesService.list(userId, {})
    } catch (error) {
      console.error('Failed to load properties for AI context:', error)
      return []
    }
  }

  /**
   * Calculate overall confidence score from extracted metadata
   */
  private calculateOverallConfidence(extracted: any): number {
    const confidences: number[] = []

    // Collect all confidence scores
    if (extracted.names) {
      confidences.push(...extracted.names.map((n: any) => n.confidence))
    }
    if (extracted.dates) {
      confidences.push(...extracted.dates.map((d: any) => d.confidence))
    }
    if (extracted.suggested_contacts) {
      confidences.push(...extracted.suggested_contacts.map((c: any) => c.confidence))
    }
    if (extracted.suggested_properties) {
      confidences.push(...extracted.suggested_properties.map((p: any) => p.confidence))
    }

    // Calculate average
    if (confidences.length === 0) {
      return 0.5 // Default confidence if no specific scores
    }

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  }
}

export const aiExtractionService = new AIExtractionService()
