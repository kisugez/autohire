'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, MoreHorizontal, Share2,
  Briefcase, MapPin, Loader2, AlertCircle, Pencil, Trash2,
  Search, SlidersHorizontal, Plus, X, ChevronDown, Check, Copy, Globe,
} from 'lucide-react'
import JobModal from '@/components/jobs/job-modal'
import { formatDate, getInitials, getMatchScoreBg, cn, getAvatarUrl } from '@/lib/utils'
import { get, post, patch, delete as del } from '@/lib/api'
import { useJobsContext } from '@/lib/jobs-context'
import type { ApiJob, ApiApplication, JobLinkResponse } from '@/types/job'
import type { ApiCandidate } from '@/types/candidate'

const STAGE_TABS = [
  { key: 'sourced',   label: 'Application' },
  { key: 'screening', label: 'Shortlist'   },
  { key: 'interview', label: 'Interview'   },
  { key: 'offer',     label: 'Offer'       },
  { key: 'hired',     label: 'Hired'       },
  { key: 'rejected',  label: 'Rejected'    },
] as const
type StageKey = typeof STAGE_TABS[number]['key']

const AVATAR_COLORS = [
  'bg-violet-600', 'bg-indigo-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function toArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[]
  if (val && typeof val === 'object') {
    for (const key of ['data', 'results', 'items', 'candidates', 'applications']) {
      const v = (val as Record<string, unknown>)[key]
      if (Array.isArray(v)) return v as T[]
    }
  }
  return []
}

export default function JobDetailPage({ params }: { params: { slug: string } }) {
  const { jobs, deleteJob, createJob } = useJobsContext()
  const contextJob = jobs.find(j => j.id === params.slug) ?? null

  const [job, setJob]                 = useState<ApiJob | null>(contextJob)
  const [applications, setApps]       = useState<ApiApplication[]>([])
  const [candidates, setCandidates]   = useState<Record<string, ApiCandidate>>({})
  const [loading, setLoading]         = useState(!contextJob)
  const [appsLoading, setAppsLoading] = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [editOpen, setEditOpen]       = useState(false)
  const [activeTab, setActiveTab]       = useState<'candidates' | 'information'>('candidates')
  const [activeStage, setActiveStage] = useState<StageKey>('sourced')
  const [search, setSearch]           = useState('')
  const [linkLoading, setLinkLoading]   = useState(false)
  const [linkCopied, setLinkCopied]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  // Job action menu (the ... button)
  const [jobMenuOpen, setJobMenuOpen] = useState(false)
  const jobMenuRef = useRef<HTMLDivElement>(null)

  // Candidate stage move menu
  const [stageMenuAppId, setStageMenuAppId] = useState<string | null>(null)
  const stageMenuRef = useRef<HTMLDivElement>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [jobLinks, setJobLinks] = useState<JobLinkResponse[]>([])
  const [linksLoading, setLinksLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const router = useRouter()

  // Prev / Next job navigation
  const jobIndex = jobs.findIndex(j => j.id === params.slug)
  const prevJob  = jobIndex > 0 ? jobs[jobIndex - 1] : null
  const nextJob  = jobIndex >= 0 && jobIndex < jobs.length - 1 ? jobs[jobIndex + 1] : null

  useEffect(() => { if (contextJob) setJob(contextJob) }, [contextJob])

  // Fetch job links for the information tab
  useEffect(() => {
    if (!job?.id) return
    setLinksLoading(true)
    get<JobLinkResponse[]>(`/api/v1/jobs/${job.id}/links`)
      .then(setJobLinks)
      .catch(() => setJobLinks([]))
      .finally(() => setLinksLoading(false))
  }, [job?.id])

  // Close job menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (jobMenuRef.current && !jobMenuRef.current.contains(e.target as Node)) {
        setJobMenuOpen(false)
      }
    }
    if (jobMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [jobMenuOpen])

  // Close stage menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (stageMenuRef.current && !stageMenuRef.current.contains(e.target as Node)) {
        setStageMenuAppId(null)
      }
    }
    if (stageMenuAppId) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [stageMenuAppId])

  const buildCandidateMap = useCallback(async (apps: ApiApplication[]) => {
    let map: Record<string, ApiCandidate> = {}
    try {
      const raw = await get<unknown>('/api/v1/candidates?page_size=500')
      toArray<ApiCandidate>(raw).forEach(c => { if (c?.id) map[c.id] = c })
    } catch { /* recover per-candidate below */ }
    const missing = Array.from(new Set(apps.map(a => a.candidate_id))).filter(id => id && !map[id])
    if (missing.length > 0) {
      const settled = await Promise.allSettled(
        missing.map(id => get<ApiCandidate>(`/api/v1/candidates/${id}`))
      )
      settled.forEach(result => {
        if (result.status === 'fulfilled' && result.value?.id) {
          map[result.value.id] = result.value
        }
      })
    }
    return map
  }, [])

  const fetchDetails = useCallback(async () => {
    setLoading(true)
    setAppsLoading(true)
    try {
      const [jobData, rawApps] = await Promise.all([
        get<ApiJob>(`/api/v1/jobs/${params.slug}`),
        get<unknown>(`/api/v1/applications/job/${params.slug}`),
      ])
      const apps = toArray<ApiApplication>(rawApps)
      setJob(jobData)
      setApps(apps)
      setCandidates(await buildCandidateMap(apps))
    } catch {
      setError('Failed to load job details.')
    } finally {
      setLoading(false)
      setAppsLoading(false)
    }
  }, [params.slug, buildCandidateMap])

  useEffect(() => {
    if (!contextJob) {
      fetchDetails()
    } else {
      setAppsLoading(true)
      get<unknown>(`/api/v1/applications/job/${params.slug}`)
        .then(async rawApps => {
          const apps = toArray<ApiApplication>(rawApps)
          setApps(apps)
          setCandidates(await buildCandidateMap(apps))
        })
        .catch(() => setError('Failed to load applications.'))
        .finally(() => {
          setLoading(false)
          setAppsLoading(false)
        })
    }
  }, [params.slug, contextJob, fetchDetails, buildCandidateMap])

  const handleCopyLink = async () => {
    if (!job) return
    setLinkLoading(true)
    try {
      const link = await post<JobLinkResponse>(`/api/v1/jobs/${job.id}/links`, {
        source: 'direct', label: 'Direct Link',
      })
      await navigator.clipboard.writeText(`${window.location.origin}/apply/${link.slug}`)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch { /* silent */ } finally { setLinkLoading(false) }
  }

  const handleCopyJob = async () => {
    if (!job) return
    setJobMenuOpen(false)
    try {
      const newJob = await createJob({
        title:        `${job.title} (Copy)`,
        description:  job.description,
        location:     job.location,
        job_type:     job.job_type,
        remote:       job.remote,
        department:   job.department,
        salary_min:   job.salary_min,
        salary_max:   job.salary_max,
        requirements: job.requirements,
        status:       'draft',
      })
      router.push(`/jobs/${newJob.id}`)
    } catch { /* silent */ }
  }

  const handleDelete = async () => {
    if (!job) return
    setDeleting(true)
    try {
      await deleteJob(job.id)
      router.push('/jobs')
    } catch {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const handleDeleteApp = async (appId: string) => {
    try {
      await del(`/api/v1/applications/${appId}`)
      setApps(prev => prev.filter(a => a.id !== appId))
    } catch { /* silent */ }
  }

  const copyField = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(key)
      setTimeout(() => setCopiedField(null), 1800)
    })
  }

  const copyJobLink = (slug: string) => {
    const url = `${window.location.origin}/apply/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(slug)
      setTimeout(() => setCopiedLink(null), 2000)
    })
  }

  const LINK_PLATFORMS: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
    linkedin:    { label: 'LinkedIn',    icon: <svg viewBox="0 0 24 24" fill="#0A66C2" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, bg: 'bg-[#EEF3FB]' },
    indeed:      { label: 'Indeed',      icon: <Image src="/images__1_-removebg-preview.png" alt="Indeed" width={18} height={18} className="object-contain" />, bg: 'bg-[#EEF2FF]' },
    bayt:        { label: 'Bayt',        icon: <Image src="/images.png" alt="Bayt" width={18} height={18} className="object-contain" />, bg: 'bg-[#EDFAF3]' },
    career_page: { label: 'Career Page', icon: <Globe className="w-4 h-4 text-violet-600" />, bg: 'bg-violet-100' },
    direct:      { label: 'Direct Link', icon: <Globe className="w-4 h-4 text-neutral-500" />, bg: 'bg-neutral-100' },
  }

  const handleMoveStage = async (appId: string, stage: StageKey) => {
    setStageMenuAppId(null)
    try {
      await patch(`/api/v1/applications/${appId}`, { current_stage: stage })
      setApps(prev => prev.map(a => a.id === appId ? { ...a, current_stage: stage } : a))
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-neutral-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error ?? 'Job not found.'}
      </div>
    )
  }

  const stageApps = applications.filter(a => {
    const stageMatch = activeStage === 'sourced'
      ? (a.current_stage === 'sourced' || !a.current_stage)
      : a.current_stage === activeStage
    const c = candidates[a.candidate_id]
    const searchMatch = !search || (c?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return stageMatch && searchMatch
  })

  const stageCounts: Record<string, number> = {}
  for (const tab of STAGE_TABS) {
    stageCounts[tab.key] = applications.filter(a =>
      tab.key === 'sourced'
        ? (a.current_stage === 'sourced' || !a.current_stage)
        : a.current_stage === tab.key
    ).length
  }

  return (
    <div className="flex flex-col min-h-full -mx-6">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between pt-5 pb-0 border-b border-neutral-100">
        <div className="flex items-start gap-3 px-4 pb-4">
          <Link
            href="/jobs"
            className="mt-1 w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <h1 className="text-neutral-950 text-xl font-bold tracking-tight leading-none">{job.title}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                {job.status?.charAt(0).toUpperCase() + (job.status?.slice(1) ?? '')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span>ID: <span className="text-neutral-600 font-medium">#{job.id?.slice(0, 4) ?? '—'}</span></span>
              <span className="text-neutral-300">·</span>
              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.job_type ?? 'Full Time'}</span>
              {job.location && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{job.location}
                    {job.remote && <span className="text-violet-500 ml-0.5">· Remote OK</span>}
                  </span>
                </>
              )}
              <span className="text-neutral-300">·</span>
              <span>Job Available: <span className="text-neutral-600 font-medium"></span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-4">
          {/* Prev job */}
          <button
            onClick={() => prevJob && router.push(`/jobs/${prevJob.id}`)}
            disabled={!prevJob}
            title={prevJob ? `Previous: ${prevJob.title}` : 'No previous job'}
            className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {/* Next job */}
          <button
            onClick={() => nextJob && router.push(`/jobs/${nextJob.id}`)}
            disabled={!nextJob}
            title={nextJob ? `Next: ${nextJob.title}` : 'No next job'}
            className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Job actions dropdown (...) */}
          <div className="relative" ref={jobMenuRef}>
            <button
              onClick={() => setJobMenuOpen(v => !v)}
              className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {jobMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 overflow-hidden">
                <button
                  onClick={() => { setJobMenuOpen(false); setEditOpen(true) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-neutral-400" /> Edit Job
                </button>
                <button
                  onClick={handleCopyJob}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-neutral-400" /> Copy Job
                </button>
                <div className="my-1 border-t border-neutral-100" />
                <button
                  onClick={() => { setJobMenuOpen(false); setDeleteConfirm(true) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Job
                </button>
              </div>
            )}
          </div>

          {/* Share / copy application link */}
          <button
            onClick={handleCopyLink}
            disabled={linkLoading}
            title={linkCopied ? 'Link copied!' : 'Copy application link'}
            className={cn(
              'w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
              linkCopied ? 'border-green-300 text-green-600 bg-green-50' : 'border-neutral-200 text-neutral-400 hover:text-neutral-700',
            )}
          >
            {linkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : linkCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Content tabs ── */}
      <div className="flex items-center gap-6 px-4 border-b border-neutral-100">
        {(['candidates', 'information'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'text-sm py-2.5 border-b-2 -mb-px transition-colors capitalize',
              activeTab === tab ? 'border-violet-600 text-violet-600 font-semibold' : 'border-transparent text-neutral-400 hover:text-neutral-700',
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'candidates' && (
      <>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 w-40"
            />
          </div>
          <button className="w-7 h-7 rounded border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/>
              <rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/>
            </svg>
          </button>
          <button className="w-7 h-7 rounded border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="6" width="14" height="2" rx="1"/><rect x="0" y="11" width="14" height="2" rx="1"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center bg-neutral-100 rounded-lg p-1 gap-0.5">
          {STAGE_TABS.map(tab => {
            const count = stageCounts[tab.key] ?? 0
            const active = activeStage === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveStage(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
                )}
              >
                {tab.label}
                <span className={cn('text-[10px] font-semibold min-w-[14px] text-center', active ? 'text-violet-600' : 'text-neutral-400')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <SlidersHorizontal className="w-3 h-3" /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
            <Plus className="w-3 h-3" /> Add Candidate
          </button>
        </div>
      </div>

      {/* ── Candidates table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              {['Name', 'Applied Date', 'Source', 'Years Experience', 'Rating', 'Current Location'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-medium text-neutral-400">
                  <span className="flex items-center gap-1">{col} <ChevronDown className="w-3 h-3 opacity-50" /></span>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {appsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className={cn('h-3 bg-neutral-100 rounded animate-pulse', j === 0 ? 'w-1/2' : 'w-3/4')} />
                    </td>
                  ))}
                </tr>
              ))
            ) : stageApps.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-neutral-400 text-sm">
                  No candidates in this stage yet.
                </td>
              </tr>
            ) : (
              stageApps.map((app, i) => {
                const c       = candidates[app.candidate_id] ?? null
                const name    = c?.name       ?? (app as any).candidate_name ?? 'Unknown Candidate'
                const exp     = c?.experience  ?? null
                const loc     = c?.location    ?? '—'
                const locFlag = c?.location_flag ?? null
                const avatar  = getAvatarUrl(c?.avatar_url, c?.github_url, c?.raw_profile?.photo_url)
                const gender  = c?.gender      ?? null
                const href    = c ? `/candidates/${c.id}` : '#'
                const color   = avatarColor(name)

                return (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-neutral-50 hover:bg-neutral-50/70 transition-colors group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {avatar ? (
                          <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0', color)}>
                            {getInitials(name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link href={href} className="text-neutral-800 font-medium hover:text-violet-600 transition-colors text-sm">
                              {name}
                            </Link>
                            {gender === 'male'   && <span className="text-blue-400 text-xs">♂</span>}
                            {gender === 'female' && <span className="text-pink-400 text-xs">♀</span>}
                          </div>
                          {app.ai_reasoning && (
                            <p className="text-[10.5px] text-neutral-400 leading-tight mt-0.5 max-w-[220px] truncate" title={app.ai_reasoning}>
                              {app.ai_reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">{formatDate(app.created_at)}</td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 14 14" stroke="currentColor">
                          <rect x="1" y="2" width="12" height="10" rx="1.5" strokeWidth="1.2"/>
                          <path d="M1 5h12" strokeWidth="1.2"/>
                        </svg>
                        {app.source === 'sourcing' ? 'Sourcing' : app.source ?? 'Career Page'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">{exp != null ? `${exp} Years` : '—'}</td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      {app.ai_score != null ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border w-fit', getMatchScoreBg(app.ai_score))}>
                            {app.ai_score}%
                          </span>
                          {app.ai_label && (
                            <span className="text-[10px] text-neutral-400 capitalize">{app.ai_label.replace('_', ' ')}</span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1.5">
                        {locFlag && <span className="text-base leading-none">{locFlag}</span>}
                        <span className="max-w-[120px] truncate">{loc}</span>
                      </span>
                    </td>
                    {/* Actions: stage mover dots + delete on right */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Move to stage (...) */}
                        <div className="relative" ref={stageMenuAppId === app.id ? stageMenuRef : undefined}>
                          <button
                            onClick={() => setStageMenuAppId(prev => prev === app.id ? null : app.id)}
                            className="w-6 h-6 rounded text-neutral-400 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                            title="Move to stage"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {stageMenuAppId === app.id && (
                            <div className="absolute right-0 top-8 z-50 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 overflow-hidden">
                              <p className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Move to stage</p>
                              {STAGE_TABS.filter(t => t.key !== activeStage).map(t => (
                                <button
                                  key={t.key}
                                  onClick={() => handleMoveStage(app.id, t.key)}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-neutral-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                                >
                                  <ChevronRight className="w-3 h-3 text-neutral-300" />
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Delete candidate from job */}
                        <button onClick={() => handleDeleteApp(app.id)} className="w-6 h-6 rounded border border-red-200 text-red-400 flex items-center justify-center hover:bg-red-50 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* ── Information tab ── */}
      {activeTab === 'information' && (
        <div className="flex-1 overflow-auto px-6 py-5">
          <div className="space-y-6">

            {/* Basic Info cards */}
            <section>
              <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-4">Basic Information</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  ['title',          'Job Title',      job.title],
                  ['department',     'Department',     job.department ?? '—'],
                  ['location',       'Location',       job.location ?? '—'],
                  ['remote',         'Remote',         job.remote ? 'Yes' : 'No'],
                  ['job_type',       'Job Type',       job.job_type ?? '—'],
                  ['status',         'Status',         job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : '—'],
                  ['openings',       'Openings',       String(job.openings ?? 1)],
                  ['hiring_manager', 'Hiring Manager', job.hiring_manager ?? '—'],
                  ['salary',         'Salary Range',   job.salary_min || job.salary_max ? `${job.salary_min ? '$' + job.salary_min.toLocaleString() : '—'} – ${job.salary_max ? '$' + job.salary_max.toLocaleString() : '—'}` : '—'],
                  ['min_ai_score',   'Min AI Score',   job.min_ai_score != null ? `${job.min_ai_score}%` : '—'],
                  ['created_at',     'Created',        job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                  ['updated_at',     'Last Updated',   job.updated_at ? new Date(job.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                ] as [string, string, string][]).map(([key, label, value]) => (
                  <div key={key} className="group relative bg-white border border-neutral-200 rounded-xl px-4 pt-3.5 pb-3 hover:border-neutral-300 hover:shadow-sm transition-all">
                    <p className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm font-semibold text-neutral-900 leading-snug pr-7">{value}</p>
                    <button
                      onClick={() => copyField(key, value)}
                      title="Copy"
                      className={cn(
                        'absolute bottom-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                        copiedField === key
                          ? 'bg-green-100 text-green-600'
                          : 'text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 opacity-0 group-hover:opacity-100',
                      )}
                    >
                      {copiedField === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Description card */}
            {job.description && (
              <section>
                <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-4">Description</h2>
                <div className="group relative bg-white border border-neutral-200 rounded-xl px-4 pt-3.5 pb-12 hover:border-neutral-300 hover:shadow-sm transition-all">
                  <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{job.description}</p>
                  <button
                    onClick={() => copyField('description', job.description!)}
                    className={cn(
                      'absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      copiedField === 'description'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 opacity-0 group-hover:opacity-100',
                    )}
                  >
                    {copiedField === 'description' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedField === 'description' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </section>
            )}

            {/* Requirements cards */}
            {job.requirements && (
              <section>
                <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-4">Requirements</h2>
                <div className="grid grid-cols-3 gap-3">
                  {job.requirements.min_experience != null && (
                    <div className="group relative bg-white border border-neutral-200 rounded-xl px-4 pt-3.5 pb-3 hover:border-neutral-300 hover:shadow-sm transition-all">
                      <p className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">Min Experience</p>
                      <p className="text-sm font-semibold text-neutral-900 pr-7">{job.requirements.min_experience} years</p>
                      <button
                        onClick={() => copyField('min_exp', String(job.requirements!.min_experience))}
                        className={cn(
                          'absolute bottom-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                          copiedField === 'min_exp' ? 'bg-green-100 text-green-600' : 'text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 opacity-0 group-hover:opacity-100',
                        )}
                      >
                        {copiedField === 'min_exp' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  {job.requirements.skills && job.requirements.skills.length > 0 && (
                    <div className="group relative bg-white border border-neutral-200 rounded-xl px-4 pt-3.5 pb-12 col-span-2 hover:border-neutral-300 hover:shadow-sm transition-all">
                      <p className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wide mb-2.5">Required Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.requirements.skills.map(skill => (
                          <span key={skill} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => copyField('skills', job.requirements!.skills!.join(', '))}
                        className={cn(
                          'absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                          copiedField === 'skills' ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 opacity-0 group-hover:opacity-100',
                        )}
                      >
                        {copiedField === 'skills' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'skills' ? 'Copied!' : 'Copy all'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Pipeline Stages card */}
            {job.pipeline_stages && job.pipeline_stages.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-4">Pipeline Stages</h2>
                <div className="group relative bg-white border border-neutral-200 rounded-xl px-4 pt-3.5 pb-12 hover:border-neutral-300 hover:shadow-sm transition-all">
                  <div className="flex flex-wrap items-center gap-2">
                    {job.pipeline_stages.map((stage, idx) => (
                      <div key={stage} className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-medium capitalize">{stage}</span>
                        {idx < (job.pipeline_stages?.length ?? 0) - 1 && <ChevronRight className="w-3 h-3 text-neutral-300" />}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => copyField('pipeline', job.pipeline_stages!.join(' → '))}
                    className={cn(
                      'absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      copiedField === 'pipeline' ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 opacity-0 group-hover:opacity-100',
                    )}
                  >
                    {copiedField === 'pipeline' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedField === 'pipeline' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </section>
            )}

            {/* Application Links */}
            <section>
              <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-4">Application Links</h2>
              {linksLoading ? (
                <div className="flex items-center gap-2 text-xs text-neutral-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading links…
                </div>
              ) : jobLinks.length === 0 ? (
                <div className="bg-white border border-neutral-200 rounded-xl px-4 py-4 text-xs text-neutral-400">
                  No application links yet. Share this job via the Create Job flow to generate tracking links.
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.values(
                    jobLinks
                      .filter(l => ['linkedin','indeed','bayt','career_page'].includes(l.source))
                      .reduce((acc, l) => { acc[l.source] = l; return acc }, {} as Record<string, typeof jobLinks[0]>)
                  ).map(link => {
                    const platform = LINK_PLATFORMS[link.source] ?? LINK_PLATFORMS['direct']
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${link.slug}`
                    const isCopied = copiedLink === link.slug
                    return (
                      <div key={link.id} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3 hover:border-neutral-300 hover:shadow-sm transition-all">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', platform.bg)}>
                          {platform.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-neutral-700 mb-0.5">{platform.label}</p>
                          <p className="text-[11px] font-mono text-neutral-400 truncate">{url}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-neutral-400">{link.click_count ?? 0} clicks</span>
                          <button
                            onClick={() => copyJobLink(link.slug)}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                              isCopied ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            )}
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* System IDs */}
            <section>
              <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-4">System</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  ['job_id', 'Job ID', job.id],
                  ['org_id', 'Org ID', job.org_id],
                ] as [string, string, string][]).map(([key, label, value]) => (
                  <div key={key} className="group relative bg-white border border-neutral-200 rounded-xl px-4 pt-3.5 pb-3 hover:border-neutral-300 hover:shadow-sm transition-all">
                    <p className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-[11px] font-mono text-neutral-600 break-all pr-7 leading-relaxed">{value}</p>
                    <button
                      onClick={() => copyField(key, value)}
                      className={cn(
                        'absolute bottom-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                        copiedField === key ? 'bg-green-100 text-green-600' : 'text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 opacity-0 group-hover:opacity-100',
                      )}
                    >
                      {copiedField === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      )}

      <JobModal open={editOpen} onClose={() => setEditOpen(false)} job={job} />

      {/* ── Delete confirmation dialog ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-base font-bold text-neutral-900 text-center mb-1">Delete Job?</h2>
              <p className="text-sm text-neutral-500 text-center leading-relaxed">
                <span className="font-semibold text-neutral-700">{job.title}</span> and all its applications will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 px-6 pb-6">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
