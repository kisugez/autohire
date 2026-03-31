'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle, XCircle, Loader2, ExternalLink, Search,
  Pencil, Users, Zap, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { get, delete as del } from '@/lib/api'

// ── Brand SVG Icons ──────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const BaytIcon = () => (
  <svg viewBox="0 0 40 40" className="w-5 h-5">
    <rect width="40" height="40" rx="8" fill="#C8102E"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">B</text>
  </svg>
)

const IndeedIcon = () => (
  <svg viewBox="0 0 40 40" className="w-5 h-5">
    <rect width="40" height="40" rx="8" fill="#2164F3"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">in</text>
  </svg>
)

const AshbyIcon = () => (
  <svg viewBox="0 0 40 40" className="w-9 h-9">
    <rect width="40" height="40" rx="8" fill="#4F46E5"/>
    <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Georgia, serif">A</text>
  </svg>
)

const LeverIcon = () => (
  <svg viewBox="0 0 40 40" className="w-9 h-9">
    <rect width="40" height="40" rx="8" fill="#f5f5f5" stroke="#e5e5e5"/>
    <line x1="10" y1="20" x2="30" y2="20" stroke="#555" strokeWidth="3" strokeLinecap="round"/>
    <line x1="10" y1="13" x2="25" y2="13" stroke="#555" strokeWidth="3" strokeLinecap="round"/>
    <line x1="10" y1="27" x2="20" y2="27" stroke="#555" strokeWidth="3" strokeLinecap="round"/>
  </svg>
)

const GreenhouseIcon = () => (
  <svg viewBox="0 0 40 40" className="w-9 h-9">
    <rect width="40" height="40" rx="8" fill="#fff" stroke="#e5e5e5"/>
    <path d="M20 8C13.37 8 8 13.37 8 20s5.37 12 12 12 12-5.37 12-12S26.63 8 20 8zm0 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18z" fill="#24A148"/>
    <circle cx="20" cy="20" r="4" fill="#24A148"/>
  </svg>
)

const RecruiterFlowIcon = () => (
  <svg viewBox="0 0 40 40" className="w-9 h-9">
    <rect width="40" height="40" rx="8" fill="#3B82F6"/>
    <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">rf</text>
  </svg>
)

// ── Types ─────────────────────────────────────────────────────────
interface GoogleStatus {
  gmail_connected: boolean
  gmail_email?: string
  gcal_connected: boolean
}

// ── ATS entries ───────────────────────────────────────────────────
const ATS_INTEGRATIONS = [
  { id: 'ashby',         name: 'Ashby',         Icon: AshbyIcon },
  { id: 'lever',         name: 'Lever',          Icon: LeverIcon },
  { id: 'greenhouse',    name: 'Greenhouse',     Icon: GreenhouseIcon },
  { id: 'recruiterflow', name: 'RecruiterFlow',  Icon: RecruiterFlowIcon },
]

// ── Job Network entries ───────────────────────────────────────────
const JOB_NETWORK = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Source and import candidates directly from LinkedIn talent network.',
    Icon: LinkedInIcon,
  },
  {
    id: 'bayt',
    name: 'Bayt',
    description: "Access the Middle East's largest professional jobs & talent platform.",
    Icon: BaytIcon,
  },
  {
    id: 'indeed',
    name: 'Indeed',
    description: "Post jobs and source candidates from the world's #1 job site.",
    Icon: IndeedIcon,
  },
]

// ── Page ──────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ gmail_connected: false, gcal_connected: false })
  const [loading, setLoading]           = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)
  const [search, setSearch]             = useState('')

  useEffect(() => {
    const gmailDone = searchParams.get('gmail')
    const gcalDone  = searchParams.get('gcal')
    if (gmailDone === 'connected') showToast('Gmail connected successfully!', true)
    if (gcalDone  === 'connected') showToast('Google Calendar connected successfully!', true)
  }, [searchParams])

  useEffect(() => {
    get<GoogleStatus>('/api/v1/google/status')
      .then(s => setGoogleStatus(s))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const connectGmail = async () => {
    setConnectingId('gmail')
    try {
      const { url } = await get<{ url: string }>('/api/v1/google/gmail/connect')
      window.location.href = url
    } catch {
      showToast('Failed to start Gmail OAuth.', false)
      setConnectingId(null)
    }
  }

  const disconnectGmail = async () => {
    setConnectingId('gmail')
    try {
      await del('/api/v1/google/gmail/disconnect')
      setGoogleStatus(s => ({ ...s, gmail_connected: false, gmail_email: undefined }))
      showToast('Gmail disconnected.')
    } catch {
      showToast('Failed to disconnect Gmail.', false)
    } finally { setConnectingId(null) }
  }

  const isGmailConnecting = connectingId === 'gmail'

  return (
    <div className="space-y-8 pt-2">

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className={cn(
            'fixed top-4 right-4 z-50 flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl shadow-lg',
            toast.ok ? 'bg-neutral-950 text-white' : 'bg-red-600 text-white',
          )}
        >
          <CheckCircle className="w-4 h-4 text-green-400" />
          {toast.msg}
        </motion.div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Integrations Marketplace</h1>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50 focus-within:bg-white focus-within:border-neutral-300 transition-colors">
          <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for integrations"
            className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 outline-none"
          />
        </div>
        <button className="flex items-center gap-1.5 text-sm text-neutral-600 border border-neutral-200 bg-white hover:bg-neutral-50 px-3 py-2 rounded-lg transition-colors font-medium">
          Request Integration
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Email Integration ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-neutral-900 text-base font-semibold">Email Integration</h2>
          <p className="text-neutral-400 text-xs mt-0.5">Connect your email account to send automated outreach sequences</p>
        </div>

        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1.2fr_1.4fr_1.6fr_1fr_1.2fr_1fr_1fr] bg-neutral-50 border-b border-neutral-200 px-4 py-2.5">
            {['Provider', 'Sender Name', 'Email Address', 'Max / Day', 'Signature', 'Status', 'Actions'].map(h => (
              <span key={h} className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {/* Gmail row */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-neutral-400 text-xs gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid grid-cols-[1.2fr_1.4fr_1.6fr_1fr_1.2fr_1fr_1fr] items-center px-4 py-3.5 hover:bg-neutral-50/50 transition-colors">
              {/* Provider */}
              <div className="flex items-center gap-2">
                <GoogleIcon />
                <span className="text-sm font-medium text-neutral-800">Gmail</span>
              </div>

              {/* Sender Name */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-700">
                  {googleStatus.gmail_connected ? 'AutoHyre User' : '—'}
                </span>
                {googleStatus.gmail_connected && (
                  <button className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-700 truncate">
                  {googleStatus.gmail_email ?? (googleStatus.gmail_connected ? '—' : 'Not connected')}
                </span>
                {googleStatus.gmail_connected && (
                  <button className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Max / day */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-700">{googleStatus.gmail_connected ? '100' : '—'}</span>
                {googleStatus.gmail_connected && (
                  <button className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Signature */}
              <div>
                {googleStatus.gmail_connected ? (
                  <div className="flex items-center gap-1.5 border border-neutral-200 rounded-md px-2 py-1 bg-white w-fit">
                    <span className="text-xs text-neutral-500">No signature</span>
                    <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                ) : (
                  <span className="text-sm text-neutral-400">—</span>
                )}
              </div>

              {/* Status */}
              <div>
                {googleStatus.gmail_connected ? (
                  <span className="text-xs font-semibold text-green-600">Connected</span>
                ) : (
                  <span className="text-xs text-neutral-400">Not connected</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                {googleStatus.gmail_connected ? (
                  <>
                    <button
                      onClick={disconnectGmail}
                      disabled={isGmailConnecting}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                      {isGmailConnecting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Disconnect'}
                    </button>
                    <button className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100 transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100 transition-colors">
                      <Users className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={connectGmail}
                    disabled={isGmailConnecting}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {isGmailConnecting
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Connecting…</>
                      : <><ExternalLink className="w-3 h-3" /> Connect</>
                    }
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Job Network ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-neutral-900 text-base font-semibold">Job Network</h2>
          <p className="text-neutral-400 text-xs mt-0.5">Import candidates and post jobs to leading recruitment platforms.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {JOB_NETWORK.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="border border-neutral-200 rounded-xl p-4 bg-white flex flex-col gap-3 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                  <item.Icon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-x">
                    <Zap className="w-2.5 h-2.5" /> Easy Access
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">{item.description}</p>
              <div className="flex items-center justify-between pt-0.5">
                <button className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors font-medium">
                  Learn More
                </button>
                <button className="text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                  Install
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── ATS ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-neutral-900 text-base font-semibold">Applicant Tracking Systems (ATS)</h2>
          <p className="text-neutral-400 text-xs mt-0.5">ATS integrations help you export candidates from AutoHyre to your ATS.</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {ATS_INTEGRATIONS.map((ats, i) => (
            <motion.div
              key={ats.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="border border-neutral-200 rounded-xl p-4 bg-white hover:border-neutral-300 hover:shadow-sm transition-all flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <ats.Icon />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{ats.name}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-x">
                    <Zap className="w-2.5 h-2.5" /> Easy Access
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <button className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors font-medium">
                  Learn More
                </button>
                <button className="text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                  Activate
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  )
}