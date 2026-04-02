'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CheckCircle2, Circle, Loader2,
  ExternalLink, Eye, ChevronRight, ChevronLeft,
  X, MapPin, Clock, Zap, BarChart3, Users, Copy,
  Check, ThumbsUp, Filter, Diamond, LayoutList,
  LayoutGrid, BookMarked, GraduationCap, Briefcase,
  ChevronDown, Mail, Phone, Plus, Tag,
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
type PanelTab   = 'overview' | 'experience' | 'education' | 'skillmap'

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
const DEMO_CANDIDATES: SourcingCandidate[] = [
  {
    id: 'demo-1',
    ai_score: 94,
    ai_reasoning: 'Over 8 years building production Python and Node.js systems at high-growth startups. Strong open-source portfolio and recent Series B experience at a fintech company.',
    candidate: {
      name: 'Priya Nair',
      title: 'Senior Software Engineer',
      company: 'Brex',
      location: 'San Francisco, CA',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 8,
      skills: ['Python', 'Node.js', 'TypeScript', 'Kubernetes', 'PostgreSQL', 'GraphQL'],
      raw_profile: {
        education_raw: ['B.S. Computer Science, UC Berkeley'],
        experiences: [
          { title: 'Senior Software Engineer', company: 'Brex', date: 'Jan 2022 – Present · 2 yrs 3 mos' },
          { title: 'Software Engineer', company: 'Stripe', date: 'Mar 2019 – Dec 2021 · 2 yrs 9 mos' },
          { title: 'Junior Engineer', company: 'Y Combinator Portfolio Co.', date: 'Jun 2016 – Feb 2019 · 2 yrs 8 mos' },
        ],
        educations: [
          { degree: 'B.S. Computer Science', school: 'UC Berkeley', date: 'Sep 2012 – May 2016' },
        ],
        skill_sections: [
          { label: 'Back-End', skills: ['Python', 'Node.js', 'GraphQL', 'PostgreSQL'] },
          { label: 'Infrastructure', skills: ['Kubernetes', 'Docker', 'AWS'] },
          { label: 'Additional', skills: ['TypeScript', 'REST APIs', 'System Design'] },
        ],
        tags: ['Fintech'],
      },
    },
  },
  {
    id: 'demo-2',
    ai_score: 91,
    ai_reasoning: 'Led backend platform teams at two Series B fintech companies. Deep Python expertise with a focus on distributed systems and API design.',
    candidate: {
      name: 'Marcus Webb',
      title: 'Staff Engineer',
      company: 'Ramp',
      location: 'New York, NY',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 11,
      skills: ['Python', 'Go', 'Node.js', 'AWS', 'Kafka', 'Redis'],
      raw_profile: {
        education_raw: ['M.S. Computer Science, Carnegie Mellon'],
        experiences: [
          { title: 'Staff Engineer', company: 'Ramp', date: 'Apr 2021 – Present · 3 yrs' },
          { title: 'Senior Engineer', company: 'Plaid', date: 'Jan 2018 – Mar 2021 · 3 yrs 2 mos' },
          { title: 'Software Engineer', company: 'Goldman Sachs', date: 'Jul 2013 – Dec 2017 · 4 yrs 5 mos' },
        ],
        educations: [
          { degree: 'M.S. Computer Science', school: 'Carnegie Mellon University', date: 'Sep 2011 – May 2013' },
        ],
        skill_sections: [
          { label: 'Back-End', skills: ['Python', 'Go', 'Kafka', 'Redis'] },
          { label: 'Cloud', skills: ['AWS', 'Node.js', 'Terraform'] },
        ],
        tags: [],
      },
    },
  },
  {
    id: 'demo-3',
    ai_score: 88,
    ai_reasoning: 'Full-stack background with strong Node.js focus. Previously at Stripe and a Series B logistics startup. Active GitHub contributor.',
    candidate: {
      name: 'Sofia Lindqvist',
      title: 'Software Engineer',
      company: 'Stripe',
      location: 'San Francisco, CA',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 6,
      skills: ['Node.js', 'React', 'TypeScript', 'Python', 'Docker'],
      raw_profile: {
        education_raw: ['B.S. Software Engineering, Stanford University'],
        experiences: [
          { title: 'Software Engineer', company: 'Stripe', date: 'Aug 2021 – Present · 2 yrs 7 mos' },
          { title: 'Frontend Engineer', company: 'Flexport', date: 'Jun 2018 – Jul 2021 · 3 yrs 1 mo' },
        ],
        educations: [
          { degree: 'B.S. Software Engineering', school: 'Stanford University', date: 'Sep 2014 – Jun 2018' },
        ],
        skill_sections: [
          { label: 'Front-End', skills: ['React', 'TypeScript', 'Node.js'] },
          { label: 'Back-End', skills: ['Python', 'Docker', 'REST APIs'] },
        ],
        tags: [],
      },
    },
  },
  {
    id: 'demo-4',
    ai_score: 85,
    ai_reasoning: 'Python specialist with ML infrastructure experience at a Series B AI company. Solid Node.js skills from previous roles.',
    candidate: {
      name: 'Kwame Asante',
      title: 'Backend Engineer',
      company: 'Scale AI',
      location: 'San Francisco, CA',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 5,
      skills: ['Python', 'Node.js', 'PyTorch', 'FastAPI', 'MongoDB'],
      raw_profile: {
        education_raw: ['B.S. Computer Science, MIT'],
        experiences: [
          { title: 'Backend Engineer', company: 'Scale AI', date: 'Mar 2022 – Present · 2 yrs' },
          { title: 'ML Engineer', company: 'Weights & Biases', date: 'Jan 2019 – Feb 2022 · 3 yrs 1 mo' },
        ],
        educations: [
          { degree: 'B.S. Computer Science', school: 'Massachusetts Institute of Technology', date: 'Sep 2015 – May 2019' },
        ],
        skill_sections: [
          { label: 'Back-End', skills: ['Python', 'FastAPI', 'MongoDB', 'Node.js'] },
          { label: 'ML', skills: ['PyTorch', 'NumPy', 'Pandas'] },
        ],
        tags: ['AI'],
      },
    },
  },
  {
    id: 'demo-5',
    ai_score: 83,
    ai_reasoning: '7 years as a generalist engineer with Node.js as primary stack. Currently at a fintech Series B building real-time payment systems.',
    candidate: {
      name: 'Aiko Tanaka',
      title: 'Senior Software Engineer',
      company: 'Mercury',
      location: 'Remote (US)',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 7,
      skills: ['Node.js', 'TypeScript', 'Python', 'React', 'PostgreSQL'],
      raw_profile: {
        education_raw: ['B.Eng. Computer Engineering, University of Toronto'],
        experiences: [
          { title: 'Senior Software Engineer', company: 'Mercury', date: 'Oct 2020 – Present · 3 yrs 5 mos' },
          { title: 'Software Engineer', company: 'Shopify', date: 'Jul 2017 – Sep 2020 · 3 yrs 2 mos' },
        ],
        educations: [
          { degree: 'B.Eng. Computer Engineering', school: 'University of Toronto', date: 'Sep 2013 – Apr 2017' },
        ],
        skill_sections: [
          { label: 'Back-End', skills: ['Node.js', 'TypeScript', 'Python', 'PostgreSQL'] },
          { label: 'Front-End', skills: ['React', 'HTML', 'CSS'] },
        ],
        tags: ['Fintech'],
      },
    },
  },
  {
    id: 'demo-6',
    ai_score: 80,
    ai_reasoning: 'Strong Python background with experience in data pipelines. Contributed to Node.js microservices at a Series B SaaS startup.',
    candidate: {
      name: 'Diego Reyes',
      title: 'Software Engineer',
      company: 'Rippling',
      location: 'San Francisco, CA',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 4,
      skills: ['Python', 'Node.js', 'Celery', 'Django', 'React'],
      raw_profile: {
        education_raw: ['B.S. Computer Science, UCLA'],
        experiences: [
          { title: 'Software Engineer', company: 'Rippling', date: 'Jun 2022 – Present · 1 yr 9 mos' },
          { title: 'Backend Engineer', company: 'Gusto', date: 'Aug 2020 – May 2022 · 1 yr 9 mos' },
        ],
        educations: [
          { degree: 'B.S. Computer Science', school: 'UCLA', date: 'Sep 2016 – Jun 2020' },
        ],
        skill_sections: [
          { label: 'Back-End', skills: ['Python', 'Django', 'Celery', 'Node.js'] },
          { label: 'Front-End', skills: ['React', 'JavaScript'] },
        ],
        tags: [],
      },
    },
  },
  {
    id: 'demo-7',
    ai_score: 78,
    ai_reasoning: 'Experienced infrastructure engineer with Python automation expertise. Has worked at two Bay Area Series B companies in the last 4 years.',
    candidate: {
      name: 'Hannah Park',
      title: 'Platform Engineer',
      company: 'Figma',
      location: 'San Francisco, CA',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 6,
      skills: ['Python', 'Terraform', 'Node.js', 'AWS', 'Kubernetes'],
      raw_profile: {
        education_raw: ['B.S. Electrical Engineering, University of Washington'],
        experiences: [
          { title: 'Platform Engineer', company: 'Figma', date: 'Jan 2022 – Present · 2 yrs 2 mos' },
          { title: 'DevOps Engineer', company: 'Databricks', date: 'Mar 2018 – Dec 2021 · 3 yrs 9 mos' },
        ],
        educations: [
          { degree: 'B.S. Electrical Engineering', school: 'University of Washington', date: 'Sep 2014 – Jun 2018' },
        ],
        skill_sections: [
          { label: 'Infrastructure', skills: ['Terraform', 'Kubernetes', 'AWS', 'Docker'] },
          { label: 'Languages', skills: ['Python', 'Node.js', 'Bash'] },
        ],
        tags: [],
      },
    },
  },
  {
    id: 'demo-8',
    ai_score: 75,
    ai_reasoning: 'Node.js expert who has shipped multiple production APIs. Currently at a Series B healthcare startup, previously at a growth-stage fintech.',
    candidate: {
      name: 'Ethan Brooks',
      title: 'Software Engineer',
      company: 'Collected Health',
      location: 'Austin, TX',
      linkedin_url: 'https://linkedin.com',
      github_url: 'https://github.com',
      experience: 5,
      skills: ['Node.js', 'Express', 'Python', 'MySQL', 'TypeScript'],
      raw_profile: {
        education_raw: ['B.S. Computer Science, UT Austin'],
        experiences: [
          { title: 'Software Engineer', company: 'Collected Health', date: 'May 2022 – Present · 1 yr 10 mos' },
          { title: 'Software Engineer', company: 'Nomad Health', date: 'Jul 2019 – Apr 2022 · 2 yrs 9 mos' },
        ],
        educations: [
          { degree: 'B.S. Computer Science', school: 'University of Texas at Austin', date: 'Sep 2015 – May 2019' },
        ],
        skill_sections: [
          { label: 'Back-End', skills: ['Node.js', 'Express', 'Python', 'MySQL'] },
          { label: 'Additional', skills: ['TypeScript', 'REST APIs', 'Git'] },
        ],
        tags: ['Healthcare'],
      },
    },
  },
]

const DEMO_RUN: SourcingRun = {
  id: 'demo-run-1',
  status: 'completed',
  created_at: new Date().toISOString(),
  criteria: {},
}

const DEMO_PARSED: ParsedQuery = {
  location: 'San Francisco',
  job_title: 'Software Engineer',
  experience_min: 5,
  industry: 'Fintech',
  skills: ['Python', 'Node.js'],
  detected: ['location', 'job_title', 'experience', 'skills', 'industry'],
}

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

/** Prefer raw_profile.experiences (structured); fall back to experience_raw (string[]) from scraper */
function parseExperiences(result: SourcingCandidate): { title: string; company: string; date?: string }[] {
  const rp = result.candidate.raw_profile
  if (rp?.experiences && rp.experiences.length > 0) return rp.experiences
  if (rp?.experience_raw && (rp.experience_raw as string[]).length > 0) {
    return (rp.experience_raw as string[]).map((line: string) => {
      const atMatch = line.match(/^(.+?)\s*[@at]\s*(.+?)(?:\s*[·•]\s*(.+))?$/)
      if (atMatch) return { title: atMatch[1].trim(), company: atMatch[2].trim(), date: atMatch[3]?.trim() }
      return { title: line, company: '' }
    })
  }
  if (result.candidate.title || result.candidate.company) {
    return [{
      title: result.candidate.title ?? 'Unknown Role',
      company: result.candidate.company ?? '',
      date: result.candidate.experience != null ? `${result.candidate.experience} yrs exp` : undefined,
    }]
  }
  return []
}

/** Prefer raw_profile.educations (structured); fall back to education_raw (string[]) from scraper */
function parseEducations(result: SourcingCandidate): { degree: string; school: string; date?: string }[] {
  const rp = result.candidate.raw_profile
  if (rp?.educations && rp.educations.length > 0) return rp.educations
  if (rp?.education_raw && (rp.education_raw as string[]).length > 0) {
    return (rp.education_raw as string[]).map((line: string) => {
      const commaIdx = line.lastIndexOf(',')
      if (commaIdx !== -1) return { degree: line.slice(0, commaIdx).trim(), school: line.slice(commaIdx + 1).trim() }
      return { degree: line, school: '' }
    })
  }
  return []
}

/** Prefer raw_profile.skill_sections (structured); fall back to top-level candidate.skills (flat[]) */
function parseSkillSections(result: SourcingCandidate): { label: string; skills: string[] }[] {
  const rp = result.candidate.raw_profile
  if (rp?.skill_sections && rp.skill_sections.length > 0) return rp.skill_sections
  const flat = result.candidate.skills ?? []
  if (flat.length > 0) return [{ label: 'Skills', skills: flat }]
  return []
}

// ─── Company Logo Avatar ──────────────────────────────────────────────────────
function CompanyLogo({ company, logoUrl, size = 36 }: { company: string; logoUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const letter = (company ?? '?').charAt(0).toUpperCase()
  if (logoUrl && !failed) {
    return (
      <img src={logoUrl} alt={company} onError={() => setFailed(true)}
        className="rounded-lg object-contain bg-white border border-neutral-100 flex-shrink-0"
        style={{ width: size, height: size }} />
    )
  }
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center font-semibold text-neutral-500 flex-shrink-0 text-[11px]"
      style={{ width: size, height: size }}>
      {letter}
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
  const experiences   = parseExperiences(result)
  const educations    = parseEducations(result)
  const skillSections = parseSkillSections(result)
  const tags = c.raw_profile?.tags ?? []
  const companyLogo = typeof c.raw_profile?.company_logo === 'string' ? c.raw_profile.company_logo : undefined
  const color = avatarColor(c.name)

  // Tenure helpers
  function parseTenureMonths(dateStr?: string): number {
    if (!dateStr) return 0
    const y = dateStr.match(/(\d+)\s*yr/); const mo = dateStr.match(/(\d+)\s*mo/)
    return (y ? parseInt(y[1]) * 12 : 0) + (mo ? parseInt(mo[1]) : 0)
  }
  function fmtMonths(m: number) {
    if (!m) return '—'
    const y = Math.floor(m / 12), mo = m % 12
    return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', mo ? `${mo} mo` : ''].filter(Boolean).join(' ')
  }
  const tenures = experiences.map(e => parseTenureMonths(e.date?.split('·')[1]))
  const nonZeroTenures = tenures.filter(t => t > 0)
  const avgTenure = fmtMonths(nonZeroTenures.length ? Math.round(nonZeroTenures.reduce((a,b)=>a+b,0)/nonZeroTenures.length) : 0)
  const currentTenure = fmtMonths(tenures[0] ?? 0)
  // total: prefer candidate.experience, then raw_profile.experience_years, then sum of durations
  const rawExpYears = typeof c.raw_profile?.experience_years === 'number' ? c.raw_profile.experience_years : null
  const totalExpNum = c.experience ?? rawExpYears ?? (nonZeroTenures.length ? Math.round(nonZeroTenures.reduce((a,b)=>a+b,0)/12) : null)
  const totalExp = totalExpNum != null ? `${totalExpNum} yrs` : '—'

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-[360px] flex-shrink-0 border-l border-neutral-200 bg-white flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            {photo
              ? <img src={photo} alt={c.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-neutral-100" />
              : <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0', color.bg, color.text)}>
                  {c.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                </div>
            }
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-semibold text-neutral-900 leading-tight">{c.name}</span>
                {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"><LinkedInIcon size={14} /></a>}
              </div>
              {(c.title || c.company) && (
                <p className="text-[11.5px] text-neutral-500 leading-tight truncate">
                  {c.title}{c.title && c.company ? ' · ' : ''}{c.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {c.linkedin_url && (
              <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-violet-600 font-medium hover:text-violet-700 transition-colors whitespace-nowrap">
                Full Profile
              </a>
            )}
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors p-0.5"><X size={13} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {c.location && <span className="flex items-center gap-1 text-[11px] text-neutral-400"><MapPin size={10}/>{c.location}</span>}
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
              <Tag size={8}/>{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center gap-2">
        <div className="flex items-center gap-2 text-[11.5px] text-neutral-400 flex-1">
          <Mail size={11} className="flex-shrink-0"/>
          <span>No email</span>
          <span className="text-neutral-200">·</span>
          <button className="text-violet-600 font-medium hover:text-violet-700 transition-colors">+ Add</button>
        </div>
        <ShortlistButton id={result.id} state={shortlistState[result.id] ?? 'idle'} onShortlist={onShortlist} compact />
      </div>

      {/* Single scroll body */}
      <div className="flex-1 overflow-y-auto">

        {/* Tenure stats */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Experience</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'AVG TENURE',  value: avgTenure },
              { label: 'CURRENT',     value: currentTenure },
              { label: 'TOTAL EXP',   value: totalExp },
            ].map(s => (
              <div key={s.label} className="bg-neutral-50 rounded-xl border border-neutral-100 p-2.5">
                <p className="text-[8.5px] text-neutral-400 uppercase tracking-wide leading-tight mb-1">{s.label}</p>
                <p className="text-[12px] font-semibold text-neutral-800">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Experience list — LinkedIn style with logo + connecting line */}
        {experiences.length > 0 && (
          <div className="px-4 pb-2">
            {experiences.map((exp, i) => {
              const expSkills: string[] = (exp as any).skills ?? []
              return (
                <div key={i} className="flex gap-3 pb-4">
                  <div className="flex flex-col items-center">
                    <CompanyLogo company={exp.company} logoUrl={i === 0 ? companyLogo : undefined} size={34} />
                    {i < experiences.length - 1 && <div className="w-px flex-1 mt-1.5 bg-neutral-200" style={{minHeight:16}} />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[12.5px] font-semibold text-neutral-900 leading-snug">{exp.title}</p>
                    <p className="text-[12px] text-neutral-600 leading-snug">{exp.company}</p>
                    {exp.date && <p className="text-[11px] text-neutral-400 mt-0.5">{exp.date}</p>}
                    {expSkills.length > 0 && (
                      <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
                        <span className="font-medium">Skills:</span> {expSkills.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mx-4 border-t border-neutral-100 my-1" />

        {/* Education */}
        <div className="px-4 pt-3 pb-4">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Education</p>
          {educations.length > 0 ? (
            <div className="space-y-4">
              {educations.map((edu, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-[34px] h-[34px] rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={15} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[12.5px] font-semibold text-neutral-900 leading-snug">{edu.school}</p>
                    <p className="text-[12px] text-neutral-600 leading-snug">{edu.degree}</p>
                    {edu.date && <p className="text-[11px] text-neutral-400 mt-0.5">{edu.date}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-neutral-400">No education data.</p>
          )}
        </div>

        <div className="mx-4 border-t border-neutral-100 my-1" />

        {/* Skill Map */}
        {skillSections.length > 0 && (
          <div className="px-4 pt-3 pb-6">
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Skill Map</p>
            <div className="space-y-3">
              {skillSections.map((section, i) => (
                <div key={i} className="border border-neutral-200 rounded-xl p-3">
                  <p className="text-[10.5px] font-semibold text-neutral-500 mb-2">{section.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {section.skills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-100 bg-violet-50 text-[11px] text-violet-700 font-medium">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="opacity-60"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
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

      {/* Footer */}
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
  const education = Array.isArray(c.raw_profile?.education_raw) ? c.raw_profile.education_raw[0] : null

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
          {c.experience != null && (
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium whitespace-nowrap flex-shrink-0 w-[100px]">
                <ThumbsUp size={10} strokeWidth={2.5} />
                Experience
              </span>
              <p className="text-[12px] text-neutral-600 leading-relaxed mt-0.5">
                {result.ai_reasoning ?? `Candidate has ${c.experience}+ years of relevant experience.`}
              </p>
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
  const rawExpYears = typeof c.raw_profile?.experience_years === 'number' ? c.raw_profile.experience_years : null
  const expNum   = c.experience ?? rawExpYears

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

      {/* match score */}
      <td className="px-2 py-2.5">
        <span className="text-[11.5px] font-semibold text-neutral-700">
          {result.ai_score != null ? `${result.ai_score}%` : '—'}
        </span>
      </td>

      {/* experience */}
      <td className="px-2 py-2.5 pr-3">
        <span className="text-[11px] text-neutral-600">
          {expNum != null ? `${expNum} yr${expNum !== 1 ? 's' : ''}` : '—'}
        </span>
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
  const [activeCandidate, setActiveCandidate] = useState<SourcingCandidate | null>(null)
  const [selectedJobId, setSelectedJobId]     = useState<string>('')
  const [shortlistState, setShortlistState]   = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({})
  const [shortlistModal, setShortlistModal]   = useState<{ ids: string[]; apiIds: string[]; names: string[] } | null>(null)
  const [platforms, setPlatforms]             = useState<string[]>(['linkedin', 'github'])
  const [history, setHistory]                 = useState<HistoryEntry[]>(() => {
    if (typeof window === 'undefined') return []
    return loadHistory()
  })
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    setActiveCandidate(null)
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
    setActiveCandidate(null)
    setActiveHistoryId(null)

    const p = parsed ?? parseQueryLocally(query)
    setParsed(p)

    const jobId = selectedJobId || jobs?.[0]?.id || ''

    try {
      const newRun = await sourcingApi.createRun({
        job_id: jobId,
        platforms: platforms.filter(p => p !== 'linkedin'),
        criteria: {
          keywords:       query,
          location:       p.location       ?? undefined,
          title:          p.job_title      ?? undefined,
          skills:         p.skills.length  > 0 ? p.skills : undefined,
          experience_min: p.experience_min ?? undefined,
          industry:       p.industry       ?? undefined,
          limit:          50,
        },
      })
      setRun(newRun)

      // Poll until completed or failed (max 3 min)
      let attempts = 0
      const MAX = 36
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        attempts++
        try {
          const latest = await sourcingApi.getRun(newRun.id)
          setRun(latest)
          if (latest.status === 'completed' || latest.status === 'failed' || attempts >= MAX) {
            clearInterval(pollRef.current!)
            pollRef.current = null
            if (latest.status === 'completed') {
              const res = await sourcingApi.getResults(newRun.id)
              setResults(res)
              // persist to search history
              const entry: HistoryEntry = {
                id: newRun.id,
                query,
                parsed: p,
                results: res,
                run: latest,
                timestamp: new Date().toISOString(),
              }
              setHistory(prev => {
                const next = [entry, ...prev.filter(h => h.id !== entry.id)].slice(0, MAX_HISTORY)
                saveHistory(next)
                return next
              })
            } else if (latest.status === 'failed') {
              setError('Sourcing run failed. Please try again.')
            }
            setPageState('results')
          }
        } catch {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setPageState('results')
        }
      }, 5000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setPageState('idle')
    }
  }

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleCandidateClick = (result: SourcingCandidate) => {
    setActiveCandidate(prev => prev?.id === result.id ? null : result)
  }

  const paginated   = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages  = Math.ceil(results.length / PAGE_SIZE)
  const detectedKeys = parsed?.detected ?? []
  const criteriaCount = detectedKeys.length

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

          {/* Mode pills */}
          <div className="flex gap-2 mb-6 flex-wrap justify-center">
            {([
              {
                id: 'similar', label: 'Find Similar',
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
              },
              {
                id: 'description', label: 'Job Description',
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
              },
              {
                id: 'boolean', label: 'Boolean',
                icon: <span className="text-[12px] font-semibold text-emerald-500 leading-none">Σ</span>,
              },
              {
                id: 'manual', label: 'Select Manually',
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
              },
            ] as const).map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as SearchMode)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-xs transition-all',
                  mode === m.id
                    ? 'border-neutral-300 bg-white text-neutral-800 shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:text-neutral-700 hover:border-neutral-300'
                )}
              >
                {m.icon}{m.label}
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
                    mode === 'similar'
                      ? 'Software Engineers with 5+ yrs of experience at fintech companies in the Bay Area'
                      : mode === 'boolean'
                      ? '("Software Engineer" OR "SWE") AND Python AND "Bay Area"'
                      : 'Paste a job description or describe the role…'
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
              <div className="flex items-center gap-2 mb-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Recent Searches</span>
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

          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </motion.div>
      </div>
    )
  }

  // ── RESULTS ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 mt-2">
      {/* Search bar row */}
      <div className="flex items-center gap-2.5 pb-4">
        <div className="flex-1 flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl px-4 py-2.5 shadow-sm min-w-0">
          <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <span className="text-[11px] font-semibold text-neutral-600">{firstName[0]}</span>
          </div>
          <span className="text-[13px] text-neutral-700 truncate flex-1">{query}</span>
          <button onClick={() => { setPageState('idle'); setRun(null); setResults([]); setActiveCandidate(null) }}
            className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 transition-colors">
            <X size={14} />
          </button>
        </div>

        <button className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 hover:bg-neutral-50 shadow-sm flex-shrink-0 font-medium transition-colors">
          <Filter size={13} className="text-neutral-500" />
          Filters
          <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">4</span>
        </button>

        <button className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 hover:bg-neutral-50 shadow-sm flex-shrink-0 font-medium transition-colors">
          <Diamond size={13} className="text-neutral-500" />
          Criteria
          {criteriaCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">
              {criteriaCount}
            </span>
          )}
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

            {(pageState as string) === 'searching' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <Loader2 size={11} className="animate-spin" />
                Searching…
              </span>
            )}
            {pageState === 'results' && run?.status === 'completed' && (
              <span className="text-xs text-emerald-600 font-medium">✓ Done</span>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[8%]">Match</th>
                        <th className="px-2 py-2 pr-3 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide w-[8%]">Exp</th>
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
        </div>

        {/* ── Candidate detail panel ── */}
        <AnimatePresence>
          {activeCandidate && (
            <CandidatePanel
              result={activeCandidate}
              onClose={() => setActiveCandidate(null)}
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