'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Sparkles, Loader2, Users, Share2, CheckCircle2,
  Globe, Check, ChevronDown, FileText, Briefcase,
  Plus, Trash2, Zap, AlertCircle, CheckCircle, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useJobsContext } from '@/lib/jobs-context'
import { integrationsApi, type PlatformIntegration, type PlatformPostStatus } from '@/lib/integrations-api'
import { post } from '@/lib/api'
import type { ApiJob } from '@/types/job'

/* ─── types ──────────────────────────────────────────────────── */
interface Props { open: boolean; onClose: () => void; job?: ApiJob | null }

/* ─── constants ──────────────────────────────────────────────── */
const JOB_TYPES    = ['Full Time', 'Part Time', 'Contract', 'Internship', 'Freelance']
const DEPARTMENTS  = ['Engineering', 'Design', 'AI/ML', 'Analytics', 'Infrastructure', 'Product', 'Marketing', 'Sales', 'Operations', 'Academic', 'HR']
const STATUS_OPTS  = ['active', 'paused', 'draft', 'closed']
const CURRENCIES   = ['USD – Dollar', 'AED – Dirham', 'SAR – Riyal', 'EUR – Euro', 'GBP – Pound']
const PAYMENT_TYPES = [
  { key: 'weekly',   label: 'Weekly',   desc: 'Payment every week. Suitable for short-term projects.' },
  { key: 'monthly',  label: 'Monthly',  desc: 'Payment each month. Ideal for ongoing contracts.' },
  { key: 'contract', label: 'Contract', desc: 'Single payment. Best for fixed-scope jobs.' },
]
const WORKPLACE_TYPES = [
  { key: 'onsite', label: 'On-Site', desc: 'Employees work from an office' },
  { key: 'hybrid', label: 'Hybrid',  desc: 'Both office and home' },
  { key: 'remote', label: 'Remote',  desc: 'Fully remote' },
]
const MARITAL = ['Single', 'Marriage']
const GENDERS  = ['Male', 'Female', 'Any']

const STAGES = [
  { step: 1, key: 'info',    label: 'Job Information', icon: FileText, desc: 'Provide key details to define the job.' },
  { step: 2, key: 'manager', label: 'Team Member',     icon: Users,   desc: 'Add team members on the hiring process.' },
  { step: 3, key: 'share',   label: 'Share Job',       icon: Share2,  desc: 'Choose where and how to publish the job.' },
]

/* Platform brand icons */
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="#0A66C2" className="w-4 h-4">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)
const IndeedIcon = () => (
  <svg viewBox="0 0 24 24" fill="#2164F3" className="w-4 h-4">
    <path d="M13.75 0C9.936 0 6.25 1.67 6.25 6.296v.772H3.5v3.57h2.75V24h4.125V10.638h3.094l.531-3.57h-3.625v-.6c0-1.404.792-1.98 2.063-1.98h1.75V.084A20.994 20.994 0 0013.75 0z"/>
  </svg>
)
const BaytIcon = () => (
  <svg viewBox="0 0 24 24" fill="#00A651" className="w-4 h-4">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 110 16A8 8 0 0112 4zm-1 3v2H9v2h2v6h2v-6h2V9h-2V7h-2z"/>
  </svg>
)

const FIELD = 'w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all placeholder-neutral-400'
const LABEL = 'block text-sm font-medium text-neutral-700 mb-1.5'
const SECTION_TITLE = 'text-sm font-semibold text-neutral-900 mb-3'

const blank = {
  title: '', department: '', job_type: 'Full Time', closing_date: '',
  available_position: '', workplace: 'onsite',
  country: '', city: '',
  salary_min: '', salary_max: '', currency: 'USD – Dollar', payment_type: 'monthly',
  prefer_not_salary: false,
  description: '',
  gender: 'Any', nationality: '', marital: '', experience: '',
  status: 'active', min_ai_score: 70,
  skills: [] as string[], min_experience: 0,
  pipeline_stages: ['Applied', 'Screening', 'Interview', 'Offer'],
  hiring_managers: [] as string[],
  share_sources: { linkedin: false, indeed: false, bayt: false, career: true } as Record<string, boolean>,
  share_agencies: { teach_east: false, alliance: false, recruitary: false } as Record<string, boolean>,
}
type FormState = typeof blank

const AGENCIES = [
  { key: 'teach_east', label: 'Teach East',           initials: 'TE', color: 'bg-blue-100 text-blue-700' },
  { key: 'alliance',   label: 'Alliance Recruitment', initials: 'AR', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'recruitary', label: 'Recruitary',            initials: 'RC', color: 'bg-teal-100 text-teal-700' },
]

/* ─── component ──────────────────────────────────────────────── */
export default function JobModal({ open, onClose, job }: Props) {
  const { createJob, updateJob } = useJobsContext()
  const isEdit = !!job

  const [step, setStep]           = useState(1)
  const [form, setForm]           = useState<FormState>(blank)
  const [saving, setSaving]       = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone]       = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState('')

  const [platformIntegrations, setPlatformIntegrations] = useState<PlatformIntegration[]>([])
  const [publishing, setPublishing]     = useState(false)
  const [postStatuses, setPostStatuses] = useState<PlatformPostStatus[]>([])
  const [savedJobId, setSavedJobId]     = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  const startPolling = (jobId: string) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const statuses = await integrationsApi.getPublishStatus(jobId)
        setPostStatuses(statuses)
        const allDone = statuses.every(s => s.status !== 'posting' && s.status !== 'pending')
        if (allDone) stopPolling()
      } catch { /* ignore */ }
    }, 4000)
  }
  useEffect(() => () => stopPolling(), [])

  useEffect(() => {
    if (!open) return
    setStep(1); setDone(false); setError(null); setAiDone(false)
    setPostStatuses([]); setSavedJobId(null); stopPolling()
    if (job) {
      setForm({
        ...blank,
        title: job.title, department: job.department ?? '',
        job_type: job.job_type ?? 'Full Time',
        available_position: '',
        workplace: job.remote ? 'remote' : 'onsite',
        country: '', city: job.location ?? '',
        salary_min: String(job.salary_min ?? ''),
        salary_max: String(job.salary_max ?? ''),
        description: job.description ?? '',
        status: job.status ?? 'active',
        min_ai_score: job.min_ai_score ?? 70,
        skills: job.requirements?.skills ?? [],
        min_experience: job.requirements?.min_experience ?? 0,
        pipeline_stages: Array.isArray(job.pipeline_stages) ? job.pipeline_stages : blank.pipeline_stages,
        hiring_managers: [],
        share_sources: { linkedin: false, indeed: false, bayt: false, career: true },
        share_agencies: { teach_east: false, alliance: false, recruitary: false },
      })
    } else {
      setForm(blank)
    }
    // Fetch connected integrations so step 3 shows correct badges
    integrationsApi.list()
      .then(setPlatformIntegrations)
      .catch(() => {})
  }, [open, job])

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(p => ({ ...p, [key]: val }))

  /* ── AI Generate Description ── */
  const generateDescription = async () => {
    setAiLoading(true); setAiDone(false)
    try {
      const res = await post<{ description: string }>('/api/v1/jobs/generate-description', {
        title: form.title || 'Professional',
        department: form.department || '',
        skills: form.skills,
        location: [form.city, form.country].filter(Boolean).join(', '),
        job_type: form.job_type,
        experience: form.experience || '',
      })
      set('description', res.description)
      setAiDone(true)
    } catch {
      // Fallback to local generation if endpoint not available
      set('description',
        `We are seeking a dedicated and experienced ${form.title || 'professional'} to join our ${form.department || 'team'}.\n\n` +
        `Key Responsibilities:\n` +
        `• Drive core initiatives aligned with our mission and strategic goals.\n` +
        `• Collaborate cross-functionally with team leads and stakeholders.\n` +
        `• Maintain high standards of quality, delivery and performance.\n` +
        `• Mentor team members and contribute to a culture of continuous improvement.\n\n` +
        `Requirements:\n` +
        (form.skills.length > 0 ? `• Proficiency in: ${form.skills.join(', ')}.\n` : '') +
        (form.experience ? `• ${form.experience} years of relevant experience.\n` : '') +
        `• Strong communication and problem-solving skills.\n` +
        `• Ability to thrive in a fast-paced, collaborative environment.`
      )
      setAiDone(true)
    } finally {
      setAiLoading(false)
    }
  }

  /* ── Save + Publish ── */
  const handleFinish = async () => {
    setSaving(true); setError(null)
    try {
      const payload = {
        title: form.title, description: form.description || null,
        department: form.department || null,
        location: [form.city, form.country].filter(Boolean).join(', ') || null,
        remote: form.workplace === 'remote',
        job_type: form.job_type.toLowerCase().replace(' ', '_'),
        status: form.status,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        hiring_manager: form.hiring_managers[0] ?? null,
        min_ai_score: form.min_ai_score,
        requirements: { skills: form.skills, min_experience: form.min_experience },
        pipeline_stages: form.pipeline_stages,
      }

      let resultJob: ApiJob
      if (isEdit && job) {
        resultJob = await updateJob(job.id, payload as any)
        setSavedJobId(job.id)
      } else {
        resultJob = await createJob(payload as any)
        setSavedJobId(resultJob?.id ?? null)
      }

      const finalJobId = resultJob?.id ?? job?.id ?? null

      // Enqueue background posting to selected connected platforms
      const selectedPlatforms = Object.entries(form.share_sources)
        .filter(([k, v]) => v && k !== 'career' && isConnected(k))
        .map(([k]) => k)

      if (selectedPlatforms.length > 0 && finalJobId) {
        setPublishing(true)
        try {
          const initial = await integrationsApi.publishJob(finalJobId, selectedPlatforms)
          setPostStatuses(initial)
          startPolling(finalJobId)
        } catch { /* non-fatal */ } finally {
          setPublishing(false)
        }
      }

      setDone(true)
    } catch {
      setError('Failed to save job. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isConnected = (platformId: string) =>
    platformIntegrations.some(i => i.platform === platformId)

  const getIntegrationEmail = (platformId: string) =>
    platformIntegrations.find(i => i.platform === platformId)?.email ?? null

  if (!open) return null

  /* ── Success screen ── */
  if (done) return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl flex flex-col items-center gap-5 text-center max-w-sm px-8 py-10"
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200"
        >
          <CheckCircle2 className="w-8 h-8 text-white" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 mb-1.5">Job {isEdit ? 'Updated' : 'Created'}!</h2>
          <p className="text-neutral-500 text-sm leading-relaxed">
            <span className="font-semibold text-neutral-800">{form.title}</span> has been successfully {isEdit ? 'updated' : 'created and published'}.
          </p>
        </div>

        {/* Real-time platform posting status */}
        {postStatuses.length > 0 && (
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide text-left">Publishing to</p>
            {postStatuses.map(s => {
              const isPosting = s.status === 'posting' || s.status === 'pending'
              const isPosted  = s.status === 'posted'
              const isErr     = s.status === 'error'
              const isNoConn  = s.status === 'not_connected'
              return (
                <div key={s.platform} className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium',
                  isPosted  ? 'bg-green-50  border-green-200  text-green-700'  :
                  isPosting ? 'bg-blue-50   border-blue-200   text-blue-700'   :
                  isErr     ? 'bg-red-50    border-red-200    text-red-700'    :
                  isNoConn  ? 'bg-amber-50  border-amber-200  text-amber-700'  :
                              'bg-neutral-50 border-neutral-200 text-neutral-600'
                )}>
                  <span className="capitalize font-semibold">{s.platform}</span>
                  <div className="flex items-center gap-1.5">
                    {isPosting && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isPosted  && <CheckCircle className="w-3 h-3" />}
                    {isErr     && <AlertCircle className="w-3 h-3" />}
                    <span>
                      {isPosting ? 'Posting…'
                       : isPosted  ? 'Posted ✓'
                       : isErr     ? (s.detail ?? 'Failed')
                       : isNoConn  ? 'Not connected'
                       : s.status}
                    </span>
                    {isPosted && s.external_url && (
                      <a href={s.external_url} target="_blank" rel="noopener noreferrer"
                         className="ml-1 underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
            {postStatuses.some(s => s.status === 'posting' || s.status === 'pending') && (
              <p className="text-[11px] text-neutral-400 text-center">
                Posting in background — updates automatically.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2.5">
          <button onClick={() => { stopPolling(); onClose() }} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors">
            Close
          </button>
          <button onClick={() => { stopPolling(); onClose() }} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors">
            View Job
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )

  const isLastStep = step === 3

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-[900px] max-h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <button onClick={onClose} className="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors">
                <X className="w-3 h-3" />
              </button>
              <h1 className="text-[13px] font-semibold text-neutral-800">{isEdit ? 'Edit Job' : 'Create New Job'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors bg-white">Preview</button>
              <button onClick={() => set('status', 'draft')} className="px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors bg-white">Save as Draft</button>
              {isLastStep ? (
                <button
                  onClick={handleFinish}
                  disabled={saving || publishing}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-[12.5px] font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60"
                >
                  {(saving || publishing) && <Loader2 className="w-3 h-3 animate-spin" />}
                  {saving ? 'Saving…' : publishing ? 'Publishing…' : 'Save & Publish'}
                </button>
              ) : (
                <button onClick={() => setStep(s => s + 1)} className="px-4 py-1.5 text-[12.5px] font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
                  Next
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-[200px] flex-shrink-0 bg-white border-r border-neutral-200 p-4">
              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
                {STAGES.map(stage => {
                  const isDone = step > stage.step
                  const isActive = step === stage.step
                  const isLocked = step < stage.step
                  return (
                    <button
                      key={stage.key}
                      onClick={() => { if (!isLocked) setStep(stage.step) }}
                      disabled={isLocked}
                      className={cn(
                        'w-full flex items-start gap-2.5 p-3 text-left transition-all border-b border-neutral-200 last:border-b-0',
                        isActive ? 'bg-white' : '',
                        isDone ? 'hover:bg-white/60 cursor-pointer' : '',
                        isLocked ? 'opacity-50 cursor-not-allowed' : '',
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                        isActive || isDone ? 'bg-violet-600 text-white' : 'bg-neutral-200 text-neutral-400'
                      )}>
                        {isDone ? <Check className="w-3.5 h-3.5" /> : <stage.icon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">STEP {stage.step}</p>
                        <p className={cn('text-[12.5px] font-semibold mt-0.5 leading-tight', isActive ? 'text-violet-700' : isDone ? 'text-neutral-700' : 'text-neutral-400')}>
                          {stage.label}
                        </p>
                        {isActive && stage.desc && (
                          <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{stage.desc}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-neutral-50">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.16 }}
                  className="max-w-2xl mx-auto px-6 py-6"
                >

                  {/* ══ STEP 1 ══ */}
                  {step === 1 && (
                    <div className="space-y-5">
                      {/* Job Detail */}
                      <section className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                        <h2 className={SECTION_TITLE}>Job Detail</h2>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={LABEL}>Job Title</label>
                              <input className={FIELD} placeholder="e.g. Senior Software Engineer" value={form.title} onChange={e => set('title', e.target.value)} />
                            </div>
                            <div>
                              <label className={LABEL}>Department</label>
                              <div className="relative">
                                <select className={cn(FIELD, 'appearance-none pr-8')} value={form.department} onChange={e => set('department', e.target.value)}>
                                  <option value="">Select Department</option>
                                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={LABEL}>Closing Date</label>
                              <input type="date" className={FIELD} value={form.closing_date} onChange={e => set('closing_date', e.target.value)} />
                            </div>
                            <div>
                              <label className={LABEL}>Employment Type</label>
                              <div className="relative">
                                <select className={cn(FIELD, 'appearance-none pr-8')} value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                                  {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className={LABEL}>Workplace Type</label>
                            <div className="grid grid-cols-3 gap-2.5">
                              {WORKPLACE_TYPES.map(w => (
                                <button key={w.key} onClick={() => set('workplace', w.key)}
                                  className={cn('text-left p-3 rounded-lg border-2 transition-all', form.workplace === w.key ? 'border-violet-500 bg-violet-50' : 'border-neutral-200 bg-white hover:border-neutral-300')}
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0', form.workplace === w.key ? 'border-violet-600' : 'border-neutral-300')}>
                                      {form.workplace === w.key && <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                                    </div>
                                    <span className="text-[12.5px] font-semibold text-neutral-800">{w.label}</span>
                                  </div>
                                  <p className="text-[11px] text-neutral-500 leading-relaxed">{w.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Location */}
                      <section className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                        <h2 className={SECTION_TITLE}>Location</h2>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={LABEL}>Country</label>
                            <div className="relative">
                              <select className={cn(FIELD, 'appearance-none pr-8')} value={form.country} onChange={e => set('country', e.target.value)}>
                                <option value="">Select Country</option>
                                {['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Egypt', 'United States', 'United Kingdom'].map(c => <option key={c}>{c}</option>)}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className={LABEL}>City</label>
                            <input className={FIELD} placeholder="e.g. Dubai" value={form.city} onChange={e => set('city', e.target.value)} />
                          </div>
                        </div>
                      </section>

                      {/* Salary */}
                      <section className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-sm font-semibold text-neutral-900">Salary</h2>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={form.prefer_not_salary} onChange={e => set('prefer_not_salary', e.target.checked)} className="w-3 h-3 rounded border-neutral-300 accent-violet-600" />
                            <span className="text-xs text-neutral-500">Prefer not to say</span>
                          </label>
                        </div>
                        <div className={cn('space-y-4 transition-opacity', form.prefer_not_salary && 'opacity-40 pointer-events-none')}>
                          <div className="grid grid-cols-3 gap-2.5">
                            <input className={FIELD} placeholder="Min Salary" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} />
                            <input className={FIELD} placeholder="Max Salary" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} />
                            <div className="relative">
                              <select className={cn(FIELD, 'appearance-none pr-8')} value={form.currency} onChange={e => set('currency', e.target.value)}>
                                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2.5">
                            {PAYMENT_TYPES.map(pt => (
                              <button key={pt.key} onClick={() => set('payment_type', pt.key)}
                                className={cn('text-left p-3 rounded-lg border-2 transition-all', form.payment_type === pt.key ? 'border-violet-500 bg-violet-50' : 'border-neutral-200 bg-white hover:border-neutral-300')}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0', form.payment_type === pt.key ? 'border-violet-600' : 'border-neutral-300')}>
                                    {form.payment_type === pt.key && <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                                  </div>
                                  <span className="text-[12.5px] font-semibold text-neutral-800">{pt.label}</span>
                                </div>
                                <p className="text-[11px] text-neutral-500 leading-relaxed">{pt.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* Description */}
                      <section className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                        <h2 className={SECTION_TITLE}>Job Description & Requirements</h2>
                        <div className="space-y-3.5">
                          {/* Skills */}
                          <div>
                            <label className={LABEL}>Required Skills <span className="text-neutral-400 font-normal">(Optional)</span></label>
                            <div className="min-h-[38px] w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 focus-within:border-violet-400 transition-colors">
                              {form.skills.map(s => (
                                <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs border border-neutral-200">
                                  {s}
                                  <button onClick={() => set('skills', form.skills.filter(x => x !== s))} className="text-neutral-400 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                </span>
                              ))}
                              <input
                                className="flex-1 min-w-[120px] text-sm outline-none placeholder-neutral-400 bg-transparent"
                                placeholder="Type a skill and press Enter"
                                value={skillInput}
                                onChange={e => setSkillInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const s = skillInput.trim()
                                    if (s && !form.skills.includes(s)) set('skills', [...form.skills, s])
                                    setSkillInput('')
                                  }
                                }}
                              />
                            </div>
                          </div>
                          {/* Description + AI button */}
                          <div>
                            <label className={LABEL}>Description</label>
                            <div className="relative border border-neutral-200 rounded-lg overflow-hidden focus-within:border-violet-400 transition-colors bg-white">
                              <textarea
                                className="w-full px-3 pt-3 pb-12 text-sm text-neutral-800 placeholder-neutral-400 resize-none focus:outline-none bg-transparent"
                                rows={6}
                                placeholder="Describe the role, responsibilities, and requirements…"
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                              />
                              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                                <button
                                  onClick={generateDescription}
                                  disabled={aiLoading}
                                  className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                                    aiLoading ? 'bg-neutral-200 text-neutral-500'
                                      : aiDone ? 'bg-green-100 text-green-700 border border-green-200'
                                      : 'bg-gradient-to-r from-orange-500 to-violet-600 text-white hover:opacity-90'
                                  )}
                                >
                                  {aiLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                                    : aiDone ? <><Check className="w-3 h-3" /> Generated</>
                                    : <><Sparkles className="w-3 h-3" /> Generate with AI ✦</>}
                                </button>
                                {form.title && !aiLoading && !aiDone && (
                                  <span className="text-[10px] text-neutral-400">
                                    Based on: <strong>{form.title}</strong>
                                    {form.skills.length > 0 && ` · ${form.skills.slice(0,3).join(', ')}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Preferences */}
                      <section className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                        <h2 className={SECTION_TITLE}>Preferences</h2>
                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg mb-4">
                          <div className="w-3.5 h-3.5 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-violet-700 text-[9px] font-bold">i</span>
                          </div>
                          <span className="text-xs text-violet-700">Preferences are for internal use only and won't be shown to applicants.</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={LABEL}>Candidate Gender</label>
                            <div className="relative">
                              <select className={cn(FIELD, 'appearance-none pr-8')} value={form.gender} onChange={e => set('gender', e.target.value)}>
                                {GENDERS.map(g => <option key={g}>{g}</option>)}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className={LABEL}>Year of Experience</label>
                            <input className={FIELD} placeholder="e.g. 3+ years" value={form.experience} onChange={e => set('experience', e.target.value)} />
                          </div>
                          <div>
                            <label className={LABEL}>Min AI Score (%)</label>
                            <input type="number" min={0} max={100} className={FIELD} value={form.min_ai_score} onChange={e => set('min_ai_score', Number(e.target.value))} />
                          </div>
                          <div>
                            <label className={LABEL}>Status</label>
                            <div className="relative">
                              <select className={cn(FIELD, 'appearance-none pr-8 capitalize')} value={form.status} onChange={e => set('status', e.target.value)}>
                                {STATUS_OPTS.map(s => <option key={s} className="capitalize">{s}</option>)}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </section>
                      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
                    </div>
                  )}

                  {/* ══ STEP 2 ══ */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <section className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                        <h2 className={SECTION_TITLE}>Hiring Manager</h2>
                        <div className="space-y-4">
                          <div>
                            <label className={LABEL}>Select Hiring Manager</label>
                            <div className="relative">
                              <select className={cn(FIELD, 'appearance-none pr-8')}
                                onChange={e => {
                                  const v = e.target.value
                                  if (v && !form.hiring_managers.includes(v)) set('hiring_managers', [...form.hiring_managers, v])
                                  e.target.value = ''
                                }}
                              >
                                <option value="">Select Manager</option>
                                {['Amanda Nur', 'Taufik Hidayat', 'Rizky Kurniawan', 'Sarah Mitchell', 'James Chen'].map(m => <option key={m}>{m}</option>)}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                            </div>
                          </div>
                          {form.hiring_managers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3"><Users className="w-6 h-6 text-neutral-400" /></div>
                              <p className="text-sm font-semibold text-neutral-700 mb-1">No Hiring Manager Assigned</p>
                              <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">Choose the right person to lead the hiring process.</p>
                            </div>
                          ) : (
                            <div className="border border-neutral-200 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-neutral-50 border-b border-neutral-100">
                                    <th className="text-left px-4 py-2 text-xs font-medium text-neutral-500">Name</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-neutral-500">Position</th>
                                    <th className="px-4 py-2" />
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                  {form.hiring_managers.map((mgr, i) => {
                                    const positions = ['Department Coordinator', 'HR Manager', 'Head of Academic', 'Engineering Lead', 'Product Lead']
                                    const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700']
                                    return (
                                      <tr key={mgr} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center gap-2">
                                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', colors[i % colors.length])}>{mgr.charAt(0)}</div>
                                            <span className="text-neutral-800 font-medium text-sm">{mgr}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-neutral-500 text-xs">{positions[i % positions.length]}</td>
                                        <td className="px-4 py-2.5 text-right">
                                          <button onClick={() => set('hiring_managers', form.hiring_managers.filter(m => m !== mgr))} className="text-neutral-400 hover:text-red-500 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </section>
                      <div className="flex items-start gap-2.5 px-4 py-3 bg-violet-50 border border-violet-200 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-violet-700 text-[9px] font-bold">i</span></div>
                        <p className="text-xs text-violet-600 leading-relaxed">Assign a hiring manager to review and shortlist candidates. This won't be visible to applicants.</p>
                      </div>
                    </div>
                  )}

                  {/* ══ STEP 3: Share Job ══ */}
                  {step === 3 && (
                    <div className="space-y-5">
                      <section className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                        <h2 className={SECTION_TITLE}>Share Job Vacancy</h2>

                        {/* Job Boards */}
                        <div className="mb-5">
                          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Job Board</p>
                          <div className="space-y-1">
                            {[
                              { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, color: '#0A66C2', bg: 'bg-[#0A66C2]' },
                              { key: 'indeed',   label: 'Indeed',   Icon: IndeedIcon,   color: '#2164F3', bg: 'bg-[#2164F3]' },
                              { key: 'bayt',     label: 'Bayt',     Icon: BaytIcon,     color: '#00A651', bg: 'bg-[#00A651]' },
                            ].map(src => {
                              const on = form.share_sources[src.key]
                              const connected = isConnected(src.key)
                              const email = getIntegrationEmail(src.key)
                              return (
                                <div key={src.key} className={cn(
                                  'flex items-center justify-between p-3 rounded-xl border transition-all',
                                  on ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-100 bg-white',
                                )}>
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0', src.bg)}>
                                      <src.Icon />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-neutral-800">{src.label}</span>
                                        {connected ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                                            <CheckCircle size={8} /> Connected
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                                            Not connected
                                          </span>
                                        )}
                                      </div>
                                      {connected && email && (
                                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">{email}</p>
                                      )}
                                      {!connected && (
                                        <p className="text-[11px] text-neutral-400 mt-0.5">
                                          Connect in{' '}
                                          <a href="/integrations" className="text-violet-600 hover:underline font-medium">
                                            Integrations
                                          </a>{' '}
                                          to post here
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => set('share_sources', { ...form.share_sources, [src.key]: !on })}
                                    disabled={!connected}
                                    title={!connected ? `Connect your ${src.label} account first` : ''}
                                    className={cn(
                                      'relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors flex-shrink-0',
                                      on && connected ? 'bg-green-500' : 'bg-neutral-200',
                                      !connected && 'opacity-40 cursor-not-allowed',
                                    )}
                                  >
                                    <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform', on && connected ? 'translate-x-4' : 'translate-x-0')} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>

                          {/* Info if none connected */}
                          {!isConnected('linkedin') && !isConnected('indeed') && !isConnected('bayt') && (
                            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                              <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-[12px] text-amber-700 leading-relaxed">
                                No job boards connected yet.{' '}
                                <a href="/integrations" className="font-semibold underline">Go to Integrations</a>
                                {' '}to connect LinkedIn, Indeed, or Bayt.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Agencies */}
                        <div className="mb-5">
                          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Share to Agency</p>
                          {AGENCIES.map(agency => {
                            const on = form.share_agencies[agency.key]
                            return (
                              <div key={agency.key} className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0">
                                <div className="flex items-center gap-2.5">
                                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold', agency.color)}>{agency.initials}</div>
                                  <span className="text-sm font-medium text-neutral-800">{agency.label}</span>
                                </div>
                                <button
                                  onClick={() => set('share_agencies', { ...form.share_agencies, [agency.key]: !on })}
                                  className={cn('relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors flex-shrink-0', on ? 'bg-green-500' : 'bg-neutral-200')}
                                >
                                  <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform', on ? 'translate-x-4' : 'translate-x-0')} />
                                </button>
                              </div>
                            )
                          })}
                        </div>

                        {/* Career Page */}
                        <div>
                          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Career Page</p>
                          <div className="flex items-center justify-between py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600"><Globe className="w-4 h-4" /></div>
                              <div>
                                <span className="text-sm font-medium text-neutral-800">Career Page</span>
                                <p className="text-[11px] text-neutral-400">Publicly listed on your AutoHyre career page</p>
                              </div>
                            </div>
                            <button
                              onClick={() => set('share_sources', { ...form.share_sources, career: !form.share_sources['career'] })}
                              className={cn('relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors flex-shrink-0', form.share_sources['career'] ? 'bg-green-500' : 'bg-neutral-200')}
                            >
                              <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform', form.share_sources['career'] ? 'translate-x-4' : 'translate-x-0')} />
                            </button>
                          </div>
                        </div>
                      </section>
                      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
                    </div>
                  )}

                  {/* Bottom nav */}
                  <div className="flex items-center justify-between pt-5">
                    <button
                      onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                      className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors bg-white"
                    >
                      {step === 1 ? 'Cancel' : '← Back'}
                    </button>
                    {isLastStep ? (
                      <button
                        onClick={handleFinish}
                        disabled={saving || publishing}
                        className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {(saving || publishing) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {saving ? 'Saving…' : publishing ? 'Publishing…' : 'Save & Publish'}
                      </button>
                    ) : (
                      <button onClick={() => setStep(s => s + 1)} className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
                        Next →
                      </button>
                    )}
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
