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

// ─── Search History ──────────────────────────────────────────────────────────
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
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch { return [] }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
  } catch {}
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

// ─── Avatar colors ─────────────────────────────────────────────────────────────
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

// ─── Normalize AI reasoning language ─────────────────────────────────────────
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

// ─── LinkedIn Icon ────────────────────────────────────────────────────────────
function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0077B5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

// ─── GitHub Icon ──────────────────────────────────────────────────────────────
function GitHubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-neutral-600">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
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
        checked
          ? 'bg-violet-600 border-violet-600'
          : 'border-neutral-300 hover:border-neutral-400 bg-white'
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
  id: string
  state: ShortlistState
  onShortlist: (id: string) => void
  full?: boolean
  compact?: boolean
}) {
  const done  = state === 'done'
  const loading = state === 'loading'

  if (compact) {
    return (
      <button
        onClick={() => !done && !loading && onShortlist(id)}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap transition-colors',
          done
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default'
            : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
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
          <button
            onClick={() => !done && !loading && onShortlist(id)}
            className="flex items-center px-2 py-2 border-l border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            <ChevronDown size={11} />
          </button>
        )}
      </div>
    )
  }

  // default (card row)
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
        <button
          onClick={() => !done && !loading && onShortlist(id)}
          className="flex items-center px-2 py-1.5 border-l border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <ChevronDown size={11} />
        </button>
      )}
    </div>
  )
}

// ─── ShortlistModal ───────────────────────────────────────────────────────────
function ShortlistModal({
  candidateNames,
  jobs,
  onConfirm,
  onClose,
}: {
  candidateNames: string[]
  jobs: ApiJob[]
  onConfirm: (jobId: string) => Promise<void>
  onClose: () => void
}) {
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeJobs = jobs.filter(j => (j.status as string) === 'open' || (j.status as string) === 'active' || !j.status)

  const handleConfirm = async () => {
    if (!selectedJobId) return
    setSaving(true)
    setError(null)
    try {
      await onConfirm(selectedJobId)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Add to Shortlist</h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {candidateNames.length === 1
                ? `Shortlisting ${candidateNames[0]}`
                : `Shortlisting ${candidateNames.length} candidates`}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors mt-0.5">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-[12px] font-medium text-neutral-700">Select a role to shortlist against</p>
          {activeJobs.length === 0 ? (
            <p className="text-[12px] text-neutral-400">No open jobs found. Create a job first.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={cn(
                    'w-full text-left px-3.5 py-3 rounded-xl border text-[13px] transition-all',
                    selectedJobId === job.id
                      ? 'border-violet-400 bg-violet-50 text-violet-900'
                      : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
                  )}
                >
                  <p className="font-medium leading-snug">{job.title}</p>
                  {job.location && (
                    <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={9} />
                      {job.location}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedJobId || saving || activeJobs.length === 0}
            className={cn(
              'px-4 py-2 rounded-lg text-[12px] font-medium transition-colors inline-flex items-center gap-1.5',
              selectedJobId && !saving
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : 'bg-violet-100 text-violet-300 cursor-not-allowed',
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


// ─── Parse helpers: bridge structured demo data ↔ real scraper data ──────────



/** Prefer raw_profile.skill_sections (structured); fall back to top-level candidate.skills (flat[]) */
function parseSkillSections(result: SourcingCandidate): { label: string; skills: string[] }[] {
  const rp = result.candidate.raw_profile
  if (rp?.skill_sections && rp.skill_sections.length > 0) return rp.skill_sections
  const flat = result.candidate.skills ?? []
  if (flat.length > 0) return [{ label: 'Skills', skills: flat }]
  return []
}


// ─── AI Score Circle ──────────────────────────────────────────────────────────
function ScoreCircle({ score }: { score: number | null | undefined }) {
  const SIZE = 96, CX = 48, CY = 48, R = 38, SW = 7
  const circ = 2 * Math.PI * R
  const color =
    score == null ? '#d1d5db'
    : score >= 85  ? '#10b981'
    : score >= 70  ? '#f59e0b'
    :                '#ef4444'
  const arc = score != null ? (Math.min(score, 100) / 100) * circ : 0

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f3f4f6" strokeWidth={SW} />
        {score != null && (
          <circle
            cx={CX} cy={CY} r={R} fill="none"
            stroke={color} strokeWidth={SW}
            strokeDasharray={`${arc} ${circ - arc}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 0.55s ease' }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {score != null ? (
          <>
            <span style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, letterSpacing: '0.07em', textTransform: 'uppercase' }}>score</span>
          </>
        ) : (
          <Loader2 size={16} className="animate-spin text-neutral-300" />
        )}
      </div>
    </div>
  )
}

// ─── Candidate Detail Panel ───────────────────────────────────────────────────
function CandidatePanel({
  result, onClose, onShortlist, shortlistState,
}: {
  result: SourcingCandidate
  onClose: () => void
  onShortlist: (id: string) => void
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
      initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-[300px] flex-shrink-0 border-l border-neutral-200 bg-white flex flex-col overflow-hidden"
    >
      {/* ── Person header ── */}
      <div className="px-4 pt-3 pb-3 border-b border-neutral-100">
        {/* close row */}
        <div className="flex justify-end mb-1.5">
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X size={13} />
          </button>
        </div>
        {/* avatar + name */}
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
              {c.linkedin_url && (
                <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <LinkedInIcon size={13} />
                </a>
              )}
            </div>
            {(c.title || c.company) && (
              <p className="text-[11px] text-neutral-500 leading-tight truncate">
                {c.title}{c.title && c.company ? ' · ' : ''}{c.company}
              </p>
            )}
            {c.location && (
              <p className="flex items-center gap-1 text-[10.5px] text-neutral-400 mt-0.5 truncate">
                <MapPin size={9} className="flex-shrink-0" />{c.location}
              </p>
            )}
          </div>
        </div>
        {/* tags + exp */}
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
        {/* description — capped, no overflow */}
        {c.raw_profile?.summary && (
          <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed line-clamp-3 break-words">
            {c.raw_profile.summary}
          </p>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* AI Score circle + statement */}
        <div className="flex flex-col items-center px-4 pt-5 pb-3">
          <ScoreCircle score={result.ai_score} />

          {result.ai_reasoning ? (
            <div className="mt-3 w-full bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
              <p className="text-[9.5px] font-semibold text-violet-400 uppercase tracking-widest mb-1">AI Assessment</p>
              <p className="text-[11px] text-violet-900 leading-relaxed">
                {normalizeReasoning(result.ai_reasoning)}
              </p>
            </div>
          ) : result.ai_score == null ? (
            <p className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Loader2 size={10} className="animate-spin" />Scoring in progress…
            </p>
          ) : null}
        </div>

        <div className="mx-4 border-t border-neutral-100" />

        {/* Skill Map */}
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

      {/* ── Footer: Shortlist button ── */}
      <div className="px-4 py-3 border-t border-neutral-100">
        <ShortlistButton id={result.id} state={shortlistState[result.id] ?? 'idle'} onShortlist={onShortlist} full />
      </div>
    </motion.div>
  )
}

// ─── Card Row ─────────────────────────────────────────────────────────────────
function CandidateCardRow({
  result, selected, onSelect, isActive, onClick, onShortlist, shortlistState,
}: {
  result: SourcingCandidate; selected: boolean; onSelect: (id: string) => void; isActive: boolean; onClick: () => void
  onShortlist: (id: string) => void
  shortlistState: Record<string, 'idle' | 'loading' | 'done' | 'error'>
}) {
  const c         = result.candidate
  const photo     = c.raw_profile?.photo_url
  const education = (
    c.raw_profile?.educations?.[0]?.school
      ? `${c.raw_profile.educations[0].school}${c.raw_profile.educations[0].degree ? ', ' + c.raw_profile.educations[0].degree : ''}`
      : Array.isArray(c.raw_profile?.education_raw) ? c.raw_profile!.education_raw![0] : null
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 px-6 py-5 border-b border-neutral-100 last:border-0 hover:bg-neutral-50/40 transition-colors cursor-pointer',
        isActive && 'bg-violet-50/30 border-l-2 border-l-violet-400'
      )}
    >
      {/* Checkbox */}
      <div className="mt-1 flex-shrink-0" onClick={e => { e.stopPropagation(); onSelect(result.id) }}>
        <SquareCheckbox checked={selected} onChange={() => onSelect(result.id)} />
      </div>

      {/* Avatar */}
      <Avatar name={c.name} photoUrl={photo} size={36} />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">

        {/* Name + links */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-neutral-900 text-[13.5px]">{c.name}</span>
          {(c.linkedin_url || c.github_url) && (
            <a
              href={c.linkedin_url ?? c.github_url ?? '#'}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border border-neutral-200 text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 transition-colors flex-shrink-0"
            >
              <ExternalLink size={10} />
            </a>
          )}
          {c.linkedin_url && (
            <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex-shrink-0">
              <LinkedInIcon size={16} />
            </a>
          )}
          {c.github_url && (
            <a href={c.github_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex-shrink-0">
              <GitHubIcon size={15} />
            </a>
          )}
          {result.ai_score != null ? (
            <span className={[
              'ml-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10.5px] font-bold border',
              result.ai_score >= 85
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : result.ai_score >= 70
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-600 border-red-200'
            ].join(' ')}>
              <BarChart3 size={9} strokeWidth={2.5} />
              {result.ai_score}
            </span>
          ) : (
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10.5px] font-medium border bg-neutral-50 text-neutral-400 border-neutral-200">
              <Loader2 size={9} className="animate-spin" />
              Scoring
            </span>
          )}
        </div>

        {/* Title + company + location */}
        {(c.title || c.company || c.location) && (
          <div className="flex items-center gap-1.5 text-[12px] text-neutral-500 flex-wrap">
            <Briefcase size={11} className="text-neutral-400 flex-shrink-0" />
            {c.title && <span className="text-neutral-700 font-medium">{c.title}</span>}
            {c.company && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="text-neutral-600">{c.company}</span>
              </>
            )}
            {c.location && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="flex items-center gap-0.5 text-neutral-500">
                  <MapPin size={10} className="flex-shrink-0" />{c.location}
                </span>
              </>
            )}
          </div>
        )}

        {/* Education */}
        {education && (
          <div className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            <GraduationCap size={11} className="text-neutral-400 flex-shrink-0" />
            <span className="truncate">{education}</span>
          </div>
        )}

        {/* Criteria rows */}
        <div className="pt-1 space-y-2">
          {(result.ai_score != null || c.experience != null) && (
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-medium whitespace-nowrap flex-shrink-0 w-[100px]">
                <BarChart3 size={10} strokeWidth={2.5} />
                AI Score
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {result.ai_score != null ? (
                  <span className={[
                    'inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-bold border',
                    result.ai_score >= 85
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : result.ai_score >= 70
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  ].join(' ')}>
                    {result.ai_score}/100
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium border bg-neutral-50 text-neutral-400 border-neutral-200">
                    <Loader2 size={10} className="animate-spin" />
                    Scoring…
                  </span>
                )}
                {c.experience != null && (
                  <span className="text-[11px] text-neutral-400">{c.experience} yrs exp</span>
                )}
                {result.ai_reasoning && (
                  <span className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2 w-full">{normalizeReasoning(result.ai_reasoning)}</span>
                )}
              </div>
            </div>
          )}
          {(c.skills ?? []).length > 0 && (
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium whitespace-nowrap flex-shrink-0 w-[100px]">
                <ThumbsUp size={10} strokeWidth={2.5} />
                Skills
              </span>
              <p className="text-[12px] text-neutral-600 leading-relaxed mt-0.5">
                {`Candidate lists ${(c.skills ?? []).slice(0, 4).join(' and ')} as skills in their profile.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
        <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
          <Eye size={14} />
        </button>
        <ShortlistButton id={result.id} state={shortlistState[result.id] ?? 'idle'} onShortlist={onShortlist} />
      </div>
    </motion.div>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function CandidateListRow({
  result, selected, onSelect, isActive, onClick, onShortlist, shortlistState,
}: {
  result: SourcingCandidate; selected: boolean; onSelect: (id: string) => void; isActive: boolean; onClick: () => void
  onShortlist: (id: string) => void
  shortlistState: Record<string, 'idle' | 'loading' | 'done' | 'error'>
}) {
  const c        = result.candidate
  const photo    = c.raw_profile?.photo_url
  // experience_years available via raw_profile if needed

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-neutral-100 hover:bg-neutral-50/60 transition-colors cursor-pointer',
        selected && 'bg-violet-50/20',
        isActive && 'bg-violet-50/40'
      )}
    >
      {/* checkbox */}
      <td className="pl-3 pr-1 py-2.5" onClick={e => { e.stopPropagation(); onSelect(result.id) }}>
        <SquareCheckbox checked={selected} onChange={() => onSelect(result.id)} />
      </td>

      {/* name + avatar */}
      <td className="px-2 py-2.5 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={c.name} photoUrl={photo} size={22} />
          <span className="text-[11.5px] font-medium text-neutral-900 truncate">{c.name}</span>
        </div>
      </td>

      {/* links */}
      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"><LinkedInIcon size={13} /></a>}
          {c.github_url   && <a href={c.github_url}   target="_blank" rel="noopener noreferrer"><GitHubIcon   size={12} /></a>}
        </div>
      </td>

      {/* title */}
      <td className="px-2 py-2.5 overflow-hidden">
        <span className="text-[11px] text-neutral-700 truncate block">{c.title ?? '—'}</span>
      </td>

      {/* company + logo */}
      <td className="px-2 py-2.5 overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0">
          {typeof c.raw_profile?.company_logo === 'string' && (
            <img src={c.raw_profile.company_logo} className="w-3.5 h-3.5 rounded-[3px] object-contain flex-shrink-0" alt="" />
          )}
          <span className="text-[11px] text-neutral-600 truncate">{c.company ?? '—'}</span>
        </div>
      </td>

      {/* shortlist */}
      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
        <ShortlistButton id={result.id} state={shortlistState[result.id] ?? 'idle'} onShortlist={onShortlist} compact />
      </td>

      {/* ai score */}
      <td className="px-2 py-2.5 pr-3">
        {result.ai_score != null ? (
          <span className={[
            'inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10.5px] font-bold border',
            result.ai_score >= 85
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : result.ai_score >= 70
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-red-50 text-red-600 border-red-200'
          ].join(' ')}>
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

// ─── Insights ─────────────────────────────────────────────────────────────────
function InsightsPanel({ results }: { results: SourcingCandidate[] }) {
  const [copied, setCopied] = useState(false)

  const locationCounts: Record<string, number> = {}
  results.forEach(r => {
    const loc = r.candidate.location?.split(',')[0]?.trim()
    if (loc) locationCounts[loc] = (locationCounts[loc] ?? 0) + 1
  })
  const topLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxLoc = topLocations[0]?.[1] ?? 1

  const skillCounts: Record<string, number> = {}
  results.forEach(r => { (r.candidate.skills ?? []).forEach(s => { skillCounts[s] = (skillCounts[s] ?? 0) + 1 }) })
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const expArr: number[] = []
  results.forEach(r => { const e = r.candidate.experience; if (e != null) expArr.push(e) })
  expArr.sort((a, b) => a - b)
  const avgExp = expArr.length > 0 ? (expArr.reduce((a, b) => a + b, 0) / expArr.length).toFixed(1) : null
  const p25 = expArr[Math.floor(expArr.length * 0.25)] ?? '—'
  const med  = expArr[Math.floor(expArr.length * 0.5)]  ?? '—'
  const p75  = expArr[Math.floor(expArr.length * 0.75)] ?? '—'
  const takeaway = topSkills.length > 0
    ? `Top skills: ${topSkills.map(([s, c]) => `${s} (${Math.round(c / results.length * 100)}%)`).join(', ')}. ${avgExp ? `Average experience: ${avgExp} years.` : ''} ${topLocations[0] ? `Most candidates in ${topLocations[0][0]}.` : ''}`
    : 'No aggregated data yet.'

  return (
    <div className="grid grid-cols-2 gap-4 p-5">
      {([
        {
          title: 'Top Locations', icon: <MapPin size={13} className="text-neutral-400" />,
          content: topLocations.length === 0
            ? <p className="text-xs text-neutral-400">No location data yet</p>
            : (
              <div className="space-y-2.5">
                {topLocations.map(([loc, count]) => (
                  <div key={loc} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-700 w-28 truncate">{loc}</span>
                    <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
                      <div className="bg-neutral-800 h-1.5 rounded-full" style={{ width: `${(count / maxLoc) * 100}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500 w-5 text-right">{count}</span>
                  </div>
                ))}
              </div>
            ),
        },
        {
          title: 'Key Takeaways',
          icon: <Zap size={13} className="text-neutral-400" />,
          extra: (
            <button onClick={() => { navigator.clipboard.writeText(takeaway); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="text-neutral-400 hover:text-neutral-600">
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          ),
          content: <p className="text-xs text-neutral-600 leading-relaxed">{takeaway}</p>,
        },
        {
          title: 'Years of Experience', icon: <Clock size={13} className="text-neutral-400" />,
          content: avgExp
            ? (
              <div>
                <div className="text-3xl font-bold text-neutral-900 mb-3">{avgExp} <span className="text-sm font-normal text-neutral-400">avg</span></div>
                <div className="grid grid-cols-3 gap-2">
                  {[['P25', p25], ['Median', med], ['P75', p75]].map(([l, v]) => (
                    <div key={l} className="text-center bg-neutral-50 rounded-lg py-2">
                      <div className="text-base font-semibold text-neutral-800">{v}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
            : <p className="text-xs text-neutral-400">No experience data yet</p>,
        },
        {
          title: 'Top Skills', icon: <BarChart3 size={13} className="text-neutral-400" />,
          content: topSkills.length === 0
            ? <p className="text-xs text-neutral-400">No skill data yet</p>
            : (
              <div className="space-y-2.5">
                {topSkills.map(([skill, count]) => (
                  <div key={skill} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-700 w-28 truncate capitalize">{skill}</span>
                    <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
                      <div className="bg-neutral-800 h-1.5 rounded-full" style={{ width: `${(count / results.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500 w-8 text-right">{Math.round(count / results.length * 100)}%</span>
                  </div>
                ))}
              </div>
            ),
        },
      ] as const).map(({ title, icon, content, extra }: any) => (
        <div key={title} className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide flex items-center gap-2">
              {icon} {title}
            </h3>
            {extra}
          </div>
          {content}
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SourcingPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? ''

  const [pageState, setPageState]         = useState<PageState>('idle')
  const [mode, setMode]                   = useState<SearchMode>('similar')
  const [roleType, setRoleType]           = useState<RoleType>('dev')
  const [query, setQuery]                 = useState('')
  const [parsed, setParsed]               = useState<ParsedQuery | null>(null)
  const [run, setRun]                     = useState<SourcingRun | null>(null)
  const [results, setResults]             = useState<SourcingCandidate[]>([])
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [tab, setTab]                     = useState<ResultTab>('results')
  const [viewMode, setViewMode]           = useState<ViewMode>('card')
  const [page, setPage]                   = useState(1)
  const [error, setError]                 = useState<string | null>(null)
  const [focused, setFocused]             = useState(false)
  const [allSelected, setAllSelected]     = useState(false)
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  // Always derived from live results — never a stale snapshot
  const activeCandidate = results.find(r => r.id === activeCandidateId) ?? null
  const [selectedJobId] = useState<string>('')
  const [shortlistState, setShortlistState]   = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({})
  const [shortlistModal, setShortlistModal]   = useState<{ ids: string[]; apiIds: string[]; names: string[] } | null>(null)
  const [sortBy, setSortBy]                   = useState<'ai_score' | 'name' | 'experience'>('ai_score')
  const [sortDir, setSortDir]                 = useState<'desc' | 'asc'>('desc')
  const [showSortModal, setShowSortModal]     = useState(false)
  const [history, setHistory]                 = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadMorePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // Load history from localStorage only on the client (avoids SSR hydration mismatch)
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const { jobs } = useJobs()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parseQueryLocally = (q: string): ParsedQuery => {
    const lower = q.toLowerCase()
    const detected: string[] = []

    const LOCATIONS = [
      'san francisco', 'sf', 'bay area', 'new york', 'nyc', 'new york city',
      'los angeles', 'la', 'seattle', 'austin', 'boston', 'chicago', 'denver',
      'london', 'berlin', 'paris', 'amsterdam', 'madrid', 'barcelona',
      'toronto', 'vancouver', 'sydney', 'melbourne', 'singapore', 'tokyo',
      'dubai', 'mumbai', 'bangalore', 'remote',
      'usa', 'us', 'uk', 'europe', 'australia', 'canada', 'germany', 'france',
      'india', 'asia', 'latam', 'apac', 'algeria', 'angola', 'benin', 'botswana', 'burkina faso', 'burundi',
      'cabo verde', 'cameroon', 'central african republic', 'chad', 'comoros',
      'congo', 'democratic republic of the congo', 'djibouti', 'egypt',
      'equatorial guinea', 'eritrea', 'eswatini', 'ethiopia', 'gabon', 'gambia',
      'ghana', 'guinea', 'guinea-bissau', 'ivory coast', 'kenya', 'lesotho',
      'liberia', 'libya', 'madagascar', 'malawi', 'mali', 'mauritania',
      'mauritius', 'morocco', 'mozambique', 'namibia', 'niger', 'nigeria',
      'rwanda', 'sao tome and principe', 'senegal', 'seychelles', 'sierra leone',
      'somalia', 'south africa', 'south sudan', 'sudan', 'tanzania', 'togo',
      'tunisia', 'uganda', 'zambia', 'zimbabwe','afghanistan', 'armenia', 'azerbaijan', 'bahrain', 'bangladesh', 'bhutan',
      'brunei', 'cambodia', 'china', 'cyprus', 'georgia', 'indonesia', 'iran',
      'iraq', 'israel', 'japan', 'jordan', 'kazakhstan', 'kuwait', 'kyrgyzstan',
      'laos', 'lebanon', 'malaysia', 'maldives', 'mongolia', 'myanmar', 'nepal',
      'north korea', 'oman', 'pakistan', 'palestine', 'philippines', 'qatar',
      'saudi arabia', 'south korea', 'sri lanka', 'syria', 'taiwan', 'tajikistan',
      'thailand', 'timor-leste', 'turkmenistan', 'united arab emirates', 'uae',
      'uzbekistan', 'vietnam', 'yemen','albania', 'andorra', 'austria', 'belarus', 'belgium', 'bosnia and herzegovina',
      'bulgaria', 'croatia', 'czech republic', 'denmark', 'estonia', 'finland',
      'greece', 'hungary', 'iceland', 'ireland', 'italy', 'kosovo', 'latvia',
      'liechtenstein', 'lithuania', 'luxembourg', 'malta', 'moldova', 'monaco',
      'montenegro', 'netherlands', 'north macedonia', 'norway', 'poland',
      'portugal', 'romania', 'russia', 'san marino', 'serbia', 'slovakia',
      'slovenia', 'spain', 'sweden', 'switzerland', 'ukraine','united kingdom', 'vatican city',
      'antigua and barbuda', 'bahamas', 'barbados', 'belize', 'costa rica', 'cuba',
      'dominica', 'dominican republic', 'el salvador', 'grenada', 'guatemala',
      'haiti', 'honduras', 'jamaica', 'mexico', 'nicaragua', 'panama',
      'saint kitts and nevis', 'saint lucia', 'saint vincent and the grenadines',
      'trinidad and tobago', 'united states', 'united states of america',
      'argentina', 'bolivia', 'brazil', 'chile', 'colombia', 'ecuador',
      'guyana', 'paraguay', 'peru', 'suriname', 'uruguay', 'venezuela',
      'fiji', 'kiribati', 'marshall islands', 'micronesia', 'nauru', 'new zealand',
      'palau', 'papua new guinea', 'samoa', 'solomon islands', 'tonga', 'tuvalu',
      'vanuatu',
    ]
    const foundLocation = LOCATIONS.find(loc => lower.includes(loc))
    const location = foundLocation ? foundLocation.charAt(0).toUpperCase() + foundLocation.slice(1) : undefined
    if (location) detected.push('location')

    let experience_min: number | undefined
    const expDigit = lower.match(/(\d+)\s*\+?\s*years?/)
    const expRange = lower.match(/(\d+)\s*[-–]\s*\d+\s*years?/)
    const EXP_WORDS: Record<string, number> = {
      junior: 1, entry: 0, mid: 3, 'mid-level': 3,
      senior: 5, staff: 7, principal: 9, lead: 6, experienced: 4,
    }
    if (expDigit) {
      experience_min = parseInt(expDigit[1]); detected.push('experience')
    } else if (expRange) {
      experience_min = parseInt(expRange[1]); detected.push('experience')
    } else {
      const wordMatch = Object.entries(EXP_WORDS).find(([w]) => lower.includes(w))
      if (wordMatch) { experience_min = wordMatch[1]; detected.push('experience') }
    }

    const TITLES = [
      'software engineer', 'frontend engineer', 'backend engineer',
      'full stack engineer', 'fullstack engineer', 'staff engineer',
      'platform engineer', 'data engineer', 'ml engineer', 'devops engineer',
      'product manager', 'engineering manager', 'designer', 'ux designer',
      'data scientist', 'data analyst', 'marketing manager', 'sales manager',
      'consultant', 'scientist', 'recruiter', 'researcher', 'developer',
    ]
    const foundTitle = TITLES.find(t => lower.includes(t))
    const job_title = foundTitle ? foundTitle.replace(/\b\w/g, c => c.toUpperCase()) : undefined
    if (job_title) detected.push('job_title')

    const INDUSTRIES: Record<string, string> = {
      fintech: 'Fintech', finance: 'Finance', banking: 'Banking',
      healthcare: 'Healthcare', health: 'Healthcare', saas: 'SaaS', startup: 'Startup',
      'series a': 'Series A', 'series b': 'Series B', 'series c': 'Series C',
      enterprise: 'Enterprise', consulting: 'Consulting',
      ecommerce: 'E-commerce', 'e-commerce': 'E-commerce',
      logistics: 'Logistics', crypto: 'Crypto', ai: 'AI',
    }

    const foundIndustry = Object.entries(INDUSTRIES).find(([k]) => lower.includes(k))
    const industry = foundIndustry?.[1]
    if (industry) detected.push('industry')

    const SKILLS = [
      'python', 'javascript', 'typescript', 'node.js', 'node', 'react',
      'vue', 'angular', 'go', 'golang', 'java', 'kotlin', 'swift',
      'rust', 'c++', 'c#', '.net', 'ruby', 'rails', 'php', 'scala',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'kafka',
      'aws', 'gcp', 'azure', 'kubernetes', 'docker', 'terraform',
      'graphql', 'rest', 'fastapi', 'django', 'flask', 'express',
      'pytorch', 'tensorflow', 'spark', 'airflow', 'dbt',
      'figma', 'sketch', 'excel', 'erp', 'salesforce', 'tableau',
    ]
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

  // Restore a search when navigated from sidebar history item
  useEffect(() => {
    const id = sessionStorage.getItem('sourcing_restore_id')
    if (!id) return
    sessionStorage.removeItem('sourcing_restore_id')
    const all = loadHistory()
    const entry = all.find(h => h.id === id)
    if (entry) restoreHistory(entry)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restoreHistory = (entry: HistoryEntry) => {
    setQuery(entry.query)
    setParsed(entry.parsed)
    setResults(entry.results)
    setRun(entry.run)
    setPage(1)
    setActiveCandidateId(null)
    setPageState('results')
    setActiveHistoryId(entry.id)
    setFocused(false)
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setError(null)
    setPageState('searching')
    setResults([])
    setPage(1)
    setFocused(false)
    setActiveCandidateId(null)
    setActiveHistoryId(null)

    const p = parsed ?? parseQueryLocally(query)
    setParsed(p)


    try {
      // Route platforms by role type:
      //   dev     → github + linkedin (GitHub fast ~10s, LinkedIn enriches in background)
      //   non_dev → linkedin only     (GitHub useless for non-engineers)
      const activePlatforms = roleType === 'non_dev' ? ['linkedin'] : ['github', 'linkedin']

      const newRun = await sourcingApi.createRun({
        ...(selectedJobId ? { job_id: selectedJobId } : {}),
        platforms: activePlatforms,
        criteria: {
          keywords:       query,
          location:       p.location       ?? undefined,
          title:          p.job_title      ?? undefined,
          skills:         p.skills.length  > 0 ? p.skills : undefined,
          experience_min: p.experience_min ?? undefined,
          industry:       p.industry       ?? undefined,
          limit:          20,
          role_type:      roleType
        },
      })
      setRun(newRun)

      // ── Single unified poll: fetch results + run status every 2 s.
      // Results trickle in from the first batch commit (~5 candidates) so we
      // show them immediately instead of waiting for the whole scrape to finish.
      let attempts = 0
      const MAX_ATTEMPTS = 90          // 90 × 2 s = 3 min hard cap
      const MAX_SCORE_WAITS = 60       // up to 2 extra min waiting for AI scores
      let runDone = false
      let scoreWaits = 0

      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        attempts++
        try {
          // Fetch results + run status in parallel every tick
          const [latest, partial] = await Promise.all([
            sourcingApi.getRun(newRun.id),
            sourcingApi.getResults(newRun.id),
          ])

          // Show whatever candidates exist so far immediately
          if (partial.length > 0) {
            setResults(partial)
            setPageState('results')   // switch out of searching as soon as 1 result arrives
          }
          setRun(latest)

          const isDone = latest.status === 'completed' || latest.status === 'failed'
          if (isDone) runDone = true

          if (latest.status === 'failed') {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setError('Sourcing run failed. Please try again.')
            if (partial.length === 0) setPageState('idle')
            return
          }

          const allScored = partial.length > 0 && partial.every(r => r.ai_score != null)
          const found = latest.candidates_found ?? partial.length
          const countDone = found > 0 && (latest.candidates_scored ?? 0) >= found

          // Stop when: run finished AND (all scored OR score timeout OR hard cap).
          // Always do at least one extra tick after countDone so the final batch
          // of scores (committed by the last screen_sourcing_result task) has time
          // to be returned by getResults before we freeze the list.
          const shouldStop = runDone && (allScored || scoreWaits >= MAX_SCORE_WAITS || attempts >= MAX_ATTEMPTS)
          const countStopPending = runDone && countDone && !allScored

          if (shouldStop || (countStopPending && scoreWaits >= 2)) {
            // Do one final fetch to capture any scores committed in the last tick
            try {
              const finalResults = await sourcingApi.getResults(newRun.id)
              if (finalResults.length > 0) setResults(finalResults)
              clearInterval(pollRef.current!)
              pollRef.current = null
              const entry: HistoryEntry = {
                id: newRun.id,
                query,
                parsed: p,
                results: finalResults.length > 0 ? finalResults : partial,
                run: latest,
                timestamp: new Date().toISOString(),
              }
              setHistory(prev => {
                const next = [entry, ...prev.filter(h => h.id !== entry.id)].slice(0, MAX_HISTORY)
                saveHistory(next)
                return next
              })
            } catch {
              clearInterval(pollRef.current!)
              pollRef.current = null
            }
            return
          }

          if (runDone) scoreWaits++

        } catch {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setPageState('results')
        }
      }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setPageState('idle')
    }
  }

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleCandidateClick = (result: SourcingCandidate) => {
    setActiveCandidateId(prev => prev === result.id ? null : result.id)
  }

  const sortedResults = [...results].sort((a, b) => {
    let av: number, bv: number
    if (sortBy === 'ai_score') {
      av = a.ai_score ?? -1
      bv = b.ai_score ?? -1
    } else if (sortBy === 'experience') {
      av = a.candidate.experience ?? -1
      bv = b.candidate.experience ?? -1
    } else {
      // name: alphabetical
      return sortDir === 'asc'
        ? (a.candidate.name ?? '').localeCompare(b.candidate.name ?? '')
        : (b.candidate.name ?? '').localeCompare(a.candidate.name ?? '')
    }
    return sortDir === 'asc' ? av - bv : bv - av
  })
  const paginated   = sortedResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages  = Math.ceil(sortedResults.length / PAGE_SIZE)
  const detectedKeys = parsed?.detected ?? []

  const toggleAll = () => {
    if (allSelected) { setSelected(new Set()); setAllSelected(false) }
    else { setSelected(new Set(paginated.map(r => r.id))); setAllSelected(true) }
  }

  const handleShortlist = (id: string) => {
    // id is the SourcingResult row UUID (used for UI state keys).
    // The backend expects the Candidate UUID (candidate_id FK), not the result row id.
    const result = results.find(r => r.id === id) ?? activeCandidate
    const name = result?.candidate.name ?? 'Candidate'
    const apiId = result?.candidate_id ?? result?.candidate?.id ?? id
    setShortlistModal({ ids: [id], apiIds: [apiId], names: [name] })
  }

  const handleShortlistConfirm = async (jobId: string) => {
    if (!shortlistModal) return
    // ids    = result row UUIDs → UI state keys (ShortlistButton tracks these)
    // apiIds = candidate UUIDs  → sent to the backend shortlist endpoint
    const { ids, apiIds } = shortlistModal
    // mark all as loading
    setShortlistState(prev => {
      const next = { ...prev }
      ids.forEach(id => { next[id] = 'loading' })
      return next
    })
    try {
      await sourcingApi.shortlist(apiIds, jobId)
      setShortlistState(prev => {
        const next = { ...prev }
        ids.forEach(id => { next[id] = 'done' })
        return next
      })
    } catch (e: unknown) {
      setShortlistState(prev => {
        const next = { ...prev }
        ids.forEach(id => { next[id] = 'error' })
        return next
      })
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
        criteria: {
          keywords:       query,
          location:       parsed.location       ?? undefined,
          title:          parsed.job_title      ?? undefined,
          skills:         parsed.skills.length  > 0 ? parsed.skills : undefined,
          experience_min: parsed.experience_min ?? undefined,
          industry:       parsed.industry       ?? undefined,
          limit:          20,
          role_type:      roleType,
        },
      })

      const existingIds = new Set(results.map(r => r.candidate_id ?? r.candidate?.id ?? r.id))
      let attempts = 0
      const MAX = 90

      if (loadMorePollRef.current) clearInterval(loadMorePollRef.current)
      loadMorePollRef.current = setInterval(async () => {
        attempts++
        try {
          const [latest, partial] = await Promise.all([
            sourcingApi.getRun(newRun.id),
            sourcingApi.getResults(newRun.id),
          ])
          const fresh = partial.filter(r => !existingIds.has(r.candidate_id ?? r.candidate?.id ?? r.id))
          if (fresh.length > 0) {
            setResults(prev => {
              const prevIds = new Set(prev.map(r => r.candidate_id ?? r.candidate?.id ?? r.id))
              return [...prev, ...fresh.filter(r => !prevIds.has(r.candidate_id ?? r.candidate?.id ?? r.id))]
            })
          }
          const done = latest.status === 'completed' || latest.status === 'failed'
          // Stop as soon as the backend run is done — don't hold the spinner
          // waiting for AI scores; they'll stream in via the "Scoring…" badge
          // just like the main search does.
          if (done || attempts >= MAX) {
            clearInterval(loadMorePollRef.current!)
            loadMorePollRef.current = null
            setLoadingMore(false)
          }
        } catch {
          clearInterval(loadMorePollRef.current!)
          loadMorePollRef.current = null
          setLoadingMore(false)
        }
      }, 2000)
    } catch {
      setLoadingMore(false)
    }
  }

  const handleCancelSearch = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setPageState('idle')
    setResults([])
    setRun(null)
    setError(null)
  }

  const handleClearHistory = () => {
    setHistory([])
    setActiveHistoryId(null)
    saveHistory([])
  }

  // ── IDLE / SEARCHING ────────────────────────────────────────────────────────
  if (pageState === 'idle' || (pageState as string) === 'searching') {
    return (
      <div className="min-h-[75vh] flex flex-col items-center" style={{ paddingTop: '12vh' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full flex flex-col items-center"
          style={{ maxWidth: 680 }}
        >
          <h1 className="text-[1.6rem] font-medium text-neutral-800 tracking-tight mb-6 text-center">
            Hey {firstName}, who are you looking for?
          </h1>

          {/* Role type toggle — dev vs non-dev */}
          <div className="flex items-center gap-2 mb-5 p-1 bg-neutral-100 rounded-xl w-fit self-center">
            {([
              { id: 'dev',     label: 'Tech / Dev',     desc: 'Engineers, Data Scientists, DevOps' },
              { id: 'non_dev', label: 'Business / Other', desc: 'Sales, Marketing, Finance, HR, Design' },
            ] as const).map(rt => (
              <button
                key={rt.id}
                onClick={() => setRoleType(rt.id)}
                className={cn(
                  'flex flex-col items-start px-4 py-2 rounded-lg text-left transition-all',
                  roleType === rt.id
                    ? 'bg-white shadow-sm text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-700'
                )}
              >
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
                  autoFocus
                  value={query}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 180)}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    mode === 'boolean'
                      ? '("Marketing Manager" OR "Head of Sales") AND "B2B" AND London'
                      : roleType === 'non_dev'
                      ? 'Senior Sales Manager in London with 5+ years B2B SaaS experience'
                      : 'Software Engineers with 5+ yrs of experience at fintech companies in the Bay Area'
                  }
                  className="w-full text-sm bg-transparent outline-none ring-0 focus:outline-none focus:ring-0 text-neutral-700 placeholder:text-neutral-400"
                />
              </div>

              <AnimatePresence>
                {focused && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 pb-3.5 gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {CRITERIA_DISPLAY.map(({ key, label }) => {
                          const detected = detectedKeys.includes(key) || (key === 'experience' && detectedKeys.includes('experience_min'))
                          return (
                            <motion.span
                              key={key}
                              animate={{ color: detected ? '#059669' : '#a3a3a3' }}
                              transition={{ duration: 0.25 }}
                              className="flex items-center gap-1 text-[11px] select-none"
                            >
                              <motion.span animate={{ scale: detected ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.2 }}>
                                {detected
                                  ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                                  : <Circle size={11} className="flex-shrink-0" />}
                              </motion.span>
                              {label}
                            </motion.span>
                          )
                        })}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={handleSearch}
                        disabled={!query.trim() || (pageState as string) === 'searching'}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                          query.trim() && pageState !== 'searching'
                            ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
                            : 'bg-violet-100 text-violet-300 cursor-not-allowed'
                        )}
                      >
                        {(pageState as string) === 'searching' ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {focused && !query.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-neutral-200 shadow-md overflow-hidden z-10"
                >
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onMouseDown={() => setQuery(s)}
                      className="w-full text-left px-5 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0">
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search history pills */}
          {history.length > 0 && (
            <div className="mt-4 w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Recent Searches</span>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
                >
                  Clear history
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {history.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => restoreHistory(entry)}
                    className={cn(
                      'flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-xl border transition-all group',
                      activeHistoryId === entry.id
                        ? 'border-violet-300 bg-violet-50/60'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                    )}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span className="flex-1 text-[12.5px] text-neutral-700 truncate">{entry.query}</span>
                    <span className="text-[11px] text-neutral-400 flex-shrink-0">
                      {entry.results.length} match{entry.results.length !== 1 ? 'es' : ''}
                    </span>
                    <span className="text-[11px] text-neutral-300 flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cancel search button — only shown while a search is in progress */}
          {(pageState as string) === 'searching' && (
            <button
              onClick={handleCancelSearch}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 bg-white text-[12px] font-medium text-neutral-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
            >
              <X size={12} />
              Cancel Search
            </button>
          )}

          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </motion.div>
      </div>
    )
  }

  // ── RESULTS ──────────────────────────────────────────────────────────────
  const SORT_LABELS: Record<string, string> = { ai_score: 'AI Score', name: 'Name', experience: 'Experience' }

  return (
    <div className="space-y-0 mt-2">
      {/* Sort / Filter Modal */}
      <AnimatePresence>
        {showSortModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setShowSortModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-xs mx-4 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h2 className="text-[13px] font-semibold text-neutral-900">Sort Results</h2>
                <button onClick={() => setShowSortModal(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {(['ai_score', 'name', 'experience'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); if (opt === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-[13px] transition-all',
                      sortBy === opt
                        ? 'border-violet-400 bg-violet-50 text-violet-900 font-medium'
                        : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                    )}
                  >
                    <span>{SORT_LABELS[opt]}</span>
                    {sortBy === opt && (
                      <span className="text-[11px] text-violet-500 font-semibold">
                        {sortDir === 'desc' ? '↓ High → Low' : '↑ Low → High'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => setShowSortModal(false)}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[13px] font-medium transition-colors"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search bar row */}
      <div className="flex items-center gap-2.5 pb-4">
        {/* Back button */}
        <button
          onClick={() => { setPageState('idle'); setRun(null); setResults([]); setActiveCandidateId(null) }}
          className="p-2 rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 shadow-sm transition-colors flex-shrink-0"
          title="Back to search"
        >
          <ArrowLeft size={15} />
        </button>

        <div className="flex-1 flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl px-4 py-2.5 shadow-sm min-w-0">
          <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <span className="text-[11px] font-semibold text-neutral-600">{firstName[0]}</span>
          </div>
          <span className="text-[13px] text-neutral-700 truncate flex-1">{query}</span>
          <button onClick={() => { setPageState('idle'); setRun(null); setResults([]); setActiveCandidateId(null) }}
            className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 transition-colors">
            <X size={14} />
          </button>
        </div>

        <button
          onClick={() => setShowSortModal(true)}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border rounded-xl text-[13px] text-neutral-700 hover:bg-neutral-50 shadow-sm flex-shrink-0 font-medium transition-colors',
            sortBy !== 'ai_score' ? 'border-violet-300 text-violet-700' : 'border-neutral-200'
          )}
        >
          <Filter size={13} className={sortBy !== 'ai_score' ? 'text-violet-500' : 'text-neutral-500'} />
          Sort
          <span className={cn(
            'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
            sortBy !== 'ai_score' ? 'bg-violet-100 text-violet-700' : 'bg-neutral-100 text-neutral-500'
          )}>
            {sortDir === 'desc' ? '↓' : '↑'}
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        {(['results', 'insights'] as ResultTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2.5 text-[13px] font-medium capitalize border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}>
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
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'p-1.5 transition-colors',
                  viewMode === 'card' ? 'bg-violet-50 text-violet-600' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
                )}
              >
                <LayoutList size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 border-l border-neutral-200 transition-colors',
                  viewMode === 'list' ? 'bg-violet-50 text-violet-600' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
                )}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {selected.size > 0 && (  
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                <BookMarked size={12} />
                Review ({selected.size})
              </button>
            )}

            {run && run.status !== 'completed' && run.status !== 'failed' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <Loader2 size={11} className="animate-spin" />
                {results.length > 0
                  ? `Found ${results.length} so far…`
                  : 'Searching…'}
              </span>
            )}
            {run?.status === 'completed' && results.every(r => r.ai_score != null) && (
              <span className="text-xs text-emerald-600 font-medium">✓ Done</span>
            )}
            {run?.status === 'completed' && !results.every(r => r.ai_score != null) && (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-500">
                <Loader2 size={11} className="animate-spin" />
                Scoring {results.filter(r => r.ai_score != null).length}/{results.length}…
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[12px] text-neutral-500 flex-shrink-0">
            <span>{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, results.length)} of {results.length}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="disabled:opacity-30 hover:text-neutral-800 transition-colors ml-0.5">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main content area: list + panel side by side */}
      <div className="flex gap-0 items-start">

        {/* ── Candidate list ── */}
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
                  <CandidateCardRow
                    key={r.id}
                    result={r}
                    selected={selected.has(r.id)}
                    onSelect={toggleSelect}
                    isActive={activeCandidate?.id === r.id}
                    onClick={() => handleCandidateClick(r)}
                    onShortlist={handleShortlist}
                    shortlistState={shortlistState}
                  />
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
                          <CandidateListRow
                            key={r.id}
                            result={r}
                            selected={selected.has(r.id)}
                            onSelect={toggleSelect}
                            isActive={activeCandidate?.id === r.id}
                            onClick={() => handleCandidateClick(r)}
                            onShortlist={handleShortlist}
                            shortlistState={shortlistState}
                          />
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
                ? <div className="flex items-center justify-center py-16">
                    <Loader2 size={22} className="animate-spin text-neutral-400" />
                    <span className="ml-3 text-sm text-neutral-500">Gathering insights…</span>
                  </div>
                : <InsightsPanel results={results} />}
            </div>
          )}

          {/* Bottom pagination */}
          {tab === 'results' && results.length > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-neutral-500 px-1">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {tab === 'results' && run?.status === 'completed' && (
            <div className="flex justify-center pt-3 pb-1">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <><Loader2 size={13} className="animate-spin" />Finding more candidates…</>
                ) : (
                  <><Users size={13} className="text-neutral-400" />Load More Candidates</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Candidate detail panel ── */}
        <AnimatePresence>
          {activeCandidate && (
            <CandidatePanel
              result={activeCandidate}
              onClose={() => setActiveCandidateId(null)}
              onShortlist={handleShortlist}
              shortlistState={shortlistState}
            />
          )}
        </AnimatePresence>

      </div>

      {/* ── Shortlist Modal ── */}
      <AnimatePresence>
        {shortlistModal && (
          <ShortlistModal
            candidateNames={shortlistModal.names}
            jobs={jobs}
            onConfirm={handleShortlistConfirm}
            onClose={() => setShortlistModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}