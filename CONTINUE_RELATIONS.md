# Continue: Many-to-Many Relations Implementation

## 🎯 Current Status: 70% Complete

### ✅ Completed Tasks

1. **Database Migration** ✅
   - File: `supabase/migrations/20250124_add_many_to_many_relations.sql`
   - Migration has been run successfully
   - Created tables: `deal_contacts`, `deal_properties`
   - Migrated existing data
   - Removed old `contact_id` and `property_id` columns from deals table
   - Added RLS policies

2. **TypeScript Types** ✅
   - Updated `/types/crm.ts`:
     - Removed `contactId` and `propertyId` from `Deal` interface
     - Added `DealContact` and `DealProperty` junction types
     - Added `DealWithRelations` type with `contactIds[]` and `propertyIds[]`
     - Updated `CreateDealInput` to use `contactIds[]` and `propertyIds[]`

3. **Validation Schemas** ✅
   - Updated `/lib/validations.ts`:
     - `createDealSchema`: Now uses `contactIds` array (min 1 required)
     - `updateDealSchema`: Updated (relations managed separately)
     - Added `addDealContactSchema`
     - Added `removeDealContactSchema`
     - Added `addDealPropertySchema`
     - Added `removeDealPropertySchema`
     - Added `updateDealRelationsSchema`

4. **Deals Repository** ✅
   - File: `/server/repositories/deals.repository.ts`
   - Completely rewritten to handle many-to-many relations
   - New methods:
     - `list()` - Filters by junction tables, optional relation loading
     - `findById()` - Optional relation loading
     - `create()` - Creates deal + links contacts/properties
     - `getRelatedContactIds()`
     - `getRelatedPropertyIds()`
     - `addContact()`
     - `removeContact()`
     - `addProperty()`
     - `removeProperty()`
     - `updateRelations()` - Bulk replace relations
     - `loadRelations()` - Private method to load related IDs

5. **Deals Service** ✅
   - File: `/server/services/deals.service.ts`
   - Updated all methods
   - Added relation management methods
   - Added validation (e.g., can't remove last contact)

6. **tRPC Router** ✅
   - File: `/server/routers/deals.ts`
   - Updated all existing endpoints
   - Added new endpoints:
     - `getRelatedContactIds`
     - `getRelatedPropertyIds`
     - `addContact`
     - `removeContact`
     - `addProperty`
     - `removeProperty`
     - `updateRelations`

7. **Sidebar** ✅
   - Removed "Compliance" page from navigation

---

## ⚠️ Current Compilation Errors

Running `pnpm type-check` shows these errors:

```
src/components/crm/contact-deals-tab.tsx(113,7):
  error TS2561: 'contactId' does not exist. Did you mean 'contactIds'?

src/components/deals/deal-detail.tsx(65,16):
  error TS2339: Property 'contactId' does not exist on type 'Deal'.

src/components/deals/deal-detail.tsx(66,23):
  error TS2339: Property 'contactId' does not exist on type 'Deal'.

src/components/deals/deal-detail.tsx(71,16):
  error TS2339: Property 'propertyId' does not exist on type 'Deal'.

src/components/deals/deal-detail.tsx(72,23):
  error TS2339: Property 'propertyId' does not exist on type 'Deal'.

src/components/deals/deal-form-dialog.tsx(113,7):
  error TS2561: 'contactId' does not exist. Did you mean 'contactIds'?

src/components/deals/deal-list.tsx(41,52):
  error TS2339: Property 'contactId' does not exist on type 'Deal'.

src/components/deals/deal-list.tsx(48,53):
  error TS2339: Property 'propertyId' does not exist on type 'Deal'.

src/components/deals/deal-list.tsx(69,65):
  error TS2339: Property 'contactId' does not exist on type 'Deal'.

src/components/deals/deal-list.tsx(70,77):
  error TS2339: Property 'propertyId' does not exist on type 'Deal'.
```

---

## 🔧 Files That Need Fixing

### 1. `/components/crm/contact-deals-tab.tsx`

**Issue:** Line 113 - Using `contactId` instead of `contactIds`

**Fix:**
```typescript
// OLD (line ~110-117):
createMutation.mutate({
  contactId,  // ❌ WRONG
  title: title.trim(),
  dealType,
  // ...
})

// NEW:
createMutation.mutate({
  contactIds: [contactId],  // ✅ CORRECT - wrap in array
  propertyIds: propertyId ? [propertyId] : undefined,
  title: title.trim(),
  dealType,
  // ...
})
```

**Additional changes needed:**
- Keep the existing single contact/property selects (for simplicity in this view)
- Just wrap the IDs in arrays when calling the mutation

---

### 2. `/components/deals/deal-form-dialog.tsx`

**Issue:** Line 113 - Using `contactId` instead of `contactIds`

**Changes needed:**
1. **State:** Change from single select to multi-select
   ```typescript
   // OLD:
   const [contactId, setContactId] = useState(defaultContactId || '')
   const [propertyId, setPropertyId] = useState(defaultPropertyId || '')

   // NEW:
   const [selectedContacts, setSelectedContacts] = useState<string[]>(
     defaultContactId ? [defaultContactId] : []
   )
   const [selectedProperties, setSelectedProperties] = useState<string[]>(
     defaultPropertyId ? [defaultPropertyId] : []
   )
   ```

2. **UI:** Replace single Select with multi-select (can use Command component or multiple Select)

3. **Mutation:**
   ```typescript
   // OLD:
   createMutation.mutate({
     contactId,  // ❌
     propertyId: propertyId || undefined,
     // ...
   })

   // NEW:
   createMutation.mutate({
     contactIds: selectedContacts,  // ✅
     propertyIds: selectedProperties.length > 0 ? selectedProperties : undefined,
     // ...
   })
   ```

---

### 3. `/components/deals/deal-detail.tsx`

**Issues:** Lines 65-72 - Trying to access `deal.contactId` and `deal.propertyId`

**Major changes needed:**
1. **Fetch related IDs:**
   ```typescript
   // Add after existing queries:
   const { data: contactIds } = trpc.deals.getRelatedContactIds.useQuery(
     { dealId: deal.id },
     { enabled: !!deal.id }
   )

   const { data: propertyIds } = trpc.deals.getRelatedPropertyIds.useQuery(
     { dealId: deal.id },
     { enabled: !!deal.id }
   )
   ```

2. **Fetch actual contact/property data:**
   ```typescript
   // Fetch contacts
   const { data: contacts } = trpc.contacts.list.useQuery(
     { limit: 100 },
     { enabled: (contactIds?.length ?? 0) > 0 }
   )

   const relatedContacts = contacts?.contacts?.filter(c =>
     contactIds?.includes(c.id)
   ) || []

   // Similar for properties
   ```

3. **Add UI sections for managing relations:**
   - Section to display all related contacts with ability to add/remove
   - Section to display all related properties with ability to add/remove
   - Use Command component for search & add
   - Use X button to remove

4. **Add mutations:**
   ```typescript
   const addContactMutation = trpc.deals.addContact.useMutation({
     onSuccess: () => {
       invalidateDealQueries(utils)
       toast.success('Contact added')
     }
   })

   const removeContactMutation = trpc.deals.removeContact.useMutation({
     onSuccess: () => {
       invalidateDealQueries(utils)
       toast.success('Contact removed')
     }
   })

   // Similar for properties
   ```

**Note:** This is the most complex file to update. Consider copying approach from `/components/documents/document-detail.tsx` which already has multi-select for contacts/properties.

---

### 4. `/components/deals/deal-list.tsx`

**Issues:** Lines 41, 48, 69-70 - Accessing `deal.contactId` and `deal.propertyId`

**Changes needed:**

1. **Update query to fetch relations:**
   ```typescript
   // Current approach won't work because deals no longer have contactId/propertyId

   // Option A: Load deals with relations from repository
   // Would need to update the tRPC endpoint to return DealWithRelations[]

   // Option B: Fetch junction tables separately (current approach)
   // Need to query deal_contacts and deal_properties tables
   ```

2. **Query contact IDs for all deals:**
   ```typescript
   // After fetching deals:
   const dealIds = deals?.map(d => d.id) || []

   // Fetch all deal-contact links
   const { data: dealContacts } = trpc.deals.getRelatedContactIds.useQuery(...)
   // But this is per-deal, not ideal

   // Better: Create a batch endpoint or use repository to return contactIds/propertyIds
   ```

3. **Update enrichment logic:**
   ```typescript
   const enrichedDeals = deals?.map(deal => {
     // deal no longer has contactId or propertyId
     // Need to get from loaded relations
     const dealContactIds = contactIdsByDeal[deal.id] || []
     const dealPropertyIds = propertyIdsByDeal[deal.id] || []

     const primaryContact = contacts?.contacts?.find(c =>
       dealContactIds[0] === c.id
     )
     const primaryProperty = properties?.properties?.find(p =>
       dealPropertyIds[0] === p.id
     )

     return {
       ...deal,
       contactName: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : undefined,
       propertyAddress: primaryProperty?.address,
       complianceScore: undefined,
     }
   })
   ```

**Recommended solution:** Update the repository's `list()` method to always return `DealWithRelations[]` with `contactIds` and `propertyIds` arrays. Then map to get first contact/property for display.

---

### 5. `/components/deals/deal-card.tsx`

**No changes needed** - This file receives enriched data from parent, doesn't access `deal.contactId` directly.

---

## 📋 Recommended Implementation Order

1. **Quick Fixes First** (10 min):
   - Fix `contact-deals-tab.tsx` - just wrap IDs in arrays
   - This will unblock creating deals from contacts

2. **Update Deal Form Dialog** (20 min):
   - Add multi-select for contacts (can use same UI as contact-deals-tab initially)
   - Add multi-select for properties
   - This enables creating deals with multiple contacts/properties

3. **Update Deal List** (30 min):
   - Modify repository to always return relations
   - OR create a new tRPC endpoint that fetches all relations in batch
   - Update enrichment logic

4. **Update Deal Detail** (45 min):
   - This is the most complex
   - Add sections to view/manage contacts and properties
   - Copy patterns from document-detail.tsx for multi-select UI
   - Add mutation calls for add/remove

---

## 🧪 Testing Checklist

After all fixes are complete:

- [ ] Create a new deal with multiple contacts
- [ ] Create a new deal with multiple properties
- [ ] View deal detail - see all contacts and properties
- [ ] Add a contact to an existing deal
- [ ] Remove a contact from a deal (should prevent removing last one)
- [ ] Add a property to an existing deal
- [ ] Remove a property from a deal
- [ ] Filter deals by contact (in deal list)
- [ ] Filter deals by property (in deal list)
- [ ] View contact detail - see all related deals
- [ ] Delete a contact - verify deals still work
- [ ] Delete a property - verify deals still work
- [ ] Delete a deal - verify junction table entries are removed

---

## 💡 Helpful Code Patterns

### Multi-Select UI Pattern (from documents)

```typescript
// State
const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
const [contactSearch, setContactSearch] = useState('')

// Search query
const { data: contactResults } = trpc.contacts.search.useQuery(
  { query: contactSearch, limit: 10 },
  { enabled: contactSearch.length > 0 }
)

// UI - Command Component
<Command>
  <CommandInput
    placeholder="Search contacts..."
    value={contactSearch}
    onValueChange={setContactSearch}
  />
  <CommandList>
    <CommandEmpty>No contacts found</CommandEmpty>
    <CommandGroup>
      {contactResults?.map((contact) => (
        <CommandItem
          key={contact.id}
          onSelect={() => {
            if (!selectedContacts.find(c => c.id === contact.id)) {
              setSelectedContacts([...selectedContacts, contact])
            }
          }}
        >
          {contact.firstName} {contact.lastName}
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</Command>

// Selected items display
<div className="flex flex-wrap gap-2">
  {selectedContacts.map((contact) => (
    <Badge key={contact.id} variant="secondary">
      {contact.firstName} {contact.lastName}
      <button onClick={() => setSelectedContacts(
        selectedContacts.filter(c => c.id !== contact.id)
      )}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  ))}
</div>
```

---

## 🔗 Related Files Reference

- **Types:** `/types/crm.ts`
- **Validations:** `/lib/validations.ts`
- **Repository:** `/server/repositories/deals.repository.ts`
- **Service:** `/server/services/deals.service.ts`
- **Router:** `/server/routers/deals.ts`
- **Migration:** `/supabase/migrations/20250124_add_many_to_many_relations.sql`
- **Cache Invalidation:** `/lib/trpc/cache-invalidation.ts`
- **Implementation Plan:** `/IMPLEMENTATION_PLAN_RELATIONS.md`

---

## 🎯 Final Goal

All entities fully interconnected:
- Deals ←→ Contacts (many-to-many) ✅ Backend done, UI in progress
- Deals ←→ Properties (many-to-many) ✅ Backend done, UI in progress
- Documents → Contacts (array-based, already working)
- Documents → Properties (array-based, already working)
- Contacts ←→ Properties (many-to-many, already working)

**When complete:** Users can link any deal to multiple contacts and properties, and see all relationships from any entity!

---

## 🚀 To Resume Work

1. Read this document
2. Check current TypeScript errors: `pnpm type-check`
3. Start with "Quick Fixes First" section
4. Follow "Recommended Implementation Order"
5. Run tests from "Testing Checklist"
6. Update this document as you complete items

Good luck! 🎉
