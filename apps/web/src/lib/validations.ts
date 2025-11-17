import { z } from 'zod'

// ============================================================================
// Contact Validation Schemas
// ============================================================================

export const contactStatusSchema = z.enum(['lead', 'client', 'past_client'])

export const contactSourceSchema = z.enum([
  'referral',
  'website',
  'social_media',
  'cold_call',
  'other',
])

export const propertyRoleSchema = z.enum(['owner', 'buyer', 'seller', 'tenant'])

// Quick create contact schema (minimal required fields)
export const quickCreateContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  phone: z.string().optional(),
})

// Full create contact schema
export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  phone: z.string().optional(),
  profilePictureUrl: z.union([z.string().url(), z.literal('')]).optional(),

  company: z.string().max(200).optional(),
  jobTitle: z.string().max(100).optional(),

  addressStreet: z.string().max(200).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(100).optional(),
  addressZip: z.string().max(20).optional(),
  addressCountry: z.string().max(100).optional(),

  status: contactStatusSchema.default('lead'),
  source: contactSourceSchema.optional(),
  tags: z.array(z.string()).default([]),

  budgetMin: z.number().positive().max(999999999, 'Budget too large (max $999,999,999)').optional(),
  budgetMax: z.number().positive().max(999999999, 'Budget too large (max $999,999,999)').optional(),

  notes: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
})

// Update contact schema (all fields optional except id)
export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().uuid('Invalid contact ID'),
})

// Contacts filter schema
export const contactsFilterSchema = z.object({
  search: z.string().optional(),
  status: z.array(contactStatusSchema).optional(),
  source: z.array(contactSourceSchema).optional(),
  tags: z.array(z.string()).optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  sortBy: z
    .enum(['firstName', 'lastName', 'createdAt', 'updatedAt', 'lastActivity'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),
})

// Contact-property relationship schema
export const createContactPropertySchema = z.object({
  contactId: z.string().uuid(),
  propertyId: z.string().uuid(),
  role: propertyRoleSchema,
})

export const deleteContactPropertySchema = z.object({
  contactId: z.string().uuid(),
  propertyId: z.string().uuid(),
  role: propertyRoleSchema,
})

// ============================================================================
// Property Validation Schemas
// ============================================================================

export const propertyStatusSchema = z.enum(['available', 'pending', 'sold', 'rented'])

export const propertyTypeSchema = z.enum(['residential', 'commercial', 'land'])

// Create property schema
export const createPropertySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),

  address: z.string().min(1, 'Address is required').max(300),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),

  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  price: z.number().positive().max(999999999, 'Price too large (max $999,999,999)').optional(),
  bedrooms: z.number().int().positive().max(100).optional(),
  bathrooms: z.number().positive().max(50).optional(),
  squareFeet: z.number().int().positive().max(1000000).optional(),
  lotSize: z.number().int().positive().max(1000000000).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 1).optional(),

  propertyType: propertyTypeSchema.default('residential'),
  status: propertyStatusSchema.default('available'),
  listingDate: z.date().optional(),

  images: z.array(z.string().url()).default([]),
  virtualTourUrl: z.union([z.string().url(), z.literal('')]).optional(),

  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.any()).optional(),
})

// Update property schema (all fields optional except id)
export const updatePropertySchema = createPropertySchema.partial().extend({
  id: z.string().uuid('Invalid property ID'),
})

// Properties filter schema
export const propertiesFilterSchema = z.object({
  search: z.string().optional(),
  status: z.array(propertyStatusSchema).optional(),
  propertyType: z.array(propertyTypeSchema).optional(),
  tags: z.array(z.string()).optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  bedroomsMin: z.number().int().positive().optional(),
  bedroomsMax: z.number().int().positive().optional(),
  bathroomsMin: z.number().positive().optional(),
  bathroomsMax: z.number().positive().optional(),
  squareFeetMin: z.number().int().positive().optional(),
  squareFeetMax: z.number().int().positive().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  sortBy: z
    .enum(['title', 'price', 'bedrooms', 'createdAt', 'listingDate'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),
})

// ============================================================================
// Document Validation Schemas
// ============================================================================

export const entityTypeSchema = z.enum(['contact', 'property', 'deal'])

export const documentCategorySchema = z.enum([
  'contract',
  'id',
  'inspection_report',
  'photo',
  'floor_plan',
  'title_deed',
  'other',
])

// Create document schema
export const createDocumentSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  fileUrl: z.string().url('Invalid file URL'),
  fileSize: z.number().int().positive().optional(),
  fileType: z.string().max(100).optional(),
  entityType: entityTypeSchema,
  entityId: z.string().uuid('Invalid entity ID'),
  category: documentCategorySchema.optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().max(1000).optional(),
})

// Update document schema (all fields optional except id)
export const updateDocumentSchema = createDocumentSchema.partial().extend({
  id: z.string().uuid('Invalid document ID'),
})
