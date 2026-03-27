'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Linkedin, Github, Mail, MessageSquare, Calendar, Database, CheckCircle, XCircle, RefreshCw, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { get, delete as del } from '@/lib/api'

interface GoogleStatus {
  gmail_connected: boolean
  gmail_email?: string
  gcal_connected: boolean
}

const staticIntegrations = [
  {
    id: 'linkedin', name: 'LinkedIn', category: 'Sourcing',
    description: 'Source candidates from LinkedIn Recruiter and track profile views',
    icon: Linkedin, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    connected: true, lastSync: '5 minutes ago', managed: false,
  },
  {
    id: 'github', name: 'GitHub', category: 'Sourcing',
    description: 'Discover developers via repositories, stars, and contribution graphs',
    icon: Github, color: 'text-neutral-700', bg: 'bg-neutral-100', border: 'border-neutral-200',
    connected: true, lastSync: '1 hour ago', managed: false,
  },
  {
    id: 'slack', name: 'Slack', category: 'Notifications',
    description: 'Get real-time notifications and hiring updates in your Slack workspace',
    icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200',
    connected: false, lastSync: null, managed: false,
  },
  {
    id: 'greenhouse', name: 'Greenhouse ATS', category: 'ATS',
    description: 'Sync candidate data, job postings and interview feedback with Greenhouse',
    icon: Database, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',
    connected: false, lastSync: null, managed: false,
  },
  {
    id: 'lever', name: 'Lever ATS', category: 'ATS',
    description: 'Bi-directional sync with Lever for pipeline and candidate management',
    icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200',
    connected: false, lastSync: null, managed: false,
  },
  {
    id: 'workday', name: 'Workday', category: 'ATS',
    description: 'Enterprise HR integration for seamless hiring workflow management',
    icon: Database, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',
    connected: false, lastSync: null, managed: false,
  },
]

const categories = ['All', 'Sourcing', 'Communication', 'Scheduling', 'Notifications', 'ATS']

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const [activeCategory, setActiveCategory] = useState('All')
  const [googleStatus, setGoogleStatus]     = useState<GoogleStatus>({ gmail_connected: false, gcal_connected: false })
  const [loading, setLoading]               = useState(true)
  const [connectingId, setConnectingId]     = useState<string | null>(null)
  const [toast, setToast]                   = useState<string | null>(null)

  useEffect(() => {
    // Check for OAuth callback success params
    const gmailDone = searchParams.get('gmail')
    const gcalDone  = searchParams.get('gcal')
    if (gmailDone === 'connected') showToast('Gmail connected successfully!')
    if (gcalDone  === 'connected') showToast('Google Calendar connected successfully!')
  }, [searchParams])

  useEffect(() => {
    get<GoogleStatus>('/api/v1/google/status')
      .then(s => setGoogleStatus(s))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const connectGmail = async () => {
    setConnectingId('gmail')
    try {
      const { url } = await get<{ url: string }>('/api/v1/google/gmail/connect')
      window.location.href = url
    } catch {
      showToast('Failed to start Gmail OAuth.')
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
      showToast('Failed to disconnect Gmail.')
    } finally {
      setConnectingId(null)
    }
  }

  const connectGcal = async () => {
    setConnectingId('gcal')
    try {
      const { url } = await get<{ url: string }>('/api/v1/google/calendar/connect')
      window.location.href = url
    } catch {
      showToast('Failed to start Google Calendar OAuth.')
      setConnectingId(null)
    }
  }

  const disconnectGcal = async () => {
    setConnectingId('gcal')
    try {
      await del('/api/v1/google/calendar/disconnect')
      setGoogleStatus(s => ({ ...s, gcal_connected: false }))
      showToast('Google Calendar disconnected.')
    } catch {
      showToast('Failed to disconnect Google Calendar.')
    } finally {
      setConnectingId(null)
    }
  }

  // Merge Google integrations into the card list
  const allIntegrations = [
    {
      id: 'gmail', name: 'Gmail', category: 'Communication',
      description: 'Send and track outreach emails directly from your Gmail account. Replies sync automatically.',
      icon: Mail, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
      connected: googleStatus.gmail_connected,
      lastSync: googleStatus.gmail_connected ? 'Just now' : null,
      managed: true,
      subtitle: googleStatus.gmail_email,
      onConnect: connectGmail,
      onDisconnect: disconnectGmail,
    },
    {
      id: 'gcal', name: 'Google Calendar', category: 'Scheduling',
      description: 'Auto-schedule interviews with Google Calendar. Generates Meet links and sends invites to both parties.',
      icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
      connected: googleStatus.gcal_connected,
      lastSync: googleStatus.gcal_connected ? 'Just now' : null,
      managed: true,
      subtitle: googleStatus.gcal_connected ? 'Calendar events & Meet links enabled' : null,
      onConnect: connectGcal,
      onDisconnect: disconnectGcal,
    },
    ...staticIntegrations,
  ]

  const filtered = activeCategory === 'All'
    ? allIntegrations
    : allIntegrations.filter(i => i.category === activeCategory)

  const connectedCount = allIntegrations.filter(i => i.connected).length

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-neutral-950 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg"
        >
          <CheckCircle className="w-4 h-4 text-green-400" />
          {toast}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Integrations</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${connectedCount} of ${allIntegrations.length} connected`}
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
              activeCategory === cat
                ? 'bg-neutral-950 text-white border-neutral-950'
                : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:text-neutral-700',
            )}>
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((integration, i) => {
          const Icon = integration.icon
          const isConnecting = connectingId === integration.id
          const managed = 'managed' in integration && integration.managed

          return (
            <motion.div key={integration.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', integration.bg, integration.border)}>
                    <Icon className={cn('w-5 h-5', integration.color)} />
                  </div>
                  <div>
                    <p className="text-neutral-900 text-sm font-semibold">{integration.name}</p>
                    <span className="text-xs text-neutral-400">{integration.category}</span>
                    {'subtitle' in integration && integration.subtitle && (
                      <p className="text-xs text-neutral-500 mt-0.5 font-medium">{integration.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {integration.connected ? (
                    <><CheckCircle className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600 font-medium">Connected</span></>
                  ) : (
                    <><XCircle className="w-3.5 h-3.5 text-neutral-300" /><span className="text-neutral-400">Not connected</span></>
                  )}
                </div>
              </div>

              <p className="text-neutral-500 text-xs mb-4 leading-relaxed">{integration.description}</p>

              <div className="flex items-center justify-between">
                <div>
                  {integration.lastSync ? (
                    <p className="text-neutral-400 text-xs flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Last sync: {integration.lastSync}
                    </p>
                  ) : (
                    <p className="text-neutral-300 text-xs">Never synced</p>
                  )}
                </div>

                {managed ? (
                  integration.connected ? (
                    <button
                      onClick={'onDisconnect' in integration ? integration.onDisconnect : undefined}
                      disabled={isConnecting}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-500 bg-white hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Disconnect'}
                    </button>
                  ) : (
                    <button
                      onClick={'onConnect' in integration ? integration.onConnect : undefined}
                      disabled={isConnecting}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isConnecting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
                        : <><ExternalLink className="w-3.5 h-3.5" /> Connect</>
                      }
                    </button>
                  )
                ) : (
                  <button className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-lg transition-all',
                    integration.connected
                      ? 'text-neutral-500 bg-white border border-neutral-200 hover:border-neutral-300'
                      : 'text-white bg-neutral-950 hover:bg-neutral-800',
                  )}>
                    {integration.connected ? 'Manage' : 'Connect'}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
