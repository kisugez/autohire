'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
import { post } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  name: string
  subject: string
  body: string
  category: string
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 't1', name: 'Initial Outreach', category: 'outreach',
    subject: 'Exciting opportunity at {{company}}',
    body: `Hi {{name}},\n\nI came across your profile and was really impressed by your background in {{skills}}. We have an exciting opportunity that I think would be a great fit for you.\n\nWould you be open to a quick 20-minute call this week to learn more?\n\nBest,\n{{sender}}`,
  },
  {
    id: 't2', name: 'Interview Invitation', category: 'interview',
    subject: 'Interview Invitation — {{role}} at {{company}}',
    body: `Hi {{name}},\n\nThank you for your application for the {{role}} position. We'd love to move forward and invite you to an interview.\n\nPlease let me know your availability this week and I'll send over a calendar invite.\n\nLooking forward to speaking with you!\n\nBest,\n{{sender}}`,
  },
  {
    id: 't3', name: 'Follow-up', category: 'followup',
    subject: 'Following up — {{role}} opportunity',
    body: `Hi {{name}},\n\nI wanted to follow up on my previous message about the {{role}} role. I'd still love to connect if you're open to it.\n\nBest,\n{{sender}}`,
  },
  {
    id: 't4', name: 'Offer Letter', category: 'offer',
    subject: 'Offer of Employment — {{role}}',
    body: `Hi {{name}},\n\nWe are thrilled to offer you the position of {{role}}. Please find the details of your offer attached.\n\nWe look forward to welcoming you to the team!\n\nBest,\n{{sender}}`,
  },
  {
    id: 't5', name: 'Rejection (Kind)', category: 'rejection',
    subject: 'Update on your application',
    body: `Hi {{name}},\n\nThank you so much for taking the time to apply and interview with us. After careful consideration, we've decided to move forward with another candidate at this time.\n\nWe were genuinely impressed with your background and hope to stay in touch for future opportunities.\n\nBest of luck,\n{{sender}}`,
  },
]

interface Props {
  open: boolean
  onClose: () => void
  candidateId: string
  candidateName: string
  candidateEmail: string
  gmailConnected: boolean
  gmailEmail?: string
}

const FIELD = 'w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

export default function ComposeEmailModal({
  open, onClose, candidateId, candidateName, candidateEmail, gmailConnected, gmailEmail,
}: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyTemplate = (t: Template) => {
    const fill = (s: string) => s
      .replace(/{{name}}/g, candidateName.split(' ')[0])
      .replace(/{{company}}/g, 'our company')
      .replace(/{{role}}/g, 'the role')
      .replace(/{{skills}}/g, 'your experience')
      .replace(/{{sender}}/g, gmailEmail ?? 'The Team')
    setSubject(fill(t.subject))
    setBody(fill(t.body))
    setSelectedTemplate(t.id)
    setShowTemplates(false)
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { setError('Subject and message are required.'); return }
    setSending(true)
    setError(null)
    try {
      const bodyHtml = body.replace(/\n/g, '<br/>')
      await post('/api/v1/conversations/send', {
        candidate_id: candidateId,
        subject,
        body_html: bodyHtml,
        body_text: body,
      })
      setSent(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to send email.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setSent(false)
    setError(null)
    setSubject('')
    setBody('')
    setSelectedTemplate(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-neutral-600" />
                </div>
                <div>
                  <h2 className="text-neutral-950 text-sm font-semibold">New Email</h2>
                  <p className="text-neutral-400 text-xs">To: {candidateName} · {candidateEmail}</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {sent ? (
                <div className="flex flex-col items-center py-10 gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-neutral-950 font-semibold mb-1">Email Sent!</h3>
                    <p className="text-neutral-500 text-sm">Your message to {candidateName} was sent via Gmail and saved to the conversation.</p>
                  </div>
                  <button onClick={handleClose} className="text-sm text-neutral-500 hover:text-neutral-700">Close</button>
                </div>
              ) : (
                <>
                  {!gmailConnected && (
                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Gmail not connected. Go to <strong>Integrations</strong> to connect your Gmail and send real emails.</span>
                    </div>
                  )}

                  {/* Template picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplates(v => !v)}
                      className="flex items-center gap-2 text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {selectedTemplate ? `Template: ${DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}` : 'Use a template'}
                      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showTemplates && 'rotate-180')} />
                    </button>
                    {showTemplates && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-7 left-0 z-10 bg-white border border-neutral-200 rounded-xl shadow-lg w-72 py-1 overflow-hidden"
                      >
                        {DEFAULT_TEMPLATES.map(t => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 text-left transition-colors"
                          >
                            <span className="font-medium">{t.name}</span>
                            <span className="text-xs text-neutral-400 capitalize">{t.category}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* From */}
                  {gmailConnected && gmailEmail && (
                    <div className="text-xs text-neutral-400 -mt-2">
                      From: <span className="text-neutral-600 font-medium">{gmailEmail}</span>
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className={LABEL}>Subject</label>
                    <input className={FIELD} placeholder="Email subject…" value={subject} onChange={e => setSubject(e.target.value)} />
                  </div>

                  {/* Body */}
                  <div>
                    <label className={LABEL}>Message</label>
                    <textarea
                      rows={9}
                      className={cn(FIELD, 'resize-none font-mono text-xs')}
                      placeholder="Write your message…"
                      value={body}
                      onChange={e => setBody(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            {!sent && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
                <button onClick={handleClose} className="px-4 py-2 text-sm text-neutral-600 border border-neutral-200 bg-white rounded-lg hover:border-neutral-300 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !gmailConnected}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Mail className="w-3.5 h-3.5" /> Send via Gmail</>}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
