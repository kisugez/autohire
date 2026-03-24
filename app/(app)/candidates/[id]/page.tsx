'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Briefcase, Mail, Github, Linkedin,
  MessageSquare, Calendar, FileText, Brain, Phone,
  CheckCircle2, Loader2, AlertCircle, ExternalLink, Save, Clock,
  Zap, Star, RefreshCw, Send, ArrowDown, ArrowUp, ScanSearch,
} from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import ScheduleInterviewModal from '@/components/candidates/schedule-interview-modal'
import ComposeEmailModal from '@/components/candidates/compose-email-modal'
import { getInitials, getMatchScoreBg, formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { get, patch, post } from '@/lib/api'
import type { ApiCandidate } from '@/types/candidate'
import type { ApiApplication } from '@/types/job'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface ActivityItem {
  icon: React.ElementType
  color: string
  bg: string
  text: string
  time: string
}

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
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
    } catch {
      setError('Failed to load candidate.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  const fetchConversation = useCallback(async () => {
    setConvLoading(true)
    try {
      const conv = await get<{ messages: EmailMessage[] }>(`/api/v1/conversations/${params.id}`)
      setMessages(conv.messages ?? [])
    } catch {
      setMessages([])
    } finally {
      setConvLoading(false)
    }
  }, [params.id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchConversation() }, [fetchConversation])

  const syncConversation = async () => {
    setSyncing(true)
    try {
      await post(`/api/v1/conversations/${params.id}/sync`, {})
      await fetchConversation()
    } finally {
      setSyncing(false)
    }
  }

  const rescanAll = async () => {
    if (!applications.length) return
    setRescanning(true)
    setRescanMsg(null)
    try {
      await Promise.all(
        applications.map(app =>
          post(`/api/v1/applications/${app.id}/screen`, {}).catch(() => null)
        )
      )
      // Reload fresh data after AI finishes
      await fetchData()
      setRescanMsg('AI re-scan complete!')
      setTimeout(() => setRescanMsg(null), 4000)
    } catch {
      setRescanMsg('Re-scan failed — try again.')
      setTimeout(() => setRescanMsg(null), 4000)
    } finally {
      setRescanning(false)
    }
  }

  const bestApp = applications.length
    ? [...applications].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))[0]
    : null

  const saveNotes = async () => {
    setNotesSaving(true)
    try {
      const updated = await patch<ApiCandidate>(`/api/v1/candidates/${params.id}`, { notes })
      setCandidate(updated)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch {
      localStorage.setItem(`candidate_notes_${params.id}`, notes)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setNotesSaving(false)
    }
  }

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

  const aiLabelColor: Record<string, string> = {
    strong_fit: 'text-green-700 bg-green-50 border-green-200',
    good_fit:   'text-blue-700 bg-blue-50 border-blue-200',
    reserve:    'text-amber-700 bg-amber-50 border-amber-200',
  }

  const activityItems: ActivityItem[] = [
    { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', text: `Profile created · sourced via ${candidate.source}`, time: formatRelativeTime(candidate.created_at) },
    ...applications.map(app => ({ icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-50', text: `Applied for ${app.job_title ?? 'a role'} · stage: ${app.current_stage}`, time: formatRelativeTime(app.created_at) })),
    ...applications.filter(a => a.ai_score !== null).map(app => ({ icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50', text: `AI scored ${app.ai_score}% for ${app.job_title ?? 'a role'}`, time: formatRelativeTime(app.updated_at) })),
    ...applications.filter(a => ['interview', 'offer', 'hired'].includes(a.current_stage)).map(app => ({ icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', text: `Moved to ${app.current_stage} stage for ${app.job_title ?? 'a role'}`, time: formatRelativeTime(app.updated_at) })),
  ]

  const profileLinks = [
    { icon: Linkedin, label: 'LinkedIn Profile', href: candidate.linkedin_url },
    { icon: Github,   label: 'GitHub Profile',   href: candidate.github_url   },
    { icon: FileText, label: 'View Resume',       href: candidate.resume_url  },
    { icon: ExternalLink, label: 'Portfolio',     href: null                  },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/candidates" className="mt-1 w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-neutral-950 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {getInitials(candidate.name)}
            </div>
            <div>
              <h1 className="text-neutral-950 text-2xl font-bold tracking-tight mb-1">{candidate.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                {candidate.title && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{candidate.title}</span>}
                {candidate.company && <span className="text-neutral-400">{candidate.company}</span>}
                {candidate.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{candidate.location}</span>}
                <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                  <Mail className="w-3.5 h-3.5" />{candidate.email}
                </a>
                {candidate.phone && (
                  <a href={`tel:${candidate.phone}`} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                    <Phone className="w-3.5 h-3.5" />{candidate.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Re-scan AI button */}
          {applications.length > 0 && (
            <button
              onClick={rescanAll}
              disabled={rescanning}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors',
                rescanMsg?.includes('complete')
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : rescanMsg?.includes('failed')
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
              )}
            >
              {rescanning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning…</>
                : rescanMsg
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> {rescanMsg}</>
                : <><ScanSearch className="w-3.5 h-3.5" /> Re-scan AI</>
              }
            </button>
          )}
          <button onClick={() => setScheduleOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:text-neutral-900 transition-colors">
            <Calendar className="w-3.5 h-3.5" /> Schedule Interview
          </button>
          <button onClick={() => setComposeOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors">
            <Mail className="w-3.5 h-3.5" /> Send Email
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">

          {/* Overview */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="text-neutral-900 text-sm font-semibold flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-neutral-400" /> Overview
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div>
                <p className="text-neutral-400 text-xs mb-0.5">Experience</p>
                <p className="text-neutral-900 font-medium">
                  {candidate.experience != null ? `${candidate.experience} years` : <span className="text-neutral-400 italic">Not extracted yet</span>}
                </p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs mb-0.5">Source</p>
                <p className="text-neutral-900 font-medium capitalize">{candidate.source}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs mb-0.5">Location</p>
                <p className="text-neutral-900 font-medium">{candidate.location || <span className="text-neutral-400 italic">—</span>}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs mb-0.5">Added</p>
                <p className="text-neutral-900 font-medium">{formatDate(candidate.created_at)}</p>
              </div>
            </div>
            <div>
              <p className="text-neutral-400 text-xs mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {(candidate.skills ?? []).length > 0
                  ? (candidate.skills ?? []).map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 border border-neutral-200">{skill}</span>
                    ))
                  : (
                    <div className="flex items-center gap-2 text-neutral-400 text-xs italic">
                      No skills extracted yet —
                      {applications.length > 0 && (
                        <button onClick={rescanAll} disabled={rescanning} className="text-indigo-600 hover:underline not-italic font-medium">
                          {rescanning ? 'Scanning…' : 'run AI scan'}
                        </button>
                      )}
                    </div>
                  )
                }
              </div>
            </div>
          </div>

          {/* AI Assessment */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-neutral-900 text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" /> AI Assessment
              </h2>
              {applications.length > 0 && (
                <button
                  onClick={rescanAll}
                  disabled={rescanning}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', rescanning && 'animate-spin')} />
                  {rescanning ? 'Scanning…' : 'Re-scan'}
                </button>
              )}
            </div>
            {bestApp && bestApp.ai_score !== null ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn('text-2xl font-bold px-3 py-1.5 rounded-xl border', getMatchScoreBg(bestApp.ai_score ?? 0))}>
                    {bestApp.ai_score}%
                  </span>
                  {bestApp.ai_label && (
                    <span className={cn('text-sm font-medium px-3 py-1 rounded-full border capitalize', aiLabelColor[bestApp.ai_label] ?? 'bg-neutral-100 text-neutral-500 border-neutral-200')}>
                      {bestApp.ai_label.replace('_', ' ')}
                    </span>
                  )}
                  <StatusBadge status={bestApp.current_stage} type="stage" />
                  {bestApp.job_title && <span className="text-xs text-neutral-400">for {bestApp.job_title}</span>}
                </div>
                {bestApp.ai_reasoning && (
                  <p className="text-neutral-600 text-sm leading-relaxed bg-neutral-50 border border-neutral-100 rounded-lg px-4 py-3">{bestApp.ai_reasoning}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-neutral-400 text-sm gap-3">
                <Brain className="w-8 h-8 text-neutral-200" />
                <span>
                  {applications.length > 0
                    ? 'AI screening pending — click Re-scan to run it now.'
                    : 'No AI score yet — appears once this candidate applies to a role.'}
                </span>
                {applications.length > 0 && (
                  <button
                    onClick={rescanAll}
                    disabled={rescanning}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    <ScanSearch className="w-3.5 h-3.5" />
                    {rescanning ? 'Scanning…' : 'Run AI Scan Now'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Email Conversation */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-neutral-900 text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neutral-400" />
                Email Conversation
                {googleStatus.gmail_connected && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Gmail synced
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                {googleStatus.gmail_connected && (
                  <button onClick={syncConversation} disabled={syncing} className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} /> Sync
                  </button>
                )}
                <button onClick={() => setComposeOpen(true)} className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
                  <Send className="w-3.5 h-3.5" /> Compose
                </button>
              </div>
            </div>

            {convLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-neutral-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-neutral-400 text-sm gap-2">
                <MessageSquare className="w-8 h-8 text-neutral-200" />
                <span>No messages yet.</span>
                <button onClick={() => setComposeOpen(true)} className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 transition-colors">
                  <Mail className="w-3.5 h-3.5" /> Send first email
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={cn(
                    'rounded-xl px-4 py-3 text-sm border',
                    msg.direction === 'outbound'
                      ? 'bg-neutral-950 text-white border-neutral-800 ml-8'
                      : 'bg-neutral-50 text-neutral-800 border-neutral-200 mr-8',
                  )}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-1 text-xs opacity-60">
                        {msg.direction === 'outbound' ? <><ArrowUp className="w-3 h-3" /> You</> : <><ArrowDown className="w-3 h-3" /> {candidate.name}</>}
                      </span>
                      <span className="text-xs opacity-50">{formatRelativeTime(msg.sent_at)}</span>
                    </div>
                    <p className="font-medium text-xs mb-1 opacity-80">{msg.subject}</p>
                    <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap line-clamp-4">{msg.body_text ?? ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-3">Profiles</h3>
            <div className="space-y-1">
              {profileLinks.map(link => {
                const Icon = link.icon
                return link.href ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors text-sm text-neutral-700 hover:text-indigo-600">
                    <Icon className="w-4 h-4 flex-shrink-0" />{link.label}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
                  </a>
                ) : (
                  <div key={link.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-300 cursor-not-allowed select-none">
                    <Icon className="w-4 h-4 flex-shrink-0" />{link.label}
                    <span className="ml-auto text-[10px]">N/A</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-4">Activity Timeline</h3>
            {activityItems.length === 0 ? (
              <p className="text-neutral-400 text-xs">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {activityItems.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-start gap-3">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', item.color)} />
                      </div>
                      <div>
                        <p className="text-neutral-800 text-xs leading-relaxed">{item.text}</p>
                        <p className="text-neutral-400 text-xs mt-0.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{item.time}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-3">Interview Notes</h3>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
              placeholder="Add notes about this candidate…"
              rows={5}
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs rounded-lg p-3 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white resize-none transition-colors"
            />
            <button onClick={saveNotes} disabled={notesSaving}
              className={cn('mt-2 w-full py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5',
                notesSaved ? 'border-green-200 bg-green-50 text-green-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100')}>
              {notesSaving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                : notesSaved ? <><CheckCircle2 className="w-3 h-3" /> Saved!</>
                : <><Save className="w-3 h-3" /> Save Notes</>}
            </button>
          </div>
        </div>
      </div>

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
