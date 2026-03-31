'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronUp, LogOut, User, CreditCard,
  HelpCircle, X, Briefcase, Users, Plus, Bell,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useJobsContext } from '@/lib/jobs-context'
import { useCandidates } from '@/lib/hooks'

type NotifType = 'interview' | 'task' | 'job' | 'offer'

interface Notification {
  id: string
  type: NotifType
  actor: string
  actorInitials: string
  actorColor: string
  actorTextColor: string
  message: string
  bold: string
  time: string
  date: 'today' | 'yesterday'
  unread?: boolean
  actionable?: boolean
}

const notifications: Notification[] = [
  {
    id: '1',
    type: 'interview',
    actor: 'Aditya Irawan',
    actorInitials: 'AI',
    actorColor: '#c8c3f8',
    actorTextColor: '#26215C',
    message: 'invited you to interview for the',
    bold: 'Math Teacher',
    time: 'just now',
    date: 'today',
    unread: true,
    actionable: true,
  },
  {
    id: '2',
    type: 'task',
    actor: 'Amanda Nur',
    actorInitials: 'AN',
    actorColor: '#EEEDFE',
    actorTextColor: '#3C3489',
    message: 'assigned a new task to',
    bold: 'Curriculum Alignment 2025',
    time: '01:00 PM',
    date: 'today',
    unread: true,
  },
  {
    id: '3',
    type: 'job',
    actor: 'Reminder',
    actorInitials: 'Y',
    actorColor: '#c8c3f8',
    actorTextColor: '#26215C',
    message: 'your posting',
    bold: 'Visual Arts Teacher',
    time: '09:21 AM',
    date: 'today',
  },
  {
    id: '4',
    type: 'offer',
    actor: 'Hendardar',
    actorInitials: 'H',
    actorColor: '#F7C1C1',
    actorTextColor: '#791F1F',
    message: 'declined the offer for',
    bold: 'Math Teacher',
    time: '02:00 PM',
    date: 'yesterday',
  },
  {
    id: '5',
    type: 'task',
    actor: 'Ghozy Muhtarom',
    actorInitials: 'GM',
    actorColor: '#B5D4F4',
    actorTextColor: '#0C447C',
    message: 'assigned a new task to',
    bold: 'Collaborative Planning',
    time: '01:00 PM',
    date: 'yesterday',
  },
]

const typeMeta: Record<NotifType, { label: string; bg: string; border: string; color: string; iconBg: string; icon: string }> = {
  interview: {
    label: 'Interview',
    bg: '#EEEDFE', border: '#CECBF6', color: '#3C3489',
    iconBg: '#7c6fe0', icon: 'M2 5h6M5 2v6',
  },
  task: {
    label: 'Task',
    bg: '#EAF3DE', border: '#C0DD97', color: '#3B6D11',
    iconBg: '#22a06b', icon: 'M2 5h6M5 2v6',
  },
  job: {
    label: 'Job',
    bg: '#FAEEDA', border: '#FAC775', color: '#854F0B',
    iconBg: '#e5a000', icon: 'M5 2v4M5 7.5v.5',
  },
  offer: {
    label: 'Offer',
    bg: '#FCEBEB', border: '#F7C1C1', color: '#A32D2D',
    iconBg: '#e03131', icon: 'M3 5l1.5 1.5L7 3.5',
  },
}

function TypeBadge({ type }: { type: NotifType }) {
  const m = typeMeta[type]
  return (
    <span style={{
      fontSize: 11,
      background: m.bg,
      border: `0.5px solid ${m.border}`,
      color: m.color,
      padding: '1px 7px',
      borderRadius: 4,
      fontWeight: 500,
    }}>
      {m.label}
    </span>
  )
}

function TypeIconBadge({ type }: { type: NotifType }) {
  const m = typeMeta[type]
  const isOffer = type === 'offer'
  return (
    <div style={{
      position: 'absolute', bottom: -1, right: -1,
      width: 14, height: 14, borderRadius: '50%',
      background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '0.5px solid #e5e7eb',
    }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        {isOffer
          ? <><circle cx="5" cy="5" r="4" fill={m.iconBg} /><path d={m.icon} stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></>
          : type === 'job'
          ? <><rect width="10" height="10" rx="2" fill={m.iconBg} /><path d={m.icon} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></>
          : <><rect width="10" height="10" rx="2" fill={m.iconBg} /><path d={m.icon} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></>
        }
      </svg>
    </div>
  )
}

function NotifRow({ n }: { n: Notification }) {
  return (
    <div style={{
      padding: '11px 16px',
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start',
      background: n.unread ? 'rgba(124,111,224,0.04)' : 'transparent',
      borderLeft: n.unread ? '2.5px solid #7c6fe0' : '2.5px solid transparent',
      borderBottom: '0.5px solid #f3f4f6',
      cursor: 'pointer',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#fafafa' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.unread ? 'rgba(124,111,224,0.04)' : 'transparent' }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: n.actorColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, color: n.actorTextColor,
        }}>
          {n.actorInitials}
        </div>
        <TypeIconBadge type={n.type} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: '#374151', margin: '0 0 3px', lineHeight: 1.45 }}>
          <span style={{ fontWeight: 600, color: '#111' }}>{n.actor}</span>{' '}
          {n.message}{' '}
          <span style={{ fontWeight: 600, color: '#111' }}>{n.bold}</span>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <TypeBadge type={n.type} />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>·</span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{n.time}</span>
        </div>
        {n.actionable && (
          <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
            <button style={{
              border: '0.5px solid #d1d5db', background: '#fff',
              color: '#374151', fontSize: 12, padding: '5px 14px',
              borderRadius: 5, cursor: 'pointer', fontWeight: 500,
            }}>Decline</button>
            <button style={{
              border: 'none', background: '#7c6fe0',
              color: '#fff', fontSize: 12, padding: '5px 14px',
              borderRadius: 5, cursor: 'pointer', fontWeight: 500,
            }}>Accept</button>
          </div>
        )}
      </div>

      {n.unread && (
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#7c6fe0', flexShrink: 0, marginTop: 5,
        }} />
      )}
    </div>
  )
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const todayItems     = notifications.filter(n => n.date === 'today')
  const yesterdayItems = notifications.filter(n => n.date === 'yesterday')
  const unreadItems    = notifications.filter(n => n.unread)
  const unreadCount    = unreadItems.length

  const showToday     = tab === 'all' ? todayItems     : unreadItems.filter(n => n.date === 'today')
  const showYesterday = tab === 'all' ? yesterdayItems : unreadItems.filter(n => n.date === 'yesterday')

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ padding: '10px 16px 2px' }}>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        color: '#9ca3af', textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'absolute', right: 0, top: '100%', marginTop: 8,
        width: 360, background: '#fff',
        border: '0.5px solid #e5e7eb', borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        overflow: 'hidden', zIndex: 50,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 16px 0',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Notifications</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 12, color: '#7c6fe0', cursor: 'pointer', fontWeight: 500,
          }}>Mark all as read</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, display: 'flex', color: '#9ca3af',
          }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', padding: '10px 16px 0',
        borderBottom: '0.5px solid #f3f4f6', marginTop: 10, gap: 0,
      }}>
        {(['all', 'unread'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 0 9px', marginRight: 16,
              fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? '#111' : '#9ca3af',
              borderBottom: tab === t ? '2px solid #7c6fe0' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {t === 'all' ? 'All' : 'Unread'}
            {t === 'unread' && unreadCount > 0 && (
              <span style={{
                background: '#7c6fe0', color: '#fff',
                fontSize: 10, fontWeight: 600,
                padding: '1px 6px', borderRadius: 20,
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {showToday.length > 0 && (
          <>
            <SectionLabel label="Today" />
            {showToday.map(n => <NotifRow key={n.id} n={n} />)}
          </>
        )}
        {showYesterday.length > 0 && (
          <>
            <SectionLabel label="Yesterday" />
            {showYesterday.map(n => <NotifRow key={n.id} n={n} />)}
          </>
        )}
        {showToday.length === 0 && showYesterday.length === 0 && (
          <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
            No notifications
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Topbar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { jobs } = useJobsContext()
  const { candidates } = useCandidates()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu]           = useState(false)
  const [searchValue, setSearchValue]             = useState('')
  const [showResults, setShowResults]             = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const displayName     = user?.name ?? 'HR Team'
  const displayInitials = user ? getInitials(user.name) : 'HR'
  const unreadCount     = notifications.filter(n => n.unread).length

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = searchValue.trim().toLowerCase()

  const matchedJobs = q
    ? jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.department ?? '').toLowerCase().includes(q) ||
        (j.location ?? '').toLowerCase().includes(q)
      ).slice(0, 4)
    : []

  const matchedCandidates = q
    ? candidates.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.title ?? '').toLowerCase().includes(q) ||
        (c.skills ?? []).some((s: string) => s.toLowerCase().includes(q))
      ).slice(0, 4)
    : []

  const hasResults = matchedJobs.length > 0 || matchedCandidates.length > 0

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setShowResults(false); setSearchValue('') }
    if (e.key === 'Enter' && q) {
      setShowResults(false)
      const dest = matchedCandidates.length >= matchedJobs.length ? 'candidates' : 'jobs'
      router.push('/' + dest + '?q=' + encodeURIComponent(q))
      setSearchValue('')
    }
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 220, right: 0, height: 67,
      background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', padding: '0 28px', zIndex: 30, gap: 16,
    }}>

      {/* Team selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: '#1a1a1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {displayInitials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{displayName}</span>
        <ChevronUp style={{ width: 14, height: 14, color: '#9ca3af' }} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: '#e5e7eb' }} />

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 420, position: 'relative' }} ref={searchRef}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search style={{ width: 15, height: 15, color: '#9ca3af', flexShrink: 0 }} />
          <input
            ref={inputRef}
            placeholder="Search..."
            value={searchValue}
            onChange={e => { setSearchValue(e.target.value); setShowResults(true) }}
            onFocus={() => { if (searchValue) setShowResults(true) }}
            onKeyDown={handleKeyDown}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: '#374151', width: '100%',
            }}
          />
          {searchValue && (
            <button onClick={() => { setSearchValue(''); setShowResults(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X style={{ width: 13, height: 13, color: '#9ca3af' }} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showResults && q && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', top: '100%', left: -30, right: 0, marginTop: 12,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden', zIndex: 50,
              }}
            >
              {!hasResults ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
                  No results for "{searchValue}"
                </div>
              ) : (
                <>
                  {matchedJobs.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px 6px' }}>
                        <Briefcase style={{ width: 11, height: 11, color: '#9ca3af' }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jobs</span>
                      </div>
                      {matchedJobs.map(job => (
                        <Link key={job.id} href={'/jobs/' + job.id}
                          onClick={() => { setShowResults(false); setSearchValue('') }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'}
                          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
                        >
                          <div>
                            <p style={{ fontSize: 13, color: '#111', fontWeight: 500, margin: 0 }}>{job.title}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{[job.department, job.location].filter(Boolean).join(' · ')}</p>
                          </div>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                            background: job.status === 'active' ? '#dcfce7' : '#f3f4f6',
                            color: job.status === 'active' ? '#15803d' : '#6b7280',
                          }}>{job.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {matchedJobs.length > 0 && matchedCandidates.length > 0 && (
                    <div style={{ borderTop: '1px solid #f3f4f6', margin: '0 16px' }} />
                  )}
                  {matchedCandidates.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px 6px' }}>
                        <Users style={{ width: 11, height: 11, color: '#9ca3af' }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Candidates</span>
                      </div>
                      {matchedCandidates.map(c => (
                        <Link key={c.id} href={'/candidates/' + c.id}
                          onClick={() => { setShowResults(false); setSearchValue('') }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'}
                          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
                        >
                          <div style={{
                            width: 26, height: 26, borderRadius: 7, background: '#1a1a1a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, color: '#111', fontWeight: 500, margin: 0 }}>{c.name}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{c.title ?? c.email}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <kbd style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace', fontSize: 10, color: '#6b7280' }}>Enter</kbd>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>to search all results</span>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right icons */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Plus */}
        <TopbarIconBtn><Plus style={{ width: 15, height: 15 }} /></TopbarIconBtn>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <TopbarIconBtn onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}>
            <Bell style={{ width: 15, height: 15 }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6, width: 6, height: 6,
                borderRadius: '50%', background: '#ef4444', border: '2px solid #fff',
              }} />
            )}
          </TopbarIconBtn>
          <AnimatePresence>
            {showNotifications && (
              <NotificationsPanel onClose={() => setShowNotifications(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
            style={{
              width: 30, height: 30, borderRadius: '50%', background: '#1a1a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
            }}
          >
            {displayInitials}
          </button>
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.12 }}
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  width: 200, background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden', zIndex: 50,
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{displayName}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? ''}</p>
                </div>
                <Link href="/profile" onClick={() => setShowUserMenu(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: '#374151', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
                >
                  <User style={{ width: 13, height: 13 }} /> Profile
                </Link>
                <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                >
                  <CreditCard style={{ width: 13, height: 13 }} /> Billing
                </button>
                <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                >
                  <HelpCircle style={{ width: 13, height: 13 }} /> Help &amp; Support
                </button>
                <div style={{ borderTop: '1px solid #f3f4f6' }}>
                  <button
                    onClick={() => { setShowUserMenu(false); logout() }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                  >
                    <LogOut style={{ width: 13, height: 13 }} /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {(showNotifications || showUserMenu) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1 }}
          onClick={() => { setShowNotifications(false); setShowUserMenu(false) }} />
      )}
    </header>
  )
}

function TopbarIconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', width: 30, height: 30, borderRadius: 8,
      border: '1px solid #e5e7eb', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#374151', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}