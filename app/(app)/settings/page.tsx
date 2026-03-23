'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building, Users, Mail, Zap, Key, CreditCard,
  Eye, EyeOff, Check, Copy, Loader2, AlertCircle, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrg, useJobs } from '@/lib/hooks'
import { useAuth } from '@/lib/auth-context'

const sections = [
  { id: 'organization', label: 'Organization',       icon: Building  },
  { id: 'users',        label: 'Users & Roles',      icon: Users     },
  { id: 'email',        label: 'Email Settings',     icon: Mail      },
  { id: 'automation',   label: 'Automation',         icon: Zap       },
  { id: 'api',          label: 'API Keys',           icon: Key       },
  { id: 'billing',      label: 'Billing',            icon: CreditCard},
]

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
        enabled ? 'bg-neutral-950' : 'bg-neutral-200'
      )}
    >
      <span className={cn(
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
        enabled ? 'translate-x-4' : 'translate-x-0'
      )} />
    </button>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { org, loading: orgLoading, error: orgError } = useOrg()
  const { jobs, loading: jobsLoading } = useJobs()

  const [activeSection, setActiveSection] = useState('organization')
  const [showApiKey, setShowApiKey]       = useState(false)
  const [copied, setCopied]               = useState(false)

  // Org form
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [orgSaved, setOrgSaved] = useState(false)

  // Email settings (local)
  const [senderName, setSenderName]   = useState('')
  const [replyTo, setReplyTo]         = useState('')
  const [signature, setSignature]     = useState('')
  const [trackOpens, setTrackOpens]   = useState(true)

  // Automation toggles (local)
  const [autoSettings, setAutoSettings] = useState({
    autoScore:       true,
    autoOutreach:    true,
    interviewReminders: true,
    autoReject:      false,
    weeklyDigest:    true,
  })

  useEffect(() => {
    if (org) { setOrgName(org.name); setOrgSlug(org.slug) }
  }, [org])

  useEffect(() => {
    if (user) {
      setSenderName(`${user.name} at ${org?.name ?? 'our company'}`)
      setReplyTo(user.email)
      setSignature(`Best regards,\n${user.name}`)
    }
  }, [user, org])

  const apiKey    = 'sk_live_autohyre_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  const maskedKey = 'sk_live_autohyre_••••••••••••••••••••••••••••••'

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeJobs   = jobs.filter(j => j.status === 'active').length
  const plan         = org?.plan ?? 'free'
  const planLabel    = plan === 'pro' ? 'Pro Plan' : plan === 'enterprise' ? 'Enterprise' : plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-neutral-950 text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Manage your workspace preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  activeSection === section.id
                    ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/70'
                )}
              >
                <section.icon className="w-4 h-4 flex-shrink-0" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >

            {/* ── ORGANIZATION ─────────────────────────────────── */}
            {activeSection === 'organization' && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
                <h2 className="text-neutral-900 text-sm font-semibold">Organization Details</h2>

                {orgLoading ? (
                  <div className="flex items-center gap-2 text-neutral-400 text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : orgError ? (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{orgError}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Organisation Name</label>
                        <input
                          type="text"
                          value={orgName}
                          onChange={e => setOrgName(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Slug</label>
                        <input
                          type="text"
                          value={orgSlug}
                          onChange={e => setOrgSlug(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Plan</label>
                        <input
                          readOnly
                          value={planLabel}
                          className="w-full bg-neutral-100 border border-neutral-200 text-neutral-400 text-sm rounded-lg px-3 py-2 cursor-not-allowed capitalize"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1.5">Organisation ID</label>
                        <input
                          readOnly
                          value={org?.id ?? '—'}
                          className="w-full bg-neutral-100 border border-neutral-200 text-neutral-400 text-xs rounded-lg px-3 py-2 cursor-not-allowed font-mono truncate"
                        />
                      </div>
                    </div>

                    {orgSaved && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2.5 rounded-lg">
                        <Check className="w-4 h-4 flex-shrink-0" /> Saved successfully.
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => { setOrgSaved(true); setTimeout(() => setOrgSaved(false), 3000) }}
                        className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── USERS & ROLES ─────────────────────────────────── */}
            {activeSection === 'users' && (
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                  <h2 className="text-neutral-900 text-sm font-semibold">Team Members</h2>
                  <button className="text-sm text-white bg-neutral-950 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
                    Invite Member
                  </button>
                </div>
                {/* Show the current logged-in user as the only confirmed member */}
                <div className="divide-y divide-neutral-100">
                  {user && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-9 h-9 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-neutral-900 text-sm font-medium truncate">{user.name}</p>
                        <p className="text-neutral-400 text-xs">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs bg-neutral-100 text-neutral-600 border border-neutral-200 px-2.5 py-1 rounded-full capitalize">
                          <Shield className="w-3 h-3" />{user.role}
                        </span>
                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">You</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-center py-8 text-neutral-400 text-sm gap-2">
                    <Users className="w-4 h-4" />
                    Invite team members to collaborate
                  </div>
                </div>
              </div>
            )}

            {/* ── EMAIL SETTINGS ────────────────────────────────── */}
            {activeSection === 'email' && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
                <h2 className="text-neutral-900 text-sm font-semibold">Email Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Sender Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Reply-To Email</label>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={e => setReplyTo(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Email Signature</label>
                    <textarea
                      value={signature}
                      onChange={e => setSignature(e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white resize-none transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between py-3 border-t border-neutral-100">
                    <div>
                      <p className="text-neutral-900 text-sm font-medium">Track Email Opens</p>
                      <p className="text-neutral-400 text-xs mt-0.5">Know when candidates open your emails</p>
                    </div>
                    <Toggle enabled={trackOpens} onChange={setTrackOpens} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-colors">
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {/* ── AUTOMATION ────────────────────────────────────── */}
            {activeSection === 'automation' && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
                <h2 className="text-neutral-900 text-sm font-semibold">Automation Settings</h2>
                <div className="space-y-1">
                  {([
                    { key: 'autoScore',           label: 'Auto-score new candidates with AI',              desc: 'Instantly score every new applicant using your job criteria' },
                    { key: 'autoOutreach',         label: 'Auto-send outreach to high-match candidates',   desc: 'Trigger outreach when AI score exceeds your threshold' },
                    { key: 'interviewReminders',   label: 'Send interview reminders automatically',         desc: 'Remind candidates 24h and 1h before scheduled interviews' },
                    { key: 'autoReject',           label: 'Auto-reject below-threshold candidates',        desc: 'Automatically decline candidates below your min AI score' },
                    { key: 'weeklyDigest',         label: 'Weekly digest email summary',                   desc: 'Receive a recap of pipeline activity every Monday' },
                  ] as const).map(setting => (
                    <div key={setting.key} className="flex items-start justify-between gap-6 py-4 border-b border-neutral-100 last:border-0">
                      <div>
                        <p className="text-neutral-900 text-sm font-medium">{setting.label}</p>
                        <p className="text-neutral-400 text-xs mt-0.5">{setting.desc}</p>
                      </div>
                      <Toggle
                        enabled={autoSettings[setting.key]}
                        onChange={v => setAutoSettings(p => ({ ...p, [setting.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-colors">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* ── API KEYS ──────────────────────────────────────── */}
            {activeSection === 'api' && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
                <h2 className="text-neutral-900 text-sm font-semibold">API Keys</h2>
                <p className="text-neutral-500 text-sm">Use these keys to integrate AutoHyre with your custom tools.</p>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-neutral-900 text-sm font-medium">Production API Key</span>
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-neutral-200 text-neutral-500 text-xs rounded-lg px-3 py-2 font-mono truncate">
                      {showApiKey ? apiKey : maskedKey}
                    </code>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyKey}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
                  + Generate new API key
                </button>
              </div>
            )}

            {/* ── BILLING ───────────────────────────────────────── */}
            {activeSection === 'billing' && (
              <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-neutral-900 text-base font-semibold">{planLabel}</h2>
                      {orgLoading
                        ? <p className="text-neutral-400 text-sm mt-0.5"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Loading…</p>
                        : <p className="text-neutral-400 text-sm mt-0.5">Organisation: {org?.name ?? '—'} · {org?.slug ?? ''}</p>
                      }
                    </div>
                    <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full font-medium">
                      Current Plan
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-5 border-t border-neutral-100">
                    {[
                      {
                        label: 'Active Jobs',
                        used:  jobsLoading ? '…' : String(activeJobs),
                        limit: 25,
                        pct:   Math.min((activeJobs / 25) * 100, 100),
                      },
                      {
                        label: 'Team Members',
                        used:  '1',
                        limit: 10,
                        pct:   10,
                      },
                      {
                        label: 'AI Credits',
                        used:  '—',
                        limit: 5000,
                        pct:   0,
                      },
                    ].map(usage => (
                      <div key={usage.label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-neutral-500">{usage.label}</span>
                          <span className="text-neutral-900 font-medium">{usage.used}/{usage.limit}</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-neutral-950 transition-all"
                            style={{ width: `${usage.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full py-3 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors">
                  Upgrade to Enterprise
                </button>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  )
}
