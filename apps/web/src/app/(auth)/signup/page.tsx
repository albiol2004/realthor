'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * User type selection
 */
type UserType = 'agent' | 'company'

/**
 * Agent signup schema
 */
const agentSignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

/**
 * Company signup schema
 */
const companySignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Company name is required'),
  pointOfContact: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

type AgentSignupFormData = z.infer<typeof agentSignupSchema>
type CompanySignupFormData = z.infer<typeof companySignupSchema>

/**
 * Signup Page
 *
 * Allows users to sign up as either an agent or a company
 */
export default function SignupPage() {
  const router = useRouter()
  const [userType, setUserType] = useState<UserType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AgentSignupFormData | CompanySignupFormData>({
    resolver: zodResolver(
      userType === 'agent' ? agentSignupSchema : companySignupSchema
    ),
  })

  const signUpAgentMutation = trpc.auth.signUpAgent.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
    onError: (error: { message: string }) => {
      setError(error.message)
    },
  })

  const signUpCompanyMutation = trpc.auth.signUpCompany.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
    onError: (error: { message: string }) => {
      setError(error.message)
    },
  })

  const onSubmit = async (data: AgentSignupFormData | CompanySignupFormData) => {
    setError(null)
    if (userType === 'agent') {
      await signUpAgentMutation.mutateAsync(data as AgentSignupFormData)
    } else if (userType === 'company') {
      await signUpCompanyMutation.mutateAsync(data as CompanySignupFormData)
    }
  }

  const handleUserTypeChange = (type: UserType) => {
    setUserType(type)
    setError(null)
    reset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Kairo
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real Estate CRM
          </p>
        </div>

        {/* Signup Form */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-8 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-black dark:text-white">
                Create Account
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Join Kairo to manage your real estate business
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* User Type Selection */}
            {!userType && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-black dark:text-white">
                  I am a...
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUserTypeChange('agent')}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-6 hover:border-black dark:hover:border-white transition-colors"
                  >
                    <svg
                      className="h-8 w-8 text-black dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-black dark:text-white">
                      Agent
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserTypeChange('company')}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-6 hover:border-black dark:hover:border-white transition-colors"
                  >
                    <svg
                      className="h-8 w-8 text-black dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm font-medium text-black dark:text-white">
                      Company
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Signup Form */}
            {userType && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Signing up as{' '}
                    <span className="font-medium text-black dark:text-white">
                      {userType === 'agent' ? 'Agent' : 'Company'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserType(null)}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline"
                  >
                    Change
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-black dark:text-white"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      {...register('email')}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-black dark:text-white"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      {...register('password')}
                      disabled={isSubmitting}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-black dark:text-white"
                    >
                      {userType === 'agent' ? 'Full Name' : 'Company Name'}
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={
                        userType === 'agent'
                          ? 'John Doe'
                          : 'Acme Real Estate'
                      }
                      className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      {...register('name')}
                      disabled={isSubmitting}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {userType === 'agent' && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        Phone (optional)
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        {...register('phone')}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  {userType === 'company' && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="pointOfContact"
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        Point of Contact (optional)
                      </Label>
                      <Input
                        id="pointOfContact"
                        type="text"
                        placeholder="John Doe"
                        className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        {...register('pointOfContact')}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="city"
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        City (optional)
                      </Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="New York"
                        className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        {...register('city')}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="country"
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        Country (optional)
                      </Label>
                      <Input
                        id="country"
                        type="text"
                        placeholder="USA"
                        className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        {...register('country')}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-medium"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </>
            )}

            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
              </span>
              <Link
                href="/login"
                className="font-medium text-black dark:text-white hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
