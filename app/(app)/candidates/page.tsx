'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, Star, Briefcase, ChevronRight, Loader2, AlertCircle,
  Search, SlidersHorizontal, LayoutList, LayoutGrid,
  FileText, Users, ListChecks, MessageSquare, Gift,
  UserCheck, XCircle, Heart, MoreHorizontal,
} from 'lucide-react'
import FilterDropdown from '@/components/cards/filter-dropdown'
import { getInitials, cn, getAvatarUrl } from '@/lib/utils'
import { useCandidates, useJobs, useAllApplications } from '@/lib/hooks'
import type { ApiCandidate } from '@/types/candidate'
import type { ApiApplication } from '@/types/job'

/* ─── stage config ─────────────────────────────────────────── */
const PIPELINE_STAGES = [
  { key: 'sourced',   label: 'Sourced',   icon: Users,         color: 'text-violet-600', activeBg: 'bg-violet-50',  dot: 'bg-violet-500'  },
  { key: 'screening', label: 'Screening', icon: ListChecks,    color: 'text-sky-600',    activeBg: 'bg-sky-50',     dot: 'bg-sky-500'     },
  { key: 'interview', label: 'Interview', icon: MessageSquare, color: 'text-indigo-600', activeBg: 'bg-indigo-50',  dot: 'bg-indigo-500'  },
  { key: 'offer',     label: 'Offer',     icon: Gift,          color: 'text-amber-600',  activeBg: 'bg-amber-50',   dot: 'bg-amber-500'   },
  { key: 'hired',     label: 'Hired',     icon: UserCheck,     color: 'text-green-600',  activeBg: 'bg-green-50',   dot: 'bg-green-500'   },
  { key: 'rejected',  label: 'Rejected',  icon: XCircle,       color: 'text-red-500',    activeBg: 'bg-red-50',     dot: 'bg-red-500'     },
]

const TABS = ['All', 'Sourced', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const
type Tab = typeof TABS[number]

/* each tab gets its own active bg color */
const TAB_ACTIVE: Record<string, string> = {
  All:        'bg-neutral-950 text-white shadow-sm',
  Sourced:    'bg-violet-600  text-white shadow-sm',
  Screening:  'bg-sky-500     text-white shadow-sm',
  Interview:  'bg-indigo-600  text-white shadow-sm',
  Offer:      'bg-amber-500   text-white shadow-sm',
  Hired:      'bg-green-600   text-white shadow-sm',
  Rejected:   'bg-red-500     text-white shadow-sm',
}

const SOURCE_OPTIONS = [
  { label: 'All Sources', value: '' },
  { label: 'LinkedIn',    value: 'linkedin' },
  { label: 'GitHub',      value: 'github' },
  { label: 'Referral',    value: 'referral' },
  { label: 'Website',     value: 'website' },
  { label: 'Indeed',      value: 'indeed' },
  { label: 'Career Page', value: 'career_page' },
  { label: 'Agency',      value: 'agency' },
]

const SCORE_OPTIONS = [
  { label: 'Any Score',  value: '' },
  { label: '90%+ Match', value: '90' },
  { label: '80%+ Match', value: '80' },
  { label: '70%+ Match', value: '70' },
]

const AI_LABEL_COLOR: Record<string, string> = {
  strong_fit: 'bg-green-50 text-green-700 border-green-200',
  good_fit:   'bg-blue-50  text-blue-700  border-blue-200',
  reserve:    'bg-amber-50 text-amber-700 border-amber-200',
}

const AVG_TIME = '2 days'

export default function CandidatesPage() {
  const { candidates, loading: cLoading, error: cError } = useCandidates()
  const { jobs,        loading: jLoading }                = useJobs()
  const { applications, loading: aLoading }               = useAllApplications(jobs)

  const [search,       setSearch]    = useState('')
  const [sourceFilter, setSource]    = useState('')
  const [scoreFilter,  setScore]     = useState('')
  const [activeTab,    setActiveTab] = useState<Tab>('All')
  const [viewMode,     setViewMode]  = useState<'list' | 'grid'>('list')
  const [liked,        setLiked]     = useState<Set<string>>(new Set())

  const loading = cLoading || jLoading || aLoading

  const appByCandidate = applications.reduce<Record<string, ApiApplication>>((acc, app) => {
    const existing = acc[app.candidate_id]
    if (!existing || (app.ai_score ?? 0) > (existing.ai_score ?? 0)) {
      acc[app.candidate_id] = app
    }
    return acc
  }, {})

  const stageCounts = PIPELINE_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = candidates.filter(c => {
      const app = appByCandidate[c.id]
      return (app?.current_stage ?? 'sourced') === s.key
    }).length
    return acc
  }, {})

  const tabStage = (tab: Tab) => (tab === 'All' ? '' : tab.toLowerCase())

  const tabCount = (tab: Tab) =>
    tab === 'All'
      ? candidates.length
      : candidates.filter(c => {
          const app = appByCandidate[c.id]
          return (app?.current_stage ?? 'sourced') === tab.toLowerCase()
        }).length

  const filtered = candidates.filter((c: ApiCandidate) => {
    const app   = appByCandidate[c.id]
    const score = app?.ai_score ?? 0
    const stage = app?.current_stage ?? 'sourced'
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.skills ?? []).some(s => s.toLowerCase().includes(search.toLowerCase()))
    const matchSource = !sourceFilter || c.source === sourceFilter
    const matchStage  = !tabStage(activeTab) || stage === tabStage(activeTab)
    const matchScore  = !scoreFilter || score >= parseInt(scoreFilter)
    return matchSearch && matchSource && matchStage && matchScore
  })

  const toggleLike = (id: string) =>
    setLiked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  return (
    <div className="space-y-4 px-1 pt-2" style={{ zoom: 0.9 }}>

      {/* ── page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Candidates</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${candidates.length} total in database`}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Candidate
        </button>
      </div>

      {/* ── stage summary tiles ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Candidate Stages */}
        <div className="bg-white border border-neutral-200 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <LayoutList className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Candidate Stages</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {PIPELINE_STAGES.slice(0, 4).map(s => {
              const isActive = activeTab === s.label
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveTab(s.label as Tab)}
                  className={cn(
                    'text-left px-2 py-2 rounded-lg transition-colors',
                    isActive ? s.activeBg : 'hover:bg-neutral-50',
                  )}
                >
                  <div className={cn('text-[11px] font-medium flex items-center gap-1 mb-1', s.color)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                    <span className="truncate">{s.label}</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900 leading-none mb-0.5">
                    {loading ? '—' : stageCounts[s.key] ?? 0}
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    Avg: <span className="text-neutral-500 font-medium">{AVG_TIME}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Final Decision */}
        <div className="bg-white border border-neutral-200 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Star className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Final Decision</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('Hired')}
              className={cn(
                'text-left px-2 py-2 rounded-lg transition-colors',
                activeTab === 'Hired' ? 'bg-green-50' : 'hover:bg-neutral-50',
              )}
            >
              <div className="text-[11px] font-medium text-green-600 flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                Hired
              </div>
              <div className="text-lg font-bold text-neutral-900 leading-none mb-0.5">
                {loading ? '—' : stageCounts['hired'] ?? 0}
              </div>
              <div className="text-[10px] text-neutral-400">
                Acceptance:{' '}
                <span className="text-neutral-500 font-medium">
                  {candidates.length ? ((stageCounts['hired'] ?? 0) / candidates.length * 100).toFixed(1) + '%' : '—'}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('Rejected')}
              className={cn(
                'text-left px-2 py-2 rounded-lg transition-colors',
                activeTab === 'Rejected' ? 'bg-red-50' : 'hover:bg-neutral-50',
              )}
            >
              <div className="text-[11px] font-medium text-red-500 flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                Rejected
              </div>
              <div className="text-lg font-bold text-neutral-900 leading-none mb-0.5">
                {loading ? '—' : stageCounts['rejected'] ?? 0}
              </div>
              <div className="text-[10px] text-neutral-400">
                Rejection:{' '}
                <span className="text-neutral-500 font-medium">
                  {candidates.length ? ((stageCounts['rejected'] ?? 0) / candidates.length * 100).toFixed(1) + '%' : '—'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── toolbar — single row with everything ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-40"
          />
        </div>

        {/* view toggle */}
        <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-400 hover:text-neutral-600')}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-400 hover:text-neutral-600')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* stage tabs */}
        <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
          {TABS.map(tab => {
            const active = tab === activeTab
            const count  = tabCount(tab)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  active ? TAB_ACTIVE[tab] : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60',
                )}
              >
                {tab}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-semibold px-1 py-px rounded min-w-[16px] text-center',
                    active ? 'bg-white/25 text-white' : 'bg-neutral-200 text-neutral-500',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* filters flush right */}
        <div className="ml-auto flex items-center gap-1.5">
          <FilterDropdown label="Source"   options={SOURCE_OPTIONS} value={sourceFilter} onChange={setSource} />
          <FilterDropdown label="AI Score" options={SCORE_OPTIONS}  value={scoreFilter}  onChange={setScore} />
          <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap">
            <SlidersHorizontal className="w-3 h-3" /> Filter
          </button>
          <span className="text-neutral-400 text-xs pl-0.5 whitespace-nowrap">
            {loading ? '—' : `${filtered.length} candidate${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* ── error ── */}
      {cError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {cError}
        </div>
      )}

      {/* ── table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading candidates…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 text-sm gap-2">
            <span>No candidates match your filters.</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/60">
                {['ID', 'Name', 'Applied Job', 'AI Score', 'Location', 'Source', 'Experience', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                    {h && h !== '' ? (
                      <span className="inline-flex items-center gap-0.5">
                        {h} <span className="text-neutral-300 text-[10px]">↕</span>
                      </span>
                    ) : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((candidate, i) => {
                const app     = appByCandidate[candidate.id]
                const score   = app?.ai_score ?? null
                const label   = app?.ai_label ?? null
                const isLiked = liked.has(candidate.id)

                return (
                  <motion.tr
                    key={candidate.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-neutral-50 transition-colors group"
                  >
                    {/* ID */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-400 font-mono">
                        #{candidate.id.slice(0, 4).toUpperCase()}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const avatarSrc = getAvatarUrl((candidate as any).avatar_url, (candidate as any).github_url)
                          return avatarSrc ? (
                            <img src={avatarSrc} alt={candidate.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {getInitials(candidate.name)}
                            </div>
                          )
                        })()}
                        <div>
                          <Link href={`/candidates/${candidate.id}`}>
                            <p className="text-neutral-900 text-sm font-medium hover:text-indigo-600 transition-colors whitespace-nowrap">
                              {candidate.name}
                            </p>
                          </Link>
                          <p className="text-neutral-400 text-[11px]">{candidate.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Applied Job */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-neutral-700 whitespace-nowrap">
                          {app ? (app as any).job_title ?? 'Unknown Job' : '—'}
                        </span>
                        {app && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-500 border border-neutral-200 px-1 py-px rounded">
                            {(candidate.skills ?? []).length}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AI Score */}
                    <td className="px-4 py-3">
                      {score !== null ? (
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                          <span className={cn(
                            'text-xs font-semibold px-1.5 py-0.5 rounded border',
                            score >= 90 ? 'bg-green-50 text-green-700 border-green-200' :
                            score >= 80 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            score >= 70 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                          'bg-neutral-100 text-neutral-600 border-neutral-200',
                          )}>
                            {score}%
                          </span>
                          {label && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-px rounded border capitalize hidden xl:inline-flex',
                              AI_LABEL_COLOR[label] ?? 'bg-neutral-100 text-neutral-500 border-neutral-200',
                            )}>
                              {label.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-600 whitespace-nowrap">
                        {(candidate as any).location ?? '—'}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                        <span className="text-sm text-neutral-600 capitalize whitespace-nowrap">
                          {candidate.source?.replace('_', ' ') ?? '—'}
                        </span>
                      </div>
                    </td>

                    {/* Experience */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-neutral-600 text-sm whitespace-nowrap">
                        <Briefcase className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                        {candidate.experience === 0 ? 'Fresh Grad' : `${candidate.experience}y`}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleLike(candidate.id)}
                          className={cn(
                            'w-6 h-6 flex items-center justify-center rounded transition-colors',
                            isLiked ? 'text-rose-500 bg-rose-50' : 'text-neutral-300 hover:text-rose-400 hover:bg-rose-50',
                          )}
                        >
                          <Heart className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} />
                        </button>
                        <button className="w-6 h-6 flex items-center justify-center rounded text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/candidates/${candidate.id}`} className="w-6 h-6 flex items-center justify-center rounded text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}