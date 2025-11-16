import { contactsRepository } from '@/server/repositories/contacts.repository'
import type {
  Contact,
  ContactWithRelations,
  CreateContactInput,
  UpdateContactInput,
  QuickCreateContactInput,
  ContactsFilterParams,
  PropertyRole,
} from '@/types/crm'
import { TRPCError } from '@trpc/server'

/**
 * Contacts Service
 * Business logic for contact management
 */
export class ContactsService {
  /**
   * List contacts with filtering and pagination
   */
  async list(
    userId: string,
    filters?: ContactsFilterParams
  ): Promise<{ contacts: ContactWithRelations[]; total: number }> {
    return await contactsRepository.list(userId, filters)
  }

  /**
   * Get a contact by ID
   */
  async getById(userId: string, contactId: string): Promise<Contact> {
    const contact = await contactsRepository.findById(userId, contactId)

    if (!contact) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contact not found',
      })
    }

    return contact
  }

  /**
   * Create a new contact (full form)
   */
  async create(userId: string, input: CreateContactInput): Promise<Contact> {
    // Check for duplicate email if provided
    if (input.email) {
      const existing = await contactsRepository.findByEmail(userId, input.email)
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A contact with this email already exists',
        })
      }
    }

    // Validate budget range
    if (input.budgetMin && input.budgetMax && input.budgetMin > input.budgetMax) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Minimum budget cannot be greater than maximum budget',
      })
    }

    return await contactsRepository.create(userId, input)
  }

  /**
   * Quick create a contact (minimal fields)
   */
  async quickCreate(userId: string, input: QuickCreateContactInput): Promise<Contact> {
    // Check for duplicate email if provided
    if (input.email) {
      const existing = await contactsRepository.findByEmail(userId, input.email)
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A contact with this email already exists',
        })
      }
    }

    // Convert to full create input with defaults
    const createInput: CreateContactInput = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      status: 'lead',
      tags: [],
    }

    return await contactsRepository.create(userId, createInput)
  }

  /**
   * Update a contact
   */
  async update(userId: string, input: UpdateContactInput): Promise<Contact> {
    // Check if contact exists
    const existing = await contactsRepository.findById(userId, input.id)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contact not found',
      })
    }

    // Check for duplicate email if changing email
    if (input.email && input.email !== existing.email) {
      const duplicate = await contactsRepository.findByEmail(userId, input.email)
      if (duplicate && duplicate.id !== input.id) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A contact with this email already exists',
        })
      }
    }

    // Validate budget range
    const newBudgetMin = input.budgetMin ?? existing.budgetMin
    const newBudgetMax = input.budgetMax ?? existing.budgetMax
    if (newBudgetMin && newBudgetMax && newBudgetMin > newBudgetMax) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Minimum budget cannot be greater than maximum budget',
      })
    }

    return await contactsRepository.update(userId, input)
  }

  /**
   * Delete a contact
   */
  async delete(userId: string, contactId: string): Promise<void> {
    // Check if contact exists
    const existing = await contactsRepository.findById(userId, contactId)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contact not found',
      })
    }

    await contactsRepository.delete(userId, contactId)
  }

  /**
   * Get properties associated with a contact
   */
  async getContactProperties(userId: string, contactId: string) {
    // Verify contact belongs to user
    const contact = await this.getById(userId, contactId)
    return await contactsRepository.getContactProperties(contact.id)
  }

  /**
   * Link a contact to a property with a role
   */
  async linkToProperty(
    userId: string,
    contactId: string,
    propertyId: string,
    role: PropertyRole
  ) {
    // Verify contact belongs to user
    await this.getById(userId, contactId)

    // TODO: Verify property belongs to user when we implement properties
    // For now, just create the relationship

    try {
      return await contactsRepository.addContactProperty(contactId, propertyId, role)
    } catch (error: any) {
      // Handle unique constraint violation (duplicate relationship)
      if (error.message.includes('duplicate') || error.code === '23505') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This contact-property relationship already exists',
        })
      }
      throw error
    }
  }

  /**
   * Unlink a contact from a property
   */
  async unlinkFromProperty(
    userId: string,
    contactId: string,
    propertyId: string,
    role: PropertyRole
  ) {
    // Verify contact belongs to user
    await this.getById(userId, contactId)

    await contactsRepository.removeContactProperty(contactId, propertyId, role)
  }

  /**
   * Search contacts (simplified search by name, email, phone)
   */
  async search(userId: string, query: string, limit: number = 10): Promise<Contact[]> {
    const { contacts } = await contactsRepository.list(userId, {
      search: query,
      limit,
      sortBy: 'firstName',
      sortOrder: 'asc',
    })

    return contacts
  }
}

export const contactsService = new ContactsService()
