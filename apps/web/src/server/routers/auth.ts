import { router, publicProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { authService } from '@/server/services/auth.service'

/**
 * Validation schemas for authentication
 */
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signUpAgentSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

const signUpCompanySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Company name is required'),
  pointOfContact: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

/**
 * Auth Router
 *
 * Handles all authentication operations using Supabase Auth
 */
export const authRouter = router({
  /**
   * Get current user session
   * Returns user info and profile (agent or company)
   */
  getSession: publicProcedure.query(async () => {
    return await authService.getSession()
  }),

  /**
   * Sign in with email and password
   */
  signIn: publicProcedure.input(signInSchema).mutation(async ({ input }) => {
    return await authService.signIn(input)
  }),

  /**
   * Sign up as an agent
   */
  signUpAgent: publicProcedure
    .input(signUpAgentSchema)
    .mutation(async ({ input }) => {
      return await authService.signUpAgent(input)
    }),

  /**
   * Sign up as a company
   */
  signUpCompany: publicProcedure
    .input(signUpCompanySchema)
    .mutation(async ({ input }) => {
      return await authService.signUpCompany(input)
    }),

  /**
   * Sign out the current user
   */
  signOut: publicProcedure.mutation(async () => {
    return await authService.signOut()
  }),
})
