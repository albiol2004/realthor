/**
 * CRM Types - Contacts, Properties, Deals, Activities
 */

// ============================================================================
// Contact Types
// ============================================================================

export type ContactStatus = 'lead' | 'client' | 'past_client'

export type ContactCategory =
  | 'potential_buyer'
  | 'potential_seller'
  | 'signed_buyer'
  | 'signed_seller'
  | 'potential_lender'
  | 'potential_tenant'

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
  category?: ContactCategory
  source?: ContactSource
  tags: string[]
  role?: 'buyer' | 'seller' | 'lender' | 'tenant' | 'landlord' | 'other'

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
  category?: ContactCategory
  source?: ContactSource
  tags?: string[]
  role?: 'buyer' | 'seller' | 'lender' | 'tenant' | 'landlord' | 'other'
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
  category?: ContactCategory[]
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
  | 'qualification'
  | 'meeting'
  | 'proposal'
  | 'showing'
  | 'offer'
  | 'negotiation'
  | 'under_contract'
  | 'closed_won'
  | 'closed_lost'

export type DealType =
  | 'residential_resale'    // Second-hand residential
  | 'new_development'       // New build from developer
  | 'residential_rental'    // Residential rental (LAU)
  | 'commercial'            // Commercial & retail
  | 'rural_land'           // Rural properties & land

export interface Deal {
  id: string
  userId: string
  title: string
  dealType: DealType
  value?: number
  stage: DealStage
  probability?: number
  expectedCloseDate?: Date
  actualCloseDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Junction table types
export interface DealContact {
  id: string
  dealId: string
  contactId: string
  role?: string
  createdAt: Date
}

export interface DealProperty {
  id: string
  dealId: string
  propertyId: string
  role?: string
  createdAt: Date
}

// Deal with loaded relations
export interface DealWithRelations extends Deal {
  contacts?: Contact[]
  properties?: PropertyWithRelations[]
  contactIds?: string[]
  propertyIds?: string[]
}

// For creating deals
export interface CreateDealInput {
  contactIds: string[]  // At least one contact required
  propertyIds?: string[]
  title: string
  dealType: DealType
  value?: number
  stage?: DealStage
  probability?: number
  expectedCloseDate?: Date
  notes?: string
}

// For updating deals
export interface UpdateDealInput {
  id: string
  title?: string
  dealType?: DealType
  value?: number
  stage?: DealStage
  probability?: number
  expectedCloseDate?: Date
  actualCloseDate?: Date
  notes?: string
}

// For filtering deals
export interface DealsFilterParams {
  contactId?: string
  propertyId?: string
  dealType?: DealType
  stage?: DealStage
  search?: string
  limit?: number
  offset?: number
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

// Comprehensive Spanish Real Estate Document Types
export type DocumentType =
  // Contratos / Contracts
  | 'contrato_compraventa' // Purchase-sale contract
  | 'contrato_arras' // Earnest money contract
  | 'contrato_alquiler' // Rental contract
  | 'contrato_reserva' // Reservation contract
  | 'contrato_obra' // Construction contract
  | 'contrato_hipoteca' // Mortgage contract

  // Escrituras / Deeds
  | 'escritura_propiedad' // Property deed
  | 'escritura_hipoteca' // Mortgage deed
  | 'nota_simple' // Simple registry note

  // Certificados / Certificates
  | 'certificado_eficiencia_energetica' // Energy efficiency certificate (CEE)
  | 'certificado_habitabilidad' // Habitability certificate (Cédula de Habitabilidad)
  | 'certificado_antigüedad' // Antiquity certificate
  | 'certificado_cargas' // Certificate of charges

  // Licencias y Permisos / Licenses & Permits
  | 'licencia_ocupacion' // Occupancy license
  | 'licencia_obra' // Building permit
  | 'licencia_primera_ocupacion' // First occupancy license

  // Fiscales / Tax Documents
  | 'ibi' // Property tax (Impuesto sobre Bienes Inmuebles)
  | 'plusvalia' // Capital gains tax
  | 'modelo_210' // Non-resident tax form
  | 'modelo_600' // Transfer tax form
  | 'modelo_714' // Wealth tax form

  // Comunidad / Community
  | 'estatutos_comunidad' // Community statutes
  | 'acta_junta' // Community meeting minutes
  | 'recibo_comunidad' // Community fees receipt
  | 'certificado_deudas_comunidad' // Certificate of community debts

  // Inspecciones y Valoraciones / Inspections & Appraisals
  | 'informe_tasacion' // Appraisal report
  | 'inspeccion_tecnica' // Technical inspection (ITE)
  | 'informe_cedulas_ilegales' // Illegal rooms report

  // Servicios / Utilities
  | 'contrato_luz' // Electricity contract
  | 'contrato_agua' // Water contract
  | 'contrato_gas' // Gas contract
  | 'boletin_electrico' // Electrical certificate

  // Identificación / Identification
  | 'dni' // National ID (Spain)
  | 'nie' // Foreign ID number
  | 'pasaporte' // Passport
  | 'poder_notarial' // Power of attorney

  // Planos y Documentación Técnica / Plans & Technical Docs
  | 'plano_vivienda' // Floor plan
  | 'plano_catastral' // Cadastral plan
  | 'referencia_catastral' // Cadastral reference
  | 'proyecto_tecnico' // Technical project

  // Fotografías / Photos
  | 'foto_exterior' // Exterior photo
  | 'foto_interior' // Interior photo
  | 'foto_defecto' // Defect photo

  // Seguros / Insurance
  | 'seguro_hogar' // Home insurance
  | 'seguro_vida' // Life insurance
  | 'seguro_decenal' // 10-year insurance

  // Otros / Other
  | 'recibo_pago' // Payment receipt
  | 'factura' // Invoice
  | 'presupuesto' // Quote/estimate
  | 'otro' // Other

  // English aliases for deal compliance (match DEALS_CATEGORIES.md)
  | 'dni_nie_passport' // DNI/NIE/Passport (same as dni/nie/pasaporte)
  | 'power_of_attorney' // Power of Attorney (same as poder_notarial)
  | 'kyc_form' // KYC Form (Anti-Money Laundering)
  | 'proof_of_funds' // Proof of Funds
  | 'title_deed' // Title Deed (same as escritura_propiedad)
  | 'nota_simple' // Nota Simple (already exists)
  | 'energy_certificate' // Energy Certificate (same as certificado_eficiencia_energetica)
  | 'community_debt_certificate' // Community Debt Certificate (same as certificado_deudas_comunidad)
  | 'habitability_certificate' // Habitability Certificate (same as certificado_habitabilidad)
  | 'seguro_decenal' // 10-year insurance (already exists)
  | 'ibi_receipt' // IBI Receipt (same as ibi)
  | 'listing_agreement' // Sales Listing Agreement (Nota de Encargo)
  | 'certificate_no_urban_infraction' // Certificate of No Urban Infraction
  | 'arras_contract' // Arras Contract (same as contrato_arras)
  | 'technical_building_inspection' // ITE (same as inspeccion_tecnica)
  | 'electrical_bulletin' // Electrical Bulletin (same as boletin_electrico)
  | 'plusvalia_estimate' // Plusvalía Estimate
  | 'community_meeting_minutes' // Community Meeting Minutes (same as acta_junta)
  | 'floor_plans' // Floor Plans (same as plano_vivienda)
  | 'utility_bills' // Utility Bills
  | 'reservation_contract' // Reservation Contract (same as contrato_reserva)
  | 'purchase_contract' // Purchase Contract (same as contrato_compraventa)
  | 'first_occupation_license' // First Occupation License (same as licencia_primera_ocupacion)
  | 'building_book' // Building Book (Libro del Edificio)
  | 'bank_guarantee' // Bank Guarantee (Aval Bancario)
  | 'architectural_plans' // Stamped Architectural Plans
  | 'quality_specifications' // Quality Specifications (Memoria de Calidades)
  | 'progress_reports' // Construction Progress Reports
  | 'rental_contract' // Rental Contract (same as contrato_alquiler)
  | 'payslips' // Payslips (Nóminas)
  | 'tax_returns' // Tax Returns
  | 'rent_default_insurance' // Rent Default Insurance (Seguro de Impago)
  | 'property_inventory' // Property Inventory
  | 'community_statutes' // Community Statutes (same as estatutos_comunidad)
  | 'company_deeds' // Company Deeds (Escritura de Constitución)
  | 'cif' // CIF (Company ID)
  | 'administrator_id' // Administrator ID
  | 'urban_compatibility_certificate' // Urban Compatibility Certificate
  | 'opening_license' // Opening License (Licencia de Apertura)
  | 'acoustic_audit' // Acoustic/Soundproofing Audit
  | 'urban_planning_certificate' // Urban Planning Certificate (Cédula Urbanística)
  | 'topographic_survey' // Topographic Survey (Georreferenciación)
  | 'water_rights' // Water Rights Documentation

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

  // Metadata fields (editable)
  documentType?: DocumentType // Spanish real estate document type
  documentDate?: Date // Date document was created/signed
  dueDate?: Date // Date document expires or is due
  description?: string // AI-generated but editable
  tags: string[]

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
  relatedContactIds: string[] // Fuzzy searchable contacts
  relatedPropertyIds: string[] // Fuzzy searchable properties
}

export interface CreateDocumentInput {
  filename: string
  fileUrl: string
  fileSize?: number
  fileType?: string
  entityType: EntityType
  entityId: string
  documentType?: DocumentType
  documentDate?: Date
  dueDate?: Date
  tags?: string[]
  description?: string
  relatedContactIds?: string[]
  relatedPropertyIds?: string[]
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
  category?: DocumentType // Filter by category
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

export function getContactCategoryLabel(category: ContactCategory): string {
  switch (category) {
    case 'potential_buyer':
      return 'Potential Buyer'
    case 'potential_seller':
      return 'Potential Seller'
    case 'signed_buyer':
      return 'Signed Buyer'
    case 'signed_seller':
      return 'Signed Seller'
    case 'potential_lender':
      return 'Potential Lender'
    case 'potential_tenant':
      return 'Potential Tenant'
    default:
      return category
  }
}

export function getContactCategoryColor(
  category: ContactCategory
): { bg: string; text: string; border: string } {
  switch (category) {
    case 'potential_buyer':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
      }
    case 'potential_seller':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
      }
    case 'signed_buyer':
      return {
        bg: 'bg-green-50 dark:bg-green-950/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
      }
    case 'signed_seller':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
      }
    case 'potential_lender':
      return {
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
      }
    case 'potential_tenant':
      return {
        bg: 'bg-cyan-50 dark:bg-cyan-950/20',
        text: 'text-cyan-700 dark:text-cyan-300',
        border: 'border-cyan-200 dark:border-cyan-800',
      }
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-800',
      }
  }
}

// Deal Helper Functions
export function getDealStageLabel(stage: DealStage): string {
  const stageLabels: Record<DealStage, string> = {
    lead: 'Lead',
    qualified: 'Qualified',
    qualification: 'Qualification',
    meeting: 'Meeting',
    proposal: 'Proposal',
    showing: 'Showing',
    offer: 'Offer',
    negotiation: 'Negotiation',
    under_contract: 'Under Contract',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost',
  }
  return stageLabels[stage] || stage
}

export function getDealStageColor(stage: DealStage): string {
  const stageColors: Record<DealStage, string> = {
    lead: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
    qualified: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900',
    qualification: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900',
    meeting: 'text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900',
    proposal: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900',
    showing: 'text-cyan-700 bg-cyan-100 dark:text-cyan-300 dark:bg-cyan-900',
    offer: 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-900',
    negotiation: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900',
    under_contract: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900',
    closed_won: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900',
    closed_lost: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900',
  }
  return stageColors[stage] || 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800'
}

export function formatDealValue(value?: number): string {
  if (!value) return 'No value'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function getDealTypeLabel(dealType: DealType): string {
  const dealTypeLabels: Record<DealType, string> = {
    residential_resale: 'Residential Resale',
    new_development: 'New Development',
    residential_rental: 'Residential Rental',
    commercial: 'Commercial & Retail',
    rural_land: 'Rural & Land',
  }
  return dealTypeLabels[dealType] || dealType
}

export function getDealTypeColor(dealType: DealType): string {
  const dealTypeColors: Record<DealType, string> = {
    residential_resale: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900',
    new_development: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900',
    residential_rental: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900',
    commercial: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900',
    rural_land: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900',
  }
  return dealTypeColors[dealType] || 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800'
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
