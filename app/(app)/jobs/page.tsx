'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, MapPin, Loader2, AlertCircle, MoreHorizontal,
  Pencil, Archive, Link2, Check, Heart, Share2,
  Briefcase, Clock, ChevronRight, Users, CheckCircle2,
  UserCheck, FileText, ListChecks, MessageSquare,
  Gift, SkipForward,
} from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import SearchInput from '@/components/cards/search-input'
import JobModal from '@/components/jobs/job-modal'
import { formatDate, cn } from '@/lib/utils'
import { useJobsContext } from '@/lib/jobs-context'
import { get, post } from '@/lib/api'
import type { ApiJob, ApiApplication, JobLinkResponse } from '@/types/job'

/* ─── helpers ─────────────────────────────────────────────── */

const STATUS_BORDER: Record<string, string> = {
  active:  'border-l-indigo-500',
  paused:  'border-l-amber-400',
  closed:  'border-l-green-500',
  draft:   'border-l-neutral-300',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active:  { label: 'Active',    color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  paused:  { label: 'Paused',    color: 'bg-amber-50  text-amber-600  border-amber-200'  },
  closed:  { label: 'Completed', color: 'bg-green-50  text-green-600  border-green-200'  },
  draft:   { label: 'Draft',     color: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
}

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract:  'Contract',
  freelance: 'Freelance',
  internship:'Internship',
}

/* pipeline stage definitions — matches detail page stageOrder exactly */
const PIPELINE: {
  key: string
  label: string
  icon: React.ElementType
  barColor: string
  countColor: string
  beforeSep?: boolean  // render ">>" before this stage
}[] = [
  { key: 'total',     label: 'Application', icon: FileText,      barColor: 'bg-orange-400', countColor: 'text-orange-600' },
  { key: 'sourced',   label: 'Sourced',     icon: Users,         barColor: 'bg-violet-400', countColor: 'text-violet-600' },
  { key: 'screening', label: 'Screening',   icon: ListChecks,    barColor: 'bg-violet-500', countColor: 'text-violet-600' },
  { key: 'interview', label: 'Interview',   icon: MessageSquare, barColor: 'bg-violet-500', countColor: 'text-violet-600' },
  { key: 'offer',     label: 'Offer',       icon: Gift,          barColor: 'bg-violet-500', countColor: 'text-violet-600' },
  { key: 'hired',     label: 'Hired',       icon: UserCheck,     barColor: 'bg-green-500',  countColor: 'text-green-600', beforeSep: true },
]

/* Circular progress ring used for "Job Available" */
function RingProgress({ value, max }: { value: number; max: number }) {
  const pct   = Math.min(value / max, 1)
  const r     = 7
  const circ  = 2 * Math.PI * r
  const dash  = circ * (1 - pct)
  const done  = value >= max
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0">
      <circle cx="9" cy="9" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
      <circle
        cx="9" cy="9" r={r} fill="none"
        stroke={done ? '#22c55e' : '#6366f1'}
        strokeWidth="2.5"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 9 9)"
      />
    </svg>
  )
}

/* ─── tab config ──────────────────────────────────────────── */
const TABS = ['All', 'Active', 'Draft', 'Paused', 'Closed'] as const
type Tab = typeof TABS[number]

/* ─── main page ───────────────────────────────────────────── */
export default function JobsPage() {
  const { jobs, loading, error, archiveJob } = useJobsContext()

  const [search,      setSearch]      = useState('')
  const [activeTab,   setActiveTab]   = useState<Tab>('All')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editJob,     setEditJob]     = useState<ApiJob | null>(null)
  const [menuOpen,    setMenuOpen]    = useState<string | null>(null)
  const [archiving,   setArchiving]   = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState<string | null>(null)
  const [copiedId,    setCopiedId]    = useState<string | null>(null)
  const [liked,        setLiked]        = useState<Set<string>>(new Set())
  // appsByJob[jobId] = ApiApplication[] — populated using the exact same
  // endpoint the detail page uses: /api/v1/applications/job/:id
  const [appsByJob,    setAppsByJob]    = useState<Record<string, ApiApplication[]>>({})
  const [appsLoading,  setAppsLoading]  = useState(false)

  /* Once jobs are loaded, fetch each job's applications in parallel —
     same URL the detail page uses, just fired for every job at once */
  useEffect(() => {
    if (!jobs.length || appsLoading) return
    setAppsLoading(true)
    Promise.all(
      jobs.map(j =>
        get<ApiApplication[]>(`/api/v1/applications/job/${j.id}`)
          .then(apps => ({ id: j.id, apps }))
          .catch(() => ({ id: j.id, apps: [] as ApiApplication[] }))
      )
    ).then(results => {
      const map: Record<string, ApiApplication[]> = {}
      results.forEach(r => { map[r.id] = r.apps })
      setAppsByJob(map)
    }).finally(() => setAppsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs])

  /* tab counts */
  const counts: Record<Tab, number> = {
    'All':    jobs.length,
    'Active': jobs.filter(j => j.status === 'active').length,
    'Draft':  jobs.filter(j => j.status === 'draft').length,
    'Paused': jobs.filter(j => j.status === 'paused').length,
    'Closed': jobs.filter(j => j.status === 'closed').length,
  }

  /* filter */
  const filtered = jobs.filter(job => {
    const q = search.toLowerCase()
    const matchSearch = job.title.toLowerCase().includes(q) ||
                        (job.department ?? '').toLowerCase().includes(q)
    const matchTab =
      activeTab === 'All'    ? true :
      activeTab === 'Active' ? job.status === 'active' :
      activeTab === 'Draft'  ? job.status === 'draft'  :
      activeTab === 'Paused' ? job.status === 'paused' :
      activeTab === 'Closed' ? job.status === 'closed' :
      true
    return matchSearch && matchTab
  })

  /* actions */
  const openEdit = (job: ApiJob) => { setEditJob(job); setModalOpen(true); setMenuOpen(null) }

  const handleArchive = async (id: string) => {
    setArchiving(id); setMenuOpen(null)
    try { await archiveJob(id) } finally { setArchiving(null) }
  }

  const handleGetLink = async (job: ApiJob) => {
    setMenuOpen(null); setLinkLoading(job.id)
    try {
      const link = await post<JobLinkResponse>(`/api/v1/jobs/${job.id}/links`, {
        source: 'direct', label: 'Direct Link',
      })
      const url = `${window.location.origin}/jobs/${link.slug}`
      await navigator.clipboard.writeText(url)
      setCopiedId(job.id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch { /* silent */ } finally { setLinkLoading(null) }
  }

  const toggleLike = (id: string) =>
    setLiked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  /* pipeline counts — uses the same /api/v1/applications/job/:id data
     as the detail page; stageOrder = ['sourced','screening','interview','offer','hired'] */
  const getPipeline = (job: ApiJob) => {
    const jobApps = appsByJob[job.id] ?? []
    const count   = (stage: string) => jobApps.filter(a => a.current_stage === stage).length
    return {
      total:     jobApps.length,
      sourced:   count('sourced'),
      screening: count('screening'),
      interview: count('interview'),
      offer:     count('offer'),
      hired:     count('hired'),
    }
  }

  /* available spots */
  const getAvailable = (job: ApiJob) => ({
    filled: (job as any).positions_filled ?? 3,
    total:  (job as any).positions_total  ?? 10,
  })

  return (
    <div className="space-y-6 px-3 pt-4">

      {/* ── top bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
          {TABS.map(tab => {
            const active = tab === activeTab
            const count  = counts[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  active
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700',
                )}
              >
                {tab}
                {count > 0 && (
                  <span className={cn(
                    'text-xs font-semibold px-1.5 py-0.5 rounded-md min-w-[20px] text-center',
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-200 text-neutral-500',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* right controls */}
        <div className="flex items-center gap-2 ml-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-52" />
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <Clock className="w-3.5 h-3.5" /> Date added
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            Filter
          </button>
          <button
            onClick={() => { setEditJob(null); setModalOpen(true) }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Job
          </button>
        </div>
      </div>

      {/* ── error ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* ── loading ── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-neutral-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading jobs…
        </div>
      )}

      {/* ── cards ── */}
      {!loading && (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 text-sm gap-3">
              <span>No jobs match your filters.</span>
              <button
                onClick={() => { setEditJob(null); setModalOpen(true) }}
                className="text-indigo-600 text-xs hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Post your first job
              </button>
            </div>
          ) : (
            filtered.map((job, i) => {
              const pipeline  = getPipeline(job)
              const available = getAvailable(job)
              const statusCfg = STATUS_LABEL[job.status] ?? STATUS_LABEL.draft
              const isLiked   = liked.has(job.id)

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'bg-white border border-neutral-200 rounded-xl border-l-4 overflow-hidden transition-shadow hover:shadow-sm',
                    STATUS_BORDER[job.status] ?? 'border-l-neutral-300',
                    archiving === job.id && 'opacity-40 pointer-events-none',
                  )}
                >
                  {/* ── card header ── */}
                  <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
                    {/* left: title + badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-neutral-900 font-semibold text-base leading-tight">
                          {job.title}
                        </h2>
                        {/* status badge */}
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
                          statusCfg.color,
                        )}>
                          {job.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />}
                          {job.status === 'closed' && <CheckCircle2 className="w-3 h-3" />}
                          {job.status === 'draft'  && <FileText className="w-3 h-3" />}
                          {statusCfg.label}
                        </span>
                        {(job as any).assigned_to_me && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            <Users className="w-3 h-3" /> Assigned to me
                          </span>
                        )}
                      </div>

                      {/* meta row */}
                      <div className="flex items-center gap-3 mt-1.5 text-neutral-400 text-xs flex-wrap">
                        <span className="font-mono text-neutral-400">ID: #{job.id.slice(0, 4).toUpperCase()}</span>
                        <span className="flex items-center gap-1">
                          {job.job_type === 'full_time' || job.job_type === 'part_time'
                            ? <Clock className="w-3 h-3" />
                            : <Briefcase className="w-3 h-3" />}
                          {JOB_TYPE_LABEL[job.job_type] ?? job.job_type}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                            {job.remote && <span className="text-indigo-400">· Remote</span>}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          Job Available:
                          <RingProgress value={available.filled} max={available.total} />
                          <span className={available.filled >= available.total ? 'text-green-500' : ''}>
                            {available.filled}/{available.total}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* right: date + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 text-sm">
                      <span className="text-neutral-400 text-xs whitespace-nowrap">
                        Added at <span className="font-medium text-neutral-600">{formatDate(job.created_at)}</span>
                      </span>

                      {/* like */}
                      <button
                        onClick={() => toggleLike(job.id)}
                        className={cn(
                          'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                          isLiked ? 'text-rose-500 bg-rose-50' : 'text-neutral-300 hover:text-rose-400 hover:bg-rose-50',
                        )}
                      >
                        <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                      </button>

                      {/* three-dot */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {menuOpen === job.id && (
                          <div className="absolute right-0 top-9 z-20 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 w-44">
                            <button
                              onClick={() => openEdit(job)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-neutral-400" /> Edit Job
                            </button>
                            <button
                              onClick={() => handleGetLink(job)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              {linkLoading === job.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : copiedId === job.id
                                  ? <Check className="w-3.5 h-3.5 text-green-600" />
                                  : <Link2 className="w-3.5 h-3.5" />}
                              {copiedId === job.id ? 'Link Copied!' : 'Copy Link'}
                            </button>
                            <div className="border-t border-neutral-100 my-1" />
                            <button
                              onClick={() => handleArchive(job.id)}
                              disabled={job.status === 'closed'}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Archive className="w-3.5 h-3.5" /> Archive
                            </button>
                          </div>
                        )}
                      </div>

                      {/* share */}
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>

                      {/* detail */}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                      >
                        Detail <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* ── pipeline strip — always shown, draft jobs show 0s ── */}
                  <div className="border-t border-neutral-100 px-6 py-3.5 flex items-center gap-3 overflow-x-auto">
                    {PIPELINE.map((stage) => {
                      const count   = (pipeline as any)[stage.key] ?? 0
                      const isHired = stage.key === 'hired'
                      return (
                        <div key={stage.key} className="flex items-center gap-3 flex-shrink-0">
                          {/* ">>" separator before Hired */}
                          {stage.beforeSep && (
                            <div className="text-neutral-300">
                              <SkipForward className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {/* bordered pill */}
                          <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white hover:border-neutral-300 transition-colors">
                            <stage.icon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                            <span className="text-xs text-neutral-500 whitespace-nowrap font-medium">{stage.label}</span>
                            <span className={cn('w-px h-3.5 rounded-full flex-shrink-0', stage.barColor)} />
                            <span className={cn('text-xs font-bold min-w-[16px]', stage.countColor)}>
                              {count}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {/* click-away for dropdown */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}

      <JobModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditJob(null) }}
        job={editJob}
      />
    </div>
  )
}