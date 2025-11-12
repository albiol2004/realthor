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
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

/**
 * Login Page
 *
 * Minimalist black/white design for authentication
 */
export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
    onError: (error: { message: string }) => {
      setError(error.message)
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    await signInMutation.mutateAsync(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Kairo
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real Estate CRM
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-8 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-black dark:text-white">
                Welcome Back
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sign in to your account
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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

              <Button
                type="submit"
                className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
              </span>
              <Link
                href="/signup"
                className="font-medium text-black dark:text-white hover:underline"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
