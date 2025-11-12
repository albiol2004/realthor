import { createClient } from '@/lib/supabase/server'
import { TRPCError } from '@trpc/server'

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

    // Create agent profile
    const { data: agent, error: profileError } = await supabase
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
      await supabase.auth.admin.deleteUser(authData.user.id)

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create agent profile',
      })
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

    // Create company profile
    const { data: company, error: profileError } = await supabase
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
      await supabase.auth.admin.deleteUser(authData.user.id)

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create company profile',
      })
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
