'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronUp, LogOut, User, CreditCard,
  HelpCircle, X, Briefcase, Users, Plus, Bell, Calendar,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useJobsContext } from '@/lib/jobs-context'
import { useCandidates, useAllApplications } from '@/lib/hooks'

type NotifType = 'application' | 'interview' | 'offer' | 'job'

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
  date: 'today' | 'earlier'
  unread?: boolean
  href?: string
}

const typeMeta: Record<NotifType, { label: string; bg: string; border: string; color: string; iconBg: string }> = {
  application: { label: 'Application', bg: '#EEEDFE', border: '#CECBF6', color: '#3C3489', iconBg: '#7c6fe0' },
  interview:   { label: 'Interview',   bg: '#EAF3DE', border: '#C0DD97', color: '#3B6D11', iconBg: '#22a06b' },
  offer:       { label: 'Offer',       bg: '#FCEBEB', border: '#F7C1C1', color: '#A32D2D', iconBg: '#e03131' },
  job:         { label: 'Job',         bg: '#FAEEDA', border: '#FAC775', color: '#854F0B', iconBg: '#e5a000' },
}

const AVATAR_COLORS = [
  { bg: '#c8c3f8', text: '#26215C' },
  { bg: '#B5D4F4', text: '#0C447C' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#F7C1C1', text: '#791F1F' },
  { bg: '#C0DD97', text: '#3B6D11' },
]

function avatarColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function TypeBadge({ type }: { type: NotifType }) {
  const m = typeMeta[type]
  return (
    <span style={{ fontSize: 11, background: m.bg, border: `0.5px solid ${m.border}`, color: m.color, padding: '1px 7px', borderRadius: 4, fontWeight: 500 }}>
      {m.label}
    </span>
  )
}

function TypeIconBadge({ type }: { type: NotifType }) {
  const m = typeMeta[type]
  return (
    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #e5e7eb' }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <rect width="10" height="10" rx="2" fill={m.iconBg} />
        <path d="M2 5h6M5 2v6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function NotifRow({ n }: { n: Notification }) {
  return (
    <div
      style={{
        padding: '11px 16px', display: 'flex', gap: 11, alignItems: 'flex-start',
        background: n.unread ? 'rgba(124,111,224,0.04)' : 'transparent',
        borderLeft: n.unread ? '2.5px solid #7c6fe0' : '2.5px solid transparent',
        borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#fafafa' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.unread ? 'rgba(124,111,224,0.04)' : 'transparent' }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: n.actorColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: n.actorTextColor }}>
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
      </div>
      {n.unread && (
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c6fe0', flexShrink: 0, marginTop: 5 }} />
      )}
    </div>
  )
}

function NotificationsPanel({ notifications, onClose }: { notifications: Notification[]; onClose: () => void }) {
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const todayItems   = notifications.filter(n => n.date === 'today')
  const earlierItems = notifications.filter(n => n.date === 'earlier')
  const unreadItems  = notifications.filter(n => n.unread)
  const unreadCount  = unreadItems.length

  const showToday   = tab === 'all' ? todayItems   : unreadItems.filter(n => n.date === 'today')
  const showEarlier = tab === 'all' ? earlierItems : unreadItems.filter(n => n.date === 'earlier')

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ padding: '10px 16px 2px' }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#9ca3af', textTransform: 'uppercase' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Notifications</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#7c6fe0', cursor: 'pointer', fontWeight: 500 }}>Mark all as read</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#9ca3af' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', padding: '10px 16px 0', borderBottom: '0.5px solid #f3f4f6', marginTop: 10, gap: 0 }}>
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
              <span style={{ background: '#7c6fe0', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20 }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {showToday.length > 0 && (<><SectionLabel label="Today" />{showToday.map(n => <NotifRow key={n.id} n={n} />)}</>)}
        {showEarlier.length > 0 && (<><SectionLabel label="Earlier" />{showEarlier.map(n => <NotifRow key={n.id} n={n} />)}</>)}
        {showToday.length === 0 && showEarlier.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>No notifications</div>
        )}
      </div>
    </motion.div>
  )
}

function QuickActionsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  const actions = [
    { initials: 'CJ', label: 'Create Job',          sub: 'Post a new opening',            iconBg: '#EEEDFE', iconColor: '#7c6fe0', href: '/jobs' },
    { initials: 'SI', label: 'Schedule Interview',  sub: 'Book an interview slot',         iconBg: '#EAF3DE', iconColor: '#22a06b', href: '/candidates' },
    { initials: 'AC', label: 'Add Candidate',       sub: 'Import or create a profile',     iconBg: '#FAEEDA', iconColor: '#e5a000', href: '/candidates' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'absolute', right: 0, top: '100%', marginTop: 8,
        width: 270, background: '#fff',
        border: '0.5px solid #e5e7eb', borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        overflow: 'hidden', zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 13px', borderBottom: '0.5px solid #f3f4f6' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>Quick Actions</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Shortcuts to common tasks</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: '#9ca3af', borderRadius: 6 }}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>

      <div style={{ padding: '6px 0' }}>
        {actions.map((a, i) => (
          <button
            key={a.label}
            onClick={() => { onClose(); router.push(a.href) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px', background: 'none', border: 'none',
              borderBottom: i < actions.length - 1 ? '0.5px solid #f9fafb' : 'none',
              cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fafafa' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: a.iconColor, letterSpacing: '-0.3px' }}>
                {a.initials}
              </div>
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #e5e7eb' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect width="10" height="10" rx="2" fill={a.iconColor} />
                  <path d="M2 5h6M5 2v6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{a.label}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{a.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function UserMenuPanel({
  displayName, email, displayInitials, onClose, onLogout,
}: {
  displayName: string
  email: string
  displayInitials: string
  onClose: () => void
  onLogout: () => void
}) {
  const col = avatarColor(displayName)

  const menuItems = [
    { initials: 'PR', label: 'Profile',        sub: 'Edit your details',  iconBg: '#EEEDFE', iconColor: '#7c6fe0', href: '/profile' as string | null },
    { initials: 'BI', label: 'Billing',         sub: 'Plan & payments',    iconBg: '#EAF3DE', iconColor: '#22a06b', href: null },
    { initials: 'HS', label: 'Help & Support',  sub: 'Docs & contact us',  iconBg: '#FAEEDA', iconColor: '#e5a000', href: null },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'absolute', right: 0, top: '100%', marginTop: 8,
        width: 270, background: '#fff',
        border: '0.5px solid #e5e7eb', borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        overflow: 'hidden', zIndex: 50,
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: col.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: col.text, letterSpacing: '-0.3px',
            }}>
              {displayInitials}
            </div>
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 10, height: 10, borderRadius: '50%',
              background: '#22a06b', border: '2px solid #fff',
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</p>
          </div>
          <span style={{ fontSize: 10, background: '#EEEDFE', border: '0.5px solid #CECBF6', color: '#3C3489', padding: '2px 8px', borderRadius: 20, fontWeight: 500, flexShrink: 0 }}>
            Admin
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: '6px 0' }}>
        {menuItems.map(item => {
          const iconTile = (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: item.iconColor, letterSpacing: '-0.3px' }}>
                {item.initials}
              </div>
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #e5e7eb' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect width="10" height="10" rx="2" fill={item.iconColor} />
                  <path d="M2 5h6M5 2v6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )
          const text = (
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#111', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>{item.sub}</p>
            </div>
          )
          const shared: React.CSSProperties = {
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left', textDecoration: 'none', transition: 'background 0.1s',
          }
          return item.href ? (
            <Link key={item.label} href={item.href} onClick={onClose} style={shared}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fafafa'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
            >{iconTile}{text}</Link>
          ) : (
            <button key={item.label} style={shared}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fafafa'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >{iconTile}{text}</button>
          )
        })}
      </div>

      {/* Sign out */}
      <div style={{ borderTop: '0.5px solid #f3f4f6', padding: '6px 0' }}>
        <button
          onClick={onLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#e03131', letterSpacing: '-0.3px' }}>
              SO
            </div>
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #e5e7eb' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect width="10" height="10" rx="2" fill="#e03131" />
                <path d="M2 5h6M5 2v6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#e03131', margin: 0 }}>Sign Out</p>
            <p style={{ fontSize: 11, color: '#f9a8a8', margin: '1px 0 0' }}>End your session</p>
          </div>
        </button>
      </div>
    </motion.div>
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

export default function Topbar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { jobs } = useJobsContext()
  const { candidates } = useCandidates()
  const { applications } = useAllApplications(jobs)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu]           = useState(false)
  const [showQuickActions, setShowQuickActions]   = useState(false)
  const [searchValue, setSearchValue]             = useState('')
  const [showResults, setShowResults]             = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const displayName     = user?.name ?? 'HR Team'
  const displayInitials = user ? getInitials(user.name) : 'HR'
  const userAvatarColor = avatarColor(displayName)

  const notifications = useMemo<Notification[]>(() => {
    const notifs: Notification[] = []

    const sorted = [...applications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)

    sorted.forEach(app => {
      const job = jobs.find(j => j.id === app.job_id)
      const candidate = candidates.find(c => c.id === app.candidate_id)
      const name = candidate?.name ?? 'A candidate'
      const col = avatarColor(name)
      const today = isToday(app.created_at)

      if (app.current_stage === 'interview') {
        notifs.push({
          id: `interview-${app.id}`, type: 'interview', actor: name,
          actorInitials: getInitials(name), actorColor: col.bg, actorTextColor: col.text,
          message: 'moved to interview stage for', bold: app.job_title ?? job?.title ?? 'a job',
          time: timeAgo(app.updated_at), date: today ? 'today' : 'earlier', unread: today, href: '/candidates',
        })
      } else if (app.current_stage === 'offer') {
        notifs.push({
          id: `offer-${app.id}`, type: 'offer', actor: name,
          actorInitials: getInitials(name), actorColor: col.bg, actorTextColor: col.text,
          message: 'reached offer stage for', bold: app.job_title ?? job?.title ?? 'a job',
          time: timeAgo(app.updated_at), date: today ? 'today' : 'earlier', unread: today, href: '/candidates',
        })
      } else {
        notifs.push({
          id: `app-${app.id}`, type: 'application', actor: name,
          actorInitials: getInitials(name), actorColor: col.bg, actorTextColor: col.text,
          message: 'applied for', bold: app.job_title ?? job?.title ?? 'a job',
          time: timeAgo(app.created_at), date: today ? 'today' : 'earlier', unread: today, href: '/candidates',
        })
      }
    })

    const recentJobs = [...jobs]
      .filter(j => j.status === 'active')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)

    recentJobs.forEach(job => {
      const today = isToday(job.created_at)
      notifs.push({
        id: `job-${job.id}`, type: 'job', actor: 'New Job', actorInitials: 'JB',
        actorColor: '#FAEEDA', actorTextColor: '#854F0B',
        message: 'posting is now live —', bold: job.title,
        time: timeAgo(job.created_at), date: today ? 'today' : 'earlier', unread: today, href: `/jobs/${job.id}`,
      })
    })

    return notifs.sort((a, b) => {
      if (a.date === b.date) return 0
      return a.date === 'today' ? -1 : 1
    })
  }, [applications, jobs, candidates])

  const unreadCount = notifications.filter(n => n.unread).length

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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
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

  const closeAll = () => {
    setShowNotifications(false)
    setShowUserMenu(false)
    setShowQuickActions(false)
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 220, right: 0, height: 67,
      background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', padding: '0 28px', zIndex: 30, gap: 16,
    }}>

      {/* Team selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {displayInitials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{displayName}</span>
        <ChevronUp style={{ width: 14, height: 14, color: '#9ca3af' }} />
      </div>

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
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#374151', width: '100%' }}
          />
          {searchValue && (
            <button onClick={() => { setSearchValue(''); setShowResults(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X style={{ width: 13, height: 13, color: '#9ca3af' }} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showResults && q && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }}
              style={{ position: 'absolute', top: '100%', left: -30, right: 0, marginTop: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden', zIndex: 50 }}
            >
              {!hasResults ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>No results for "{searchValue}"</div>
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
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: job.status === 'active' ? '#dcfce7' : '#f3f4f6', color: job.status === 'active' ? '#15803d' : '#6b7280' }}>{job.status}</span>
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
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
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

        <div style={{ position: 'relative' }}>
          <TopbarIconBtn onClick={() => { setShowQuickActions(!showQuickActions); setShowNotifications(false); setShowUserMenu(false) }}>
            <Plus style={{ width: 15, height: 15 }} />
          </TopbarIconBtn>
          <AnimatePresence>
            {showQuickActions && <QuickActionsPanel onClose={() => setShowQuickActions(false)} />}
          </AnimatePresence>
        </div>

        <div style={{ position: 'relative' }}>
          <TopbarIconBtn onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); setShowQuickActions(false) }}>
            <Bell style={{ width: 15, height: 15 }} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }} />
            )}
          </TopbarIconBtn>
          <AnimatePresence>
            {showNotifications && <NotificationsPanel notifications={notifications} onClose={() => setShowNotifications(false)} />}
          </AnimatePresence>
        </div>

        <div style={{ position: 'relative' }}>
          <TopbarIconBtn onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowQuickActions(false) }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: userAvatarColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: userAvatarColor.text, letterSpacing: '-0.2px' }}>
              {displayInitials}
            </div>
          </TopbarIconBtn>
          <AnimatePresence>
            {showUserMenu && (
              <UserMenuPanel
                displayName={displayName}
                email={user?.email ?? ''}
                displayInitials={displayInitials}
                onClose={() => setShowUserMenu(false)}
                onLogout={() => { setShowUserMenu(false); logout() }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {(showNotifications || showUserMenu || showQuickActions) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={closeAll} />
      )}
    </header>
  )
}