'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, MapPin, Loader2, AlertCircle, MoreHorizontal,
  Pencil, Archive, Link2, Check, Share2,
  Briefcase, Clock, ChevronRight, Users, CheckCircle2,
  UserCheck, FileText, ListChecks, MessageSquare,
  Gift, SkipForward, SortDesc, SlidersHorizontal, X,
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

const PIPELINE: {
  key: string
  label: string
  icon: React.ElementType
  barColor: string
  countColor: string
  beforeSep?: boolean
}[] = [
  { key: 'total',     label: 'Application', icon: FileText,      barColor: 'bg-orange-400', countColor: 'text-orange-600' },
  { key: 'sourced',   label: 'Sourced',     icon: Users,         barColor: 'bg-violet-400', countColor: 'text-violet-600' },
  { key: 'screening', label: 'Screening',   icon: ListChecks,    barColor: 'bg-violet-500', countColor: 'text-violet-600' },
  { key: 'interview', label: 'Interview',   icon: MessageSquare, barColor: 'bg-violet-500', countColor: 'text-violet-600' },
  { key: 'offer',     label: 'Offer',       icon: Gift,          barColor: 'bg-violet-500', countColor: 'text-violet-600' },
  { key: 'hired',     label: 'Hired',       icon: UserCheck,     barColor: 'bg-green-500',  countColor: 'text-green-600', beforeSep: true },
]

function RingProgress({ value, max }: { value: number; max: number }) {
  const pct   = Math.min(value / max, 1)
  const r     = 5.5
  const circ  = 2 * Math.PI * r
  const dash  = circ * (1 - pct)
  const done  = value >= max
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
      <circle cx="7" cy="7" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2" />
      <circle
        cx="7" cy="7" r={r} fill="none"
        stroke={done ? '#22c55e' : '#6366f1'}
        strokeWidth="2"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 7 7)"
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
  const [dateSort,     setDateSort]     = useState<'newest' | 'oldest'>('newest')
  const [dateSortOpen, setDateSortOpen] = useState(false)
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [filterType,   setFilterType]   = useState<string>('')
  const [filterRemote, setFilterRemote] = useState<boolean | null>(null)

  const dateSortRef = useRef<HTMLDivElement>(null)
  const filterRef   = useRef<HTMLDivElement>(null)

  const [appsByJob,   setAppsByJob]   = useState<Record<string, ApiApplication[]>>({})
  const [appsLoading, setAppsLoading] = useState(false)
  const [statsByJob,  setStatsByJob]  = useState<Record<string, { openings: number; hired_count: number; available: number }>>({})

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dateSortRef.current && !dateSortRef.current.contains(e.target as Node)) setDateSortOpen(false)
      if (filterRef.current   && !filterRef.current.contains(e.target as Node))   setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!jobs.length || appsLoading) return
    setAppsLoading(true)
    Promise.all([
      Promise.all(
        jobs.map(j =>
          get<ApiApplication[]>(`/api/v1/applications/job/${j.id}`)
            .then(apps => ({ id: j.id, apps }))
            .catch(() => ({ id: j.id, apps: [] as ApiApplication[] }))
        )
      ),
      Promise.all(
        jobs.map(j =>
          get<{ openings: number; hired_count: number; available: number }>(`/api/v1/jobs/${j.id}/stats`)
            .then(stats => ({ id: j.id, stats }))
            .catch(() => ({ id: j.id, stats: { openings: j.openings ?? 1, hired_count: 0, available: j.openings ?? 1 } }))
        )
      ),
    ]).then(([appResults, statsResults]) => {
      const appMap: Record<string, ApiApplication[]> = {}
      appResults.forEach(r => { appMap[r.id] = r.apps })
      setAppsByJob(appMap)

      const statsMap: Record<string, { openings: number; hired_count: number; available: number }> = {}
      statsResults.forEach(r => { statsMap[r.id] = r.stats })
      setStatsByJob(statsMap)
    }).finally(() => setAppsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs])

  const counts: Record<Tab, number> = {
    'All':    jobs.length,
    'Active': jobs.filter(j => j.status === 'active').length,
    'Draft':  jobs.filter(j => j.status === 'draft').length,
    'Paused': jobs.filter(j => j.status === 'paused').length,
    'Closed': jobs.filter(j => j.status === 'closed').length,
  }

  const activeFilterCount = [filterType, filterRemote !== null ? 'remote' : ''].filter(Boolean).length

  const filtered = jobs
    .filter(job => {
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
      const matchType   = filterType   ? job.job_type === filterType : true
      const matchRemote = filterRemote !== null ? !!job.remote === filterRemote : true
      return matchSearch && matchTab && matchType && matchRemote
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return dateSort === 'newest' ? db - da : da - db
    })

  const clearFilters = () => { setFilterType(''); setFilterRemote(null) }

  const openEdit = (job: ApiJob) => { setEditJob(job); setModalOpen(true); setMenuOpen(null) }

  const handleArchive = async (id: string) => {
    setArchiving(id); setMenuOpen(null)
    try { await archiveJob(id) } finally { setArchiving(null) }
  }

  const handleGetLink = async (job: ApiJob) => {
    setMenuOpen(null)
    setLinkLoading(job.id)
    try {
      const link = await post<JobLinkResponse>(`/api/v1/jobs/${job.id}/links`, {
        source: 'direct',
        label: 'Direct Link',
      })
      const url = `${window.location.origin}/apply/${link.slug}`
      await navigator.clipboard.writeText(url)
      setCopiedId(job.id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch { /* silent */ } finally { setLinkLoading(null) }
  }

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

  const getAvailable = (job: ApiJob) => {
    const s = statsByJob[job.id]
    if (s) return { filled: s.hired_count, total: s.openings }
    return { filled: 0, total: job.openings ?? 1 }
  }

  return (
    <div className="space-y-3 px-2 pt-3">

      {/* ── top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* tabs */}
        <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
          {TABS.map(tab => {
            const active = tab === activeTab
            const count  = counts[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  active
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700',
                )}
              >
                {tab}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-semibold px-1 py-px rounded min-w-[16px] text-center',
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
        <div className="flex items-center gap-1.5 ml-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-44" />
          {/* Date sort dropdown */}
          <div className="relative" ref={dateSortRef}>
            <button
              onClick={() => { setDateSortOpen(o => !o); setFilterOpen(false) }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors',
                dateSortOpen || dateSort === 'oldest'
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'text-neutral-600 border-neutral-200 hover:bg-neutral-50',
              )}
            >
              <SortDesc className="w-3 h-3" />
              {dateSort === 'newest' ? 'Newest first' : 'Oldest first'}
            </button>
            <AnimatePresence>
              {dateSortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 z-30 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-36"
                >
                  {(['newest', 'oldest'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setDateSort(opt); setDateSortOpen(false) }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                        dateSort === opt
                          ? 'text-indigo-600 bg-indigo-50 font-semibold'
                          : 'text-neutral-700 hover:bg-neutral-50',
                      )}
                    >
                      {dateSort === opt && <Check className="w-3 h-3 flex-shrink-0" />}
                      <span className={dateSort === opt ? '' : 'ml-[14px]'}>
                        {opt === 'newest' ? 'Newest first' : 'Oldest first'}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => { setFilterOpen(o => !o); setDateSortOpen(false) }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors',
                filterOpen || activeFilterCount > 0
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'text-neutral-600 border-neutral-200 hover:bg-neutral-50',
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filter
              {activeFilterCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 z-30 bg-white border border-neutral-200 rounded-xl shadow-lg p-3 w-52 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-700">Filters</span>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="text-[10px] text-red-500 hover:text-red-600 flex items-center gap-0.5">
                        <X className="w-2.5 h-2.5" /> Clear all
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Job Type</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(JOB_TYPE_LABEL).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setFilterType(filterType === val ? '' : val)}
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-md border transition-colors',
                            filterType === val
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'text-neutral-600 border-neutral-200 hover:border-indigo-300',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Work Mode</p>
                    <div className="flex gap-1">
                      {([['Remote', true], ['On-site', false]] as [string, boolean][]).map(([label, val]) => (
                        <button
                          key={label}
                          onClick={() => setFilterRemote(filterRemote === val ? null : val)}
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-md border transition-colors',
                            filterRemote === val
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'text-neutral-600 border-neutral-200 hover:border-indigo-300',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => { setEditJob(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" /> Create Job
          </button>
        </div>
      </div>

      {/* ── active filter chips ── */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterType && (
            <span className="flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
              {JOB_TYPE_LABEL[filterType]}
              <button onClick={() => setFilterType('')}><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {filterRemote !== null && (
            <span className="flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
              {filterRemote ? 'Remote' : 'On-site'}
              <button onClick={() => setFilterRemote(null)}><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* ── loading ── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-neutral-400 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading jobs…
        </div>
      )}

      {/* ── cards ── */}
      {!loading && (
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 text-xs gap-2">
              <span>No jobs match your filters.</span>
              <button
                onClick={() => { setEditJob(null); setModalOpen(true) }}
                className="text-indigo-600 text-xs hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Post your first job
              </button>
            </div>
          ) : (
            filtered.map((job, i) => {
              const pipeline  = getPipeline(job)
              const available = getAvailable(job)
              const statusCfg = STATUS_LABEL[job.status] ?? STATUS_LABEL.draft
              const isCopied  = copiedId === job.id
              const isLinking = linkLoading === job.id

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'bg-white border border-neutral-200 rounded-lg border-l-4 overflow-hidden transition-shadow hover:shadow-sm',
                    STATUS_BORDER[job.status] ?? 'border-l-neutral-300',
                    archiving === job.id && 'opacity-40 pointer-events-none',
                  )}
                >
                  {/* ── card header ── */}
                  <div className="px-3.5 pt-3 pb-2 flex items-start justify-between gap-3">
                    {/* left: title + badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-neutral-900 font-semibold text-sm leading-tight">
                          {job.title}
                        </h2>
                        {/* status badge */}
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-px rounded-full border',
                          statusCfg.color,
                        )}>
                          {job.status === 'active' && <span className="w-1 h-1 rounded-full bg-indigo-500 inline-block" />}
                          {job.status === 'closed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {job.status === 'draft'  && <FileText className="w-2.5 h-2.5" />}
                          {statusCfg.label}
                        </span>
                        {(job as any).assigned_to_me && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-px rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            <Users className="w-2.5 h-2.5" /> Assigned to me
                          </span>
                        )}
                      </div>

                      {/* meta row */}
                      <div className="flex items-center gap-2.5 mt-1 text-neutral-400 text-[11px] flex-wrap">
                        <span className="font-mono text-neutral-400">ID: #{job.id.slice(0, 4).toUpperCase()}</span>
                        <span className="flex items-center gap-0.5">
                          {['full_time', 'part_time'].includes(job.job_type)
                            ? <Clock className="w-2.5 h-2.5" />
                            : <Briefcase className="w-2.5 h-2.5" />}
                          {JOB_TYPE_LABEL[job.job_type] ?? job.job_type}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-neutral-400 text-[11px] whitespace-nowrap">
                        Added at <span className="font-medium text-neutral-600">{formatDate(job.created_at)}</span>
                      </span>

                      {/* three-dot */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)}
                          className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </button>

                        {menuOpen === job.id && (
                          <div className="absolute right-0 top-7 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-36">
                            <button
                              onClick={() => openEdit(job)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Pencil className="w-3 h-3 text-neutral-400" /> Edit Job
                            </button>
                            <button
                              onClick={() => handleGetLink(job)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              {isLinking
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : isCopied
                                  ? <Check className="w-3 h-3 text-green-600" />
                                  : <Link2 className="w-3 h-3" />}
                              {isCopied ? 'Link Copied!' : 'Copy Link'}
                            </button>
                            <div className="border-t border-neutral-100 my-0.5" />
                            <button
                              onClick={() => handleArchive(job.id)}
                              disabled={job.status === 'closed'}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Archive className="w-3 h-3" /> Archive
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Share */}
                      <button
                        onClick={() => handleGetLink(job)}
                        disabled={isLinking}
                        title={isCopied ? 'Link copied!' : 'Copy application link'}
                        className={cn(
                          'w-6 h-6 flex items-center justify-center rounded transition-colors',
                          isCopied
                            ? 'text-green-600 bg-green-50'
                            : 'text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100',
                        )}
                      >
                        {isLinking
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : isCopied
                            ? <Check className="w-3 h-3" />
                            : <Share2 className="w-3 h-3" />}
                      </button>

                      {/* detail */}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                      >
                        Detail <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* ── pipeline strip ── */}
                  <div className="border-t border-neutral-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
                    {PIPELINE.map((stage) => {
                      const count = (pipeline as any)[stage.key] ?? 0
                      return (
                        <div key={stage.key} className="flex items-center gap-2 flex-shrink-0">
                          {stage.beforeSep && (
                            <div className="text-neutral-300">
                              <SkipForward className="w-3 h-3" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 border border-neutral-200 rounded-md px-2 py-1 bg-white hover:border-neutral-300 transition-colors">
                            <stage.icon className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                            <span className="text-[11px] text-neutral-500 whitespace-nowrap font-medium">{stage.label}</span>
                            <span className={cn('w-px h-3 rounded-full flex-shrink-0', stage.barColor)} />
                            <span className={cn('text-[11px] font-bold min-w-[12px]', stage.countColor)}>
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