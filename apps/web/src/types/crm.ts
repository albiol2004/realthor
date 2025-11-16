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
  price?: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  lotSize?: number
  propertyType?: PropertyType
  status: PropertyStatus
  listingDate?: Date
  images: string[]
  virtualTourUrl?: string
  tags: string[]
  customFields: Record<string, any>
  createdAt: Date
  updatedAt: Date
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
