'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  keepSignedIn: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { keepSignedIn: false },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setIsPending(true)
    try {
      await login(values.email, values.password)
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
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[360px]">
          {/* Brand */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              AutoHyre
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              Smarter hiring, faster decisions.
              <br />
              Sign in to continue your recruitment journey.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter email"
                  {...register('email')}
                  className={cn(
                    'w-full border rounded-lg py-2.5 pl-9 pr-4 text-sm text-gray-900',
                    'placeholder:text-gray-400 outline-none transition-all bg-white',
                    'focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500',
                    errors.email
                      ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  {...register('password')}
                  className={cn(
                    'w-full border rounded-lg py-2.5 pl-9 pr-10 text-sm text-gray-900',
                    'placeholder:text-gray-400 outline-none transition-all bg-white',
                    'focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500',
                    errors.password
                      ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
              <div className="flex justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-xs text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Keep me signed in */}
            <div className="flex items-center gap-2">
              <input
                id="keepSignedIn"
                type="checkbox"
                {...register('keepSignedIn')}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 accent-violet-600"
              />
              <label htmlFor="keepSignedIn" className="text-sm text-gray-600 cursor-pointer">
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'w-full flex items-center justify-center gap-2 mt-2',
                'bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed',
                'text-white text-sm font-medium py-2.5 rounded-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t Have an Account?{' '}
            <Link
              href="/register"
              className="text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel — GIF fills the right side ── */}
      <div className="hidden lg:flex w-[45%] rounded-r-xl overflow-hidden">
        <img
          src="/original-a256fc211bd748036134c22b5777d44a.gif"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  )
}