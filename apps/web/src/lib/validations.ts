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

  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),

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
