'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, RefreshCw, Send, Mail, Phone, Briefcase,
  Loader2, AlertCircle, ArrowDown, ArrowUp,
  Calendar, MessageSquare, X, Plus, UserPlus, Archive, Inbox,
  Sparkles, Check, ChevronDown, FileText,
} from 'lucide-react'
import { formatRelativeTime, formatDate, getInitials, cn } from '@/lib/utils'
import { get, post } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────

interface ContactedCandidate {
  id: string
  candidate_id: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string
  role?: string
  source: 'applied' | 'sourced' | string
  status: 'scheduled' | 'sent' | 'opened' | 'replied' | 'bounced' | string
  subject: string
  sent_at: string | null
  scheduled_at: string | null
  applied_at?: string | null
  unread?: number
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
  outlook_connected: boolean
  outlook_email?: string
}

interface ApiCandidate {
  id: string
  name: string
  email: string
  phone?: string
  title?: string
}

interface OutreachTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
}

interface ComposeTarget {
  candidate_id: string
  candidate_name: string
  candidate_email: string
}

// ─── localStorage key ────────────────────────────────────────────
const ARCHIVE_KEY = 'outreach_archived_ids'

function getArchivedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveArchivedIds(ids: Set<string>) {
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...ids])) } catch {}
}


function renderTemplate(text: string, candidateName: string, candidateEmail: string, jobTitle?: string): string {
  const firstName = candidateName.split(' ')[0]
  return text
    .replace(/\{\{candidate_name\}\}/gi, candidateName)
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{candidate_email\}\}/gi, candidateEmail)
    .replace(/\{\{job_title\}\}/gi, jobTitle ?? '')
    .replace(/\{\{role\}\}/gi, jobTitle ?? '')
}

// ─── Config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  scheduled: { label: 'Scheduled', dot: 'bg-blue-500',    badge: 'text-blue-700 bg-blue-50 border-blue-200' },
  sent:      { label: 'Sent',      dot: 'bg-neutral-400', badge: 'text-neutral-500 bg-neutral-100 border-neutral-200' },
  opened:    { label: 'Opened',    dot: 'bg-amber-500',   badge: 'text-amber-700 bg-amber-50 border-amber-200' },
  replied:   { label: 'Replied',   dot: 'bg-green-500',   badge: 'text-green-700 bg-green-50 border-green-200' },
  bounced:   { label: 'Bounced',   dot: 'bg-red-500',     badge: 'text-red-700 bg-red-50 border-red-200' },
}

const SOURCE_CONFIG: Record<string, { label: string; style: string }> = {
  applied: { label: 'Applied', style: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  sourced: { label: 'Sourced', style: 'text-purple-700 bg-purple-50 border-purple-200' },
}

// ─── Sub-components ──────────────────────────────────────────────

function AvatarInitials({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }[size]
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none', sizeClass)}
      style={{ background: `hsl(${hue},55%,48%)` }}
    >
      {getInitials(name)}
    </div>
  )
}

function CandidatePickerModal({ open, onClose, onSelect }: {
  open: boolean
  onClose: () => void
  onSelect: (c: ApiCandidate) => void
}) {
  const [candidates, setCandidates] = useState<ApiCandidate[]>([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    get<ApiCandidate[]>('/api/v1/candidates')
      .then(r => setCandidates(r))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-[400px] max-h-[500px] flex flex-col z-10"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5 text-neutral-500" />
            <p className="text-neutral-900 text-sm font-semibold">New Outreach</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>
        <div className="px-4 py-2.5 border-b border-neutral-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-300 focus:bg-white transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-neutral-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading candidates…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400 text-xs gap-2">
              <Search className="w-5 h-5 text-neutral-200" />No candidates found
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setTimeout(onClose, 0) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 border-b border-neutral-50 transition-colors text-left"
              >
                <AvatarInitials name={c.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-900 text-xs font-medium truncate">{c.name}</p>
                  <p className="text-neutral-400 text-[11px] truncate">{c.email}</p>
                </div>
                {c.title && (
                  <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full truncate max-w-[90px]">{c.title}</span>
                )}
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

function TemplatePicker({ templates, loading, selected, onSelect }: {
  templates: OutreachTemplate[]
  loading: boolean
  selected: OutreachTemplate | null
  onSelect: (t: OutreachTemplate | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
      >
        <FileText className="w-3 h-3 text-neutral-400" />
        {selected ? <span className="max-w-[110px] truncate">{selected.name}</span> : 'Templates'}
        <ChevronDown className="w-3 h-3 text-neutral-400" />
        {selected && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onSelect(null) }}
            className="ml-0.5 text-neutral-400 hover:text-red-400"
          ><X className="w-2.5 h-2.5" /></span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-[420px] max-h-[520px] flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  <p className="text-neutral-900 text-sm font-semibold">Outreach Templates</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-neutral-400 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading templates…
                  </div>
                ) : templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-400 text-xs gap-2">
                    <FileText className="w-7 h-7 text-neutral-200" />
                    No templates yet
                  </div>
                ) : (
                  templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { onSelect(t); setOpen(false) }}
                      className={cn(
                        'w-full text-left px-5 py-3.5 hover:bg-neutral-50 border-b border-neutral-50 transition-colors',
                        selected?.id === t.id && 'bg-violet-50 hover:bg-violet-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">{t.name}</p>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{t.subject}</p>
                          <p className="text-[11px] text-neutral-300 line-clamp-2 mt-1 leading-relaxed">{t.body}</p>
                        </div>
                        {selected?.id === t.id && (
                          <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <span className={cn(
                        'inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full border',
                        t.category === 'outreach'  ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
                        t.category === 'follow_up' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                        t.category === 'interview' ? 'text-green-600 bg-green-50 border-green-200' :
                        t.category === 'offer'     ? 'text-violet-600 bg-violet-50 border-violet-200' :
                                                     'text-neutral-500 bg-neutral-100 border-neutral-200'
                      )}>
                        {t.category.replace('_', ' ')}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {selected && (
                <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Using: <span className="font-medium text-neutral-700">{selected.name}</span></span>
                  <button
                    onClick={() => { onSelect(null); setOpen(false) }}
                    className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}



// ─── Provider Picker ─────────────────────────────────────────────

function ProviderPicker({
  value,
  onChange,
  gmailConnected,
  outlookConnected,
}: {
  value: 'gmail' | 'outlook'
  onChange: (v: 'gmail' | 'outlook') => void
  gmailConnected: boolean
  outlookConnected: boolean
}) {
  if (!gmailConnected || !outlookConnected) return null
  return (
    <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
      <button
        onClick={() => onChange('gmail')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
          value === 'gmail' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
        )}
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none">
          <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill="#fff" stroke="#e0e0e0" strokeWidth="1"/>
          <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
        </svg>
        Gmail
      </button>
      <button
        onClick={() => onChange('outlook')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
          value === 'outlook' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
        )}
      >
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none">
          <rect width="16" height="16" rx="2" fill="#0078D4"/>
          <path d="M9 4h4.5v8H9V4z" fill="#50B1F8"/>
          <rect x="2.5" y="5" width="5.5" height="6" rx="0.5" fill="white"/>
        </svg>
        Outlook
      </button>
    </div>
  )
}

function ComposeModal({ target, googleStatus, onClose, onSent }: {
  target: ComposeTarget
  googleStatus: GoogleStatus
  onClose: () => void
  onSent: () => void
}) {
  const [subject, setSubject]         = useState('')
  const [body, setBody]               = useState('')
  const [sending, setSending]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [templates, setTemplates]     = useState<OutreachTemplate[]>([])
  const [tplLoading, setTplLoading]   = useState(false)
  const [selectedTpl, setSelectedTpl] = useState<OutreachTemplate | null>(null)
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiDone, setAiDone]           = useState(false)
  const defaultProvider = googleStatus.gmail_connected ? 'gmail' : googleStatus.outlook_connected ? 'outlook' : 'gmail'
  const [provider, setProvider]       = useState<'gmail' | 'outlook'>(defaultProvider)

  useEffect(() => {
    setTplLoading(true)
    get<OutreachTemplate[]>('/api/v1/outreach/templates')
      .then(setTemplates).catch(() => setTemplates([])).finally(() => setTplLoading(false))
  }, [])

  const applyTemplate = (t: OutreachTemplate | null) => {
    setSelectedTpl(t)
    setAiDone(false)
    if (t) {
      setSubject(renderTemplate(t.subject, target.candidate_name, target.candidate_email))
      setBody(renderTemplate(t.body, target.candidate_name, target.candidate_email))
    } else {
      setSubject(''); setBody('')
    }
  }

  const generateWithAI = async () => {
    setAiLoading(true); setAiDone(false)
    try {
      const res = await post<{ body: string }>('/api/v1/outreach/generate-email', {
        candidate_name: target.candidate_name,
        subject: subject || undefined,
        template_subject: selectedTpl?.subject || undefined,
        template_body: selectedTpl?.body || undefined,
      })
      setBody(res.body)
      setAiDone(true)
    } catch {
      setAiDone(false)
    } finally {
      setAiLoading(false)
    }
  }

  const send = async () => {
    if (!subject.trim() || !body.trim()) return
    setSending(true); setError(null)
    try {
      await post('/api/v1/outreach/send', { candidate_id: target.candidate_id, candidate_email: target.candidate_email, subject, body, provider })
      onSent()
    } catch { setError(`Failed to send. Check your ${provider === 'outlook' ? 'Outlook' : 'Gmail'} connection.`) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-[480px] flex flex-col z-10"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <AvatarInitials name={target.candidate_name} size="sm" />
            <div>
              <p className="text-neutral-900 text-xs font-semibold">{target.candidate_name}</p>
              <p className="text-neutral-400 text-[11px]">{target.candidate_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProviderPicker
              value={provider}
              onChange={setProvider}
              gmailConnected={googleStatus.gmail_connected}
              outlookConnected={googleStatus.outlook_connected}
            />
            {!googleStatus.gmail_connected && googleStatus.outlook_connected && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#0078D4] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">Outlook</span>
            )}
            {googleStatus.gmail_connected && !googleStatus.outlook_connected && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-lg">Gmail</span>
            )}
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors">
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>
        </div>
        {!googleStatus.gmail_connected && !googleStatus.outlook_connected && (
          <div className="mx-4 mt-3 flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            No email connected. <a href="/integrations" className="underline font-medium ml-1">Connect Gmail or Outlook</a>
          </div>
        )}
        <div className="px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
            <span className="text-neutral-400 text-[11px] w-14 flex-shrink-0">Subject</span>
            <input
              autoFocus
              value={subject}
              onChange={e => { setSubject(e.target.value); setAiDone(false) }}
              placeholder="Email subject…"
              className="flex-1 text-xs text-neutral-800 bg-transparent placeholder-neutral-300 focus:outline-none"
            />
          </div>
          <div className="relative border border-neutral-200 rounded-lg overflow-hidden focus-within:border-violet-300 transition-colors bg-white">
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setAiDone(false) }}
              placeholder={`Write to ${target.candidate_name}…`}
              rows={7}
              className="w-full px-3 pt-3 pb-11 text-xs text-neutral-800 bg-transparent placeholder-neutral-300 focus:outline-none resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <button
                onClick={generateWithAI}
                disabled={aiLoading}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                  aiLoading
                    ? 'bg-neutral-100 text-neutral-400'
                    : aiDone
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gradient-to-r from-orange-500 to-violet-600 text-white hover:opacity-90'
                )}
              >
                {aiLoading
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                  : aiDone
                  ? <><Check className="w-3 h-3" /> Generated</>
                  : <><Sparkles className="w-3 h-3" /> Generate with AI ✦</>}
              </button>
              {!aiLoading && !aiDone && (subject || selectedTpl) && (
                <span className="text-[10px] text-neutral-400 truncate max-w-[160px]">
                  {selectedTpl ? `Template: ${selectedTpl.name}` : `Topic: ${subject.slice(0, 30)}`}
                </span>
              )}
            </div>
          </div>
        </div>
        {error && (
          <div className="mx-4 mb-2 flex items-center gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
          <TemplatePicker
            templates={templates}
            loading={tplLoading}
            selected={selectedTpl}
            onSelect={applyTemplate}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-300">⌘↵</span>
            <button
              onClick={send}
              disabled={sending || !body.trim() || !subject.trim()}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                subject.trim() && body.trim() ? 'bg-neutral-950 text-white hover:bg-neutral-800' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed')}
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}



// ─── Main Page ───────────────────────────────────────────────────

export default function OutreachPage() {
  const [contacts, setContacts]           = useState<ContactedCandidate[]>([])
  const [loading, setLoading]             = useState(true)
  const [tab, setTab]                     = useState<'active' | 'archive'>('active')
  const [archivedIds, setArchivedIds]     = useState<Set<string>>(new Set())
  const [search, setSearch]               = useState('')
  const [selected, setSelected]           = useState<ContactedCandidate | null>(null)

  const [messages, setMessages]           = useState<EmailMessage[]>([])
  const [convLoading, setConvLoading]     = useState(false)
  const [syncing, setSyncing]             = useState(false)

  const [googleStatus, setGoogleStatus]   = useState<GoogleStatus>({ gmail_connected: false, gcal_connected: false, outlook_connected: false })

  const [pickerOpen, setPickerOpen]       = useState(false)
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null)

  const [replySubject, setReplySubject]   = useState('')
  const [replyBody, setReplyBody]         = useState('')
  const [sending, setSending]             = useState(false)
  const [sendError, setSendError]         = useState<string | null>(null)
  const [replyTemplates, setReplyTemplates]     = useState<OutreachTemplate[]>([])
  const [replyTplLoading, setReplyTplLoading]   = useState(false)
  const [replySelectedTpl, setReplySelectedTpl] = useState<OutreachTemplate | null>(null)
  const [replyAiLoading, setReplyAiLoading]     = useState(false)
  const [replyAiDone, setReplyAiDone]           = useState(false)
  const [replyProvider, setReplyProvider]       = useState<'gmail' | 'outlook'>('gmail')

  const [allCandidates, setAllCandidates] = useState<ApiCandidate[]>([])

  const threadRef = useRef<HTMLDivElement>(null)

  // Load archived IDs from localStorage on mount
  useEffect(() => { setArchivedIds(getArchivedIds()) }, [])

  const toggleArchive = (id: string) => {
    setArchivedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveArchivedIds(next)
      return next
    })
    // If the currently selected contact is being archived, deselect it
    setSelected(prev => prev?.id === id ? null : prev)
  }

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const [msgs, gStatus, outlookStatus, allC] = await Promise.all([
        get<ContactedCandidate[]>('/api/v1/outreach/messages').catch(() => [] as ContactedCandidate[]),
        get<GoogleStatus>('/api/v1/google/status').catch(() => ({ gmail_connected: false, gcal_connected: false, outlook_connected: false } as GoogleStatus)),
        get<{ outlook_connected: boolean; outlook_email?: string }>('/api/v1/outlook/status').catch(() => ({ outlook_connected: false, outlook_email: undefined })),
        get<ApiCandidate[]>('/api/v1/candidates').catch(() => [] as ApiCandidate[]),
      ])
      setContacts(msgs)
      setGoogleStatus({ ...gStatus, outlook_connected: outlookStatus.outlook_connected, outlook_email: outlookStatus.outlook_email })
      setAllCandidates(allC)
      if (msgs.length > 0 && !selected) setSelected(msgs[0])
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  // Lightweight status re-check — only refreshes Gmail connection state
  const refreshGoogleStatus = useCallback(async () => {
    try {
      const [gStatus, outlookStatus] = await Promise.all([
        get<GoogleStatus>('/api/v1/google/status'),
        get<{ outlook_connected: boolean; outlook_email?: string }>('/api/v1/outlook/status').catch(() => ({ outlook_connected: false, outlook_email: undefined })),
      ])
      setGoogleStatus({ ...gStatus, outlook_connected: outlookStatus.outlook_connected, outlook_email: outlookStatus.outlook_email })
    } catch {}
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  // Re-check Google status whenever the tab regains focus so a disconnect
  // on the Integrations page is immediately reflected here without a reload.
  useEffect(() => {
    window.addEventListener('focus', refreshGoogleStatus)
    return () => window.removeEventListener('focus', refreshGoogleStatus)
  }, [refreshGoogleStatus])

  // Load templates once for the reply panel
  useEffect(() => {
    setReplyTplLoading(true)
    get<OutreachTemplate[]>('/api/v1/outreach/templates')
      .then(setReplyTemplates).catch(() => setReplyTemplates([])).finally(() => setReplyTplLoading(false))
  }, [])

  const applyReplyTemplate = (t: OutreachTemplate | null) => {
    setReplySelectedTpl(t)
    setReplyAiDone(false)
    if (t && selected) {
      setReplySubject(renderTemplate(t.subject, selected.candidate_name, selected.candidate_email, selected.role))
      setReplyBody(renderTemplate(t.body, selected.candidate_name, selected.candidate_email, selected.role))
    } else if (t) {
      setReplySubject(t.subject); setReplyBody(t.body)
    }
  }

  const generateReplyWithAI = async () => {
    if (!selected) return
    setReplyAiLoading(true); setReplyAiDone(false)
    try {
      const res = await post<{ body: string }>('/api/v1/outreach/generate-email', {
        candidate_name: selected.candidate_name,
        subject: replySubject || undefined,
        template_subject: replySelectedTpl?.subject || undefined,
        template_body: replySelectedTpl?.body || undefined,
      })
      setReplyBody(res.body)
      setReplyAiDone(true)
    } catch {
      setReplyAiDone(false)
    } finally {
      setReplyAiLoading(false)
    }
  }

  const fetchConversation = useCallback(async (candidateId: string) => {
    setConvLoading(true); setMessages([])
    try {
      const conv = await get<{ messages: EmailMessage[] }>(`/api/v1/conversations/${candidateId}`)
      setMessages(conv.messages ?? [])
    } catch { setMessages([]) }
    finally { setConvLoading(false) }
  }, [])

  useEffect(() => {
    if (!selected) return
    fetchConversation(selected.candidate_id)
    setReplySubject(`Re: ${selected.subject}`)
    setReplyBody('')
    setSendError(null)
  }, [selected, fetchConversation])

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages])

  const syncConversation = async () => {
    if (!selected) return
    setSyncing(true)
    try { await post(`/api/v1/conversations/${selected.candidate_id}/sync`, {}); await fetchConversation(selected.candidate_id) }
    finally { setSyncing(false) }
  }

  const sendReply = async () => {
    if (!selected || !replyBody.trim() || !replySubject.trim()) return
    setSending(true); setSendError(null)
    try {
      await post('/api/v1/outreach/send', { candidate_id: selected.candidate_id, candidate_email: selected.candidate_email, subject: replySubject, body: replyBody, provider: replyProvider })
      setReplyBody('')
      await fetchConversation(selected.candidate_id)
    } catch { setSendError(`Failed to send. Check your ${replyProvider === 'outlook' ? 'Outlook' : 'Gmail'} connection.`) }
    finally { setSending(false) }
  }

  // Split contacts into active / archived purely by client-side cache
  const activeContacts   = contacts.filter(c => !archivedIds.has(c.id))
  const archivedContacts = contacts.filter(c => archivedIds.has(c.id))
  const visibleContacts  = tab === 'active' ? activeContacts : archivedContacts

  const contactedIds = new Set(contacts.map(c => c.candidate_id))
  const q = search.toLowerCase()

  const filteredContacts = search
    ? visibleContacts.filter(c =>
        (c.candidate_name ?? '').toLowerCase().includes(q) ||
        (c.subject ?? '').toLowerCase().includes(q) ||
        (c.candidate_email ?? '').toLowerCase().includes(q)
      )
    : visibleContacts

  const unmatchedCandidates: ApiCandidate[] = search && tab === 'active'
    ? allCandidates.filter(c =>
        !contactedIds.has(c.id) && (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        )
      ).slice(0, 8)
    : []

  const statusCfg = selected ? (STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.sent) : null
  const sourceCfg = selected ? (SOURCE_CONFIG[selected.source] ?? SOURCE_CONFIG.sourced) : null

  const timelineRows = selected ? [
    selected.applied_at ? { label: 'Applied',    value: selected.applied_at, icon: UserPlus, iconColor: 'text-indigo-500', bg: 'bg-indigo-50' } : null,
    selected.sent_at    ? { label: 'Email sent',  value: selected.sent_at,    icon: Send,     iconColor: 'text-neutral-500', bg: 'bg-neutral-100' } : null,
    (!selected.sent_at && selected.scheduled_at) ? { label: 'Scheduled', value: selected.scheduled_at!, icon: Calendar, iconColor: 'text-blue-500', bg: 'bg-blue-50' } : null,
  ].filter(Boolean) as { label: string; value: string; icon: any; iconColor: string; bg: string }[]
  : []

  return (
    <div className="fixed flex overflow-hidden bg-white" style={{ top: 67, left: 220, right: 0, bottom: 0 }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
      <div className="w-[260px] flex-shrink-0 flex flex-col border-r border-neutral-100">
        <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-neutral-900 text-sm font-semibold">Outreach</h1>
            <button
              onClick={() => setPickerOpen(true)}
              className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center hover:bg-neutral-800 transition-colors"
              title="New outreach"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-neutral-300 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-neutral-400" />
              </button>
            )}
          </div>

          {/* Active / Archive tab toggle */}
          <div className="flex mt-2.5 gap-1 bg-neutral-100 rounded-lg p-0.5">
            <button
              onClick={() => { setTab('active'); setSelected(null) }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-all',
                tab === 'active' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              )}
            >
              <Inbox className="w-3 h-3" />
              Active
              {activeContacts.length > 0 && (
                <span className="text-[10px] bg-neutral-200 text-neutral-600 rounded-full px-1.5 py-px">{activeContacts.length}</span>
              )}
            </button>
            <button
              onClick={() => { setTab('archive'); setSelected(null) }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-all',
                tab === 'archive' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              )}
            >
              <Archive className="w-3 h-3" />
              Archive
              {archivedContacts.length > 0 && (
                <span className="text-[10px] bg-neutral-200 text-neutral-600 rounded-full px-1.5 py-px">{archivedContacts.length}</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-neutral-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : filteredContacts.length === 0 && unmatchedCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400 text-xs gap-2">
              {tab === 'archive'
                ? <><Archive className="w-6 h-6 text-neutral-200" />{search ? 'No archived results' : 'No archived contacts'}</>
                : <><Mail className="w-6 h-6 text-neutral-200" />{search ? 'No results found' : 'No contacts yet'}</>
              }
            </div>
          ) : (
            <>
              {filteredContacts.map((c, i) => {
                const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.sent
                const isActive = selected?.id === c.id
                const isArchived = archivedIds.has(c.id)
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="group relative"
                  >
                    <button
                      onClick={() => setSelected(c)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 border-b border-neutral-50 text-left transition-colors',
                        isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50/70'
                      )}
                    >
                      <div className="relative flex-shrink-0 mt-0.5">
                        <AvatarInitials name={c.candidate_name} size="sm" />
                        <span className={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white', cfg.dot)} />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-neutral-900 text-xs font-semibold truncate">{c.candidate_name}</p>
                          <span className="text-neutral-400 text-[10px] flex-shrink-0">
                            {c.sent_at ? formatRelativeTime(c.sent_at) : c.scheduled_at ? formatRelativeTime(c.scheduled_at) : '—'}
                          </span>
                        </div>
                        <p className="text-neutral-500 text-[11px] truncate mt-0.5">{c.subject}</p>
                        {!!c.unread && (
                          <span className="mt-1 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold px-1">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </button>
                    {/* Archive / unarchive button — appears on hover */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleArchive(c.id) }}
                      title={isArchived ? 'Move to Active' : 'Archive'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                    >
                      {isArchived
                        ? <Inbox className="w-3 h-3 text-neutral-500" />
                        : <Archive className="w-3 h-3 text-neutral-500" />
                      }
                    </button>
                  </motion.div>
                )
              })}

              {unmatchedCandidates.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-neutral-50 border-b border-neutral-100">
                    <p className="text-neutral-400 text-[10px] uppercase tracking-wide font-medium">Candidates</p>
                  </div>
                  {unmatchedCandidates.map((c, i) => (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setComposeTarget({ candidate_id: c.id, candidate_name: c.name, candidate_email: c.email })}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-neutral-50 text-left hover:bg-neutral-50/70 transition-colors"
                    >
                      <AvatarInitials name={c.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-neutral-900 text-xs font-semibold truncate">{c.name}</p>
                        <p className="text-neutral-400 text-[11px] truncate">{c.email}</p>
                      </div>
                      <span className="text-[10px] text-indigo-500 flex-shrink-0 flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                      </span>
                    </motion.button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CENTRE THREAD ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <AvatarInitials name={selected.candidate_name} size="sm" />
                <div className="min-w-0">
                  <p className="text-neutral-900 text-sm font-semibold truncate">{selected.candidate_name}</p>
                  <p className="text-neutral-400 text-xs truncate">{selected.candidate_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Archive toggle in thread header */}
                <button
                  onClick={() => toggleArchive(selected.id)}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {archivedIds.has(selected.id)
                    ? <><Inbox className="w-3 h-3" /> Unarchive</>
                    : <><Archive className="w-3 h-3" /> Archive</>
                  }
                </button>
                {googleStatus.gmail_connected && (
                  <button
                    onClick={syncConversation}
                    disabled={syncing}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <RefreshCw className={cn('w-3 h-3', syncing && 'animate-spin')} /> Sync
                  </button>
                )}
                {googleStatus.gmail_connected && (
                  <span className="flex items-center gap-1 text-xs text-green-700 border border-green-200 bg-green-50 px-2.5 py-1.5 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Gmail
                  </span>
                )}
                {googleStatus.outlook_connected && (
                  <span className="flex items-center gap-1 text-xs text-blue-700 border border-blue-200 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0078D4]" /> Outlook
                  </span>
                )}
                {!googleStatus.gmail_connected && !googleStatus.outlook_connected && (
                  <a href="/integrations" className="flex items-center gap-1.5 text-xs text-amber-700 border border-amber-200 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                    <AlertCircle className="w-3 h-3" /> Connect email
                  </a>
                )}
              </div>
            </div>

            <div className="px-5 py-2 bg-neutral-50/60 border-b border-neutral-100 flex-shrink-0">
              <p className="text-neutral-400 text-[10px] uppercase tracking-wider font-medium">Subject</p>
              <p className="text-neutral-800 text-xs font-medium mt-0.5">{selected.subject}</p>
            </div>

            <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {convLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-neutral-400 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading thread…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-neutral-400 text-xs gap-2">
                  <MessageSquare className="w-7 h-7 text-neutral-200" />
                  No messages yet — send the first email below.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-neutral-100" />
                    <span className="text-neutral-300 text-[10px]">Conversation started</span>
                    <div className="flex-1 h-px bg-neutral-100" />
                  </div>
                  {messages.map(msg => {
                    const isOut = msg.direction === 'outbound'
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn('flex gap-2 items-end', isOut ? 'justify-end' : 'justify-start')}
                      >
                        {!isOut && <AvatarInitials name={selected.candidate_name} size="sm" />}
                        <div className={cn(
                          'max-w-[66%] rounded-xl px-4 py-3 text-xs border',
                          isOut ? 'bg-neutral-950 text-white border-neutral-800' : 'bg-white text-neutral-800 border-neutral-200 shadow-sm'
                        )}>
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                              {isOut ? <><ArrowUp className="w-2.5 h-2.5" /> You</> : <><ArrowDown className="w-2.5 h-2.5" /> {selected.candidate_name}</>}
                            </span>
                            <span className={cn('text-[10px]', isOut ? 'text-neutral-500' : 'text-neutral-400')}>
                              {formatRelativeTime(msg.sent_at)}
                            </span>
                          </div>
                          <p className={cn('font-medium text-[11px] mb-1.5', isOut ? 'text-neutral-300' : 'text-neutral-500')}>{msg.subject}</p>
                          <p className={cn('leading-relaxed whitespace-pre-wrap', isOut ? 'text-neutral-100' : 'text-neutral-700')}>{msg.body_text ?? ''}</p>
                        </div>
                        {isOut && (
                          <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] text-white font-semibold flex-shrink-0">You</div>
                        )}
                      </motion.div>
                    )
                  })}
                </>
              )}
            </div>

            <div className="border-t border-neutral-100 px-4 pt-3 pb-4 flex-shrink-0 space-y-2">
              {sendError && (
                <div className="flex items-center gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" /> {sendError}
                </div>
              )}
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                <span className="text-neutral-400 text-[11px] w-12 flex-shrink-0">Subject</span>
                <input
                  value={replySubject}
                  onChange={e => { setReplySubject(e.target.value); setReplyAiDone(false) }}
                  className="flex-1 bg-transparent text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none"
                  placeholder="Email subject…"
                />
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden focus-within:border-violet-200 focus-within:bg-white transition-all">
                <div className="relative">
                  <textarea
                    value={replyBody}
                    onChange={e => { setReplyBody(e.target.value); setReplyAiDone(false) }}
                    placeholder={`Reply to ${selected.candidate_name}…`}
                    rows={4}
                    className="w-full bg-transparent px-4 pt-3 pb-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
                  />
                </div>
                <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-neutral-100 gap-2">
                  {/* Left: Template picker + AI generate */}
                  <div className="flex items-center gap-2 min-w-0">
                    <TemplatePicker
                      templates={replyTemplates}
                      loading={replyTplLoading}
                      selected={replySelectedTpl}
                      onSelect={applyReplyTemplate}
                    />
                    <button
                      onClick={generateReplyWithAI}
                      disabled={replyAiLoading}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0',
                        replyAiLoading
                          ? 'bg-neutral-100 text-neutral-400'
                          : replyAiDone
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gradient-to-r from-orange-500 to-violet-600 text-white hover:opacity-90'
                      )}
                    >
                      {replyAiLoading
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                        : replyAiDone
                        ? <><Check className="w-3 h-3" /> Generated</>
                        : <><Sparkles className="w-3 h-3" /> Generate with AI ✦</>}
                    </button>
                  </div>
                  {/* Right: Provider picker + Send */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ProviderPicker
                      value={replyProvider}
                      onChange={setReplyProvider}
                      gmailConnected={googleStatus.gmail_connected}
                      outlookConnected={googleStatus.outlook_connected}
                    />
                    <span className="text-[10px] text-neutral-300">⌘↵</span>
                    <button
                      onClick={sendReply}
                      disabled={sending || !replyBody.trim() || !replySubject.trim()}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        replyBody.trim() && replySubject.trim() ? 'bg-neutral-950 text-white hover:bg-neutral-800' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      )}
                    >
                      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 gap-3">
            {tab === 'archive'
              ? <><Archive className="w-8 h-8 text-neutral-200" /><p className="text-xs">Select an archived contact to view the thread</p></>
              : <><Mail className="w-8 h-8 text-neutral-200" /><p className="text-xs">Select a contact to view the thread</p></>
            }
            {tab === 'active' && (
              <button
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-2 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New outreach
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT DETAILS PANEL ──────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-l border-neutral-100 flex flex-col overflow-y-auto">
        {selected ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center px-4 pt-6 pb-4 gap-3"
            >
              <AvatarInitials name={selected.candidate_name} size="lg" />
              <div className="text-center">
                <p className="text-neutral-900 text-sm font-semibold">{selected.candidate_name}</p>
                <a href={`/candidates/${selected.candidate_id}`} className="text-indigo-600 text-[11px] hover:underline">
                  View profile →
                </a>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                {statusCfg && (
                  <span className={cn('flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', statusCfg.badge)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                )}
                {sourceCfg && (
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', sourceCfg.style)}>
                    {sourceCfg.label}
                  </span>
                )}
                {archivedIds.has(selected.id) && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-neutral-500 bg-neutral-100 border-neutral-200 flex items-center gap-1">
                    <Archive className="w-2.5 h-2.5" /> Archived
                  </span>
                )}
              </div>

              <div className="w-full border-t border-neutral-100 pt-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-3 h-3 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-neutral-400 text-[10px] uppercase tracking-wide font-medium">Mail</p>
                    <a href={`mailto:${selected.candidate_email}`} className="text-indigo-600 text-xs hover:underline truncate block">
                      {selected.candidate_email}
                    </a>
                  </div>
                </div>

                {selected.candidate_phone && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-3 h-3 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-neutral-400 text-[10px] uppercase tracking-wide font-medium">Phone</p>
                      <a href={`tel:${selected.candidate_phone}`} className="text-neutral-700 text-xs hover:underline">
                        {selected.candidate_phone}
                      </a>
                    </div>
                  </div>
                )}

                {selected.role && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Briefcase className="w-3 h-3 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-neutral-400 text-[10px] uppercase tracking-wide font-medium">Role</p>
                      <p className="text-neutral-700 text-xs">{selected.role}</p>
                    </div>
                  </div>
                )}

                {timelineRows.length > 0 && (
                  <div className="border-t border-neutral-100 pt-3">
                    <p className="text-neutral-400 text-[10px] uppercase tracking-wide font-medium mb-3">Timeline</p>
                    <div className="relative">
                      {timelineRows.length > 1 && (
                        <div className="absolute left-[9px] top-3 bottom-3 w-px bg-neutral-100 z-0" />
                      )}
                      <div className="space-y-3">
                        {timelineRows.map(row => (
                          <div key={row.label} className="flex items-start gap-2.5 relative z-10">
                            <div className={cn('w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white', row.bg)}>
                              <row.icon className={cn('w-2 h-2', row.iconColor)} />
                            </div>
                            <div>
                              <p className="text-neutral-600 text-[11px] font-medium leading-tight">{row.label}</p>
                              <p className="text-neutral-400 text-[10px]">{formatDate(row.value)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-300 text-xs text-center px-4">
            Select a contact to see their details
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <AnimatePresence>
        {pickerOpen && (
          <CandidatePickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={c => setComposeTarget({ candidate_id: c.id, candidate_name: c.name, candidate_email: c.email })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {composeTarget && (
          <ComposeModal
            target={composeTarget}
            googleStatus={googleStatus}
            onClose={() => setComposeTarget(null)}
            onSent={async () => { setComposeTarget(null); await loadContacts() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
