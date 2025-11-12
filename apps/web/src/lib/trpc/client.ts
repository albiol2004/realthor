import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/routers/_app'

/**
 * tRPC React Client
 *
 * Provides React hooks for calling tRPC procedures
 * Usage: trpc.auth.signIn.useMutation()
 */
export const trpc = createTRPCReact<AppRouter>()
