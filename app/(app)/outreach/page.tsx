'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Mail, Clock, CheckCircle, Eye, MessageSquare, Send, Calendar, Loader2, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import SearchInput from '@/components/cards/search-input'
import FilterDropdown from '@/components/cards/filter-dropdown'
import ComposeEmailModal from '@/components/candidates/compose-email-modal'
import { formatDate, cn } from '@/lib/utils'
import api, { get, post } from '@/lib/api'

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Scheduled',  value: 'scheduled' },
  { label: 'Sent',       value: 'sent' },
  { label: 'Opened',     value: 'opened' },
  { label: 'Replied',    value: 'replied' },
  { label: 'Bounced',    value: 'bounced' },
]

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  scheduled: { color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',    icon: Calendar },
  sent:      { color: 'text-neutral-500', bg: 'bg-neutral-100 border-neutral-200', icon: Send },
  opened:    { color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',   icon: Eye },
  replied:   { color: 'text-green-600',   bg: 'bg-green-50 border-green-200',   icon: MessageSquare },
  bounced:   { color: 'text-red-600',     bg: 'bg-red-50 border-red-200',       icon: Mail },
}

interface OutreachMessage {
  id: string
  candidate_id: string
  subject: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  opened_at: string | null
  replied_at: string | null
  created_at: string
  candidate_name?: string
  candidate_email?: string
}

interface OutreachTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
  uses: number
  created_at: string
}

interface GoogleStatus {
  gmail_connected: boolean
  gmail_email?: string
  gcal_connected: boolean
}

const TEMPLATE_DEFAULTS = [
  { name: 'Initial Outreach',     category: 'outreach',   subject: 'Exciting opportunity at {{company}}', body: 'Hi {{name}},\n\nI came across your profile and was impressed by your background. We have an exciting opportunity that I think would be a great fit.\n\nWould you be open to a quick call this week?\n\nBest,\n{{sender}}' },
  { name: '3-Day Follow-up',      category: 'followup',   subject: 'Following up — {{role}} opportunity', body: 'Hi {{name}},\n\nJust following up on my previous message about the {{role}} role. Still very interested in connecting!\n\nBest,\n{{sender}}' },
  { name: 'Interview Invitation', category: 'interview',  subject: 'Interview Invitation — {{role}}',     body: 'Hi {{name}},\n\nThank you for your application. We\'d love to invite you to interview for the {{role}} position.\n\nPlease share your availability and we\'ll send a calendar invite.\n\nBest,\n{{sender}}' },
  { name: 'Offer Letter',         category: 'offer',      subject: 'Offer of Employment — {{role}}',      body: 'Hi {{name}},\n\nWe are thrilled to offer you the {{role}} position. Please find the offer details attached.\n\nLooking forward to welcoming you!\n\nBest,\n{{sender}}' },
  { name: 'Rejection (Kind)',     category: 'rejection',  subject: 'Update on your application',          body: 'Hi {{name}},\n\nThank you for your time and interest. After careful consideration we have decided to move forward with another candidate.\n\nWe were impressed with your background and will keep you in mind for future opportunities.\n\nBest,\n{{sender}}' },
]

export default function OutreachPage() {
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeTab, setActiveTab]     = useState<'messages' | 'templates' | 'sequences'>('messages')

  const [messages, setMessages]       = useState<OutreachMessage[]>([])
  const [templates, setTemplates]     = useState<OutreachTemplate[]>([])
  const [loading, setLoading]         = useState(true)
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ gmail_connected: false, gcal_connected: false })

  // Compose modal state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeCandidateId, setComposeCandidateId]     = useState('')
  const [composeCandidateName, setComposeCandidateName] = useState('')
  const [composeCandidateEmail, setComposeCandidateEmail] = useState('')

  // Template form
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', category: 'outreach' })
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [msgs, tpls, gStatus] = await Promise.all([
          get<OutreachMessage[]>('/api/v1/outreach/messages').catch(() => []),
          get<OutreachTemplate[]>('/api/v1/outreach/templates').catch(() => []),
          get<GoogleStatus>('/api/v1/google/status').catch(() => ({ gmail_connected: false, gcal_connected: false } as GoogleStatus)),
        ])
        setMessages(msgs)
        setTemplates(tpls)
        setGoogleStatus(gStatus)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = messages.filter(m => {
    const matchSearch = (m.subject ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.candidate_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || m.status === statusFilter
    return matchSearch && matchStatus
  })

  const openCompose = (msg: OutreachMessage) => {
    setComposeCandidateId(msg.candidate_id)
    setComposeCandidateName(msg.candidate_name ?? '')
    setComposeCandidateEmail(msg.candidate_email ?? '')
    setComposeOpen(true)
  }

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      setTemplateError('Name, subject and body are required.')
      return
    }
    setSavingTemplate(true)
    setTemplateError(null)
    try {
      if (editingTemplate) {
        // In a real app: PATCH /api/v1/outreach/templates/:id
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t))
      } else {
        const created = await post<OutreachTemplate>('/api/v1/outreach/templates', templateForm)
        setTemplates(prev => [created, ...prev])
      }
      setNewTemplate(false)
      setEditingTemplate(null)
      setTemplateForm({ name: '', subject: '', body: '', category: 'outreach' })
    } catch {
      setTemplateError('Failed to save template.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const seedTemplates = async () => {
    setSavingTemplate(true)
    try {
      const created = await Promise.all(
        TEMPLATE_DEFAULTS.map(t => post<OutreachTemplate>('/api/v1/outreach/templates', t).catch(() => null))
      )
      const valid = created.filter(Boolean) as OutreachTemplate[]
      setTemplates(prev => [...valid, ...prev])
    } finally {
      setSavingTemplate(false)
    }
  }

  // Stats
  const sentCount     = messages.filter(m => ['sent','opened','replied'].includes(m.status)).length
  const openedCount   = messages.filter(m => ['opened','replied'].includes(m.status)).length
  const repliedCount  = messages.filter(m => m.status === 'replied').length
  const scheduledCount = messages.filter(m => m.status === 'scheduled').length
  const openRate  = sentCount > 0 ? Math.round((openedCount  / sentCount) * 100) : 0
  const replyRate = sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Outreach</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            Manage candidate communications
            {googleStatus.gmail_connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Gmail connected
              </span>
            )}
          </p>
        </div>
        {!googleStatus.gmail_connected && (
          <a href="/integrations" className="flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors font-medium">
            <Mail className="w-4 h-4" /> Connect Gmail
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Sent',       value: sentCount,     icon: Send,         color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Open Rate',  value: `${openRate}%`, icon: Eye,         color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Reply Rate', value: `${replyRate}%`, icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Scheduled',  value: scheduledCount, icon: Clock,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.bg)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div>
              <p className="text-neutral-400 text-xs">{stat.label}</p>
              <p className="text-neutral-950 text-xl font-bold">{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
        {(['messages', 'templates', 'sequences'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
              activeTab === tab ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search messages…" className="w-72" />
            <FilterDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>

          {!googleStatus.gmail_connected && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Connect your Gmail in <a href="/integrations" className="underline font-medium">Integrations</a> to send real emails and see them tracked here.</span>
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-neutral-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-400 text-sm gap-2">
                <Mail className="w-8 h-8 text-neutral-200" />
                <span>No messages yet. Go to a candidate profile to send the first email.</span>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100">
                    {['Candidate', 'Subject', 'Status', 'Sent', 'Opened', 'Replied', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((msg, i) => {
                    const config = statusConfig[msg.status] ?? statusConfig.sent
                    const StatusIcon = config.icon
                    return (
                      <motion.tr key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="hover:bg-neutral-50 transition-colors group">
                        <td className="px-5 py-3.5">
                          <p className="text-neutral-900 text-sm font-medium">{msg.candidate_name ?? '—'}</p>
                          <p className="text-neutral-400 text-xs">{msg.candidate_email ?? ''}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-neutral-600 text-sm truncate max-w-[260px]">{msg.subject}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border capitalize', config.bg, config.color)}>
                            <StatusIcon className="w-3 h-3" /> {msg.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500 text-sm">{msg.sent_at ? formatDate(msg.sent_at) : msg.scheduled_at ? `Scheduled ${formatDate(msg.scheduled_at)}` : '—'}</td>
                        <td className="px-5 py-3.5 text-neutral-500 text-sm">{msg.opened_at ? formatDate(msg.opened_at) : '—'}</td>
                        <td className="px-5 py-3.5 text-neutral-500 text-sm">{msg.replied_at ? formatDate(msg.replied_at) : '—'}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => openCompose(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            <Send className="w-3.5 h-3.5" /> Reply
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </motion.div>
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setNewTemplate(true); setEditingTemplate(null); setTemplateForm({ name: '', subject: '', body: '', category: 'outreach' }) }}
              className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> New Template
            </button>
            {templates.length === 0 && (
              <button onClick={seedTemplates} disabled={savingTemplate}
                className="flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors font-medium">
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Load Default Templates
              </button>
            )}
          </div>

          {(newTemplate || editingTemplate) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
              <h3 className="text-neutral-900 text-sm font-semibold">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Name</label>
                  <input className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                    value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="Template name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Category</label>
                  <select className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                    value={templateForm.category} onChange={e => setTemplateForm(p => ({ ...p, category: e.target.value }))}>
                    {['outreach','followup','interview','offer','rejection'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Subject</label>
                <input className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                  value={templateForm.subject} onChange={e => setTemplateForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject — use {{name}}, {{role}}, {{company}}" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Body</label>
                <textarea rows={7} className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all resize-none font-mono text-xs"
                  value={templateForm.body} onChange={e => setTemplateForm(p => ({ ...p, body: e.target.value }))} placeholder="Email body — use {{name}}, {{role}}, {{company}}, {{sender}}" />
                <p className="text-xs text-neutral-400 mt-1">Variables: {'{{name}} {{role}} {{company}} {{sender}}'}</p>
              </div>
              {templateError && <p className="text-xs text-red-600">{templateError}</p>}
              <div className="flex items-center gap-2">
                <button onClick={saveTemplate} disabled={savingTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors">
                  {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
                <button onClick={() => { setNewTemplate(false); setEditingTemplate(null) }}
                  className="px-4 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-neutral-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template, i) => (
                <motion.div key={template.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-neutral-900 text-sm font-semibold">{template.name}</p>
                        <span className="text-xs text-neutral-400 capitalize">{template.category}</span>
                      </div>
                    </div>
                    <button onClick={() => { setEditingTemplate(template); setNewTemplate(false); setTemplateForm({ name: template.name, subject: template.subject, body: template.body, category: template.category }) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2 font-medium truncate">{template.subject}</p>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{template.body}</p>
                  <p className="text-xs text-neutral-300 mt-3">{template.uses} uses</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sequences Tab */}
      {activeTab === 'sequences' && (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400 text-sm gap-3 bg-white border border-neutral-200 rounded-xl">
            <Mail className="w-8 h-8 text-neutral-200" />
            <span>Sequences coming soon — create automated multi-step email campaigns.</span>
          </div>
        </div>
      )}

      {/* Compose modal */}
      <ComposeEmailModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        candidateId={composeCandidateId}
        candidateName={composeCandidateName}
        candidateEmail={composeCandidateEmail}
        gmailConnected={googleStatus.gmail_connected}
        gmailEmail={googleStatus.gmail_email}
      />
    </div>
  )
}
