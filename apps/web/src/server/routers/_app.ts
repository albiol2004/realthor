import { router } from '@/lib/trpc/server'
import { authRouter } from './auth'
import { subscriptionRouter } from './subscription'
import { paymentRouter } from './payment'
import { contactsRouter } from './contacts'

/**
 * Main tRPC Router
 *
 * Combines all feature routers into one app router
 *
 * Phase 1: Auth router + Subscription router + Payment
 * Phase 2: Contacts, properties, deals, activities
 * Phase 3: Add documents
 * Phase 4: Add messaging
 * Phase 5: Add AI and search
 */
export const appRouter = router({
  auth: authRouter,
  subscription: subscriptionRouter,
  payment: paymentRouter,
  contacts: contactsRouter,
  // Phase 2+: Add more routers
  // properties: propertiesRouter,
  // deals: dealsRouter,
  // messaging: messagingRouter,
  // search: searchRouter,
  // ai: aiRouter,
})

export type AppRouter = typeof appRouter
