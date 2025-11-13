import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { subscriptionService } from './subscription.service'

/**
 * Create a Supabase client with service role key for admin operations
 * Used during signup to bypass RLS when creating profiles
 */
function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * User type for authentication
 */
export type UserType = 'agent' | 'company'

/**
 * Sign up input for agents
 */
export interface SignUpAgentInput {
  email: string
  password: string
  name: string
  phone?: string
  city?: string
  country?: string
}

/**
 * Sign up input for companies
 */
export interface SignUpCompanyInput {
  email: string
  password: string
  name: string
  pointOfContact?: string
  city?: string
  country?: string
}

/**
 * Sign in input
 */
export interface SignInInput {
  email: string
  password: string
}

/**
 * Authentication Service
 * Handles all authentication operations using Supabase Auth
 */
class AuthService {
  /**
   * Sign up a new agent
   */
  async signUpAgent(input: SignUpAgentInput) {
    const supabase = await createClient()

    // Check if email already exists in agent table
    const { data: existingAgent } = await supabase
      .from('agent')
      .select('email')
      .eq('email', input.email)
      .single()

    if (existingAgent) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An agent with this email already exists',
      })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          user_type: 'agent',
          name: input.name,
        },
      },
    })

    if (authError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: authError.message,
      })
    }

    if (!authData.user) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user',
      })
    }

    // Create agent profile using admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data: agent, error: profileError } = await adminClient
      .from('agent')
      .insert({
        userID: authData.user.id,
        email: input.email,
        name: input.name,
        phone: input.phone,
        city: input.city,
        country: input.country,
      })
      .select()
      .single()

    if (profileError) {
      // Rollback: Delete the auth user if profile creation fails
      const rollbackClient = createAdminClient()
      await rollbackClient.auth.admin.deleteUser(authData.user.id)

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create agent profile: ${profileError.message}`,
      })
    }

    // Create 7-day trial subscription
    try {
      await subscriptionService.createTrialSubscription(authData.user.id)
    } catch (subscriptionError) {
      // Log error but don't fail signup - subscription can be created later
      console.error('Failed to create trial subscription:', subscriptionError)
      // TODO: Add proper logging/monitoring
    }

    return {
      user: authData.user,
      agent,
      session: authData.session,
    }
  }

  /**
   * Sign up a new company
   */
  async signUpCompany(input: SignUpCompanyInput) {
    const supabase = await createClient()

    // Check if email already exists in company table
    const { data: existingCompany } = await supabase
      .from('company')
      .select('email')
      .eq('email', input.email)
      .single()

    if (existingCompany) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A company with this email already exists',
      })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          user_type: 'company',
          name: input.name,
        },
      },
    })

    if (authError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: authError.message,
      })
    }

    if (!authData.user) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user',
      })
    }

    // Create company profile using admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data: company, error: profileError } = await adminClient
      .from('company')
      .insert({
        userID: authData.user.id,
        email: input.email,
        name: input.name,
        pointOfContact: input.pointOfContact,
        city: input.city,
        country: input.country,
      })
      .select()
      .single()

    if (profileError) {
      // Rollback: Delete the auth user if profile creation fails
      const rollbackClient = createAdminClient()
      await rollbackClient.auth.admin.deleteUser(authData.user.id)

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create company profile: ${profileError.message}`,
      })
    }

    // Create 7-day trial subscription
    try {
      await subscriptionService.createTrialSubscription(authData.user.id)
    } catch (subscriptionError) {
      // Log error but don't fail signup - subscription can be created later
      console.error('Failed to create trial subscription:', subscriptionError)
      // TODO: Add proper logging/monitoring
    }

    return {
      user: authData.user,
      company,
      session: authData.session,
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(input: SignInInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })

    if (error) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    }

    if (!data.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
      })
    }

    // Fetch user profile (either agent or company)
    const userType = data.user.user_metadata?.user_type as UserType | undefined

    let profile = null
    if (userType === 'agent') {
      const { data: agent } = await supabase
        .from('agent')
        .select('*')
        .eq('userID', data.user.id)
        .single()
      profile = agent
    } else if (userType === 'company') {
      const { data: company } = await supabase
        .from('company')
        .select('*')
        .eq('userID', data.user.id)
        .single()
      profile = company
    }

    return {
      user: data.user,
      session: data.session,
      profile,
      userType,
    }
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to sign out',
      })
    }

    return { success: true }
  }

  /**
   * Get the current user session
   */
  async getSession() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Fetch user profile (either agent or company)
    const userType = user.user_metadata?.user_type as UserType | undefined

    let profile = null
    if (userType === 'agent') {
      const { data: agent } = await supabase
        .from('agent')
        .select('*')
        .eq('userID', user.id)
        .single()
      profile = agent
    } else if (userType === 'company') {
      const { data: company } = await supabase
        .from('company')
        .select('*')
        .eq('userID', user.id)
        .single()
      profile = company
    }

    return {
      user,
      profile,
      userType,
    }
  }
}

export const authService = new AuthService()
