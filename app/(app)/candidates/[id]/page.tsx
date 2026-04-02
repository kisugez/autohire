'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, MapPin, Briefcase, Mail, Github, Linkedin,
  MessageSquare, Calendar, FileText, Brain, Phone,
  CheckCircle2, Loader2, AlertCircle, ExternalLink, Save, Clock,
  Zap, Star, RefreshCw, Send, ArrowDown, ArrowUp, ScanSearch,
  Heart, MoreHorizontal, User, BookOpen, ChevronRight,
  Activity, Award, Users, Building2, GraduationCap, Link2,
} from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import ScheduleInterviewModal from '@/components/candidates/schedule-interview-modal'
import ComposeEmailModal from '@/components/candidates/compose-email-modal'
import { getInitials, getMatchScoreBg, formatDate, formatRelativeTime, cn, getAvatarUrl } from '@/lib/utils'
import { get, patch, post } from '@/lib/api'
import type { ApiCandidate } from '@/types/candidate'
import type { ApiApplication } from '@/types/job'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/* ─── types ───────────────────────────────────────────────── */
interface EmailMessage {
  id: string
  direction: 'inbound' | 'outbound'
  from_email: string
  to_email: string
  subject: string
  body_text: string | null
  sent_at: string
  is_read: boolean
}

interface GoogleStatus {
  gmail_connected: boolean
  gmail_email?: string
  gcal_connected: boolean
}

interface ActivityEntry {
  id: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  actor?: string
  actorAvatar?: string
  text: React.ReactNode
  time: string
  date: string           // YYYY-MM-DD for grouping
  dateLabel: string      // "TODAY" | "11 APRIL, 2025" etc.
  detail?: React.ReactNode
}

type Tab = 'Rating' | 'Activity' | 'Recruitment'

/* ─── helpers ─────────────────────────────────────────────── */
function groupBy<T>(arr: T[], key: (x: T) => string): Record<string, T[]> {
  return arr.reduce((acc, x) => {
    const k = key(x);
    (acc[k] = acc[k] ?? []).push(x)
    return acc
  }, {} as Record<string, T[]>)
}

function toDateLabel(iso: string): { key: string; label: string } {
  const d    = new Date(iso)
  const today = new Date()
  const key   = d.toISOString().slice(0, 10)
  if (key === today.toISOString().slice(0, 10)) return { key, label: 'TODAY' }
  return {
    key,
    label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase(),
  }
}

/* Score ring */
function ScoreRing({ score }: { score: number }) {
  const r = 54, circ = 2 * Math.PI * r
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#6366f1' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <motion.circle
        cx="65" cy="65" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (score / 100) * circ }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform="rotate(-90 65 65)"
      />
      <text x="65" y="60" textAnchor="middle" fontSize="26" fontWeight="700" fill={color}>{score}%</text>
      <text x="65" y="78" textAnchor="middle" fontSize="11" fill="#9ca3af">AI Score</text>
    </svg>
  )
}

/* ─── main component ──────────────────────────────────────── */
export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const [candidate, setCandidate] = useState<ApiCandidate | null>(null)
  const [applications, setApps]   = useState<ApiApplication[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [notes, setNotes]             = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved]   = useState(false)

  const [rescanning, setRescanning]   = useState(false)
  const [rescanMsg, setRescanMsg]     = useState<string | null>(null)

  const [messages, setMessages]       = useState<EmailMessage[]>([])
  const [convLoading, setConvLoading] = useState(false)
  const [syncing, setSyncing]         = useState(false)

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ gmail_connected: false, gcal_connected: false })
  const [composeOpen, setComposeOpen]   = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const [activeTab, setActiveTab]   = useState<Tab>('Activity')
  const [liked, setLiked]           = useState(false)
  const [activityNote, setActivityNote] = useState('')
  const [postingNote, setPostingNote]   = useState(false)

  /* ─── fetch ─── */
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [candidateData, jobsData, gStatus] = await Promise.all([
        get<ApiCandidate>(`/api/v1/candidates/${params.id}`),
        get<{ items: import('@/types/job').ApiJob[] }>('/api/v1/jobs?page=1&page_size=100'),
        get<GoogleStatus>('/api/v1/google/status').catch(() => ({ gmail_connected: false, gcal_connected: false } as GoogleStatus)),
      ])
      setCandidate(candidateData)
      setNotes(candidateData.notes ?? '')
      setGoogleStatus(gStatus)
      const appResults = await Promise.all(
        jobsData.items.map(j =>
          get<ApiApplication[]>(`/api/v1/applications/job/${j.id}`)
            .then(apps => apps.map(a => ({ ...a, job_title: a.job_title ?? j.title })))
            .catch(() => [] as ApiApplication[])
        )
      )
      setApps(appResults.flat().filter(a => a.candidate_id === params.id))
    } catch { setError('Failed to load candidate.') }
    finally { setLoading(false) }
  }, [params.id])

  const fetchConversation = useCallback(async () => {
    setConvLoading(true)
    try {
      const conv = await get<{ messages: EmailMessage[] }>(`/api/v1/conversations/${params.id}`)
      setMessages(conv.messages ?? [])
    } catch { setMessages([]) }
    finally { setConvLoading(false) }
  }, [params.id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchConversation() }, [fetchConversation])

  const syncConversation = async () => {
    setSyncing(true)
    try { await post(`/api/v1/conversations/${params.id}/sync`, {}); await fetchConversation() }
    finally { setSyncing(false) }
  }

  const rescanAll = async () => {
    if (!applications.length) return
    setRescanning(true); setRescanMsg(null)
    try {
      await Promise.all(applications.map(app => post(`/api/v1/applications/${app.id}/screen`, {}).catch(() => null)))
      await fetchData()
      setRescanMsg('AI re-scan complete!')
    } catch { setRescanMsg('Re-scan failed — try again.') }
    finally { setRescanning(false); setTimeout(() => setRescanMsg(null), 4000) }
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    try {
      const updated = await patch<ApiCandidate>(`/api/v1/candidates/${params.id}`, { notes })
      setCandidate(updated); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000)
    } catch {
      localStorage.setItem(`candidate_notes_${params.id}`, notes)
      setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000)
    } finally { setNotesSaving(false) }
  }

  const postNote = async () => {
    if (!activityNote.trim()) return
    setPostingNote(true)
    try {
      await patch<ApiCandidate>(`/api/v1/candidates/${params.id}`, { notes: `${notes}\n\n[Note] ${activityNote}`.trim() })
      setNotes(prev => `${prev}\n\n[Note] ${activityNote}`.trim())
      setActivityNote('')
    } catch {}
    finally { setPostingNote(false) }
  }

  /* ─── derived ─── */
  const bestApp = applications.length
    ? [...applications].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))[0]
    : null

  /* build activity timeline from apps + messages */
  const buildActivity = (): ActivityEntry[] => {
    if (!candidate) return []
    const items: ActivityEntry[] = []

    // profile created
    const created = toDateLabel(candidate.created_at)
    items.push({
      id: 'created',
      icon: CheckCircle2, iconColor: 'text-green-600', iconBg: 'bg-green-50',
      text: <span>Profile created · sourced via <strong>{candidate.source}</strong></span>,
      time: formatRelativeTime(candidate.created_at),
      date: created.key, dateLabel: created.label,
    })

    // applications
    applications.forEach(app => {
      const dl = toDateLabel(app.created_at)
      items.push({
        id: `app-${app.id}`,
        icon: User, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50',
        actor: candidate.name, actorAvatar: getInitials(candidate.name),
        text: <span>applied for <strong>{app.job_title ?? 'a role'}</strong></span>,
        time: new Date(app.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        date: dl.key, dateLabel: dl.label,
      })

      // stage moves
      if (app.current_stage !== 'sourced' && app.current_stage !== 'applied') {
        const dl2 = toDateLabel(app.updated_at)
        items.push({
          id: `stage-${app.id}`,
          icon: ChevronRight, iconColor: 'text-violet-600', iconBg: 'bg-violet-50',
          text: (
            <span className="flex items-center gap-1.5 flex-wrap">
              Moved from
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[11px] font-medium">Application</span>
              to
              <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 text-[11px] font-medium capitalize">{app.current_stage}</span>
              for <strong>{app.job_title}</strong>
            </span>
          ),
          time: new Date(app.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          date: dl2.key, dateLabel: dl2.label,
        })
      }

      // AI score
      if (app.ai_score !== null && app.ai_score !== undefined) {
        const dl3 = toDateLabel(app.updated_at)
        items.push({
          id: `ai-${app.id}`,
          icon: Brain, iconColor: 'text-purple-600', iconBg: 'bg-purple-50',
          text: <span>AI scored <strong>{app.ai_score}%</strong> for <strong>{app.job_title}</strong></span>,
          time: new Date(app.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          date: dl3.key, dateLabel: dl3.label,
          detail: app.ai_reasoning
            ? <p className="mt-2 text-xs text-neutral-500 leading-relaxed bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2">{app.ai_reasoning}</p>
            : undefined,
        })
      }
    })

    // messages as activity
    messages.forEach(msg => {
      const dl = toDateLabel(msg.sent_at)
      items.push({
        id: `msg-${msg.id}`,
        icon: msg.direction === 'outbound' ? Send : Mail,
        iconColor: msg.direction === 'outbound' ? 'text-neutral-600' : 'text-blue-600',
        iconBg: msg.direction === 'outbound' ? 'bg-neutral-100' : 'bg-blue-50',
        text: (
          <span>
            {msg.direction === 'outbound' ? 'Email sent' : 'Email received'} ·{' '}
            <strong>{msg.subject}</strong>
          </span>
        ),
        time: new Date(msg.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        date: dl.key, dateLabel: dl.label,
      })
    })

    // sort newest first
    return items.sort((a, b) => b.date.localeCompare(a.date))
  }

  const activityItems = buildActivity()
  const grouped = groupBy(activityItems, x => x.date)
  const groupKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-neutral-400 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>
  )
  if (error || !candidate) return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl max-w-lg">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {error ?? 'Candidate not found.'}
      <Link href="/candidates" className="ml-auto text-red-600 underline text-xs">Back</Link>
    </div>
  )

  const TABS: Tab[] = ['Rating', 'Activity', 'Recruitment']

  const TAB_ICONS: Record<Tab, React.ElementType> = {
    Rating:      Award,
    Activity:    Activity,
    Recruitment: Users,
  }

  return (
    <div className="flex flex-col -mx-7 -mb-12 bg-white min-h-[calc(100vh-67px)]">

      {/* ── top header bar ── */}
      <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-neutral-100 bg-white">
        {/* left: back + avatar + name */}
        <div className="flex items-center gap-3">
          <Link href="/candidates"
            className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* avatar */}
          {(() => {
            const avatarSrc = getAvatarUrl(candidate.avatar_url, candidate.github_url)
            return avatarSrc ? (
              <img src={avatarSrc} alt={candidate.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {getInitials(candidate.name)}
              </div>
            )
          })()}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-neutral-900 text-base font-semibold leading-tight">{candidate.name}</h1>
              {/* gender icon placeholder */}
              <span className="text-blue-400 text-xs">♂</span>
            </div>
            <p className="text-neutral-400 text-xs">
              {candidate.title ?? 'Candidate'} · ID: <span className="font-medium text-neutral-500">#{params.id.slice(0,4).toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* right: nav + actions */}
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLiked(l => !l)}
            className={cn(
              'w-8 h-8 rounded-lg border flex items-center justify-center transition-colors',
              liked ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-neutral-200 text-neutral-300 hover:text-rose-400 hover:border-rose-200',
            )}
          >
            <Heart className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-neutral-200 mx-1" />
          <button
            onClick={() => setScheduleOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm text-neutral-700 border border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" /> Schedule Meeting
          </button>
          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Mail className="w-3.5 h-3.5" /> Send Email
          </button>
          {/* re-scan AI */}
          {applications.length > 0 && (
            <button
              onClick={rescanAll}
              disabled={rescanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {rescanning
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</>
                : <><ScanSearch className="w-3 h-3" /> Re-scan AI</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── body: left sidebar + right panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ LEFT SIDEBAR ══════════════════════════════════════ */}
        <div className="w-96 flex-shrink-0 border-r border-neutral-100 bg-white overflow-y-auto">
          <div className="p-5 space-y-6">

            {/* Personal Information */}
            <section>
              <SectionHeader icon={User} label="Personal Information" />
              <div className="space-y-2.5 mt-3">
                <InfoRow label="Experience" value={candidate.experience != null ? `${candidate.experience} Years` : '—'} />
                <InfoRow label="Source" value={candidate.source ?? '—'} capitalize />
                {(candidate as any).birth_date && (
                  <InfoRow label="Birth of date" value={(candidate as any).birth_date} />
                )}
                {(candidate as any).nationality && (
                  <InfoRow label="Nationality" value={(candidate as any).nationality} />
                )}
                {(candidate as any).dependants && (
                  <InfoRow label="Dependants" value={(candidate as any).dependants} />
                )}
              </div>
            </section>

            {/* Address & Contact */}
            <section>
              <SectionHeader icon={MapPin} label="Address & Contact" />
              <div className="space-y-2.5 mt-3">
                {candidate.location && <InfoRow label="Location" value={candidate.location} />}
                <InfoRowLink label="Email" value={candidate.email} href={`mailto:${candidate.email}`} />
                {candidate.phone && <InfoRowLink label="Phone" value={candidate.phone} href={`tel:${candidate.phone}`} />}
                {candidate.linkedin_url && (
                  <InfoRowLink label="LinkedIn" value="View Profile" href={candidate.linkedin_url} external />
                )}
                {candidate.github_url && (
                  <InfoRowLink label="GitHub" value="View Profile" href={candidate.github_url} external />
                )}
                {candidate.resume_url && (
                  <InfoRowLink label="Resume" value="View Resume" href={candidate.resume_url} external />
                )}
              </div>
            </section>

            {/* Preferences */}
            <section>
              <SectionHeader icon={BookOpen} label="Preferences" />
              <div className="space-y-3 mt-3">
                {candidate.title && (
                  <InfoRow label="Job Title" value={candidate.title} />
                )}
                {candidate.company && (
                  <InfoRow label="Company" value={candidate.company} />
                )}
                {(candidate.skills ?? []).length > 0 && (
                  <div>
                    <p className="text-neutral-400 text-[11px] font-medium uppercase tracking-wide mb-1.5">Skills & Tech Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(candidate.skills ?? []).map(skill => (
                        <span key={skill} className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(candidate.skills ?? []).length === 0 && (
                  <p className="text-neutral-400 text-xs italic">No skills extracted yet</p>
                )}
              </div>
            </section>

            {/* Notes */}
            <section>
              <SectionHeader icon={FileText} label="Notes" />
              <div className="mt-3">
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
                  placeholder="Add notes about this candidate…"
                  rows={4}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs rounded-lg p-3 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white resize-none transition-colors"
                />
                <button
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className={cn(
                    'mt-1.5 w-full py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5',
                    notesSaved ? 'border-green-200 bg-green-50 text-green-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100',
                  )}
                >
                  {notesSaving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                    : notesSaved ? <><CheckCircle2 className="w-3 h-3" /> Saved!</>
                    : <><Save className="w-3 h-3" /> Save Notes</>}
                </button>
              </div>
            </section>

          </div>
        </div>

        {/* ══ RIGHT PANEL ═══════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* tabs */}
          <div className="flex items-center gap-0 px-6 pt-3 bg-white border-b border-neutral-100">
            {TABS.map(tab => {
              const Icon = TAB_ICONS[tab]
              const active = tab === activeTab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    active
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-neutral-400 hover:text-neutral-700',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab}
                </button>
              )
            })}
          </div>

          {/* tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">

              {/* ── RATING TAB ── */}
              {activeTab === 'Rating' && (
                <motion.div key="rating" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  {bestApp && bestApp.ai_score !== null ? (
                    <>
                      {/* score card */}
                      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex items-center gap-8">
                        <ScoreRing score={bestApp.ai_score ?? 0} />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className={cn('text-sm font-semibold px-3 py-1 rounded-full border capitalize', {
                              'bg-green-50 text-green-700 border-green-200':  (bestApp.ai_label ?? '') === 'strong_fit',
                              'bg-blue-50  text-blue-700  border-blue-200':   (bestApp.ai_label ?? '') === 'good_fit',
                              'bg-amber-50 text-amber-700 border-amber-200':  (bestApp.ai_label ?? '') === 'reserve',
                              'bg-neutral-100 text-neutral-600 border-neutral-200': !bestApp.ai_label,
                            })}>
                              {bestApp.ai_label ? bestApp.ai_label.replace('_', ' ') : 'Pending'}
                            </span>
                            <StatusBadge status={bestApp.current_stage} type="stage" />
                            {bestApp.job_title && (
                              <span className="text-xs text-neutral-400">for <strong className="text-neutral-600">{bestApp.job_title}</strong></span>
                            )}
                          </div>
                          {bestApp.ai_reasoning && (
                            <p className="text-neutral-600 text-sm leading-relaxed">{bestApp.ai_reasoning}</p>
                          )}
                          <button
                            onClick={rescanAll}
                            disabled={rescanning}
                            className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={cn('w-3 h-3', rescanning && 'animate-spin')} />
                            {rescanning ? 'Scanning…' : 'Re-scan AI'}
                          </button>
                        </div>
                      </div>

                      {/* all applications scores */}
                      {applications.length > 1 && (
                        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                          <div className="px-5 py-3.5 border-b border-neutral-100">
                            <h3 className="text-neutral-800 text-sm font-semibold">All Application Scores</h3>
                          </div>
                          <div className="divide-y divide-neutral-100">
                            {applications.map(app => (
                              <div key={app.id} className="flex items-center gap-4 px-5 py-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-neutral-800">{app.job_title ?? 'Unknown role'}</p>
                                  <p className="text-xs text-neutral-400 capitalize">{app.current_stage} · {formatDate(app.created_at)}</p>
                                </div>
                                {app.ai_score !== null && app.ai_score !== undefined
                                  ? <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg border', getMatchScoreBg(app.ai_score ?? 0))}>{app.ai_score}%</span>
                                  : <span className="text-xs text-neutral-300 italic">pending</span>
                                }
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white border border-neutral-200 rounded-xl flex flex-col items-center justify-center py-16 gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                        <Brain className="w-7 h-7 text-neutral-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-neutral-700 text-sm font-medium">No AI Score Yet</p>
                        <p className="text-neutral-400 text-xs mt-1">
                          {applications.length > 0 ? 'Click Re-scan to run AI screening now.' : 'Appears once this candidate applies to a role.'}
                        </p>
                      </div>
                      {applications.length > 0 && (
                        <button onClick={rescanAll} disabled={rescanning}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                          <ScanSearch className="w-4 h-4" />
                          {rescanning ? 'Scanning…' : 'Run AI Scan Now'}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── ACTIVITY TAB ── */}
              {activeTab === 'Activity' && (
                <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                  {/* search / filter bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <ScanSearch className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <input placeholder="Search activity…" className="flex-1 bg-transparent text-sm text-neutral-700 placeholder-neutral-400 outline-none" />
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                      <Clock className="w-3.5 h-3.5" /> Last 30 Days
                    </button>
                  </div>

                  {/* timeline */}
                  {groupKeys.length === 0 ? (
                    <p className="text-neutral-400 text-sm text-center py-14">No activity yet.</p>
                  ) : (
                    groupKeys.map(key => {
                      const group = grouped[key]
                      return (
                        <div key={key}>
                          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3 px-1">
                            {group[0].dateLabel}
                          </p>
                          <div>
                            {group.map((item, idx) => {
                              const Icon = item.icon
                              const isLast = idx === group.length - 1
                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.04 }}
                                  className="flex items-start gap-4 py-1 px-1"
                                >
                                  {/* time */}
                                  <span className="text-[11px] text-neutral-400 w-16 flex-shrink-0 pt-3 tabular-nums leading-none text-right">{item.time}</span>
                                  {/* icon + connector line */}
                                  <div className="flex flex-col items-center flex-shrink-0">
                                    {item.actorAvatar ? (
                                      (() => {
                                        const avatarSrc = getAvatarUrl(candidate.avatar_url, candidate.github_url)
                                        return avatarSrc ? (
                                          <img src={avatarSrc} alt={candidate.name} className="w-8 h-8 rounded-full object-cover mt-1.5 z-10 flex-shrink-0" />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mt-1.5 z-10">
                                            <span className="text-[10px] font-bold text-white">{item.actorAvatar}</span>
                                          </div>
                                        )
                                      })()
                                    ) : (
                                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mt-1.5 z-10', item.iconBg)}>
                                        <Icon className={cn('w-3.5 h-3.5', item.iconColor)} />
                                      </div>
                                    )}
                                    {!isLast && <div className="w-px flex-1 bg-neutral-200 my-1" style={{ minHeight: '28px' }} />}
                                  </div>
                                  {/* text */}
                                  <div className="flex-1 min-w-0 pt-3 pb-5">
                                    <div className="text-[13px] text-neutral-700 leading-snug">
                                      {item.actor && <strong className="text-neutral-900 font-semibold mr-1">{item.actor}</strong>}
                                      {item.text}
                                    </div>
                                    {item.detail && <div className="mt-1.5">{item.detail}</div>}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </motion.div>
              )}

              {/* ── RECRUITMENT TAB ── */}
              {activeTab === 'Recruitment' && (
                <motion.div key="recruitment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {applications.length === 0 ? (
                    <div className="bg-white border border-neutral-200 rounded-xl flex items-center justify-center py-14 text-neutral-400 text-sm">
                      No applications yet.
                    </div>
                  ) : (
                    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-neutral-100">
                        <h3 className="text-neutral-800 text-sm font-semibold">Applications ({applications.length})</h3>
                      </div>
                      <div className="divide-y divide-neutral-100">
                        {applications.map(app => (
                          <div key={app.id} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors">
                            <div className="flex-1">
                              <p className="text-neutral-900 text-sm font-medium">{app.job_title ?? 'Unknown role'}</p>
                              <p className="text-neutral-400 text-xs mt-0.5">Applied {formatDate(app.created_at)}</p>
                            </div>
                            <StatusBadge status={app.current_stage} type="stage" />
                            {app.ai_score !== null && app.ai_score !== undefined && (
                              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg border', getMatchScoreBg(app.ai_score ?? 0))}>
                                {app.ai_score}%
                              </span>
                            )}
                            <Link href={`/jobs/${app.job_id}`}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── modals ── */}
      <ComposeEmailModal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); fetchConversation() }}
        candidateId={candidate.id}
        candidateName={candidate.name}
        candidateEmail={candidate.email}
        gmailConnected={googleStatus.gmail_connected}
        gmailEmail={googleStatus.gmail_email}
      />
      <ScheduleInterviewModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        candidateId={candidate.id}
        candidateName={candidate.name}
        candidateEmail={candidate.email}
        jobId={bestApp?.job_id}
        gcalConnected={googleStatus.gcal_connected}
      />
    </div>
  )
}

/* ─── small shared sub-components ────────────────────────── */

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
      <h3 className="text-neutral-800 text-xs font-semibold uppercase tracking-wide">{label}</h3>
    </div>
  )
}

function InfoRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-neutral-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className={cn('text-neutral-700 font-medium flex-1', capitalize && 'capitalize')}>: {value}</span>
    </div>
  )
}

function InfoRowLink({ label, value, href, external }: { label: string; value: string; href: string; external?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-neutral-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="text-indigo-600 hover:text-indigo-700 font-medium flex-1 truncate hover:underline"
      >
        : {value}
      </a>
    </div>
  )
}