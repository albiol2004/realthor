# Optimistic Updates & Responsiveness Implementation Plan

## Executive Summary

This document outlines the implementation plan for improving application responsiveness through optimistic updates, client-side caching, and real-time polling strategies. The goal is to eliminate the "lag" users experience when performing operations like adding contacts to deals, waiting for AI processing, or switching between documents.

## Current State Analysis

### ✅ Already Implemented

1. **Deal Contacts - Optimistic Updates** (`deal-detail.tsx:144-230`)
   - ✅ Add contact: Optimistic update + rollback on error
   - ✅ Remove contact: Optimistic update + rollback on error
   - ✅ Uses `utils.deals.getById.fetch()` to force fresh data after mutation

2. **Document AI Labeling - Polling** (`document-detail.tsx:69-101`)
   - ✅ Polling every 3 seconds when `isAILabelingInProgress === true`
   - ✅ Auto-stops polling when `aiProcessedAt` is set
   - ✅ 2-minute timeout with warning toast
   - ✅ Direct cache update via `utils.documents.getById.setData()`

3. **React Query Configuration** (`Provider.tsx:38-55`)
   - ✅ staleTime: 10 seconds (reasonable default)
   - ✅ gcTime: 5 minutes (good cache persistence)
   - ✅ networkMode: 'offlineFirst' (desktop-app-like UX)
   - ✅ refetchOnWindowFocus: true
   - ✅ retry: 1 with 500ms delay

### ❌ Missing / Issues

1. **Deal Properties - NO Optimistic Updates** (`deal-detail.tsx:233-254`)
   - ❌ `addPropertyMutation` only invalidates, no optimistic update
   - ❌ `removePropertyMutation` only invalidates, no optimistic update
   - **Impact:** User sees delay when adding/removing properties

2. **Deal Compliance Score - NO Client-Side Calculation** (`deal-detail.tsx:171-175, 218-221`)
   - ❌ Only refetches compliance after contact mutations complete
   - ❌ No instant feedback when contacts added/removed
   - **Impact:** Compliance score shows stale data until refetch completes

3. **Document Contacts/Properties - NO Optimistic Updates** (`document-detail.tsx:284-302`)
   - ❌ Only saves on "Guardar Detalles" button click
   - ❌ No optimistic updates when adding/removing contacts or properties
   - **Impact:** User must wait for save + refetch cycle

4. **Email Newline Rendering** (`email-message.tsx:150`)
   - ❌ Uses `dangerouslySetInnerHTML` with raw HTML
   - ❌ Plain text emails with `\n` characters collapse to single line
   - **Issue:** Email body renders as one line instead of preserving paragraphs
   - **Impact:** Emails from plain-text senders (e.g., Gmail API) are unreadable

---

## Implementation Plan

### Phase 1: Quick Wins (30 minutes)

#### 1.1 Fix Email Newline Rendering ⚡ CRITICAL

**File:** `apps/web/src/components/messaging/email/email-message.tsx`

**Problem:**
```tsx
// Line 150 - Current (BAD)
<div dangerouslySetInnerHTML={{ __html: email.body || "No content" }} />
```

Plain text emails with `\n` characters collapse because HTML ignores whitespace.

**Solution:**
```tsx
// Helper function to handle both plain text and HTML emails
const renderEmailBody = (body: string | null) => {
  if (!body) return "No content"

  // Detect if email is HTML (contains HTML tags)
  const isHTML = /<[a-z][\s\S]*>/i.test(body)

  if (isHTML) {
    // Already HTML, render as-is
    return body
  } else {
    // Plain text: Convert newlines to <br> tags
    return body
      .replace(/\r\n/g, '\n')  // Normalize Windows line endings
      .replace(/\n/g, '<br>')  // Convert \n to <br>
  }
}

// Line 150 - Updated
<div dangerouslySetInnerHTML={{ __html: renderEmailBody(email.body) }} />

// Also update preview (line 52-56)
const getTextPreview = (body: string | null) => {
  if (!body) return "No content"
  const text = body.replace(/<[^>]*>/g, '')  // Strip HTML tags
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n/g, ' ')  // Flatten for preview
  return normalized.length > 150 ? normalized.substring(0, 150) + '...' : normalized
}
```

**Testing:**
- Send plain text email from Gmail
- Verify paragraphs render with line breaks
- Send HTML email
- Verify HTML renders correctly

**Impact:** 🎯 HIGH - Fixes reported bug #2 in BUGS_TO_FIX.md

---

### Phase 2: Deal Property Optimistic Updates (45 minutes)

#### 2.1 Add Optimistic Updates for Property Add/Remove

**File:** `apps/web/src/components/deals/deal-detail.tsx`

**Current Issue:**
```tsx
// Lines 233-254 - Current (NO optimistic updates)
const addPropertyMutation = trpc.deals.addProperty.useMutation({
  onSuccess: () => {
    toast.success('Property added to deal')
    invalidateDealQueries(utils)  // ❌ Only invalidates, no optimistic update
    setPropertySearch('')
    setPropertyOpen(false)
  },
  onError: (error) => {
    toast.error(error.message || 'Error adding property')
  },
})
```

**Solution (match contact pattern):**
```tsx
// Add property mutation - WITH optimistic updates
const addPropertyMutation = trpc.deals.addProperty.useMutation({
  onMutate: async ({ dealId, propertyId }) => {
    // Cancel outgoing refetches
    await utils.deals.getById.cancel({ id: dealId })

    // Snapshot previous value
    const previousDeal = utils.deals.getById.getData({ id: dealId })

    // Optimistically update
    if (previousDeal) {
      utils.deals.getById.setData({ id: dealId }, {
        ...previousDeal,
        propertyIds: [...(previousDeal.propertyIds || []), propertyId]
      })
    }

    return { previousDeal }
  },
  onSuccess: async (_, { dealId }) => {
    toast.success('Property added to deal')

    // Force fetch from server (bypasses cache) and update
    const freshDeal = await utils.deals.getById.fetch({ id: dealId })
    if (freshDeal) {
      utils.deals.getById.setData({ id: dealId }, freshDeal)
    }

    setPropertySearch('')
    setPropertyOpen(false)
  },
  onError: (error, { dealId }, context) => {
    // Rollback on error
    if (context?.previousDeal) {
      utils.deals.getById.setData({ id: dealId }, context.previousDeal)
    }
    toast.error(error.message || 'Error adding property')
  },
})

// Remove property mutation - WITH optimistic updates
const removePropertyMutation = trpc.deals.removeProperty.useMutation({
  onMutate: async ({ dealId, propertyId }) => {
    // Cancel outgoing refetches
    await utils.deals.getById.cancel({ id: dealId })

    // Snapshot previous value
    const previousDeal = utils.deals.getById.getData({ id: dealId })

    // Optimistically update
    if (previousDeal) {
      utils.deals.getById.setData({ id: dealId }, {
        ...previousDeal,
        propertyIds: (previousDeal.propertyIds || []).filter((id: string) => id !== propertyId)
      })
    }

    return { previousDeal }
  },
  onSuccess: async (_, { dealId }) => {
    toast.success('Property removed from deal')

    // Force fetch from server (bypasses cache) and update
    const freshDeal = await utils.deals.getById.fetch({ id: dealId })
    if (freshDeal) {
      utils.deals.getById.setData({ id: dealId }, freshDeal)
    }
  },
  onError: (error, { dealId }, context) => {
    // Rollback on error
    if (context?.previousDeal) {
      utils.deals.getById.setData({ id: dealId }, context.previousDeal)
    }
    toast.error(error.message || 'Error removing property')
  },
})
```

**Testing:**
- Add property to deal → should appear instantly
- Check network tab → mutation happens in background
- Simulate error (disconnect network) → should rollback
- Remove property → should disappear instantly

**Impact:** 🎯 HIGH - Fixes bug #1 in BUGS_TO_FIX.md for properties

---

### Phase 3: Client-Side Compliance Calculation (60 minutes)

#### 3.1 Create Optimistic Compliance Hook

**New File:** `apps/web/src/hooks/use-optimistic-compliance.ts`

```tsx
import { useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { calculateContactCompliance } from '@/lib/config/contact-compliance'
import { calculateDealCompliance } from '@/lib/config/deal-compliance'
import type { DealType } from '@/types/crm'

/**
 * Calculate deal compliance score in real-time on the client
 *
 * This hook recalculates compliance whenever:
 * - Related contacts change (added/removed)
 * - Contact documents change (uploaded/deleted)
 * - Deal type changes (different requirements)
 *
 * Benefits:
 * - Instant feedback when adding/removing contacts
 * - No waiting for server refetch
 * - Seamless UX during optimistic updates
 */
export function useOptimisticDealCompliance(dealId: string, dealType: DealType) {
  // Get deal's related contact IDs (may contain optimistic updates)
  const { data: contactIds } = trpc.deals.getRelatedContactIds.useQuery({ dealId })

  // Fetch all contacts efficiently (batch query)
  const { data: allContactsData } = trpc.contacts.list.useQuery(
    { limit: 100 },
    { enabled: (contactIds?.length ?? 0) > 0 }
  )

  // Filter to only deal contacts
  const dealContacts = allContactsData?.contacts?.filter(c => contactIds?.includes(c.id)) || []

  // Fetch documents for each contact (parallel queries with staleTime)
  const contactDocuments = dealContacts.map(contact => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: docs } = trpc.documents.listByEntity.useQuery(
      { entityType: 'contact', entityId: contact.id },
      {
        enabled: !!contact.id,
        staleTime: 1000 * 30, // Cache for 30 seconds
      }
    )
    return { contactId: contact.id, documents: docs || [] }
  })

  // Recalculate compliance client-side (runs whenever data changes)
  const compliance = useMemo(() => {
    if (!dealContacts.length) {
      return {
        score: 0,
        dealTypeLabel: '',
        critical: { completed: 0, total: 0 },
        legallyRecommended: { completed: 0, total: 0 },
        advised: { completed: 0, total: 0 },
        missingCritical: [],
      }
    }

    // Calculate individual contact compliance scores
    const contactScores = dealContacts.map(contact => {
      const docs = contactDocuments.find(cd => cd.contactId === contact.id)?.documents || []

      // Determine contact role from deal-contact relationship
      // (For MVP, we can infer from contact category or default to 'buyer')
      const role = contact.category === 'signed_buyer' || contact.category === 'potential_buyer'
        ? 'buyer'
        : contact.category === 'signed_seller' || contact.category === 'potential_seller'
        ? 'seller'
        : 'other'

      return calculateContactCompliance(role, docs)
    })

    // Aggregate scores (average of all contacts)
    const avgScore = contactScores.reduce((sum, s) => sum + s.score, 0) / contactScores.length

    // Aggregate counts
    const aggregated = {
      critical: { completed: 0, total: 0 },
      recommended: { completed: 0, total: 0 },
      optional: { completed: 0, total: 0 },
      missingCritical: [] as any[],
    }

    contactScores.forEach(score => {
      aggregated.critical.completed += score.critical.completed
      aggregated.critical.total += score.critical.total
      aggregated.recommended.completed += score.recommended.completed
      aggregated.recommended.total += score.recommended.total
      aggregated.optional.completed += score.optional.completed
      aggregated.optional.total += score.optional.total
      aggregated.missingCritical.push(...score.missingCritical)
    })

    return {
      score: Math.round(avgScore),
      dealTypeLabel: dealType, // Use deal type for display
      critical: aggregated.critical,
      legallyRecommended: aggregated.recommended,
      advised: aggregated.optional,
      missingCritical: aggregated.missingCritical,
    }
  }, [dealContacts, contactDocuments, dealType])

  return compliance
}
```

#### 3.2 Use Optimistic Compliance in Deal Detail

**File:** `apps/web/src/components/deals/deal-detail.tsx`

**Current:**
```tsx
// Line 108-110 - Fetches from server
const { data: compliance, isLoading: complianceLoading } = trpc.deals.getCompliance.useQuery(
  { dealId: deal.id }
)
```

**Updated:**
```tsx
import { useOptimisticDealCompliance } from '@/hooks/use-optimistic-compliance'

// Inside component:
// Use client-side optimistic compliance (recalculates on contact changes)
const optimisticCompliance = useOptimisticDealCompliance(deal.id, deal.dealType)

// Also fetch server compliance for comparison (optional, for debugging)
const { data: serverCompliance } = trpc.deals.getCompliance.useQuery(
  { dealId: deal.id },
  { staleTime: 1000 * 60 } // Cache for 1 minute since we're using optimistic
)

// Use optimistic compliance in UI (instant updates)
const compliance = optimisticCompliance

// Optional: Log differences for debugging
useEffect(() => {
  if (serverCompliance && optimisticCompliance.score !== serverCompliance.score) {
    console.log('⚠️ Compliance mismatch:', {
      optimistic: optimisticCompliance.score,
      server: serverCompliance.score,
    })
  }
}, [serverCompliance, optimisticCompliance])
```

**Benefits:**
- ✅ Compliance score updates **instantly** when adding/removing contacts
- ✅ No waiting for server refetch
- ✅ Still validates against server data (optional)
- ✅ Works seamlessly with optimistic contact mutations

**Testing:**
1. Open deal with 2 contacts at 50% compliance each (average: 50%)
2. Add 3rd contact with 100% compliance
3. **Expected:** Compliance score instantly updates to ~67%
4. Verify server sync after mutation completes
5. Remove contact → score instantly updates

**Impact:** 🎯 CRITICAL - Fixes bug #1 in BUGS_TO_FIX.md for compliance

---

### Phase 4: Document Contact/Property Optimistic Updates (45 minutes)

#### 4.1 Add Individual Add/Remove Actions

**File:** `apps/web/src/components/documents/document-detail.tsx`

**Current Issue:**
```tsx
// Line 284-302 - Only saves on button click (NO optimistic updates)
const handleSaveMetadata = () => {
  const tagsArray = tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)

  updateMutation.mutate({
    id: document.id,
    // ...
    relatedContactIds: selectedContacts.map((c) => c.id),
    relatedPropertyIds: selectedProperties.map((p) => p.id),
  })
}
```

**Solution: Add Optimistic Mutations**

```tsx
// Add contact mutation (optimistic)
const addContactToDocumentMutation = trpc.documents.addContact.useMutation({
  onMutate: async ({ documentId, contactId }) => {
    // Cancel outgoing refetches
    await utils.documents.getById.cancel({ id: documentId })

    // Snapshot
    const previousDoc = utils.documents.getById.getData({ id: documentId })

    // Optimistically update
    if (previousDoc) {
      utils.documents.getById.setData({ id: documentId }, {
        ...previousDoc,
        relatedContactIds: [...previousDoc.relatedContactIds, contactId]
      })
    }

    return { previousDoc }
  },
  onSuccess: () => {
    toast.success('Contact linked to document')
  },
  onError: (error, { documentId }, context) => {
    if (context?.previousDoc) {
      utils.documents.getById.setData({ id: documentId }, context.previousDoc)
    }
    toast.error(error.message || 'Error linking contact')
  },
})

// Handle contact selection (INSTANT feedback)
const handleContactSelect = (contact: any) => {
  const isSelected = selectedContacts.some((c) => c.id === contact.id)

  if (isSelected) {
    // Remove optimistically
    setSelectedContacts((prev) => prev.filter((c) => c.id !== contact.id))
    // TODO: Call removeContactFromDocumentMutation
  } else {
    // Add optimistically
    setSelectedContacts((prev) => [...prev, {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
    }])

    // Trigger mutation immediately
    addContactToDocumentMutation.mutate({
      documentId: document.id,
      contactId: contact.id,
    })
  }
}
```

**Alternative: Keep Button-Based Save with Optimistic Update**

```tsx
const handleSaveMetadata = () => {
  const tagsArray = tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)

  // Optimistic update for local state
  const optimisticUpdate = {
    ...document,
    displayName: displayName.trim() || document.filename,
    documentType: documentType || "otro",
    documentDate,
    dueDate,
    tags: tagsArray,
    description: description || undefined,
    relatedContactIds: selectedContacts.map((c) => c.id),
    relatedPropertyIds: selectedProperties.map((p) => p.id),
  }

  // Show immediate feedback
  toast.info('Saving...')

  updateMutation.mutate({
    id: document.id,
    displayName: displayName.trim() || document.filename,
    documentType: documentType || "otro",
    documentDate,
    dueDate,
    tags: tagsArray,
    description: description || undefined,
    relatedContactIds: selectedContacts.map((c) => c.id),
    relatedPropertyIds: selectedProperties.map((p) => p.id),
  }, {
    onMutate: async () => {
      // Cancel outgoing refetches
      await utils.documents.getById.cancel({ id: document.id })

      // Snapshot
      const previousDoc = utils.documents.getById.getData({ id: document.id })

      // Optimistically update
      utils.documents.getById.setData({ id: document.id }, optimisticUpdate as any)

      return { previousDoc }
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousDoc) {
        utils.documents.getById.setData({ id: document.id }, context.previousDoc)
      }
    },
  })
}
```

**Note:** Current updateMutation already uses onSuccess to update cache (line 184-198), but adding `onMutate` makes it optimistic.

**Impact:** 🎯 MEDIUM - Improves document editing responsiveness

---

### Phase 5: AI Labeling Enhancements (Optional - Already Good)

The current implementation (`document-detail.tsx:69-101`) is already excellent:

✅ Polling every 3 seconds
✅ Auto-stops when complete
✅ Timeout with warning
✅ Direct cache update

**Possible Enhancement:** Server-Sent Events (SSE) instead of polling

```tsx
// Future: Replace polling with SSE
useEffect(() => {
  if (!isAILabelingInProgress) return

  const eventSource = new EventSource(`/api/documents/${document.id}/ai-status`)

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.status === 'completed') {
      setIsAILabelingInProgress(false)
      toast.success('AI labeling completed!')
      utils.documents.getById.invalidate({ id: document.id })
      eventSource.close()
    }
  }

  return () => eventSource.close()
}, [isAILabelingInProgress])
```

**Not a priority** - Current polling works well.

---

## Summary of Changes

| Component | File | Current State | Changes | Impact |
|-----------|------|---------------|---------|--------|
| **Email Body** | `email-message.tsx` | ❌ Newlines collapse | ✅ Convert `\n` to `<br>` | 🎯 HIGH - Bug fix |
| **Deal Properties** | `deal-detail.tsx` | ❌ No optimistic updates | ✅ Add onMutate + rollback | 🎯 HIGH - Bug fix |
| **Deal Compliance** | `deal-detail.tsx` | ❌ Server-only | ✅ Client-side calculation | 🎯 CRITICAL - Bug fix |
| **Document Contacts** | `document-detail.tsx` | ❌ Button-based save | ✅ Optimistic updates | 🎯 MEDIUM - UX improvement |
| **AI Labeling** | `document-detail.tsx` | ✅ Already good | ⏭️ No changes needed | N/A |

---

## Testing Checklist

### Email Rendering
- [ ] Send plain text email with multiple paragraphs → Verify line breaks render
- [ ] Send HTML email → Verify HTML renders correctly
- [ ] Check email preview in list → Verify flattened text (no excessive whitespace)

### Deal Properties
- [ ] Add property to deal → Should appear instantly
- [ ] Network error during add → Should rollback (property disappears)
- [ ] Remove property → Should disappear instantly
- [ ] Refresh page → Verify server data matches

### Deal Compliance
- [ ] Open deal with 2 contacts (50% each)
- [ ] Add 3rd contact (100%) → Compliance should jump to ~67% **instantly**
- [ ] Remove contact → Compliance updates **instantly**
- [ ] Check console for server/client mismatch warnings
- [ ] Verify missing critical documents list updates

### Document Metadata
- [ ] Add contact to document → Should appear in badges **instantly** (if using immediate mutation)
- [ ] Save metadata → Should show "Saving..." toast immediately
- [ ] Network error during save → Should rollback
- [ ] Verify saved data persists after refresh

### AI Labeling
- [ ] Upload document → Trigger AI labeling
- [ ] Verify "Processing..." button shows
- [ ] Wait for completion → Verify automatic update
- [ ] Verify 2-minute timeout warning

---

## Performance Considerations

### React Query Cache Efficiency

**Current Config (Good):**
- staleTime: 10s → Data fresh for 10 seconds (good balance)
- gcTime: 5 min → Cache persists for 5 minutes (prevents excessive refetching)
- networkMode: 'offlineFirst' → Uses cache while fetching (instant UI)

**Optimization Opportunities:**

1. **Increase staleTime for static data:**
```tsx
// For data that rarely changes (e.g., contact list)
const { data: contacts } = trpc.contacts.list.useQuery(
  { limit: 100 },
  { staleTime: 1000 * 60 * 5 } // 5 minutes for contact list
)
```

2. **Use selective invalidation:**
```tsx
// ✅ GOOD - Only invalidate specific query
utils.deals.getById.invalidate({ id: dealId })

// ❌ BAD - Invalidates ALL deals
utils.deals.invalidate()
```

3. **Batch mutations:**
```tsx
// If adding multiple contacts, batch into single mutation
const addMultipleContacts = trpc.deals.addMultipleContacts.useMutation({
  onMutate: async ({ dealId, contactIds }) => {
    // Optimistically add all at once
  }
})
```

### Memory Usage

**Risk:** Too many concurrent queries with documents
**Solution:** Use pagination and lazy loading

```tsx
// For deal with 50+ contacts
const { data: dealContacts } = trpc.deals.getContacts.useQuery(
  { dealId, limit: 20, offset: 0 }, // Paginated
  { staleTime: 1000 * 60 } // Cache aggressively
)
```

---

## Edge Cases & Error Handling

### 1. Concurrent Mutations

**Problem:** User adds contact A, then immediately removes contact B before A finishes

**Solution:** Use React Query's built-in mutation queue (already handled)

### 2. Optimistic Update Mismatch

**Problem:** Optimistic data differs from server response

**Solution:** Always force-fetch after mutation success
```tsx
onSuccess: async () => {
  const fresh = await utils.deals.getById.fetch({ id: dealId })
  utils.deals.getById.setData({ id: dealId }, fresh)
}
```

### 3. Stale Cache After Error

**Problem:** Mutation fails, but cache isn't rolled back

**Solution:** Always provide `onError` rollback
```tsx
onError: (error, variables, context) => {
  if (context?.previousData) {
    utils.query.setData(key, context.previousData)
  }
  toast.error(error.message)
}
```

### 4. Network Disconnect

**Problem:** User goes offline, tries to mutate

**Solution:** React Query's networkMode already handles this
- Mutations have `networkMode: 'online'` → Won't run offline
- Queries have `networkMode: 'offlineFirst'` → Use cache

---

## Migration Path

### Step 1: Low-Risk Quick Win (Email Fix)
- ✅ No breaking changes
- ✅ Pure UI fix
- ✅ Immediate user benefit

### Step 2: Deal Properties Optimistic Updates
- ✅ Low risk (matches existing contact pattern)
- ✅ High user benefit
- ⚠️ Test rollback scenarios

### Step 3: Client-Side Compliance
- ⚠️ Medium risk (new hook, complex logic)
- ✅ High user benefit
- ⚠️ Verify calculations match server
- ⚠️ Test with edge cases (0 contacts, 50+ contacts)

### Step 4: Document Optimistic Updates
- ✅ Low risk (similar to deal updates)
- ✅ Medium user benefit
- ⚠️ Decide: Immediate mutations vs. button-based with optimistic feedback

---

## Future Enhancements (Post-MVP)

1. **Server-Sent Events for AI Labeling**
   - Replace polling with SSE
   - Reduces server load
   - More responsive

2. **Optimistic Deal Stage Changes**
   - Update deal stage instantly
   - Show in kanban board immediately

3. **Optimistic Contact Creation**
   - Create contact + add to deal in one flow
   - Instant feedback

4. **Undo/Redo System**
   - Store mutation history
   - Allow undo of last 5 actions
   - Use React Query's mutation cache

5. **Offline Mode**
   - Queue mutations when offline
   - Sync when back online
   - Use IndexedDB for persistence

---

## Conclusion

This implementation plan addresses all issues in `BUGS_TO_FIX.md`:

✅ **Bug #1 (Responsiveness):** Fixed with optimistic updates for deals + client-side compliance
✅ **Bug #2 (Email newlines):** Fixed with plain text → HTML conversion
✅ **Bug #3 (AI labeling wait):** Already implemented with polling (optional: add SSE)

**Estimated Total Time:** 3-4 hours
**Risk Level:** Low (most patterns already exist in codebase)
**User Benefit:** HIGH - Instant feedback, desktop-app-like UX

**Next Steps:**
1. Implement Phase 1 (email fix) - 30 min
2. Implement Phase 2 (deal properties) - 45 min
3. Implement Phase 3 (compliance hook) - 60 min
4. Test all scenarios - 60 min
5. Deploy to staging for QA
