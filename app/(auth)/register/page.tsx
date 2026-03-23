'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, Building2, Hash, User, Mail, Lock, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

// ── Schema ───────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  org_name: z.string().min(2, 'Company name must be at least 2 characters'),
  org_slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(48, 'Slug must be 48 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  name: z.string().min(2, 'Your name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

// ── Field component ───────────────────────────────────────────────────────────
function Field({
  id,
  label,
  error,
  icon: Icon,
  children,
}: {
  id: string
  label: string
  error?: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#D1D5DB]">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563] pointer-events-none" />
        {children}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { register: authRegister } = useAuth()
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { org_name: '', org_slug: '', name: '', email: '', password: '' },
  })

  // Auto-generate slug from company name
  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setValue('org_name', raw)
    setValue(
      'org_slug',
      raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      { shouldValidate: watch('org_slug') !== '' },
    )
  }

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full bg-[#0B0F19] border rounded-lg py-2.5 pl-10 pr-4',
      'text-sm text-[#F9FAFB] placeholder:text-[#4B5563]',
      'outline-none transition-colors',
      'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
      hasError
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
        : 'border-[#1F2937] hover:border-[#374151]',
    )

  const onSubmit = async (values: RegisterFormValues) => {
    setIsPending(true)
    try {
      await authRegister(values)
      // redirect to /dashboard handled inside register()
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 409) {
          toast.error('Slug already taken', {
            description: `"${values.org_slug}" is already in use. Try a different company slug.`,
          })
        } else if (err.response?.status === 422) {
          toast.error('Invalid data', {
            description: 'Please check all fields and try again.',
          })
        } else {
          toast.error('Something went wrong', {
            description: 'Unable to reach the server. Please try again later.',
          })
        }
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-[#F9FAFB]">AutoHyre</span>
      </div>

      {/* Card */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#F9FAFB]">Create your account</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Set up your organisation and start hiring smarter.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Company Name */}
          <Field id="org_name" label="Company Name" error={errors.org_name?.message} icon={Building2}>
            <input
              id="org_name"
              type="text"
              placeholder="Acme Corp"
              {...register('org_name')}
              onChange={handleOrgNameChange}
              className={inputClass(!!errors.org_name)}
            />
          </Field>

          {/* Company Slug — auto-filled but editable */}
          <Field id="org_slug" label="Company Slug" error={errors.org_slug?.message} icon={Hash}>
            <input
              id="org_slug"
              type="text"
              placeholder="acme-corp"
              {...register('org_slug')}
              className={inputClass(!!errors.org_slug)}
            />
            <p className="mt-1 text-xs text-[#4B5563]">
              Used in URLs — auto-filled from company name.
            </p>
          </Field>

          {/* Divider */}
          <div className="border-t border-[#1F2937] !mt-5 !mb-1" />

          {/* Your Name */}
          <Field id="name" label="Your Name" error={errors.name?.message} icon={User}>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              {...register('name')}
              className={inputClass(!!errors.name)}
            />
          </Field>

          {/* Email */}
          <Field id="email" label="Email" error={errors.email?.message} icon={Mail}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="jane@acmecorp.com"
              {...register('email')}
              className={inputClass(!!errors.email)}
            />
          </Field>

          {/* Password */}
          <Field id="password" label="Password" error={errors.password?.message} icon={Lock}>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
              className={inputClass(!!errors.password)}
            />
          </Field>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'w-full flex items-center justify-center gap-2 !mt-6',
              'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed',
              'text-white text-sm font-medium py-2.5 rounded-lg transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]',
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
