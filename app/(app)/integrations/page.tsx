'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle, Loader2, ExternalLink, Search,
  Pencil, Users, X, Eye, EyeOff, AlertCircle,
  Shield, Zap, CheckCircle2, Link2, KeyRound,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { get, post, delete as del } from '@/lib/api'
import { integrationsApi, type PlatformIntegration } from '@/lib/integrations-api'

// ── Brand SVG Icons ───────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const LinkedInIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const IndeedWordmark = () => (
  <Image
    src="/images__1_-removebg-preview.png"
    alt="Indeed"
    width={32}
    height={32}
    className="object-contain"
  />
)

const BaytWordmark = () => (
  <Image
    src="/images.png"
    alt="Bayt"
    width={32}
    height={32}
    className="object-contain"
  />
)

// ── Platform config ───────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'linkedin' as const,
    name: 'LinkedIn',
    tagline: 'The world\'s largest professional network',
    description: 'Post jobs directly to LinkedIn and reach millions of active job seekers. Requires your LinkedIn Employer account.',
    color: '#0A66C2',
    bgColor: 'bg-[#EEF3FB]',
    borderColor: 'border-[#0A66C2]/20',
    Icon: () => <LinkedInIcon size={22} />,
    features: ['Job posting', 'Candidate sourcing', 'InMail outreach'],
  },
  {
    id: 'indeed' as const,
    name: 'Indeed',
    tagline: "World's #1 job site",
    description: 'Publish jobs to Indeed and attract candidates from the largest job aggregator. Requires an Indeed Employer account.',
    color: '#2164F3',
    bgColor: 'bg-[#EEF2FF]',
    borderColor: 'border-[#2164F3]/20',
    Icon: () => <IndeedWordmark />,
    features: ['Sponsored job posts', 'Resume search', 'Applicant tracking'],
  },
  {
    id: 'bayt' as const,
    name: 'Bayt',
    tagline: "Middle East's #1 job platform",
    description: 'Reach top talent across the MENA region. Requires a Bayt Employer account.',
    color: '#00A651',
    bgColor: 'bg-[#EDFAF3]',
    borderColor: 'border-[#00A651]/20',
    Icon: () => <BaytWordmark />,
    features: ['MENA-focused talent', 'Arabic job posts', 'CV database access'],
  },
]

// ── ATS ───────────────────────────────────────────────────────────────────────
const ATS_INTEGRATIONS = [
  { id: 'ashby',         name: 'Ashby',        bg: 'bg-indigo-600',  letter: 'A' },
  { id: 'lever',         name: 'Lever',         bg: 'bg-neutral-700', letter: 'L' },
  { id: 'greenhouse',    name: 'Greenhouse',    bg: 'bg-green-600',   letter: 'G' },
  { id: 'recruiterflow', name: 'RecruiterFlow', bg: 'bg-blue-500',    letter: 'R' },
]

interface GoogleStatus { gmail_connected: boolean; gmail_email?: string; gcal_connected: boolean }


// ── LinkedIn Verify Banner ────────────────────────────────────────────────────
function LinkedInVerifyBanner({ onDismiss }: { onDismiss: () => void }) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async () => {
    if (code.trim().length < 4) { setError('Please enter the full code.'); return }
    setLoading(true); setError(null)
    try {
      await post('/api/v1/linkedin-verify/submit', { code: code.trim() })
      setSuccess(true)
      setTimeout(onDismiss, 2500)
    } catch {
      setError('Failed to submit. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[460px] px-4"
    >
      <div className={cn(
        'rounded-2xl shadow-2xl border overflow-hidden',
        success ? 'bg-green-50 border-green-200' : 'bg-white border-amber-200'
      )}>
        <div className={cn('px-5 py-3.5 flex items-center gap-3', success ? 'bg-green-100' : 'bg-amber-50')}>
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            success ? 'bg-green-500' : 'bg-amber-100 border border-amber-200'
          )}>
            {success
              ? <CheckCircle2 size={16} className="text-white" />
              : <KeyRound size={15} className="text-amber-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-[13px] font-bold', success ? 'text-green-800' : 'text-amber-900')}>
              {success ? 'Code submitted — LinkedIn connecting…' : 'LinkedIn needs a verification code'}
            </p>
            {!success && (
              <p className="text-[11px] text-amber-700 mt-0.5">
                Check the email or phone linked to your LinkedIn account
              </p>
            )}
          </div>
          <button onClick={onDismiss} className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0 ml-1">
            <X size={14} />
          </button>
        </div>

        {!success && (
          <div className="px-5 py-4 flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. 485948"
              className="flex-1 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-[0.3em] text-center text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || code.length < 4}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors flex-shrink-0',
                loading || code.length < 4 ? 'bg-amber-200 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'
              )}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Submit
            </button>
          </div>
        )}

        {error && (
          <div className="px-5 pb-4 -mt-1 flex items-center gap-2 text-[12px] text-red-600">
            <AlertCircle size={12} className="flex-shrink-0" /> {error}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Connect Modal ─────────────────────────────────────────────────────────────
function ConnectModal({
  platform,
  onClose,
  onSuccess,
}: {
  platform: typeof PLATFORMS[number]
  onClose: () => void
  onSuccess: (integration: PlatformIntegration) => void
}) {
  const [step, setStep] = useState<'credentials' | 'verify'>('credentials')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleConnect = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await integrationsApi.connect({
        platform: platform.id,
        email: email.trim(),
        password,
        verification_code: code || undefined,
      })
      onSuccess(result)
      onClose()
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.detail
      // If the platform returns a "verification required" signal
      if (msg?.includes('verification') || msg?.includes('2FA') || msg?.includes('code')) {
        setStep('verify')
        setError(null)
      } else {
        setError(msg ?? 'Connection failed. Check your credentials and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className={cn('px-6 pt-6 pb-5 flex items-start justify-between', platform.bgColor)}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center border border-white/60">
              <platform.Icon />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900">
                Connect {platform.name}
              </h2>
              <p className="text-[12px] text-neutral-500 mt-0.5">{platform.tagline}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Security note */}
        <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl">
          <Shield size={13} className="text-neutral-400 flex-shrink-0" />
          <p className="text-[11px] text-neutral-500">
            Your credentials are encrypted and used only to post jobs on your behalf.
          </p>
        </div>

        {step === 'credentials' ? (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-neutral-700 mb-1.5">
                {platform.name} Employer Email
              </label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-neutral-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  placeholder="••••••••••"
                  className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <Shield size={20} className="text-amber-500" />
              </div>
              <p className="text-[13px] font-semibold text-neutral-800">Verification Required</p>
              <p className="text-[12px] text-neutral-500 mt-1 leading-relaxed">
                {platform.name} sent a verification code to <strong>{email}</strong>. Enter it below.
              </p>
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-neutral-700 mb-1.5">Verification Code</label>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                placeholder="000000"
                className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-center tracking-widest font-mono text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {step === 'verify' ? (
            <button
              onClick={() => { setStep('credentials'); setCode(''); setError(null) }}
              className="text-[12.5px] font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <a
              href={`https://${platform.id === 'linkedin' ? 'linkedin.com' : platform.id === 'indeed' ? 'employers.indeed.com' : 'bayt.com'}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <ExternalLink size={11} /> Get account
            </a>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || !email.trim() || (!password.trim() && step === 'credentials')}
              className={cn(
                'px-5 py-2 rounded-xl text-[12.5px] font-semibold text-white transition-colors flex items-center gap-2',
                loading || !email.trim()
                  ? 'bg-violet-200 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-700'
              )}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              {step === 'verify' ? 'Verify & Connect' : 'Connect Account'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function IntegrationsContent() {
  const searchParams = useSearchParams()

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ gmail_connected: false, gcal_connected: false })
  const [googleLoading, setGoogleLoading] = useState(true)
  const [connectingGmail, setConnectingGmail] = useState(false)
  const [disconnectingGmail, setDisconnectingGmail] = useState(false)

  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([])
  const [intLoading, setIntLoading] = useState(true)

  const [connectModal, setConnectModal] = useState<typeof PLATFORMS[number] | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')

  // LinkedIn verification banner — polls backend every 3 s
  const [liVerifyNeeded, setLiVerifyNeeded] = useState(false)


  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  // Load Google status
  useEffect(() => {
    const gmailDone = searchParams.get('gmail')
    if (gmailDone === 'connected') showToast('Gmail connected successfully!', true)
    get<GoogleStatus>('/api/v1/google/status')
      .then(s => setGoogleStatus(s))
      .catch(() => {})
      .finally(() => setGoogleLoading(false))
  }, [searchParams])

  // Load platform integrations
  useEffect(() => {
    setIntLoading(true)
    integrationsApi.list()
      .then(setIntegrations)
      .catch(() => {})
      .finally(() => setIntLoading(false))
  }, [])

  const getIntegration = (platformId: string) =>
    integrations.find(i => i.platform === platformId) ?? null

  const handleConnectSuccess = (integration: PlatformIntegration) => {
    setIntegrations(prev => {
      const without = prev.filter(i => i.platform !== integration.platform)
      return [...without, integration]
    })
    showToast(`${integration.platform.charAt(0).toUpperCase() + integration.platform.slice(1)} connected successfully!`)
  }

  const handleDisconnect = async (platformId: string) => {
    setDisconnecting(platformId)
    try {
      await integrationsApi.disconnect(platformId)
      setIntegrations(prev => prev.filter(i => i.platform !== platformId))
      showToast(`${platformId.charAt(0).toUpperCase() + platformId.slice(1)} disconnected.`)
    } catch {
      showToast('Failed to disconnect. Try again.', false)
    } finally {
      setDisconnecting(null) }
  }

  const connectGmail = async () => {
    setConnectingGmail(true)
    try {
      const { url } = await get<{ url: string }>('/api/v1/google/gmail/connect')
      window.location.href = url
    } catch {
      showToast('Failed to start Gmail OAuth.', false)
      setConnectingGmail(false)
    }
  }

  const disconnectGmail = async () => {
    setDisconnectingGmail(true)
    try {
      await del('/api/v1/google/gmail/disconnect')
      setGoogleStatus(s => ({ ...s, gmail_connected: false, gmail_email: undefined }))
      showToast('Gmail disconnected.', true)
    } catch {
      showToast('Failed to disconnect Gmail. Try again.', false)
    } finally {
      setDisconnectingGmail(false)
    }
  }

  const visiblePlatforms = PLATFORMS.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 pt-2">

      {/* LinkedIn Verify Banner */}
      <AnimatePresence>
        {liVerifyNeeded && (
          <LinkedInVerifyBanner onDismiss={() => setLiVerifyNeeded(false)} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className={cn(
              'fixed top-4 right-4 z-50 flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl shadow-lg',
              toast.ok ? 'bg-neutral-950 text-white' : 'bg-red-600 text-white',
            )}
          >
            {toast.ok
              ? <CheckCircle className="w-4 h-4 text-green-400" />
              : <AlertCircle className="w-4 h-4 text-red-200" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Integrations Marketplace</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Connect your accounts to post jobs and source candidates automatically.</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50 focus-within:bg-white focus-within:border-neutral-300 transition-colors">
          <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 outline-none"
          />
        </div>
        <button className="flex items-center gap-1.5 text-sm text-neutral-600 border border-neutral-200 bg-white hover:bg-neutral-50 px-3 py-2 rounded-lg transition-colors font-medium">
          Request Integration
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Job Boards ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-neutral-900 text-base font-semibold">Job Boards</h2>
          <p className="text-neutral-400 text-xs mt-0.5">
            Connect your employer accounts to post jobs directly from AutoHyre.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {visiblePlatforms.map((platform, i) => {
            const integration = getIntegration(platform.id)
            const isConnected = !!integration
            const isDisconnecting = disconnecting === platform.id

            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={cn(
                  'relative bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md',
                  isConnected ? 'border-green-200 shadow-sm shadow-green-50' : 'border-neutral-200 hover:border-neutral-300',
                )}
              >
                {/* Connected ribbon */}
                {isConnected && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={9} />
                    Connected
                  </div>
                )}

                {/* Brand header */}
                <div className={cn('px-5 pt-5 pb-4 flex items-center gap-3', platform.bgColor)}>
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-white/60 flex items-center justify-center flex-shrink-0">
                    <platform.Icon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-neutral-900">{platform.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{platform.tagline}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                  <p className="text-[12px] text-neutral-500 leading-relaxed">{platform.description}</p>

                  {/* Connected account info */}
                  {isConnected && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={12} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-green-800">Account Connected</p>
                        <p className="text-[11px] text-green-600 truncate">{integration.email}</p>
                      </div>
                    </div>
                  )}

                  {/* Feature list */}
                  <div className="space-y-1.5">
                    {platform.features.map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
                        <span className="text-[11.5px] text-neutral-500">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="px-5 pb-5 flex items-center justify-between gap-2">
                  <a
                    href={`https://${platform.id === 'linkedin' ? 'linkedin.com/talent' : platform.id === 'indeed' ? 'employers.indeed.com' : 'bayt.com/employer'}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <Link2 size={11} /> Learn more
                  </a>

                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(platform.id)}
                      disabled={isDisconnecting}
                      className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isDisconnecting
                        ? <Loader2 size={11} className="animate-spin" />
                        : <X size={11} />}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => setConnectModal(platform)}
                      className="fext-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >                      Connect
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── Email Integration ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-neutral-900 text-base font-semibold">Email Integration</h2>
          <p className="text-neutral-400 text-xs mt-0.5">Connect your email account to send automated outreach sequences.</p>
        </div>

        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1.2fr_1.4fr_1.6fr_1fr_1.2fr_1fr_1fr] bg-neutral-50 border-b border-neutral-200 px-4 py-2.5">
            {['Provider', 'Sender Name', 'Email Address', 'Max / Day', 'Signature', 'Status', 'Actions'].map(h => (
              <span key={h} className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {googleLoading ? (
            <div className="flex items-center justify-center py-6 text-neutral-400 text-xs gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid grid-cols-[1.2fr_1.4fr_1.6fr_1fr_1.2fr_1fr_1fr] items-center px-4 py-3.5 hover:bg-neutral-50/50 transition-colors">
              <div className="flex items-center gap-2"><GoogleIcon /><span className="text-sm font-medium text-neutral-800">Gmail</span></div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-700">{googleStatus.gmail_connected ? 'AutoHyre User' : '—'}</span>
                {googleStatus.gmail_connected && <button className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400"><Pencil className="w-3 h-3" /></button>}
              </div>
              <span className="text-sm text-neutral-700 truncate">{googleStatus.gmail_email ?? (googleStatus.gmail_connected ? '—' : 'Not connected')}</span>
              <span className="text-sm text-neutral-700">{googleStatus.gmail_connected ? '100' : '—'}</span>
              <span className="text-sm text-neutral-400">—</span>
              <span className={cn('text-xs font-semibold', googleStatus.gmail_connected ? 'text-green-600' : 'text-neutral-400')}>
                {googleStatus.gmail_connected ? 'Connected' : 'Not connected'}
              </span>
              <div>
                {googleStatus.gmail_connected ? (
                  <button
                    onClick={disconnectGmail}
                    disabled={disconnectingGmail}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {disconnectingGmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={connectGmail}
                    disabled={connectingGmail}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {connectingGmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                    Connect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── ATS ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-neutral-900 text-base font-semibold">Applicant Tracking Systems (ATS)</h2>
          <p className="text-neutral-400 text-xs mt-0.5">Export candidates from AutoHyre to your existing ATS.</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {ATS_INTEGRATIONS.map((ats, i) => (
            <motion.div
              key={ats.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="border border-neutral-200 rounded-xl p-4 bg-white hover:border-neutral-300 hover:shadow-sm transition-all flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0', ats.bg)}>
                  {ats.letter}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{ats.name}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    <Zap className="w-2.5 h-2.5" /> Easy Access
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <button className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors font-medium">Learn More</button>
                <button className="text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                  Activate
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Connect Modal */}
      <AnimatePresence>
        {connectModal && (
          <ConnectModal
            platform={connectModal}
            onClose={() => setConnectModal(null)}
            onSuccess={handleConnectSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsContent />
    </Suspense>
  )
}
