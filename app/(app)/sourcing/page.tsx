'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2,
  ExternalLink, Eye, ChevronRight, ChevronLeft,
  X, MapPin, Clock, Zap, BarChart3, Users, Copy,
  Check, ThumbsUp, Filter, LayoutList,
  LayoutGrid, BookMarked, GraduationCap, Briefcase,
  ChevronDown, Tag,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import type { ParsedQuery, SourcingCandidate, SourcingRun } from '@/lib/sourcing-api'
import { sourcingApi } from '@/lib/sourcing-api'
import { useJobs } from '@/lib/jobs-context'
import type { ApiJob } from '@/types/job'
import { useAuth } from '@/lib/auth-context'

type PageState  = 'idle' | 'searching' | 'results'
type ResultTab  = 'results' | 'insights'
type SearchMode = 'similar' | 'description' | 'boolean' | 'manual'
type ViewMode   = 'card' | 'list'
type RoleType   = 'dev' | 'non_dev'

const SUGGESTIONS = [
  'Software Engineers in SF working at Series B companies, skilled in Python and Node.js',
  'Marketing Manager in Europe, German-speaking, working at a large enterprise',
  'Senior Scientist in Australia, 8+ years experience',
  'Consultant in London with 2+ years experience at top consulting firms',
  'Sales Manager in Dallas with experience in ERP',
]

const CRITERIA_DISPLAY = [
  { key: 'location',   label: 'Location' },
  { key: 'job_title',  label: 'Job Title' },
  { key: 'experience', label: 'Years of Experience' },
  { key: 'industry',   label: 'Industry' },
  { key: 'skills',     label: 'Skills' },
] as const

const PAGE_SIZE = 15

// ─── Search History ───────────────────────────────────────────────────────────
const HISTORY_KEY = 'sourcing_history'
const MAX_HISTORY = 10

interface HistoryEntry {
  id: string
  query: string
  parsed: ParsedQuery | null
  results: SourcingCandidate[]
  run: SourcingRun | null
  timestamp: string
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') }
  catch { return [] }
}

function saveHistory(entries: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY))) }
  catch {}
}

// ─── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { bg: 'bg-emerald-100',text: 'text-emerald-700' },
  { bg: 'bg-amber-100',  text: 'text-amber-700'   },
  { bg: 'bg-pink-100',   text: 'text-pink-700'    },
  { bg: 'bg-teal-100',   text: 'text-teal-700'    },
]

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function normalizeReasoning(text: string | null | undefined): string | null | undefined {
  if (!text) return text
  return text
    .replace(/\bno evidence\b/gi, 'not adequate evidence')
    .replace(/\blacks? evidence\b/gi, 'lacks adequate evidence')
    .replace(/\bno (clear |direct )?evidence of\b/gi, 'not adequate evidence of')
    .replace(/\bdoes not (appear to |seem to )?meet\b/gi, 'does not adequately meet')
    .replace(/\bdoes not demonstrate\b/gi, 'does not adequately demonstrate')
    .replace(/\bnot found\b/gi, 'not adequately demonstrated')
    .replace(/\bcannot (be )?confirmed\b/gi, 'is not adequately confirmed')
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0077B5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function GitHubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-neutral-600">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function SparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.09 6.26L20 9.27l-4.91 4.78 1.18 6.95L12 17.77l-4.27 3.23 1.18-6.95L4 9.27l5.91-1.01L12 2z" />
    </svg>
  )
}

// ─── Square Checkbox ──────────────────────────────────────────────────────────
function SquareCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center flex-shrink-0 transition-all',
        checked ? 'bg-violet-600 border-violet-600' : 'border-neutral-300 hover:border-neutral-400 bg-white'
      )}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, photoUrl, size = 36 }: { name: string; photoUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const color = avatarColor(name)
  if (photoUrl && !failed) {
    return (
      <img src={photoUrl} alt={name} onError={() => setFailed(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    )
  }
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-xs', color.bg, color.text)}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

// ─── ShortlistButton ──────────────────────────────────────────────────────────
type ShortlistState = 'idle' | 'loading' | 'done' | 'error'

function ShortlistButton({
  id, state, onShortlist, full = false, compact = false,
}: {
  id: string; state: ShortlistState; onShortlist: (id: string) => void; full?: boolean; compact?: boolean
}) {
  const done = state === 'done'
  const loading = state === 'loading'

  if (compact) {
    return (
      <button
        onClick={() => !done && !loading && onShortlist(id)}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap transition-colors',
          done ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
        )}
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : done ? <Check size={10} /> : <BookMarked size={10} />}
        {done ? 'Shortlisted' : 'Shortlist'}
      </button>
    )
  }

  if (full) {
    return (
      <div className="inline-flex items-stretch rounded-lg border border-neutral-200 overflow-hidden text-[12px] font-medium text-neutral-700 flex-1">
        <button
          onClick={() => !done && !loading && onShortlist(id)}
          disabled={loading}
          className={cn(
            'flex items-center justify-center gap-1.5 flex-1 px-3 py-2 transition-colors',
            done ? 'bg-emerald-50 text-emerald-700 cursor-default' : 'hover:bg-neutral-50',
          )}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : done ? <Check size={12} /> : <BookMarked size={12} />}
          {done ? 'Shortlisted' : 'Add to Shortlist'}
        </button>
        {!done && (
          <button onClick={() => !done && !loading && onShortlist(id)} className="flex items-center px-2 py-2 border-l border-neutral-200 hover:bg-neutral-50 transition-colors">
            <ChevronDown size={11} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex items-stretch rounded-lg border border-neutral-200 overflow-hidden text-[12px] font-medium text-neutral-700 hover:border-neutral-300 transition-colors">
      <button
        onClick={() => !done && !loading && onShortlist(id)}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 transition-colors whitespace-nowrap',
          done ? 'bg-emerald-50 text-emerald-700 cursor-default' : 'hover:bg-neutral-50',
        )}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : done ? <Check size={12} /> : <BookMarked size={12} />}
        {done ? 'Shortlisted' : 'Shortlist'}
      </button>
      {!done && (
        <button onClick={() => !done && !loading && onShortlist(id)} className="flex items-center px-2 py-1.5 border-l border-neutral-200 hover:bg-neutral-50 transition-colors">
          <ChevronDown size={11} />
        </button>
      )}
    </div>
  )
}

// ─── ShortlistModal ───────────────────────────────────────────────────────────
function ShortlistModal({
  candidateNames, jobs, onConfirm, onClose,
}: {
  candidateNames: string[]; jobs: ApiJob[]; onConfirm: (jobId: string) => Promise<void>; onClose: () => void
}) {
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeJobs = jobs.filter(j => (j.status as string) === 'open' || (j.status as string) === 'active' || !j.status)

  const handleConfirm = async () => {
    if (!selectedJobId) return
    setSaving(true); setError(null)
    try { await onConfirm(selectedJobId); onClose() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Something went wrong'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex items-start justify-between p-5 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Add to Shortlist</h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {candidateNames.length === 1 ? `Shortlisting ${candidateNames[0]}` : `Shortlisting ${candidateNames.length} candidates`}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors mt-0.5"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] font-medium text-neutral-700">Select a role to shortlist against</p>
          {activeJobs.length === 0 ? (
            <p className="text-[12px] text-neutral-400">No open jobs found. Create a job first.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeJobs.map(job => (
                <button key={job.id} onClick={() => setSelectedJobId(job.id)}
                  className={cn('w-full text-left px-3.5 py-3 rounded-xl border text-[13px] transition-all',
                    selectedJobId === job.id ? 'border-violet-400 bg-violet-50 text-violet-900' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
                  )}>
                  <p className="font-medium leading-snug">{job.title}</p>
                  {job.location && <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1"><MapPin size={9} />{job.location}</p>}
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-neutral-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">Cancel</button>
          <button
            onClick={handleConfirm} disabled={!selectedJobId || saving || activeJobs.length === 0}
            className={cn('px-4 py-2 rounded-lg text-[12px] font-medium transition-colors inline-flex items-center gap-1.5',
              selectedJobId && !saving ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-violet-100 text-violet-300 cursor-not-allowed',
            )}
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            {saving ? 'Shortlisting…' : 'Confirm Shortlist'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Parse helpers ────────────────────────────────────────────────────────────
function parseSkillSections(result: SourcingCandidate): { label: string; skills: string[] }[] {
  const rp = result.candidate.raw_profile
  if (rp?.skill_sections && rp.skill_sections.length > 0) return rp.skill_sections
  const flat = result.candidate.skills ?? []
  if (flat.length > 0) return [{ label: 'Skills', skills: flat }]
  return []
}

// ─── Score Circle ─────────────────────────────────────────────────────────────
function ScoreCircle({ score }: { score: number | null | undefined }) {
  const SIZE = 96, CX = 48, CY = 48, R = 38, SW = 7
  const circ = 2 * Math.PI * R
  const color = score == null ? '#d1d5db' : score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'
  const arc = score != null ? (Math.min(score, 100) / 100) * circ : 0
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f3f4f6" strokeWidth={SW} />
        {score != null && (
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={SW}
            strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`} style={{ transition: 'stroke-dasharray 0.55s ease' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {score != null ? (
          <>
            <span style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, letterSpacing: '0.07em', textTransform: 'uppercase' }}>score</span>
          </>
        ) : <Loader2 size={16} className="animate-spin text-neutral-300" />}
      </div>
    </div>
  )
}

// ─── Candidate Detail Panel ───────────────────────────────────────────────────
function CandidatePanel({ result, onClose, onShortlist, shortlistState }: {
  result: SourcingCandidate; onClose: () => void; onShortlist: (id: string) => void
  shortlistState: Record<string, 'idle' | 'loading' | 'done' | 'error'>
}) {
  const c = result.candidate
  const photo = c.raw_profile?.photo_url
  const skillSections = parseSkillSections(result)
  const tags = c.raw_profile?.tags ?? []
  const color = avatarColor(c.name)
  const rawExpYears = typeof c.raw_profile?.experience_years === 'number' ? c.raw_profile.experience_years : null
  const expYears = c.experience ?? rawExpYears

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-[300px] flex-shrink-0 border-l border-neutral-200 bg-white flex flex-col overflow-hidden"
    >
      <div className="px-4 pt-3 pb-3 border-b border-neutral-100">
        <div className="flex justify-end mb-1.5">
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors"><X size={13} /></button>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          {photo
            ? <img src={photo} alt={c.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-neutral-100" />
            : <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0', color.bg, color.text)}>
                {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
          }
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] font-semibold text-neutral-900 leading-tight truncate">{c.name}</span>
              {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0"><LinkedInIcon size={13} /></a>}
            </div>
            {(c.title || c.company) && <p className="text-[11px] text-neutral-500 leading-tight truncate">{c.title}{c.title && c.company ? ' · ' : ''}{c.company}</p>}
            {c.location && <p className="flex items-center gap-1 text-[10.5px] text-neutral-400 mt-0.5 truncate"><MapPin size={9} className="flex-shrink-0" />{c.location}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {expYears != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-medium">
              <Briefcase size={8} />{expYears} yrs exp
            </span>
          )}
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
              <Tag size={8} />{tag}
            </span>
          ))}
        </div>
        {c.raw_profile?.summary && <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed line-clamp-3 break-words">{c.raw_profile.summary}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 pt-5 pb-3">
          <ScoreCircle score={result.ai_score} />
          {result.ai_reasoning ? (
            <div className="mt-3 w-full bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
              <p className="text-[9.5px] font-semibold text-violet-400 uppercase tracking-widest mb-1">AI Assessment</p>
              <p className="text-[11px] text-violet-900 leading-relaxed">{normalizeReasoning(result.ai_reasoning)}</p>
            </div>
          ) : result.ai_score == null ? (
            <p className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" />Scoring in progress…</p>
          ) : null}
        </div>
        <div className="mx-4 border-t border-neutral-100" />
        {skillSections.length > 0 && (
          <div className="px-4 pt-3 pb-5">
            <p className="text-[9.5px] font-semibold text-neutral-400 uppercase tracking-widest mb-2.5">Skill Map</p>
            <div className="space-y-2">
              {skillSections.map((section, i) => (
                <div key={i} className="border border-neutral-200 rounded-xl p-2.5">
                  <p className="text-[10px] font-semibold text-neutral-500 mb-1.5">{section.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {section.skills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-violet-100 bg-violet-50 text-[10.5px] text-violet-700 font-medium">
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor" className="opacity-50 flex-shrink-0"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-neutral-100">
        <ShortlistButton id={result.id} state={shortlistState[result.id] ?? 'idle'} onShortlist={onShortlist} full />
      </div>
    </motion.div>
  )
}

// ─── Card Row ─────────────────────────────────────────────────────────────────
function CandidateCardRow({ result, selected, onSelect, isActive, onClick, onShortlist, shortlistState }: {
  result: SourcingCandidate; selected: boolean; onSelect: (id: string) => void; isActive: boolean; onClick: () => void
  onShortlist: (id: string) => void; shortlistState: Record<string, 'idle' | 'loading' | 'done' | 'error'>
}) {
  const c = result.candidate
  const photo = c.raw_profile?.photo_url
  const education = (
    c.raw_profile?.educations?.[0]?.school
      ? `${c.raw_profile.educations[0].school}${c.raw_profile.educations[0].degree ? ', ' + c.raw_profile.educations[0].degree : ''}`
      : Array.isArray(c.raw_profile?.education_raw) ? c.raw_profile!.education_raw![0] : null
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} onClick={onClick}
      className={cn('flex items-start gap-4 px-6 py-5 border-b border-neutral-100 last:border-0 hover:bg-neutral-50/40 transition-colors cursor-pointer',
        isActive && 'bg-violet-50/30 border-l-2 border-l-violet-400')}
    >
      <div className="mt-1 flex-shrink-0" onClick={e => { e.stopPropagation(); onSelect(result.id) }}>
        <SquareCheckbox checked={selected} onChange={() => onSelect(result.id)} />
      </div>
      <Avatar name={c.name} photoUrl={photo} size={36} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-neutral-900 text-[13.5px]">{c.name}</span>
          {(c.linkedin_url || c.github_url) && (
            <a href={c.linkedin_url ?? c.github_url ?? '#'} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border border-neutral-200 text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 transition-colors flex-shrink-0">
              <ExternalLink size={10} />
            </a>
          )}
          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex-shrink-0"><LinkedInIcon size={16} /></a>}
          {c.github_url && <a href={c.github_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex-shrink-0"><GitHubIcon size={15} /></a>}
          {result.ai_score != null ? (
            <span className={['ml-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10.5px] font-bold border',
              result.ai_score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : result.ai_score >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'].join(' ')}>
              <BarChart3 size={9} strokeWidth={2.5} />{result.ai_score}
            </span>
          ) : (
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10.5px] font-medium border bg-neutral-50 text-neutral-400 border-neutral-200">
              <Loader2 size={9} className="animate-spin" />Scoring
            </span>
          )}
        </div>
        {(c.title || c.company || c.location) && (
          <div className="flex items-center gap-1.5 text-[12px] text-neutral-500 flex-wrap">
            <Briefcase size={11} className="text-neutral-400 flex-shrink-0" />
            {c.title && <span className="text-neutral-700 font-medium">{c.title}</span>}
            {c.company && <><span className="text-neutral-300">·</span><span className="text-neutral-600">{c.company}</span></>}
            {c.location && <><span className="text-neutral-300">·</span><span className="flex items-center gap-0.5 text-neutral-500"><MapPin size={10} className="flex-shrink-0" />{c.location}</span></>}
          </div>
        )}
        {education && (
          <div className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            <GraduationCap size={11} className="text-neutral-400 flex-shrink-0" />
            <span className="truncate">{education}</span>
          </div>
        )}
        <div className="pt-1 space-y-2">
          {(result.ai_score != null || c.experience != null) && (
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-medium whitespace-nowrap flex-shrink-0 w-[100px]">
                <BarChart3 size={10} strokeWidth={2.5} />AI Score
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {result.ai_score != null ? (
                  <span className={['inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-bold border',
                    result.ai_score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : result.ai_score >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'].join(' ')}>
                    {result.ai_score}/100
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium border bg-neutral-50 text-neutral-400 border-neutral-200">
                    <Loader2 size={10} className="animate-spin" />Scoring…
                  </span>
                )}
                {c.experience != null && <span className="text-[11px] text-neutral-400">{c.experience} yrs exp</span>}
                {result.ai_reasoning && <span className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2 w-full">{normalizeReasoning(result.ai_reasoning)}</span>}
              </div>
            </div>
          )}
          {(c.skills ?? []).length > 0 && (
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium whitespace-nowrap flex-shrink-0 w-[100px]">
                <ThumbsUp size={10} strokeWidth={2.5} />Skills
              </span>
              <p className="text-[12px] text-neutral-600 leading-relaxed mt-0.5">
                {`Candidate lists ${(c.skills ?? []).slice(0, 4).join(' and ')} as skills in their profile.`}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
        <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"><Eye size={14} /></button>
        <ShortlistButton id={result.id} state={shortlistState[result.id] ?? 'idle'} onShortlist={onShortlist} />
      </div>
    </motion.div>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function CandidateListRow({ result, selected, onSelect, isActive, onClick, onShortlist, shortlistState }: {
  result: SourcingCandidate; selected: boolean; onSelect: (id: string) => void; isActive: boolean; onClick: () => void
  onShortlist: (id: string) => void; shortlistState: Record<string, 'idle' | 'loading' | 'done' | 'error'>
}) {
  const c = result.candidate
  const photo = c.raw_profile?.photo_url
  return (
    <tr onClick={onClick} className={cn('border-b border-neutral-100 hover:bg-neutral-50/60 transition-colors cursor-pointer', selected && 'bg-violet-50/20', isActive && 'bg-violet-50/40')}>
      <td className="pl-3 pr-1 py-2.5" onClick={e => { e.stopPropagation(); onSelect(result.id) }}><SquareCheckbox checked={selected} onChange={() => onSelect(result.id)} /></td>
      <td className="px-2 py-2.5 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={c.name} photoUrl={photo} size={22} />
          <span className="text-[11.5px] font-medium text-neutral-900 truncate">{c.name}</span>
        </div>
      </td>
      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"><LinkedInIcon size={13} /></a>}
          {c.github_url && <a href={c.github_url} target="_blank" rel="noopener noreferrer"><GitHubIcon size={12} /></a>}
        </div>
      </td>
      <td className="px-2 py-2.5 overflow-hidden"><span className="text-[11px] text-neutral-700 truncate block">{c.title ?? '—'}</span></td>
      <td className="px-2 py-2.5 overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0">
          {typeof c.raw_profile?.company_logo === 'string' && <img src={c.raw_profile.company_logo} className="w-3.5 h-3.5 rounded-[3px] object-contain flex-shrink-0" alt="" />}
          <span className="text-[11px] text-neutral-600 truncate">{c.company ?? '—'}</span>
        </div>
      </td>
      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
        <ShortlistButton id={result.id} state={shortlistState[result.id] ?? 'idle'} onShortlist={onShortlist} compact />
      </td>
      <td className="px-2 py-2.5 pr-3">
        {result.ai_score != null ? (
          <span className={['inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10.5px] font-bold border',
            result.ai_score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : result.ai_score >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'].join(' ')}>
            {result.ai_score}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10.5px] font-medium border bg-neutral-50 text-neutral-400 border-neutral-200">
            <Loader2 size={9} className="animate-spin" />
          </span>
        )}
      </td>
    </tr>
  )
}

// ─── Map: city coords lookup ──────────────────────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  doha: [25.2854, 51.531], 'al wakrah': [25.166, 51.6], 'ar rayyan': [25.292, 51.424],
  'ar rayyān': [25.292, 51.424], lusail: [25.427, 51.491],
  'umm salal ali': [25.408, 51.403], 'umm ṣalāl ʻalī': [25.408, 51.403],
  'umm salal muhammad': [25.382, 51.392], 'umm ṣalāl muḥammad': [25.382, 51.392],
  'al khor': [25.678, 51.496], 'al daayen': [25.434, 51.532],
  dubai: [25.2048, 55.2708], 'abu dhabi': [24.4539, 54.3773], sharjah: [25.3573, 55.4033],
  riyadh: [24.7136, 46.6753], jeddah: [21.4858, 39.1925],
  cairo: [30.0444, 31.2357], beirut: [33.8938, 35.5018], amman: [31.9454, 35.9284],
  kuwait: [29.3759, 47.9774], manama: [26.2235, 50.5876], muscat: [23.5859, 58.4059],
  london: [51.5074, -0.1278], berlin: [52.52, 13.405], paris: [48.8566, 2.3522],
  amsterdam: [52.3676, 4.9041], madrid: [40.4168, -3.7038], barcelona: [41.3851, 2.1734],
  'san francisco': [37.7749, -122.4194], 'new york': [40.7128, -74.006],
  'new york city': [40.7128, -74.006], nyc: [40.7128, -74.006],
  seattle: [47.6062, -122.3321], austin: [30.2672, -97.7431], boston: [42.3601, -71.0589],
  toronto: [43.6532, -79.3832], vancouver: [49.2827, -123.1207],
  sydney: [-33.8688, 151.2093], melbourne: [-37.8136, 144.9631],
  singapore: [1.3521, 103.8198], tokyo: [35.6762, 139.6503],
  bangalore: [12.9716, 77.5946], mumbai: [19.076, 72.8777],
  nairobi: [-1.2921, 36.8219], lagos: [6.5244, 3.3792],
  johannesburg: [-26.2041, 28.0473], casablanca: [33.5731, -7.5898],
  stockholm: [59.3293, 18.0686],
  gothenburg: [57.7089, 11.9746],
  malmö: [55.6050, 13.0038],
  malmo: [55.6050, 13.0038],
  oslo: [59.9139, 10.7522],
  copenhagen: [55.6761, 12.5683],
  helsinki: [60.1699, 24.9384],
  reykjavik: [64.1355, -21.8954],
  aarhus: [56.1629, 10.2039],
  tampere: [61.4978, 23.7610],
  turku: [60.4518, 22.2666],

  // More Europe
  zurich: [47.3769, 8.5417],
  geneva: [46.2044, 6.1432],
  vienna: [48.2082, 16.3738],
  brussels: [50.8503, 4.3517],
  lisbon: [38.7169, -9.1399],
  porto: [41.1579, -8.6291],
  rome: [41.9028, 12.4964],
  milan: [45.4654, 9.1859],
  munich: [48.1351, 11.5820],
  hamburg: [53.5753, 10.0153],
  frankfurt: [50.1109, 8.6821],
  cologne: [50.9333, 6.9500],
  düsseldorf: [51.2217, 6.7762],
  dusseldorf: [51.2217, 6.7762],
  prague: [50.0755, 14.4378],
  warsaw: [52.2297, 21.0122],
  budapest: [47.4979, 19.0402],
  bucharest: [44.4268, 26.1025],
  athens: [37.9838, 23.7275],
  sofia: [42.6977, 23.3219],
  zagreb: [45.8150, 15.9819],
  ljubljana: [46.0569, 14.5058],
  tallinn: [59.4370, 24.7536],
  riga: [56.9460, 24.1059],
  vilnius: [54.6872, 25.2797],
  bratislava: [48.1486, 17.1077],

  // Middle East extras
  tel: [32.0853, 34.7818],
  'tel aviv': [32.0853, 34.7818],
  'tel aviv-yafo': [32.0853, 34.7818],
  ankara: [39.9334, 32.8597],
  istanbul: [41.0082, 28.9784],

  // Asia Pacific extras
  'kuala lumpur': [3.1390, 101.6869],
  jakarta: [-6.2088, 106.8456],
  bangkok: [13.7563, 100.5018],
  'ho chi minh': [10.8231, 106.6297],
  manila: [14.5995, 120.9842],
  seoul: [37.5665, 126.9780],
  taipei: [25.0330, 121.5654],
  shanghai: [31.2304, 121.4737],
  beijing: [39.9042, 116.4074],
  shenzhen: [22.5431, 114.0579],
  hong: [22.3193, 114.1694],
  'hong kong': [22.3193, 114.1694],
  auckland: [-36.8485, 174.7633],
  perth: [-31.9505, 115.8605],
  brisbane: [-27.4698, 153.0251],

  // North America extras
  miami: [25.7617, -80.1918],
  chicago: [41.8781, -87.6298],
  'los angeles': [34.0522, -118.2437],
  la: [34.0522, -118.2437],
  denver: [39.7392, -104.9903],
  atlanta: [33.7490, -84.3880],
  dallas: [32.7767, -96.7970],
  houston: [29.7604, -95.3698],
  phoenix: [33.4484, -112.0740],
  portland: [45.5051, -122.6750],
  'san diego': [32.7157, -117.1611],
  minneapolis: [44.9778, -93.2650],
  montreal: [45.5017, -73.5673],
  calgary: [51.0447, -114.0719],
  ottawa: [45.4215, -75.6972],

  // Africa extras
  accra: [5.6037, -0.1870],
  'cape town': [-33.9249, 18.4241],
  dar: [-6.7924, 39.2083],
  'dar es salaam': [-6.7924, 39.2083],
  addis: [9.0320, 38.7469],
  'addis ababa': [9.0320, 38.7469],
  kigali: [-1.9441, 30.0619],
  kampala: [0.3476, 32.5825],
  tunis: [36.8065, 10.1815],
  algiers: [36.7372, 3.0863],
  dakar: [14.7167, -17.4677],
  abidjan: [5.3600, -4.0083],
}

function getCoords(location: string): [number, number] | null {
  const key = location.toLowerCase().trim()
  if (CITY_COORDS[key]) return CITY_COORDS[key]
  const found = Object.entries(CITY_COORDS).find(([k]) => key.includes(k) || k.includes(key))
  return found ? found[1] : null
}

// ─── Leaflet Map (no API key — free OpenStreetMap) ────────────────────────────
function CandidateMap({ locationCounts }: { locationCounts: Array<{ city: string; count: number; coords: [number, number] }> }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    import('leaflet').then((L) => {
      // @ts-expect-error leaflet webpack icon fix
      delete L.Icon.Default.prototype._getIconUrl
      const center: [number, number] = locationCounts[0]?.coords ?? [25.2854, 51.531]
      const map = L.map(mapRef.current!, {
        center, zoom: locationCounts.length === 1 ? 10 : 7,
        zoomControl: true, scrollWheelZoom: false, attributionControl: false,
      })
      mapInstanceRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.85 }).addTo(map)
      const maxCount = Math.max(...locationCounts.map(l => l.count), 1)
      locationCounts.forEach(({ city, count, coords }) => {
        const radius = Math.max(10, Math.min(40, (count / maxCount) * 44))
        L.circleMarker(coords, {
          radius, fillColor: '#7c3aed', fillOpacity: 0.25, color: '#7c3aed', weight: 1.5, opacity: 0.6,
        }).addTo(map).bindTooltip(
          `<strong>${city}</strong>: ${count} candidate${count !== 1 ? 's' : ''}`,
          { permanent: false, className: 'sourcing-map-tooltip' }
        )
      })
      if (locationCounts.length > 1) {
        map.fitBounds(L.latLngBounds(locationCounts.map(l => l.coords)), { padding: [32, 32] })
      }
    })
    return () => {
      if (mapInstanceRef.current) {
        ;(mapInstanceRef.current as { remove: () => void }).remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={mapRef} className="h-full w-full rounded-xl overflow-hidden" />
}

// ─── Insights helpers ─────────────────────────────────────────────────────────
function buildExpBuckets(results: SourcingCandidate[]) {
  const buckets: Record<number, number> = {}
  results.forEach(r => {
    const exp = r.candidate.experience ?? r.candidate.raw_profile?.experience_years
    if (exp != null) { const b = Math.floor(Number(exp)); buckets[b] = (buckets[b] ?? 0) + 1 }
  })
  if (Object.keys(buckets).length === 0) return []
  const maxKey = Math.max(...Object.keys(buckets).map(Number))
  return Array.from({ length: maxKey + 1 }, (_, i) => ({ years: i, count: buckets[i] ?? 0 }))
}

function computeAvgTenure(results: SourcingCandidate[]): number | null {
  const tenures: number[] = []
  results.forEach(r => {
    const positions = r.candidate.raw_profile?.positions ?? r.candidate.raw_profile?.experience ?? []
    if (Array.isArray(positions) && positions.length > 1) {
      const exp = r.candidate.experience ?? r.candidate.raw_profile?.experience_years
      if (exp && positions.length > 0) tenures.push(Number(exp) / positions.length)
    }
  })
  if (tenures.length === 0) return null
  return tenures.reduce((a, b) => a + b, 0) / tenures.length
}

// ─── Insights Panel ───────────────────────────────────────────────────────────
function InsightsPanel({ results }: { results: SourcingCandidate[] }) {
  const [copied, setCopied] = useState(false)

  // Location counts
  const locationCountMap: Record<string, number> = {}
  results.forEach(r => {
    const city = r.candidate.location?.split(',')[0]?.trim()
    if (city) locationCountMap[city] = (locationCountMap[city] ?? 0) + 1
  })
  const sortedLocations = Object.entries(locationCountMap).sort(([, a], [, b]) => b - a).slice(0, 8)
  const mappableLocations = sortedLocations
    .map(([city, count]) => { const coords = getCoords(city); return coords ? { city, count, coords } : null })
    .filter(Boolean) as Array<{ city: string; count: number; coords: [number, number] }>
  const otherCount =
    Object.values(locationCountMap).reduce((a, b) => a + b, 0) -
    sortedLocations.slice(0, 7).reduce((sum, [, c]) => sum + c, 0)

  // Experience stats
  const expArr: number[] = []
  results.forEach(r => {
    const e = r.candidate.experience ?? r.candidate.raw_profile?.experience_years
    if (e != null) expArr.push(Number(e))
  })
  expArr.sort((a, b) => a - b)
  const avgExp = expArr.length > 0 ? (expArr.reduce((a, b) => a + b, 0) / expArr.length).toFixed(1) : null
  const p25 = expArr.length > 0 ? expArr[Math.floor(expArr.length * 0.25)] : null
  const med  = expArr.length > 0 ? expArr[Math.floor(expArr.length * 0.5)]  : null
  const p75  = expArr.length > 0 ? expArr[Math.floor(expArr.length * 0.75)] : null
  const avgTenure = computeAvgTenure(results)
  const expBuckets = buildExpBuckets(results)

  // Skills
  const skillCounts: Record<string, number> = {}
  results.forEach(r => { (r.candidate.skills ?? []).forEach(s => { skillCounts[s] = (skillCounts[s] ?? 0) + 1 }) })
  const topSkills = Object.entries(skillCounts).sort(([, a], [, b]) => b - a).slice(0, 5)

  // Takeaway lines
  const takeawayLines: string[] = []
  if (topSkills.length > 0) {
    const dominant = topSkills.slice(0, 3).map(([s, c]) => `${s} (${Math.round((c / results.length) * 100)}%)`).join(', ')
    takeawayLines.push(`Top skills in this pool: ${dominant}.`)
  }
  if (avgExp) {
    takeawayLines.push(`Average experience is ${avgExp} years — median sits at ${med ?? '—'} yrs, suggesting a ${Number(avgExp) > 7 ? 'senior-leaning' : 'mid-level'} candidate pool.`)
  }
  if (sortedLocations[0]) {
    const pct = Math.round((sortedLocations[0][1] / results.length) * 100)
    takeawayLines.push(`${pct}% of candidates are based in ${sortedLocations[0][0]}.${sortedLocations[1] ? ` ${sortedLocations[1][0]} is the next largest cluster.` : ''}`)
  }
  const takeawayText = takeawayLines.join(' ')

  return (
    <>
      <style>{`
        @import url('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
        .sourcing-map-tooltip { background:#1e1b4b; color:#ede9fe; border:none; border-radius:8px; font-size:12px; padding:4px 10px; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
        .sourcing-map-tooltip::before { display:none; }
      `}</style>

      <div className="p-5 space-y-4">

        {/* Row 1: Map card + Key Takeaways */}
        <div className="grid grid-cols-[1fr_320px] gap-4">

          {/* Top-left: Locations + Map */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 overflow-hidden">
            <h3 className="text-[13px] font-semibold text-neutral-800 mb-0.5">Top Locations</h3>
            <p className="text-[11px] text-neutral-400 mb-4">Top cities for your search pool</p>
            <div className="flex gap-4 h-[290px]">
              {/* List */}
              <div className="w-40 flex-shrink-0 overflow-y-auto pr-1">
                {sortedLocations.slice(0, 7).map(([city, count]) => (
                  <div key={city} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                    <span className="text-[12px] text-neutral-700 truncate max-w-[100px]">{city}</span>
                    <span className="text-[12px] font-medium text-neutral-500 flex-shrink-0 ml-2">{count}</span>
                  </div>
                ))}
                {otherCount > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[12px] text-neutral-400">Other</span>
                    <span className="text-[12px] text-neutral-400 ml-2">{otherCount}</span>
                  </div>
                )}
              </div>
              {/* Map */}
              <div className="flex-1 rounded-xl overflow-hidden border border-neutral-100">
                {mappableLocations.length > 0 ? (
                  <CandidateMap locationCounts={mappableLocations} />
                ) : (
                  <div className="h-full flex items-center justify-center bg-neutral-50">
                    <div className="text-center">
                      <MapPin size={22} className="text-neutral-200 mx-auto mb-2" />
                      <p className="text-[11px] text-neutral-400">No mappable locations</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top-right: Key Takeaways */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-violet-600"><SparkleIcon size={13} /></span>
                <h3 className="text-[13px] font-semibold text-neutral-800">Key Takeaways</h3>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(takeawayText); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="text-neutral-400 hover:text-neutral-600 transition-colors mt-0.5"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mb-4">Takeaways from your insights, curated by AI</p>
            {takeawayLines.length === 0 ? (
              <p className="text-[12px] text-neutral-400">Run a search to generate takeaways.</p>
            ) : (
              <div className="space-y-4 flex-1">
                {takeawayLines.map((line, i) => (
                  <p key={i} className="text-[12.5px] text-neutral-700 leading-relaxed">{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Experience stats + Chart */}
        <div className="grid grid-cols-[320px_1fr] gap-4">

          {/* Bottom-left: Years of Experience + Average Tenure */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <h3 className="text-[13px] font-semibold text-neutral-800 mb-0.5">Years of Experience</h3>
              <p className="text-[11px] text-neutral-400 mb-4">Total full-time work experience</p>
              {avgExp ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium mb-1">Average</p>
                    <p className="text-[2.5rem] font-bold text-neutral-900 leading-none">
                      {avgExp} <span className="text-[1rem] font-normal text-neutral-400">years</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'P25',    value: p25 != null ? `${p25} years` : '—' },
                      { label: 'Median', value: med != null ? `${med} years` : '—' },
                      { label: 'P75',    value: p75 != null ? `${p75} years` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center bg-neutral-50 rounded-xl py-3">
                        <p className="text-[12px] font-semibold text-neutral-800">{value}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-[12px] text-neutral-400">No experience data yet</p>}
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <h3 className="text-[13px] font-semibold text-neutral-800 mb-0.5">Average Tenure</h3>
              <p className="text-[11px] text-neutral-400 mb-4">Average time before switching companies</p>
              {avgTenure ? (
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium mb-1">Average</p>
                  <p className="text-[2.5rem] font-bold text-neutral-900 leading-none">
                    {avgTenure.toFixed(1)} <span className="text-[1rem] font-normal text-neutral-400">years</span>
                  </p>
                </div>
              ) : <p className="text-[12px] text-neutral-400">Not enough position data</p>}
            </div>
          </div>

          {/* Bottom-right: Experience distribution chart */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h3 className="text-[13px] font-semibold text-neutral-800 mb-0.5">Number of Profiles by Experience</h3>
            <p className="text-[11px] text-neutral-400 mb-5">Distribution of years of experience in your search pool</p>
            {expBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={expBuckets} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="years" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: 10, fontSize: 12, color: '#ede9fe', padding: '6px 12px' }}
                    itemStyle={{ color: '#ede9fe' }}
                    cursor={{ stroke: '#7c3aed', strokeWidth: 1, strokeDasharray: '4 2' }}
                    formatter={(value) => [value ?? 0, 'Profiles']}
                    labelFormatter={(label) => `${label} yrs exp`}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center">
                <p className="text-[12px] text-neutral-400">No experience data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SourcingPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? ''

  const [pageState, setPageState]           = useState<PageState>('idle')
  const [mode, setMode]                     = useState<SearchMode>('similar')
  const [roleType, setRoleType]             = useState<RoleType>('dev')
  const [query, setQuery]                   = useState('')
  const [parsed, setParsed]                 = useState<ParsedQuery | null>(null)
  const [run, setRun]                       = useState<SourcingRun | null>(null)
  const [results, setResults]               = useState<SourcingCandidate[]>([])
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [tab, setTab]                       = useState<ResultTab>('results')
  const [viewMode, setViewMode]             = useState<ViewMode>('card')
  const [page, setPage]                     = useState(1)
  const [error, setError]                   = useState<string | null>(null)
  const [focused, setFocused]               = useState(false)
  const [allSelected, setAllSelected]       = useState(false)
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  const activeCandidate = results.find(r => r.id === activeCandidateId) ?? null
  const [selectedJobId]                     = useState<string>('')
  const [shortlistState, setShortlistState] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({})
  const [shortlistModal, setShortlistModal] = useState<{ ids: string[]; apiIds: string[]; names: string[] } | null>(null)
  const [sortBy, setSortBy]                 = useState<'ai_score' | 'name' | 'experience'>('ai_score')
  const [sortDir, setSortDir]               = useState<'desc' | 'asc'>('desc')
  const [showSortModal, setShowSortModal]   = useState(false)
  const [history, setHistory]               = useState<HistoryEntry[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadMorePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [loadingMore, setLoadingMore]       = useState(false)
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { jobs } = useJobs()

  useEffect(() => { setHistory(loadHistory()) }, [])

  const parseQueryLocally = (q: string): ParsedQuery => {
    const lower = q.toLowerCase()
    const detected: string[] = []
    const LOCATIONS = [
      'san francisco', 'sf', 'bay area', 'new york', 'nyc', 'new york city', 'los angeles', 'la', 'seattle', 'austin', 'boston', 'chicago', 'denver',
      'london', 'berlin', 'paris', 'amsterdam', 'madrid', 'barcelona', 'toronto', 'vancouver', 'sydney', 'melbourne', 'singapore', 'tokyo',
      'dubai', 'mumbai', 'bangalore', 'remote', 'usa', 'us', 'uk', 'europe', 'australia', 'canada', 'germany', 'france', 'india', 'asia', 'latam', 'apac',
      'kenya', 'nigeria', 'south africa', 'egypt', 'morocco', 'ghana', 'ethiopia', 'tanzania', 'uganda', 'rwanda', 'nairobi', 'lagos', 'cairo', 'accra',
      'qatar', 'saudi arabia', 'uae', 'kuwait', 'bahrain', 'oman', 'jordan', 'lebanon', 'doha', 'riyadh', 'jeddah', 'abu dhabi', 'manama', 'muscat',
      'united states', 'united kingdom', 'united arab emirates',
    ]
    const foundLocation = LOCATIONS.find(loc => lower.includes(loc))
    const location = foundLocation ? foundLocation.charAt(0).toUpperCase() + foundLocation.slice(1) : undefined
    if (location) detected.push('location')

    let experience_min: number | undefined
    const expDigit = lower.match(/(\d+)\s*\+?\s*years?/)
    const expRange = lower.match(/(\d+)\s*[-–]\s*\d+\s*years?/)
    const EXP_WORDS: Record<string, number> = { junior: 1, entry: 0, mid: 3, 'mid-level': 3, senior: 5, staff: 7, principal: 9, lead: 6, experienced: 4 }
    if (expDigit) { experience_min = parseInt(expDigit[1]); detected.push('experience') }
    else if (expRange) { experience_min = parseInt(expRange[1]); detected.push('experience') }
    else {
      const wordMatch = Object.entries(EXP_WORDS).find(([w]) => lower.includes(w))
      if (wordMatch) { experience_min = wordMatch[1]; detected.push('experience') }
    }

    const TITLES = ['software engineer', 'frontend engineer', 'backend engineer', 'full stack engineer', 'fullstack engineer', 'staff engineer', 'platform engineer', 'data engineer', 'ml engineer', 'devops engineer', 'product manager', 'engineering manager', 'designer', 'ux designer', 'data scientist', 'data analyst', 'marketing manager', 'sales manager', 'consultant', 'scientist', 'recruiter', 'researcher', 'developer']
    const foundTitle = TITLES.find(t => lower.includes(t))
    const job_title = foundTitle ? foundTitle.replace(/\b\w/g, c => c.toUpperCase()) : undefined
    if (job_title) detected.push('job_title')

    const INDUSTRIES: Record<string, string> = { fintech: 'Fintech', finance: 'Finance', banking: 'Banking', healthcare: 'Healthcare', health: 'Healthcare', saas: 'SaaS', startup: 'Startup', 'series a': 'Series A', 'series b': 'Series B', 'series c': 'Series C', enterprise: 'Enterprise', consulting: 'Consulting', ecommerce: 'E-commerce', 'e-commerce': 'E-commerce', logistics: 'Logistics', crypto: 'Crypto', ai: 'AI' }
    const foundIndustry = Object.entries(INDUSTRIES).find(([k]) => lower.includes(k))
    const industry = foundIndustry?.[1]
    if (industry) detected.push('industry')

    const SKILLS = ['python', 'javascript', 'typescript', 'node.js', 'node', 'react', 'vue', 'angular', 'go', 'golang', 'java', 'kotlin', 'swift', 'rust', 'c++', 'c#', '.net', 'ruby', 'rails', 'php', 'scala', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'kafka', 'aws', 'gcp', 'azure', 'kubernetes', 'docker', 'terraform', 'graphql', 'rest', 'fastapi', 'django', 'flask', 'express', 'pytorch', 'tensorflow', 'spark', 'airflow', 'dbt', 'figma', 'sketch', 'excel', 'erp', 'salesforce', 'tableau']
    const skills = SKILLS.filter(s => lower.includes(s))
    if (skills.length > 0) detected.push('skills')

    return { location: location ?? null, job_title: job_title ?? null, experience_min: experience_min ?? null, industry: industry ?? null, skills, detected }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setParsed(null); return }
    debounceRef.current = setTimeout(() => { setParsed(parseQueryLocally(query)) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const id = sessionStorage.getItem('sourcing_restore_id')
    if (!id) return
    sessionStorage.removeItem('sourcing_restore_id')
    const entry = loadHistory().find(h => h.id === id)
    if (entry) restoreHistory(entry)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restoreHistory = (entry: HistoryEntry) => {
    setQuery(entry.query); setParsed(entry.parsed); setResults(entry.results)
    setRun(entry.run); setPage(1); setActiveCandidateId(null)
    setPageState('results'); setActiveHistoryId(entry.id); setFocused(false)
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setError(null); setPageState('searching'); setResults([]); setPage(1)
    setFocused(false); setActiveCandidateId(null); setActiveHistoryId(null)
    const p = parsed ?? parseQueryLocally(query)
    setParsed(p)
    try {
      const activePlatforms = roleType === 'non_dev' ? ['linkedin'] : ['github', 'linkedin']
      const newRun = await sourcingApi.createRun({
        ...(selectedJobId ? { job_id: selectedJobId } : {}),
        platforms: activePlatforms,
        criteria: { keywords: query, location: p.location ?? undefined, title: p.job_title ?? undefined, skills: p.skills.length > 0 ? p.skills : undefined, experience_min: p.experience_min ?? undefined, industry: p.industry ?? undefined, limit: 20, role_type: roleType },
      })
      setRun(newRun)
      let attempts = 0; const MAX_ATTEMPTS = 90; const MAX_SCORE_WAITS = 60; let runDone = false; let scoreWaits = 0
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        attempts++
        try {
          const [latest, partial] = await Promise.all([sourcingApi.getRun(newRun.id), sourcingApi.getResults(newRun.id)])
          if (partial.length > 0) { setResults(partial); setPageState('results') }
          setRun(latest)
          const isDone = latest.status === 'completed' || latest.status === 'failed'
          if (isDone) runDone = true
          if (latest.status === 'failed') { clearInterval(pollRef.current!); pollRef.current = null; setError('Sourcing run failed. Please try again.'); if (partial.length === 0) setPageState('idle'); return }
          const allScored = partial.length > 0 && partial.every(r => r.ai_score != null)
          const found = latest.candidates_found ?? partial.length
          const countDone = found > 0 && (latest.candidates_scored ?? 0) >= found
          const shouldStop = runDone && (allScored || scoreWaits >= MAX_SCORE_WAITS || attempts >= MAX_ATTEMPTS)
          const countStopPending = runDone && countDone && !allScored
          if (shouldStop || (countStopPending && scoreWaits >= 2)) {
            try {
              const finalResults = await sourcingApi.getResults(newRun.id)
              if (finalResults.length > 0) setResults(finalResults)
              clearInterval(pollRef.current!); pollRef.current = null
              const entry: HistoryEntry = { id: newRun.id, query, parsed: p, results: finalResults.length > 0 ? finalResults : partial, run: latest, timestamp: new Date().toISOString() }
              setHistory(prev => { const next = [entry, ...prev.filter(h => h.id !== entry.id)].slice(0, MAX_HISTORY); saveHistory(next); return next })
            } catch { clearInterval(pollRef.current!); pollRef.current = null }
            return
          }
          if (runDone) scoreWaits++
        } catch { clearInterval(pollRef.current!); pollRef.current = null; setPageState('results') }
      }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg); setPageState('idle')
    }
  }

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const handleCandidateClick = (result: SourcingCandidate) => { setActiveCandidateId(prev => prev === result.id ? null : result.id) }

  const sortedResults = [...results].sort((a, b) => {
    let av: number, bv: number
    if (sortBy === 'ai_score') { av = a.ai_score ?? -1; bv = b.ai_score ?? -1 }
    else if (sortBy === 'experience') { av = a.candidate.experience ?? -1; bv = b.candidate.experience ?? -1 }
    else { return sortDir === 'asc' ? (a.candidate.name ?? '').localeCompare(b.candidate.name ?? '') : (b.candidate.name ?? '').localeCompare(a.candidate.name ?? '') }
    return sortDir === 'asc' ? av - bv : bv - av
  })
  const paginated  = sortedResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(sortedResults.length / PAGE_SIZE)
  const detectedKeys = parsed?.detected ?? []

  const toggleAll = () => {
    if (allSelected) { setSelected(new Set()); setAllSelected(false) }
    else { setSelected(new Set(paginated.map(r => r.id))); setAllSelected(true) }
  }

  const handleShortlist = (id: string) => {
    const result = results.find(r => r.id === id) ?? activeCandidate
    const name = result?.candidate.name ?? 'Candidate'
    const apiId = result?.candidate_id ?? result?.candidate?.id ?? id
    setShortlistModal({ ids: [id], apiIds: [apiId], names: [name] })
  }

  const handleShortlistConfirm = async (jobId: string) => {
    if (!shortlistModal) return
    const { ids, apiIds } = shortlistModal
    setShortlistState(prev => { const next = { ...prev }; ids.forEach(id => { next[id] = 'loading' }); return next })
    try {
      await sourcingApi.shortlist(apiIds, jobId)
      setShortlistState(prev => { const next = { ...prev }; ids.forEach(id => { next[id] = 'done' }); return next })
    } catch (e: unknown) {
      setShortlistState(prev => { const next = { ...prev }; ids.forEach(id => { next[id] = 'error' }); return next })
      throw e
    }
  }

  const handleLoadMore = async () => {
    if (!run || !parsed || loadingMore) return
    setLoadingMore(true)
    try {
      const activePlatforms = roleType === 'non_dev' ? ['linkedin'] : ['github']
      const newRun = await sourcingApi.createRun({
        platforms: activePlatforms,
        criteria: { keywords: query, location: parsed.location ?? undefined, title: parsed.job_title ?? undefined, skills: parsed.skills.length > 0 ? parsed.skills : undefined, experience_min: parsed.experience_min ?? undefined, industry: parsed.industry ?? undefined, limit: 20, role_type: roleType },
      })
      const existingIds = new Set(results.map(r => r.candidate_id ?? r.candidate?.id ?? r.id))
      let attempts = 0; const MAX = 90
      if (loadMorePollRef.current) clearInterval(loadMorePollRef.current)
      loadMorePollRef.current = setInterval(async () => {
        attempts++
        try {
          const [latest, partial] = await Promise.all([sourcingApi.getRun(newRun.id), sourcingApi.getResults(newRun.id)])
          const fresh = partial.filter(r => !existingIds.has(r.candidate_id ?? r.candidate?.id ?? r.id))
          if (fresh.length > 0) {
            setResults(prev => { const prevIds = new Set(prev.map(r => r.candidate_id ?? r.candidate?.id ?? r.id)); return [...prev, ...fresh.filter(r => !prevIds.has(r.candidate_id ?? r.candidate?.id ?? r.id))] })
          }
          if (latest.status === 'completed' || latest.status === 'failed' || attempts >= MAX) { clearInterval(loadMorePollRef.current!); loadMorePollRef.current = null; setLoadingMore(false) }
        } catch { clearInterval(loadMorePollRef.current!); loadMorePollRef.current = null; setLoadingMore(false) }
      }, 2000)
    } catch { setLoadingMore(false) }
  }

  const handleCancelSearch = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setPageState('idle'); setResults([]); setRun(null); setError(null)
  }

  const handleClearHistory = () => { setHistory([]); setActiveHistoryId(null); saveHistory([]) }

  // ── IDLE / SEARCHING ────────────────────────────────────────────────────────
  if (pageState === 'idle' || (pageState as string) === 'searching') {
    return (
      <div className="min-h-[75vh] flex flex-col items-center" style={{ paddingTop: '12vh' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full flex flex-col items-center" style={{ maxWidth: 680 }}>
          <h1 className="text-[1.6rem] font-medium text-neutral-800 tracking-tight mb-6 text-center">
            Hey {firstName}, who are you looking for?
          </h1>

          {/* Role type toggle */}
          <div className="flex items-center gap-2 mb-5 p-1 bg-neutral-100 rounded-xl w-fit self-center">
            {([
              { id: 'dev',     label: 'Tech / Dev',       desc: 'Engineers, Data Scientists, DevOps' },
              { id: 'non_dev', label: 'Business / Other', desc: 'Sales, Marketing, Finance, HR, Design' },
            ] as const).map(rt => (
              <button key={rt.id} onClick={() => setRoleType(rt.id)}
                className={cn('flex flex-col items-start px-4 py-2 rounded-lg text-left transition-all',
                  roleType === rt.id ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700')}>
                <span className="text-[12px] font-semibold leading-tight">{rt.label}</span>
                <span className="text-[10px] mt-0.5 leading-tight">{rt.desc}</span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="w-full relative">
            <div className="w-full bg-white rounded-2xl border border-neutral-200">
              <div className="px-5 pt-4 pb-3">
                <input
                  autoFocus value={query}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 180)}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    mode === 'boolean' ? '("Marketing Manager" OR "Head of Sales") AND "B2B" AND London'
                    : roleType === 'non_dev' ? 'Senior Sales Manager in London with 5+ years B2B SaaS experience'
                    : 'Software Engineers with 5+ yrs of experience at fintech companies in the Bay Area'
                  }
                  className="w-full text-sm bg-transparent outline-none ring-0 focus:outline-none focus:ring-0 text-neutral-700 placeholder:text-neutral-400"
                />
              </div>
              <AnimatePresence>
                {focused && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                    <div className="flex items-center justify-between px-5 pb-3.5 gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {CRITERIA_DISPLAY.map(({ key, label }) => {
                          const detected = detectedKeys.includes(key) || (key === 'experience' && detectedKeys.includes('experience_min'))
                          return (
                            <motion.span key={key} animate={{ color: detected ? '#059669' : '#a3a3a3' }} transition={{ duration: 0.25 }} className="flex items-center gap-1 text-[11px] select-none">
                              <motion.span animate={{ scale: detected ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.2 }}>
                                {detected ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" /> : <Circle size={11} className="flex-shrink-0" />}
                              </motion.span>
                              {label}
                            </motion.span>
                          )
                        })}
                      </div>
                      <motion.button whileTap={{ scale: 0.92 }} onClick={handleSearch}
                        disabled={!query.trim() || (pageState as string) === 'searching'}
                        className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                          query.trim() && pageState !== 'searching' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm' : 'bg-violet-100 text-violet-300 cursor-not-allowed')}>
                        {(pageState as string) === 'searching' ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {focused && !query.trim() && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-neutral-200 shadow-md overflow-hidden z-10">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onMouseDown={() => setQuery(s)} className="w-full text-left px-5 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0">{s}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-4 w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Recent Searches</span>
                </div>
                <button onClick={handleClearHistory} className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors">Clear history</button>
              </div>
              <div className="flex flex-col gap-1.5">
                {history.map(entry => (
                  <button key={entry.id} onClick={() => restoreHistory(entry)}
                    className={cn('flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-xl border transition-all group',
                      activeHistoryId === entry.id ? 'border-violet-300 bg-violet-50/60' : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span className="flex-1 text-[12.5px] text-neutral-700 truncate">{entry.query}</span>
                    <span className="text-[11px] text-neutral-400 flex-shrink-0">{entry.results.length} match{entry.results.length !== 1 ? 'es' : ''}</span>
                    <span className="text-[11px] text-neutral-300 flex-shrink-0">{new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(pageState as string) === 'searching' && (
            <button onClick={handleCancelSearch} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 bg-white text-[12px] font-medium text-neutral-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
              <X size={12} />Cancel Search
            </button>
          )}
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </motion.div>
      </div>
    )
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  const SORT_LABELS: Record<string, string> = { ai_score: 'AI Score', name: 'Name', experience: 'Experience' }

  return (
    <div className="space-y-0 mt-2">
      {/* Sort Modal */}
      <AnimatePresence>
        {showSortModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowSortModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="relative bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-xs mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h2 className="text-[13px] font-semibold text-neutral-900">Sort Results</h2>
                <button onClick={() => setShowSortModal(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors"><X size={14} /></button>
              </div>
              <div className="p-4 space-y-2">
                {(['ai_score', 'name', 'experience'] as const).map(opt => (
                  <button key={opt} onClick={() => { setSortBy(opt); if (opt === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                    className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border text-[13px] transition-all',
                      sortBy === opt ? 'border-violet-400 bg-violet-50 text-violet-900 font-medium' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50')}>
                    <span>{SORT_LABELS[opt]}</span>
                    {sortBy === opt && <span className="text-[11px] text-violet-500 font-semibold">{sortDir === 'desc' ? '↓ High → Low' : '↑ Low → High'}</span>}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-4">
                <button onClick={() => setShowSortModal(false)} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[13px] font-medium transition-colors">Apply</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search bar row */}
      <div className="flex items-center gap-2.5 pb-4">
        <button onClick={() => { setPageState('idle'); setRun(null); setResults([]); setActiveCandidateId(null) }}
          className="p-2 rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 shadow-sm transition-colors flex-shrink-0" title="Back to search">
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl px-4 py-2.5 shadow-sm min-w-0">
          <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <span className="text-[11px] font-semibold text-neutral-600">{firstName[0]}</span>
          </div>
          <span className="text-[13px] text-neutral-700 truncate flex-1">{query}</span>
          <button onClick={() => { setPageState('idle'); setRun(null); setResults([]); setActiveCandidateId(null) }} className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 transition-colors"><X size={14} /></button>
        </div>
        <button onClick={() => setShowSortModal(true)}
          className={cn('inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border rounded-xl text-[13px] text-neutral-700 hover:bg-neutral-50 shadow-sm flex-shrink-0 font-medium transition-colors',
            sortBy !== 'ai_score' ? 'border-violet-300 text-violet-700' : 'border-neutral-200')}>
          <Filter size={13} className={sortBy !== 'ai_score' ? 'text-violet-500' : 'text-neutral-500'} />
          Sort
          <span className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center', sortBy !== 'ai_score' ? 'bg-violet-100 text-violet-700' : 'bg-neutral-100 text-neutral-500')}>
            {sortDir === 'desc' ? '↓' : '↑'}
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        {(['results', 'insights'] as ResultTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-5 py-2.5 text-[13px] font-medium capitalize border-b-2 -mb-px transition-colors',
              tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-neutral-500 hover:text-neutral-700')}>
            {t === 'results' ? 'Results' : 'Insights'}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      {tab === 'results' && (
        <div className="flex items-center gap-3 py-3 px-0.5">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="flex items-center gap-1.5">
              <SquareCheckbox checked={allSelected} onChange={toggleAll} />
              <ChevronDown size={12} className="text-neutral-400" />
            </div>
            <span className="text-[13px] font-semibold text-neutral-800">
              Matches <span className="font-normal text-neutral-500">({results.length})</span>
            </span>
            <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
              <button onClick={() => setViewMode('card')} className={cn('p-1.5 transition-colors', viewMode === 'card' ? 'bg-violet-50 text-violet-600' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50')}><LayoutList size={14} /></button>
              <button onClick={() => setViewMode('list')} className={cn('p-1.5 border-l border-neutral-200 transition-colors', viewMode === 'list' ? 'bg-violet-50 text-violet-600' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50')}><LayoutGrid size={14} /></button>
            </div>
            {selected.size > 0 && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                <BookMarked size={12} />Review ({selected.size})
              </button>
            )}
            {run && run.status !== 'completed' && run.status !== 'failed' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <Loader2 size={11} className="animate-spin" />{results.length > 0 ? `Found ${results.length} so far…` : 'Searching…'}
              </span>
            )}
            {run?.status === 'completed' && results.every(r => r.ai_score != null) && <span className="text-xs text-emerald-600 font-medium">✓ Done</span>}
            {run?.status === 'completed' && !results.every(r => r.ai_score != null) && (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-500">
                <Loader2 size={11} className="animate-spin" />Scoring {results.filter(r => r.ai_score != null).length}/{results.length}…
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[12px] text-neutral-500 flex-shrink-0">
            <span>{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, results.length)} of {results.length}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="disabled:opacity-30 hover:text-neutral-800 transition-colors ml-0.5"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-0 items-start">
        <div className={cn('flex-1 min-w-0 transition-all duration-200', activeCandidate ? 'mr-3' : '')}>

          {/* Card view */}
          {tab === 'results' && viewMode === 'card' && (
            <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
              {(pageState as string) === 'searching' && results.length === 0 && (
                <div className="divide-y divide-neutral-100">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 px-6 py-5 animate-pulse">
                      <div className="w-[15px] h-[15px] rounded-[3px] bg-neutral-100 mt-1 flex-shrink-0" />
                      <div className="w-9 h-9 bg-neutral-100 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2.5 pt-0.5">
                        <div className="h-3 bg-neutral-100 rounded w-40" />
                        <div className="h-2.5 bg-neutral-100 rounded w-64" />
                        <div className="space-y-2 pt-1">
                          <div className="flex gap-4 items-center"><div className="h-6 bg-neutral-100 rounded-full w-[100px]" /><div className="h-2.5 bg-neutral-100 rounded w-48" /></div>
                          <div className="flex gap-4 items-center"><div className="h-6 bg-neutral-100 rounded-full w-[100px]" /><div className="h-2.5 bg-neutral-100 rounded w-40" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pageState === 'results' && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Users size={28} className="text-neutral-300 mb-3" />
                  <p className="text-sm font-medium text-neutral-600">No candidates found</p>
                  <p className="text-xs text-neutral-400 mt-1">Try broadening your search</p>
                </div>
              )}
              <AnimatePresence>
                {paginated.map(r => (
                  <CandidateCardRow key={r.id} result={r} selected={selected.has(r.id)} onSelect={toggleSelect}
                    isActive={activeCandidate?.id === r.id} onClick={() => handleCandidateClick(r)}
                    onShortlist={handleShortlist} shortlistState={shortlistState} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* List view */}
          {tab === 'results' && viewMode === 'list' && (
            <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
              {(pageState as string) === 'searching' && results.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="animate-spin text-neutral-400" />
                  <span className="ml-3 text-sm text-neutral-500">Loading candidates…</span>
                </div>
              ) : (
                <div className="overflow-x-hidden w-full">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-neutral-100 bg-neutral-50/50">
                        <th className="pl-3 pr-1 py-2 w-6" />
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[26%]">Name</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[5%]">Links</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[22%]">Title</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[17%]">Company</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[14%]">Shortlist</th>
                        <th className="px-2 py-2 pr-3 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[16%]">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {paginated.map(r => (
                          <CandidateListRow key={r.id} result={r} selected={selected.has(r.id)} onSelect={toggleSelect}
                            isActive={activeCandidate?.id === r.id} onClick={() => handleCandidateClick(r)}
                            onShortlist={handleShortlist} shortlistState={shortlistState} />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  {pageState === 'results' && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Users size={28} className="text-neutral-300 mb-3" />
                      <p className="text-sm font-medium text-neutral-600">No candidates found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Insights tab */}
          {tab === 'insights' && (
            <div className="bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden mt-3">
              {(pageState as string) === 'searching' && results.length === 0
                ? <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-neutral-400" /><span className="ml-3 text-sm text-neutral-500">Gathering insights…</span></div>
                : <InsightsPanel results={results} />}
            </div>
          )}

          {/* Bottom pagination */}
          {tab === 'results' && results.length > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-xs text-neutral-500 px-1">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
            </div>
          )}

          {tab === 'results' && run?.status === 'completed' && (
            <div className="flex justify-center pt-3 pb-1">
              <button onClick={handleLoadMore} disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-colors disabled:opacity-50">
                {loadingMore ? <><Loader2 size={13} className="animate-spin" />Finding more candidates…</> : <><Users size={13} className="text-neutral-400" />Load More Candidates</>}
              </button>
            </div>
          )}
        </div>

        {/* Candidate detail panel */}
        <AnimatePresence>
          {activeCandidate && (
            <CandidatePanel result={activeCandidate} onClose={() => setActiveCandidateId(null)} onShortlist={handleShortlist} shortlistState={shortlistState} />
          )}
        </AnimatePresence>
      </div>

      {/* Shortlist Modal */}
      <AnimatePresence>
        {shortlistModal && (
          <ShortlistModal candidateNames={shortlistModal.names} jobs={jobs} onConfirm={handleShortlistConfirm} onClose={() => setShortlistModal(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}