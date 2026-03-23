'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, Mail, Lock, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

// ── Schema ───────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth()
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setIsPending(true)
    try {
      await login(values.email, values.password)
      // redirect to /dashboard is handled inside login()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        toast.error('Invalid credentials', {
          description: 'Please check your email and password and try again.',
        })
      } else {
        toast.error('Something went wrong', {
          description: 'Unable to reach the server. Please try again later.',
        })
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo / brand */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-[#F9FAFB]">
          AutoHyre
        </span>
      </div>

      {/* Card */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#F9FAFB]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Sign in to your AutoHyre account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-[#D1D5DB]">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563] pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...register('email')}
                className={cn(
                  'w-full bg-[#0B0F19] border rounded-lg py-2.5 pl-10 pr-4',
                  'text-sm text-[#F9FAFB] placeholder:text-[#4B5563]',
                  'outline-none transition-colors',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  errors.email
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-[#1F2937] hover:border-[#374151]',
                )}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-[#D1D5DB]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563] pointer-events-none" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className={cn(
                  'w-full bg-[#0B0F19] border rounded-lg py-2.5 pl-10 pr-4',
                  'text-sm text-[#F9FAFB] placeholder:text-[#4B5563]',
                  'outline-none transition-colors',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  errors.password
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-[#1F2937] hover:border-[#374151]',
                )}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed',
              'text-white text-sm font-medium py-2.5 rounded-lg transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]',
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
