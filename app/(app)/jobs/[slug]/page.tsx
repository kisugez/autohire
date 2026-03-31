'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Heart, MoreHorizontal, Share2,
  Briefcase, MapPin, Clock, Users, Loader2, AlertCircle, Pencil,
  Search, SlidersHorizontal, Plus, X, ChevronDown,
} from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import JobModal from '@/components/jobs/job-modal'
import { formatDate, formatSalary, getInitials, getMatchScoreBg, cn } from '@/lib/utils'
import { get } from '@/lib/api'
import { useJobsContext } from '@/lib/jobs-context'
import type { ApiJob, ApiApplication, JobLinkResponse } from '@/types/job'
import type { ApiCandidate } from '@/types/candidate'

// Stage tab config — matches your pipeline stages
const STAGE_TABS = [
  { key: 'sourced',    label: 'Application' },
  { key: 'screening',  label: 'Shortlist'   },
  { key: 'interview',  label: 'Interview'   },
  { key: 'offer',      label: 'Offer'       },
  { key: 'hired',      label: 'Hired'       },
  { key: 'rejected',   label: 'Rejected'    },
] as const

type StageKey = typeof STAGE_TABS[number]['key']

// Nationality flag helper — simple emoji map
const FLAG: Record<string, string> = {
  Japanese: '🇯🇵', Korean: '🇰🇷', American: '🇺🇸', British: '🇬🇧',
  Indian: '🇮🇳', Pakistani: '🇵🇰', Filipino: '🇵🇭', Egyptian: '🇪🇬',
  Jordanian: '🇯🇴', Lebanese: '🇱🇧', Saudi: '🇸🇦', Moroccan: '🇲🇦',
  Emirati: '🇦🇪', Indonesian: '🇮🇩', Malaysian: '🇲🇾', Turkish: '🇹🇷',
  Spanish: '🇪🇸', French: '🇫🇷', German: '🇩🇪', Italian: '🇮🇹',
}

function getFlag(nationality?: string) {
  if (!nationality) return '🏳️'
  for (const [key, flag] of Object.entries(FLAG)) {
    if (nationality.toLowerCase().includes(key.toLowerCase())) return flag
  }
  return '🏳️'
}

// Avatar colour from initials
const AVATAR_COLORS = [
  'bg-violet-600', 'bg-indigo-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function JobDetailPage({ params }: { params: { slug: string } }) {
  const { jobs, updateJob } = useJobsContext()
  const contextJob = jobs.find(j => j.id === params.slug) ?? null

  const [job, setJob]               = useState<ApiJob | null>(contextJob)
  const [applications, setApps]     = useState<ApiApplication[]>([])
  const [candidates, setCandidates] = useState<Record<string, ApiCandidate>>({})
  const [loading, setLoading]       = useState(!contextJob)
  const [error, setError]           = useState<string | null>(null)
  const [editOpen, setEditOpen]     = useState(false)
  const [activeStage, setActiveStage] = useState<StageKey>('sourced')
  const [search, setSearch]         = useState('')

  useEffect(() => { if (contextJob) setJob(contextJob) }, [contextJob])

  const fetchDetails = useCallback(async () => {
    setLoading(true)
    try {
      const [jobData, apps, allCandidates] = await Promise.all([
        get<ApiJob>(`/api/v1/jobs/${params.slug}`),
        get<ApiApplication[]>(`/api/v1/applications/job/${params.slug}`),
        get<ApiCandidate[]>('/api/v1/candidates'),
      ])
      setJob(jobData)
      setApps(apps)
      setCandidates(Object.fromEntries(allCandidates.map(c => [c.id, c])))
    } catch {
      setError('Failed to load job details.')
    } finally {
      setLoading(false)
    }
  }, [params.slug])

  useEffect(() => {
    if (!contextJob) {
      fetchDetails()
    } else {
      Promise.all([
        get<ApiApplication[]>(`/api/v1/applications/job/${params.slug}`),
        get<ApiCandidate[]>('/api/v1/candidates'),
      ])
        .then(([apps, allCandidates]) => {
          setApps(apps)
          setCandidates(Object.fromEntries(allCandidates.map(c => [c.id, c])))
        })
        .catch(() => setError('Failed to load applications.'))
        .finally(() => setLoading(false))
    }
  }, [params.slug, contextJob, fetchDetails])

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

  // Filtered apps for current stage
  const stageApps = applications.filter(a => {
    const stageMatch = activeStage === 'sourced'
      ? (a.current_stage === 'sourced' || !a.current_stage)
      : a.current_stage === activeStage
    const searchMatch = !search || (() => {
      const c = candidates[a.candidate_id]
      return c?.name?.toLowerCase().includes(search.toLowerCase())
    })()
    return stageMatch && searchMatch
  })

  // Stage counts
  const stageCounts: Record<string, number> = {}
  for (const tab of STAGE_TABS) {
    stageCounts[tab.key] = applications.filter(a =>
      tab.key === 'sourced'
        ? (a.current_stage === 'sourced' || !a.current_stage)
        : a.current_stage === tab.key
    ).length
  }

  const salaryDisplay = job.salary_min && job.salary_max
    ? formatSalary(job.salary_min, job.salary_max)
    : null

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
              <h1 className="text-neutral-950 text-xl font-bold tracking-tight leading-none">
                {job.title}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                {job.status?.charAt(0).toUpperCase() + (job.status?.slice(1) ?? '')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span>ID: <span className="text-neutral-600 font-medium">#{job.id?.slice(0, 4) ?? '—'}</span></span>
              <span className="text-neutral-300">·</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {job.job_type ?? 'Full Time'}
              </span>
              {job.location && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.location}
                    {job.remote && <span className="text-violet-500 ml-0.5">· Remote OK</span>}
                  </span>
                </>
              )}
              <span className="text-neutral-300">·</span>
              <span>Job Available: <span className="text-neutral-600 font-medium">0/{job.openings ?? 10}</span></span>
            </div>
          </div>
        </div>

        {/* Right actions */}
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
          <button className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit Job
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
              tab === 'Candidates'
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-neutral-100">
        {/* Left: search + layout toggle */}
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

        {/* Centre: grey pill switcher — active tab gets white bg + shadow */}
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
                  active
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[10px] font-semibold min-w-[14px] text-center',
                  active ? 'text-violet-600' : 'text-neutral-400'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right: filter + add */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <SlidersHorizontal className="w-3 h-3" />
            Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
            <Plus className="w-3 h-3" />
            Add Candidate
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              {['Name', 'Applied Date', 'Source', 'Years Experience', 'Rating', 'Current Location'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-medium text-neutral-400">
                  <span className="flex items-center gap-1">
                    {col}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {stageApps.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-neutral-400 text-sm">
                  No candidates in this stage yet.
                </td>
              </tr>
            ) : (
              stageApps.map((app, i) => {
                const c = candidates[app.candidate_id]
                if (!c) return null
                const color = avatarColor(c.name)
                return (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-neutral-50 hover:bg-neutral-50/70 transition-colors group"
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0', color)}>
                            {getInitials(c.name)}
                          </div>
                        )}
                        <Link href={`/candidates/${c.id}`} className="text-neutral-800 font-medium hover:text-violet-600 transition-colors text-sm">
                          {c.name}
                        </Link>
                        {c.gender === 'male'   && <span className="text-blue-400 text-xs">♂</span>}
                        {c.gender === 'female' && <span className="text-pink-400 text-xs">♀</span>}
                      </div>
                    </td>
                    {/* Applied Date */}
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">{formatDate(app.created_at)}</td>
                    {/* Source */}
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 14 14" stroke="currentColor">
                          <rect x="1" y="2" width="12" height="10" rx="1.5" strokeWidth="1.2"/>
                          <path d="M1 5h12" strokeWidth="1.2"/>
                        </svg>
                        {app.source ?? 'Career Page'}
                      </span>
                    </td>
                    {/* Experience */}
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      {c.experience ? `${c.experience} Years` : '—'}
                    </td>
                    {/* Rating */}
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      {app.ai_score != null ? (
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border', getMatchScoreBg(app.ai_score))}>
                          {app.ai_score}%
                        </span>
                      ) : '—'}
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3.5 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1.5">
                        {c.location_flag && <span className="text-base leading-none">{c.location_flag}</span>}
                        <span className="max-w-[120px] truncate">{c.location ?? '—'}</span>
                      </span>
                    </td>
                    {/* Actions */}
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

      {/* Edit modal */}
      <JobModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        job={job}
      />
    </div>
  )
}