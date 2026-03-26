'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Loader2, Plus, Trash2, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useJobsContext } from '@/lib/jobs-context'
import FormBuilder from './form-builder'
import LinkManager from './link-manager'
import type { ApiJob } from '@/types/job'

interface Props {
  open: boolean
  onClose: () => void
  job?: ApiJob | null
}

const JOB_TYPES    = ['full-time', 'part-time', 'contract', 'internship']
const DEPARTMENTS  = ['Engineering', 'Design', 'AI/ML', 'Analytics', 'Infrastructure', 'Product', 'Marketing', 'Sales', 'Operations']
const STATUS_OPTS  = ['active', 'paused', 'draft', 'closed']
const STAGE_DEFAULTS = ['Applied', 'Screening', 'Interview', 'Offer']

const FIELD = 'w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all placeholder-neutral-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

const AI_TEMPLATES: Record<string, Partial<typeof blankForm>> = {
  'frontend': { department: 'Engineering', job_type: 'full-time', skills: ['React', 'TypeScript', 'CSS', 'Next.js'], min_experience: 3, min_ai_score: 70, description: 'We are looking for a skilled Frontend Engineer to build beautiful, performant user interfaces. You will collaborate with design and backend teams to ship great product experiences.' },
  'backend':  { department: 'Engineering', job_type: 'full-time', skills: ['Node.js', 'PostgreSQL', 'REST APIs', 'Docker'], min_experience: 3, min_ai_score: 70, description: 'We need a Backend Engineer to design and build scalable APIs and services. You will own infrastructure decisions and work closely with the product team.' },
  'ml':       { department: 'AI/ML',       job_type: 'full-time', skills: ['Python', 'PyTorch', 'LLMs', 'MLOps'], min_experience: 4, min_ai_score: 75, description: 'Join our AI team to build and deploy machine learning models at scale. You will work on cutting-edge NLP, recommendation, and forecasting systems.' },
  'designer': { department: 'Design',      job_type: 'full-time', skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'], min_experience: 3, min_ai_score: 65, description: 'We are seeking a Product Designer to craft delightful user experiences. You will lead end-to-end design from research to high-fidelity prototypes.' },
  'devops':   { department: 'Infrastructure', job_type: 'full-time', skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD', 'Docker'], min_experience: 4, min_ai_score: 70, description: 'We need a DevOps Engineer to own our cloud infrastructure, CI/CD pipelines, and reliability engineering.' },
  'data':     { department: 'Analytics',   job_type: 'full-time', skills: ['Python', 'SQL', 'Spark', 'Tableau'], min_experience: 3, min_ai_score: 68, description: 'As a Data Scientist you will analyse large datasets to drive product decisions, run A/B tests, and build data-driven features.' },
  'product':  { department: 'Product',     job_type: 'full-time', skills: ['Product Strategy', 'Roadmapping', 'Agile', 'SQL'], min_experience: 4, min_ai_score: 65, description: 'We are looking for a Product Manager to drive the roadmap, work with engineering and design, and ship products users love.' },
}

const blankForm = {
  title: '', description: '', department: '', location: '',
  remote: false, job_type: 'full-time', status: 'active',
  salary_min: '' as number | '', salary_max: '' as number | '',
  hiring_manager: '', min_ai_score: 70,
  skills: [] as string[], min_experience: 0,
  pipeline_stages: STAGE_DEFAULTS,
}
type FormState = typeof blankForm

type Tab = 'details' | 'links'

export default function JobModal({ open, onClose, job }: Props) {
  const { createJob, updateJob } = useJobsContext()
  const isEdit = !!job

  const [tab, setTab]             = useState<Tab>('details')
  const [form, setForm]           = useState<FormState>(blankForm)
  const [skillInput, setSkillInput] = useState('')
  const [stageInput, setStageInput] = useState('')
  const [saving, setSaving]       = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiApplied, setAiApplied] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  // savedJobId tracks the job after first save so the Links tab can load
  const [savedJobId, setSavedJobId] = useState<string | null>(null)

  useEffect(() => {
    if (job) {
      setForm({
        title: job.title, description: job.description ?? '',
        department: job.department ?? '', location: job.location ?? '',
        remote: job.remote, job_type: job.job_type, status: job.status,
        salary_min: job.salary_min ?? '', salary_max: job.salary_max ?? '',
        hiring_manager: job.hiring_manager ?? '', min_ai_score: job.min_ai_score,
        skills: job.requirements?.skills ?? [],
        min_experience: job.requirements?.min_experience ?? 0,
        pipeline_stages: Array.isArray(job.pipeline_stages) ? job.pipeline_stages : STAGE_DEFAULTS,
      })
      setSavedJobId(job.id)
    } else {
      setForm(blankForm)
      setSavedJobId(null)
    }
    setTab('details')
    setError(null)
    setAiApplied(false)
  }, [job, open])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleAiFill = () => {
    const key = Object.keys(AI_TEMPLATES).find(k => form.title.toLowerCase().includes(k))
    if (!key) return
    setAiLoading(true)
    setTimeout(() => {
      const tpl = AI_TEMPLATES[key]
      setForm(prev => ({
        ...prev,
        department:     tpl.department     ?? prev.department,
        job_type:       tpl.job_type       ?? prev.job_type,
        description:    tpl.description    ?? prev.description,
        skills:         tpl.skills         ?? prev.skills,
        min_experience: tpl.min_experience ?? prev.min_experience,
        min_ai_score:   tpl.min_ai_score   ?? prev.min_ai_score,
      }))
      setAiLoading(false)
      setAiApplied(true)
    }, 900)
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) setForm(p => ({ ...p, skills: [...p.skills, s] }))
    setSkillInput('')
  }

  const addStage = () => {
    const s = stageInput.trim()
    if (s && !form.pipeline_stages.includes(s)) setForm(p => ({ ...p, pipeline_stages: [...p.pipeline_stages, s] }))
    setStageInput('')
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Job title is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title, description: form.description || null,
        department: form.department || null, location: form.location || null,
        remote: form.remote, job_type: form.job_type, status: form.status,
        salary_min: form.salary_min !== '' ? Number(form.salary_min) : null,
        salary_max: form.salary_max !== '' ? Number(form.salary_max) : null,
        hiring_manager: form.hiring_manager || null, min_ai_score: form.min_ai_score,
        requirements: { skills: form.skills, min_experience: form.min_experience },
        pipeline_stages: form.pipeline_stages,
      }
      if (isEdit && job) {
        await updateJob(job.id, payload as any)
      } else {
        const created = await createJob(payload as any)
        // store the new job id so Links tab can load
        if (created?.id) setSavedJobId(created.id)
      }
      // switch to links tab after saving
      setTab('links')
    } catch {
      setError('Failed to save job. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Job Details' },
    { id: 'links',   label: 'Links & Form' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div>
                <h2 className="text-neutral-950 font-semibold">{isEdit ? 'Edit Job' : 'Post New Job'}</h2>
                <p className="text-neutral-400 text-xs mt-0.5">{isEdit ? 'Update job details and manage application links' : 'Fill in the details, then generate a shareable link'}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-100 px-6">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    // Can only visit Links tab if job is saved
                    if (t.id === 'links' && !savedJobId) return
                    setTab(t.id)
                  }}
                  className={cn(
                    'px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-colors',
                    tab === t.id
                      ? 'border-neutral-950 text-neutral-950'
                      : 'border-transparent text-neutral-400 hover:text-neutral-700',
                    t.id === 'links' && !savedJobId && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {t.id === 'links' && <Link2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {tab === 'details' && (
                <>
                  {/* Title + AI */}
                  <div>
                    <label className={LABEL}>Job Title *</label>
                    <div className="flex gap-2">
                      <input
                        className={cn(FIELD, 'flex-1')}
                        placeholder="e.g. Senior Frontend Engineer"
                        value={form.title}
                        onChange={e => { set('title', e.target.value); setAiApplied(false) }}
                      />
                      <button
                        onClick={handleAiFill}
                        disabled={!form.title.trim() || aiLoading}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all flex-shrink-0',
                          aiApplied
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {aiApplied ? 'AI Applied' : 'AI Fill'}
                      </button>
                    </div>
                    {aiApplied && (
                      <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI pre-filled department, description, skills and score threshold.
                      </p>
                    )}
                  </div>

                  {/* Department + Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Department</label>
                      <select className={FIELD} value={form.department} onChange={e => set('department', e.target.value)}>
                        <option value="">Select department</option>
                        {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Job Type</label>
                      <select className={FIELD} value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                        {JOB_TYPES.map(t => <option key={t} className="capitalize">{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Location + Remote */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Location</label>
                      <input className={FIELD} placeholder="e.g. San Francisco, CA" value={form.location} onChange={e => set('location', e.target.value)} />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2.5 cursor-pointer group pb-2">
                        <div onClick={() => set('remote', !form.remote)} className={cn('relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors', form.remote ? 'bg-neutral-950' : 'bg-neutral-200')}>
                          <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform', form.remote ? 'translate-x-4' : 'translate-x-0')} />
                        </div>
                        <span className="text-sm text-neutral-700 group-hover:text-neutral-900">Remote OK</span>
                      </label>
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Salary Min (USD/yr)</label>
                      <input type="number" className={FIELD} placeholder="e.g. 120000" value={form.salary_min} onChange={e => set('salary_min', e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className={LABEL}>Salary Max (USD/yr)</label>
                      <input type="number" className={FIELD} placeholder="e.g. 180000" value={form.salary_max} onChange={e => set('salary_max', e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                  </div>

                  {/* Hiring manager + Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Hiring Manager</label>
                      <input className={FIELD} placeholder="e.g. Sarah Mitchell" value={form.hiring_manager} onChange={e => set('hiring_manager', e.target.value)} />
                    </div>
                    <div>
                      <label className={LABEL}>Status</label>
                      <select className={FIELD} value={form.status} onChange={e => set('status', e.target.value)}>
                        {STATUS_OPTS.map(s => <option key={s} className="capitalize">{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className={LABEL}>Description</label>
                    <textarea className={cn(FIELD, 'resize-none')} rows={4} placeholder="Describe the role, responsibilities, and team…" value={form.description} onChange={e => set('description', e.target.value)} />
                  </div>

                  {/* Skills */}
                  <div>
                    <label className={LABEL}>Required Skills</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        className={cn(FIELD, 'flex-1')}
                        placeholder="Type a skill and press Enter"
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <button onClick={addSkill} className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {form.skills.map(skill => (
                        <span key={skill} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {skill}
                          <button onClick={() => set('skills', form.skills.filter(s => s !== skill))} className="text-neutral-400 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Min experience + AI score threshold */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Min Experience (years)</label>
                      <input type="number" className={FIELD} min={0} max={20} value={form.min_experience} onChange={e => set('min_experience', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className={LABEL}>Min AI Score Threshold (%)</label>
                      <input type="number" className={FIELD} min={0} max={100} value={form.min_ai_score} onChange={e => set('min_ai_score', Number(e.target.value))} />
                      <p className="text-neutral-400 text-xs mt-1">Candidates below this score are flagged automatically</p>
                    </div>
                  </div>

                  {/* Pipeline stages */}
                  <div>
                    <label className={LABEL}>Pipeline Stages</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        className={cn(FIELD, 'flex-1')}
                        placeholder="Add a stage name"
                        value={stageInput}
                        onChange={e => setStageInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStage())}
                      />
                      <button onClick={addStage} className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {form.pipeline_stages.map((stage, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700">
                          <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="flex-1">{stage}</span>
                          <button onClick={() => set('pipeline_stages', form.pipeline_stages.filter((_, j) => j !== i))} className="text-neutral-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
                  )}
                </>
              )}

              {tab === 'links' && savedJobId && (
                <LinkManager jobId={savedJobId} jobTitle={form.title || job?.title || ''} />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
              <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-200 bg-white rounded-lg hover:border-neutral-300 transition-colors">
                {tab === 'links' ? 'Close' : 'Cancel'}
              </button>
              {tab === 'details' && (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save & Get Link →'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
