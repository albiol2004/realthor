/**
 * CRM Types - Contacts, Properties, Deals, Activities
 */

// ============================================================================
// Contact Types
// ============================================================================

export type ContactStatus = 'lead' | 'client' | 'past_client'

export type ContactSource =
  | 'referral'
  | 'website'
  | 'social_media'
  | 'cold_call'
  | 'other'

export type PropertyRole = 'owner' | 'buyer' | 'seller' | 'tenant'

export interface Contact {
  id: string
  userId: string

  // Basic Information
  firstName: string
  lastName: string
  email?: string
  phone?: string
  profilePictureUrl?: string

  // Professional Information
  company?: string
  jobTitle?: string

  // Address
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressZip?: string
  addressCountry?: string

  // CRM Fields
  status: ContactStatus
  source?: ContactSource
  tags: string[]

  // Real Estate Specific
  budgetMin?: number
  budgetMax?: number

  // Notes
  notes?: string

  // Custom fields
  customFields: Record<string, any>

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface ContactProperty {
  id: string
  contactId: string
  propertyId: string
  role: PropertyRole
  createdAt: Date
}

// For list views with computed fields
export interface ContactWithRelations extends Contact {
  propertyCount?: number
  lastActivityDate?: Date
  dealCount?: number
  unreadMessageCount?: number
}

// For creating contacts
export interface CreateContactInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  profilePictureUrl?: string
  company?: string
  jobTitle?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressZip?: string
  addressCountry?: string
  status?: ContactStatus
  source?: ContactSource
  tags?: string[]
  budgetMin?: number
  budgetMax?: number
  notes?: string
  customFields?: Record<string, any>
}

// For updating contacts
export interface UpdateContactInput extends Partial<CreateContactInput> {
  id: string
}

// Quick create (minimal fields)
export interface QuickCreateContactInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
}

// Search and filter params
export interface ContactsFilterParams {
  search?: string // Search in name, email, phone, company
  status?: ContactStatus[]
  source?: ContactSource[]
  tags?: string[]
  budgetMin?: number
  budgetMax?: number
  hasEmail?: boolean
  hasPhone?: boolean
  createdAfter?: Date
  createdBefore?: Date
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'updatedAt' | 'lastActivity'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// ============================================================================
// Property Types (Basic - will expand in property feature)
// ============================================================================

export type PropertyStatus = 'available' | 'pending' | 'sold' | 'rented'

export type PropertyType = 'residential' | 'commercial' | 'land'

export interface Property {
  id: string
  userId: string
  title: string
  description?: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  latitude?: number
  longitude?: number
  price?: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  lotSize?: number
  yearBuilt?: number
  propertyType: PropertyType
  status: PropertyStatus
  listingDate?: Date
  images: string[]
  virtualTourUrl?: string
  tags: string[]
  customFields: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// For list views with computed fields
export interface PropertyWithRelations extends Property {
  contactCount?: number
  documentCount?: number
  dealCount?: number
}

// For creating properties
export interface CreatePropertyInput {
  title: string
  description?: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  latitude?: number
  longitude?: number
  price?: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  lotSize?: number
  yearBuilt?: number
  propertyType?: PropertyType
  status?: PropertyStatus
  listingDate?: Date
  images?: string[]
  virtualTourUrl?: string
  tags?: string[]
  customFields?: Record<string, any>
}

// For updating properties
export interface UpdatePropertyInput extends Partial<CreatePropertyInput> {
  id: string
}

// Search and filter params
export interface PropertiesFilterParams {
  search?: string // Search in title, address, city
  status?: PropertyStatus[]
  propertyType?: PropertyType[]
  tags?: string[]
  priceMin?: number
  priceMax?: number
  bedroomsMin?: number
  bedroomsMax?: number
  bathroomsMin?: number
  bathroomsMax?: number
  squareFeetMin?: number
  squareFeetMax?: number
  city?: string
  state?: string
  sortBy?: 'title' | 'price' | 'bedrooms' | 'createdAt' | 'listingDate'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// ============================================================================
// Deal Types (Basic - will expand in deals feature)
// ============================================================================

export type DealStage =
  | 'lead'
  | 'qualified'
  | 'showing'
  | 'offer'
  | 'negotiation'
  | 'under_contract'
  | 'closed_won'
  | 'closed_lost'

export interface Deal {
  id: string
  userId: string
  contactId: string
  propertyId?: string
  title: string
  value?: number
  stage: DealStage
  probability?: number
  expectedCloseDate?: Date
  actualCloseDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Activity Types (Basic - will expand in activity feature)
// ============================================================================

export type ActivityType =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'showing'
  | 'note'
  | 'task'

export interface Activity {
  id: string
  userId: string
  contactId?: string
  propertyId?: string
  dealId?: string
  type: ActivityType
  subject?: string
  description?: string
  completed: boolean
  dueDate?: Date
  completedAt?: Date
  createdAt: Date
}

// ============================================================================
// Document Types
// ============================================================================

export type EntityType = 'contact' | 'property' | 'deal'

export type DocumentCategory =
  | 'contract'
  | 'id'
  | 'inspection_report'
  | 'photo'
  | 'floor_plan'
  | 'title_deed'
  | 'other'

export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type SignatureStatus = 'unsigned' | 'partially_signed' | 'fully_signed'

// AI-extracted metadata structure
export interface AIMetadata {
  // People mentioned in document
  names?: Array<{
    name: string
    context: string // "buyer", "seller", "agent", "witness"
    confidence: number
  }>

  // Important dates
  dates?: Array<{
    date: Date
    type: string // "closing_date", "inspection_date", "expiration_date"
    confidence: number
  }>

  // Document properties
  documentType?: string // "contract", "inspection_report", "id"
  hasSignature?: boolean
  signatureCount?: number

  // Importance assessment
  importanceReasons?: string[]

  // Auto-linking suggestions
  suggestedContacts?: Array<{ contactId: string; confidence: number }>
  suggestedProperties?: Array<{ propertyId: string; confidence: number }>
}

export interface Document {
  id: string
  userId: string
  filename: string
  fileUrl: string
  fileSize?: number // Bytes
  fileType?: string // MIME type
  entityType: EntityType
  entityId: string
  category?: DocumentCategory
  tags: string[]
  description?: string
  uploadedBy?: string
  createdAt: Date
  updatedAt: Date

  // OCR fields
  ocrText?: string
  ocrStatus: OCRStatus
  ocrProcessedAt?: Date

  // AI metadata fields
  aiMetadata?: AIMetadata
  aiConfidence?: number // 0.00 to 1.00
  aiProcessedAt?: Date

  // Document intelligence fields
  hasSignature: boolean
  signatureStatus?: SignatureStatus
  importanceScore?: number // 1-5 scale (1=low, 5=critical)
  extractedNames: string[]
  extractedDates: Date[]
  relatedContactIds: string[]
  relatedPropertyIds: string[]
}

export interface CreateDocumentInput {
  filename: string
  fileUrl: string
  fileSize?: number
  fileType?: string
  entityType: EntityType
  entityId: string
  category?: DocumentCategory
  tags?: string[]
  description?: string
}

export interface UpdateDocumentInput extends Partial<CreateDocumentInput> {
  id: string
}

// ============================================================================
// Document Embeddings & Semantic Search Types
// ============================================================================

export interface DocumentEmbedding {
  id: string
  documentId: string
  userId: string
  embedding: number[] // 384-dimensional vector
  contentHash: string
  chunkIndex: number
  chunkText: string
  chunkLength: number
  createdAt: Date
  updatedAt: Date
}

export interface SemanticSearchResult {
  documentId: string
  filename: string
  fileUrl: string
  category?: string
  similarity: number
  chunkText: string
  chunkIndex: number
  // Related document fields for context
  document?: Document
}

export interface SemanticSearchParams {
  query: string
  threshold?: number // Minimum similarity (0-1), default 0.6
  limit?: number // Max results, default 20
  entityType?: EntityType // Filter by entity type
  category?: DocumentCategory // Filter by category
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getContactFullName(contact: Contact | CreateContactInput): string {
  return `${contact.firstName} ${contact.lastName}`.trim()
}

export function getContactInitials(contact: Contact | CreateContactInput): string {
  return `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase()
}

export function getContactDisplayInfo(contact: Contact): string {
  if (contact.company) {
    return contact.company
  }
  if (contact.email) {
    return contact.email
  }
  if (contact.phone) {
    return contact.phone
  }
  return 'No contact info'
}

export function formatContactBudget(contact: Contact): string | null {
  if (!contact.budgetMin && !contact.budgetMax) {
    return null
  }
  if (contact.budgetMin && contact.budgetMax) {
    return `$${contact.budgetMin.toLocaleString()} - $${contact.budgetMax.toLocaleString()}`
  }
  if (contact.budgetMin) {
    return `$${contact.budgetMin.toLocaleString()}+`
  }
  if (contact.budgetMax) {
    return `Up to $${contact.budgetMax.toLocaleString()}`
  }
  return null
}

export function getContactStatusColor(
  status: ContactStatus
): { bg: string; text: string; border: string } {
  switch (status) {
    case 'lead':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
      }
    case 'client':
      return {
        bg: 'bg-green-50 dark:bg-green-950/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
      }
    case 'past_client':
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-800',
      }
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-800',
      }
  }
}

export function getContactStatusLabel(status: ContactStatus): string {
  switch (status) {
    case 'lead':
      return 'Lead'
    case 'client':
      return 'Client'
    case 'past_client':
      return 'Past Client'
    default:
      return status
  }
}

// Property Helper Functions
export function formatPropertyPrice(property: Property): string {
  if (!property.price) {
    return 'Price not set'
  }
  return `$${property.price.toLocaleString()}`
}

export function formatPropertyDetails(property: Property): string {
  const parts: string[] = []

  if (property.bedrooms) parts.push(`${property.bedrooms} bed`)
  if (property.bathrooms) parts.push(`${property.bathrooms} bath`)
  if (property.squareFeet) parts.push(`${property.squareFeet.toLocaleString()} sqft`)

  return parts.join(' • ') || 'No details'
}

export function getPropertyStatusColor(
  status: PropertyStatus
): { bg: string; text: string; border: string } {
  switch (status) {
    case 'available':
      return {
        bg: 'bg-green-50 dark:bg-green-950/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
      }
    case 'pending':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-950/20',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
      }
    case 'sold':
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-800',
      }
    case 'rented':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
      }
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-800',
      }
  }
}

export function getPropertyStatusLabel(status: PropertyStatus): string {
  switch (status) {
    case 'available':
      return 'Available'
    case 'pending':
      return 'Pending'
    case 'sold':
      return 'Sold'
    case 'rented':
      return 'Rented'
    default:
      return status
  }
}

export function getPropertyTypeLabel(type: PropertyType): string {
  switch (type) {
    case 'residential':
      return 'Residential'
    case 'commercial':
      return 'Commercial'
    case 'land':
      return 'Land'
    default:
      return type
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
