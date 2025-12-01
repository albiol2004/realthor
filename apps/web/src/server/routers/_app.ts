import { router } from '@/lib/trpc/server'
import { authRouter } from './auth'
import { subscriptionRouter } from './subscription'
import { paymentRouter } from './payment'
import { contactsRouter } from './contacts'
import { propertiesRouter } from './properties'
import { documentsRouter } from './documents'
import { dealsRouter } from './deals'
import { searchRouter } from './search'
import { messagingRouter } from './messaging'
import { emailSettingsRouter } from './email-settings'

/**
 * Main tRPC Router
 *
 * Combines all feature routers into one app router
 *
 * Phase 1: Auth router + Subscription router + Payment
 * Phase 2: Contacts, Properties, Documents (in progress), Deals, Activities
 * Phase 3: Messaging
 * Phase 4: AI and search ✅ (Semantic search now available!)
 */
export const appRouter = router({
  auth: authRouter,
  subscription: subscriptionRouter,
  payment: paymentRouter,
  contacts: contactsRouter,
  properties: propertiesRouter,
  documents: documentsRouter,
  deals: dealsRouter, // ✅ Deal management
  search: searchRouter, // ✅ Semantic document search
  messaging: messagingRouter,
  emailSettings: emailSettingsRouter,
})

export type AppRouter = typeof appRouter
