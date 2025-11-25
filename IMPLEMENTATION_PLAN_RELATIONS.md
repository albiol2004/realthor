# Implementation Plan: Many-to-Many Relations

## Overview
This document outlines the changes needed to implement full many-to-many relations between Deals, Contacts, Properties, and Documents.

## Database Changes ✅ DONE
- Created junction tables: `deal_contacts`, `deal_properties`
- Migrated existing data from `deals.contact_id` and `deals.property_id`
- Removed old columns from deals table
- Added RLS policies
- Documents already have `related_contact_ids` and `related_property_ids` arrays

## TypeScript Types ✅ DONE
- Updated `Deal` interface (removed contactId, propertyId)
- Added `DealContact` and `DealProperty` junction types
- Added `DealWithRelations` type
- Updated `CreateDealInput` to use arrays
- Added relation management schemas in validations.ts

## Repository Changes NEXT
File: `/server/repositories/deals.repository.ts`

### Changes Needed:
1. Remove `contact_id` and `property_id` from mapToDeal()
2. Add method: `getRelatedContacts(dealId): Promise<string[]>`
3. Add method: `getRelatedProperties(dealId): Promise<string[]>`
4. Update `create()` to insert into junction tables
5. Update `list()` to optionally load relations
6. Update `findById()` to optionally load relations
7. Add method: `addContact(dealId, contactId, role?)`
8. Add method: `removeContact(dealId, contactId)`
9. Add method: `addProperty(dealId, propertyId, role?)`
10. Add method: `removeProperty(dealId, propertyId)`
11. Add method: `updateRelations(dealId, contactIds, propertyIds)`

## Service Changes
File: `/server/services/deals.service.ts`

### Changes Needed:
1. Update `create()` to handle contactIds and propertyIds arrays
2. Add methods for managing relations
3. Update `getById()` to load relations
4. Update `list()` to optionally load relations

## Router Changes
File: `/server/routers/deals.ts`

### Changes Needed:
1. Update input schemas to use new validations
2. Add endpoints:
   - `addContact`
   - `removeContact`
   - `addProperty`
   - `removeProperty`
   - `updateRelations`

## UI Changes

### Deal Detail Component
File: `/components/deals/deal-detail.tsx`

**Changes Needed:**
1. Add Contacts section with multi-select
2. Add Properties section with multi-select
3. Add ability to add/remove contacts
4. Add ability to add/remove properties
5. Show all related contacts and properties
6. Use Command component for search and select

### Deal Form Dialog
File: `/components/deals/deal-form-dialog.tsx`

**Changes Needed:**
1. Change from single contact select to multi-select
2. Change from single property select to multi-select (optional)
3. Update form state to use arrays
4. Update create mutation to send arrays

### Deal List
File: `/components/deals/deal-list.tsx`

**Changes Needed:**
1. Update to handle deals without direct contactId
2. Load contacts/properties from junction tables
3. Display multiple contacts/properties on cards

### Contact Deals Tab
File: `/components/crm/contact-deals-tab.tsx`

**Changes Needed:**
1. Update to work with new many-to-many structure
2. Filter deals by checking junction table
3. Update create form to use arrays

## Document Changes (Lower Priority)
Documents already have `related_contact_ids` and `related_property_ids` as arrays.

### Minor UI Updates Needed:
File: `/components/documents/document-detail.tsx`

**Changes Needed:**
1. Ensure properties can be linked (already supports contacts)
2. Add property search and multi-select if not present

## Testing Checklist
- [ ] Run migration successfully
- [ ] Create deal with multiple contacts
- [ ] Create deal with multiple properties
- [ ] Add contact to existing deal
- [ ] Remove contact from deal
- [ ] Add property to existing deal
- [ ] Remove property from deal
- [ ] Filter deals by contact
- [ ] Filter deals by property
- [ ] View deal detail shows all contacts
- [ ] View deal detail shows all properties
- [ ] View contact shows all related deals
- [ ] View property shows all related deals
- [ ] Delete contact removes from junction table
- [ ] Delete property removes from junction table
- [ ] Delete deal removes junction table entries

## Migration Script to Run
```sql
-- File: supabase/migrations/20250124_add_many_to_many_relations.sql
-- Apply via Supabase Dashboard or CLI
```

## Summary of Relations

```
deals ←→ deal_contacts ←→ contacts (many-to-many)
deals ←→ deal_properties ←→ properties (many-to-many)
contacts ←→ contact_properties ←→ properties (many-to-many, already exists)
documents.related_contact_ids → contacts (array-based, already exists)
documents.related_property_ids → properties (array-based, already exists)
```

All entities are now fully interconnected!
