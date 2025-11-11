import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers/_app'
import { createContext } from '@/lib/trpc/context'

/**
 * tRPC API Handler for Next.js App Router
 *
 * This handles all tRPC requests via the /api/trpc/[trpc] route
 *
 * Phase 1: Basic setup with auth context
 * Phase 2+: Will be used for all API operations (contacts, properties, etc.)
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `L tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            )
          }
        : undefined,
  })

export { handler as GET, handler as POST }
