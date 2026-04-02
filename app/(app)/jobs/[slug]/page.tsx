'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Heart, MoreHorizontal, Share2,
  Briefcase, MapPin, Loader2, AlertCircle, Pencil, Trash2,
  Search, SlidersHorizontal, Plus, X, ChevronDown, Check,
} from 'lucide-react'
import JobModal from '@/components/jobs/job-modal'
import { formatDate, getInitials, getMatchScoreBg, cn, getAvatarUrl } from '@/lib/utils'
import { get, post } from '@/lib/api'
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

/**
 * Safe array coerce — handles paginated { data: [...] } or { results: [...] } wrappers.
 * This is the main reason candidates/applications silently disappear.
 */
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
  const { jobs, deleteJob } = useJobsContext()
  const contextJob = jobs.find(j => j.id === params.slug) ?? null

  const [job, setJob]                 = useState<ApiJob | null>(contextJob)
  const [applications, setApps]       = useState<ApiApplication[]>([])
  const [candidates, setCandidates]   = useState<Record<string, ApiCandidate>>({})
  const [loading, setLoading]         = useState(!contextJob)
  const [appsLoading, setAppsLoading] = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [editOpen, setEditOpen]       = useState(false)
  const [activeStage, setActiveStage] = useState<StageKey>('sourced')
  const [search, setSearch]           = useState('')
  const [linkLoading, setLinkLoading]   = useState(false)
  const [linkCopied, setLinkCopied]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const router = useRouter()

  useEffect(() => { if (contextJob) setJob(contextJob) }, [contextJob])

  /**
   * Build the candidates lookup dict.
   * 1. Bulk-fetch /api/v1/candidates
   * 2. For any candidate_id still missing, fetch individually
   *    so no row is ever silently dropped.
   */
  const buildCandidateMap = useCallback(async (apps: ApiApplication[]) => {
    let map: Record<string, ApiCandidate> = {}

    try {
      const raw = await get<unknown>('/api/v1/candidates?page_size=500')
      toArray<ApiCandidate>(raw).forEach(c => { if (c?.id) map[c.id] = c })
    } catch { /* recover per-candidate below */ }

    // IDs that still aren't in the map after the bulk fetch
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
          <button className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-rose-500 transition-colors">
            <Heart className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
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
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit Job
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>

      {/* ── Content tabs ── */}
      <div className="flex items-center gap-6 px-4 border-b border-neutral-100">
        {['Candidates', 'Information', 'Activity'].map(tab => (
          <button
            key={tab}
            className={cn(
              'text-sm py-2.5 border-b-2 -mb-px transition-colors',
              tab === 'Candidates' ? 'border-violet-600 text-violet-600 font-semibold' : 'border-transparent text-neutral-400 hover:text-neutral-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

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
              // Skeleton rows while fetching — prevents the flash of "no candidates"
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
                // Never return null — use fallback values when candidate isn't in the map
                const c       = candidates[app.candidate_id] ?? null
                const name    = c?.name       ?? (app as any).candidate_name ?? 'Unknown Candidate'
                const exp     = c?.experience  ?? null
                const loc     = c?.location    ?? '—'
                const locFlag = c?.location_flag ?? null
                const avatar  = getAvatarUrl(c?.avatar_url, (c as any)?.github_url)
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
                        <Link href={href} className="text-neutral-800 font-medium hover:text-violet-600 transition-colors text-sm">
                          {name}
                        </Link>
                        {gender === 'male'   && <span className="text-blue-400 text-xs">♂</span>}
                        {gender === 'female' && <span className="text-pink-400 text-xs">♀</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">{formatDate(app.created_at)}</td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 14 14" stroke="currentColor">
                          <rect x="1" y="2" width="12" height="10" rx="1.5" strokeWidth="1.2"/>
                          <path d="M1 5h12" strokeWidth="1.2"/>
                        </svg>
                        {app.source ?? 'Career Page'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">{exp != null ? `${exp} Years` : '—'}</td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      {app.ai_score != null ? (
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border', getMatchScoreBg(app.ai_score))}>
                          {app.ai_score}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1.5">
                        {locFlag && <span className="text-base leading-none">{locFlag}</span>}
                        <span className="max-w-[120px] truncate">{loc}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-6 h-6 rounded border border-red-200 text-red-400 flex items-center justify-center hover:bg-red-50 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                        <button className="px-3 py-1 rounded-lg border border-neutral-200 text-xs text-neutral-600 hover:bg-neutral-100 transition-colors font-medium">
                          Shortlist
                        </button>
                        <button className="w-6 h-6 rounded text-neutral-400 flex items-center justify-center hover:bg-neutral-100 transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
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