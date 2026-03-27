'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  MapPin, Briefcase, Clock, DollarSign, Wifi, CheckCircle2,
  Loader2, AlertCircle, Upload, X, Building2, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  enabled: boolean
  placeholder?: string | null
}

interface JobForm {
  job_id: string
  job_title: string
  job_description: string | null
  department: string | null
  location: string | null
  remote: boolean
  job_type: string
  salary_min: number | null
  salary_max: number | null
  slug: string
  form_fields: FormField[]
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

export default function PublicJobPage() {
  const { slug } = useParams<{ slug: string }>()

  const [job, setJob]         = useState<JobForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [values, setValues]   = useState<Record<string, string>>({})
  const [cvFile, setCvFile]   = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${BASE}/api/v1/applications/form/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const set = (id: string, v: string) => setValues(p => ({ ...p, [id]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // client-side required validation
    const missing = (job?.form_fields ?? [])
      .filter(f => f.enabled && f.required && f.id !== 'cv')
      .filter(f => !(values[f.id] ?? '').trim())
    if (missing.length) {
      setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      // Upload CV first — capture BOTH the url AND the extracted resume_text
      let resume_url: string | null = null
      let resume_text: string | null = null

      if (cvFile) {
        const fd = new FormData()
        fd.append('file', cvFile)
        const up = await fetch(`${BASE}/api/v1/applications/upload-cv`, { method: 'POST', body: fd })
        if (up.ok) {
          const j = await up.json()
          resume_url  = j.url          ?? null
          // The upload endpoint returns the parsed text — send it so the AI can screen the candidate
          resume_text = j.resume_text  ?? null
        }
      }

      const payload: Record<string, any> = {
        name:          values['name']         ?? '',
        email:         values['email']        ?? null,
        phone:         values['phone']        ?? null,
        linkedin_url:  values['linkedin_url'] ?? null,
        github_url:    values['github_url']   ?? null,
        cover_letter:  values['cover_letter'] ?? null,
        resume_url,
        resume_text,   // ← critical: AI screener uses this to extract skills, experience, etc.
      }

      const res = await fetch(`${BASE}/api/v1/applications/submit/${slug}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.detail ?? 'Submission failed')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── loading / not-found states ─────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-red-400" />
      </div>
      <h1 className="text-neutral-900 text-xl font-semibold mb-2">Position not found</h1>
      <p className="text-neutral-400 text-sm max-w-xs">This job link may have expired or been removed by the employer.</p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
      </div>
      <h1 className="text-neutral-900 text-xl font-semibold mb-2">Application submitted!</h1>
      <p className="text-neutral-500 text-sm max-w-sm">
        Thanks for applying for <strong>{job?.job_title}</strong>. The team will be in touch if your profile is a great match.
      </p>
    </div>
  )

  const enabledFields = (job?.form_fields ?? []).filter(f => f.enabled)

  /* ── main page ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-neutral-900 text-sm font-semibold">AutoHyre</span>
          <span className="ml-auto text-xs text-neutral-400">Powered by AutoHyre ATS</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Job header */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-neutral-950 text-2xl font-bold mb-1">{job?.job_title}</h1>
              {job?.department && (
                <p className="text-indigo-600 text-sm font-medium">{job.department}</p>
              )}
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
              Hiring
            </span>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-3 mb-6">
            {job?.location && (
              <div className="flex items-center gap-1.5 text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                {job.location}
              </div>
            )}
            {job?.remote && (
              <div className="flex items-center gap-1.5 text-sm text-neutral-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                Remote OK
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5">
              <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
              <span className="capitalize">{job?.job_type?.replace('-', ' ')}</span>
            </div>
            {job?.salary_min && job?.salary_max && (
              <div className="flex items-center gap-1.5 text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5">
                <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                {fmt(job.salary_min)} – {fmt(job.salary_max)}
              </div>
            )}
          </div>

          {/* Description */}
          {job?.job_description && (
            <div className="prose prose-sm prose-neutral max-w-none">
              <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">{job.job_description}</p>
            </div>
          )}
        </div>

        {/* Application form */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8">
          <h2 className="text-neutral-950 text-lg font-semibold mb-1">Apply for this position</h2>
          <p className="text-neutral-400 text-sm mb-6">Fill in the form below and we'll review your application.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {enabledFields.map(field => {
              if (field.id === 'cv') return (
                <div key="cv">
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                      cvFile ? 'border-indigo-300 bg-indigo-50' : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50',
                    )}
                  >
                    <Upload className={cn('w-5 h-5', cvFile ? 'text-indigo-500' : 'text-neutral-400')} />
                    {cvFile ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-indigo-700 font-medium">{cvFile.name}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); setCvFile(null) }}>
                          <X className="w-4 h-4 text-neutral-400 hover:text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-neutral-600 font-medium">Click to upload CV / Résumé</p>
                        <p className="text-xs text-neutral-400">PDF, DOCX up to 10 MB</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={e => setCvFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )

              if (field.type === 'textarea') return (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={4}
                    required={field.required}
                    placeholder={field.placeholder ?? ''}
                    value={values[field.id] ?? ''}
                    onChange={e => set(field.id, e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all resize-none"
                  />
                </div>
              )

              return (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder ?? ''}
                    value={values[field.id] ?? ''}
                    onChange={e => set(field.id, e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                  />
                </div>
              )
            })}

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 pb-6">
          Powered by <strong className="text-neutral-600">AutoHyre</strong> · Applicant Tracking System
        </p>
      </div>
    </div>
  )
}
