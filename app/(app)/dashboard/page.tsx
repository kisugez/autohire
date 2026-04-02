'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import {
  ChevronDown, CalendarDays, SlidersHorizontal, Upload,
  MoreVertical, Loader2, ArrowRight, Check,
  Users, CalendarCheck, Video, MapPin, FileText,
  BriefcaseBusiness, Clock3, UserPlus, TrendingUp,
  CheckCircle2, MessageSquare, Star,
} from 'lucide-react'
import Link from 'next/link'
import { getInitials, getAvatarUrl } from '@/lib/utils'
import { get } from '@/lib/api'
import { useJobsContext } from '@/lib/jobs-context'
import { useAuth } from '@/lib/auth-context'
import type { ApiApplication } from '@/types/job'
import type { ApiCandidate } from '@/types/candidate'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────
const STAGES = ['sourced', 'screening', 'interview', 'offer', 'hired']
const STAGE_LABELS: Record<string, string> = {
  sourced: 'Sourced', screening: 'Screening', interview: 'Interview', offer: 'Offer', hired: 'Hired',
}
const ROW_PALETTES = [
  { bg: '#fce7f3', text: '#be185d' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#fef9c3', text: '#854d0e' },
]

// Shared section header size — used on ALL four cards
const H: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: '#111', margin: 0, flexShrink: 0 }

// ─── Date range ───────────────────────────────────────────────────

// ── Alert avatar helpers (mirrors topbar notification style) ──────
const ALERT_AVATAR_COLORS = [
  { bg: '#c8c3f8', text: '#26215C' },
  { bg: '#B5D4F4', text: '#0C447C' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#F7C1C1', text: '#791F1F' },
  { bg: '#C0DD97', text: '#3B6D11' },
]

function alertAvatarColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return ALERT_AVATAR_COLORS[Math.abs(h) % ALERT_AVATAR_COLORS.length]
}

function AlertAvatar({ initials, iconBg }: { initials: string; iconBg: string }) {
  const col = alertAvatarColor(initials)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: col.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: col.text, letterSpacing: '-0.3px',
      }}>
        {initials}
      </div>
      <div style={{
        position: 'absolute', bottom: -1, right: -1,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '0.5px solid #e5e7eb',
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect width="10" height="10" rx="2" fill={iconBg} />
          <path d="M2 5h6M5 2v6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

type Preset = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom'
interface DateRange { from: Date; to: Date }
const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d',  label: 'Last 7 days'   },
  { key: '30d', label: 'Last 30 days'  },
  { key: '90d', label: 'Last 90 days'  },
  { key: '6m',  label: 'Last 6 months' },
  { key: '1y',  label: 'Last year'     },
]
function presetToRange(p: Preset): DateRange {
  const to = new Date(); const from = new Date()
  if (p === '7d')  from.setDate(to.getDate() - 7)
  if (p === '30d') from.setDate(to.getDate() - 30)
  if (p === '90d') from.setDate(to.getDate() - 90)
  if (p === '6m')  from.setMonth(to.getMonth() - 6)
  if (p === '1y')  from.setFullYear(to.getFullYear() - 1)
  return { from, to }
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

// ─── Granularity / Status filter ─────────────────────────────────
type Granularity  = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'
const GRANULARITIES: Granularity[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly']
type StatusFilter = 'active' | 'paused' | 'draft' | 'closed'
const STATUS_FILTERS: StatusFilter[] = ['active', 'paused', 'draft', 'closed']
const STATUS_COLORS: Record<StatusFilter, string> = {
  active: '#22c55e', paused: '#f59e0b', draft: '#9ca3af', closed: '#ef4444',
}

// ─── Activity period ──────────────────────────────────────────────
type ActivityPeriod = 'today' | 'week' | 'month'
const ACTIVITY_PERIODS: { key: ActivityPeriod; label: string }[] = [
  { key: 'today', label: 'Today'      },
  { key: 'week',  label: 'This Week'  },
  { key: 'month', label: 'This Month' },
]

// ─── Calendar event type (matches backend CalendarEventOut) ───────
interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  type: string
  all_day: boolean
  location?: string | null
  meet_link?: string | null
  description?: string | null
  candidate_name?: string | null
  job_title?: string | null
}
const EVENT_CFG: Record<string, { color: string; Icon: any; label: string }> = {
  interview: { color: '#f59e0b', Icon: CalendarCheck,     label: 'Interview' },
  meeting:   { color: '#6366f1', Icon: Users,             label: 'Meeting'   },
  task:      { color: '#3b82f6', Icon: FileText,          label: 'Task'      },
  time_off:  { color: '#22c55e', Icon: Clock3,            label: 'Time Off'  },
  holiday:   { color: '#a855f7', Icon: CalendarDays,      label: 'Holiday'   },
  other:     { color: '#9ca3af', Icon: BriefcaseBusiness, label: 'Event'     },
}

// ─── Activity item (derived from real data) ───────────────────────
interface ActivityItem {
  id: string
  color: string
  Icon: any
  time: string      // formatted time string shown in the left column
  title: string
  sub?: string      // secondary line (candidate name, job title…)
  badge?: string    // small badge chip text
  badgeColor?: string
  href: string
}

// ─── Dropdown shell ───────────────────────────────────────────────
function Dropdown({ anchor, open, onClose, children }: {
  anchor: React.ReactNode; open: boolean; onClose: () => void; children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {anchor}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
              background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)', minWidth: 200, overflow: 'hidden',
            }}
          >{children}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Pill button ──────────────────────────────────────────────────
function Pill({ children, onClick, active, badge }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; badge?: number
}) {
  return (
    <div onClick={onClick} style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 5,
      border: active ? '1px solid #7c6fe0' : '1px solid #e5e7eb',
      borderRadius: 8, padding: '5px 12px', fontSize: 12.5,
      color: active ? '#7c6fe0' : '#374151',
      background: active ? '#EEEDFE' : '#fff',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.1s', userSelect: 'none',
    }}>
      {children}
      {!!badge && (
        <span style={{
          position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%',
          background: '#7c6fe0', color: '#fff', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #f9fafb',
        }}>{badge}</span>
      )}
    </div>
  )
}

// ─── Small menu item ──────────────────────────────────────────────
function MenuItem({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, color: active ? '#7c6fe0' : '#374151', textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fafafa'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
    >
      {label}
      {active && <Check style={{ width: 12, height: 12 }} />}
    </button>
  )
}
function MenuHeader({ label }: { label: string }) {
  return (
    <div style={{ padding: '10px 14px 6px', borderBottom: '0.5px solid #f3f4f6' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#111', margin: 0 }}>{label}</p>
    </div>
  )
}

// ─── CSV export ───────────────────────────────────────────────────
function exportCSV(filteredApplications: ApiApplication[], range: DateRange) {
  const rows: string[][] = [
    ['Job Title', 'Stage', 'AI Score', 'Source', 'Applied At', 'Status'],
    ...filteredApplications.map(a => [
      a.job_title ?? '', a.current_stage ?? '',
      a.ai_score != null ? String(a.ai_score) : '',
      a.source ?? '',
      a.created_at ? new Date(a.created_at).toLocaleDateString() : '',
      a.status ?? '',
    ]),
  ]
  const csv  = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `dashboard_export_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── CountUp ──────────────────────────────────────────────────────
function CountUp({ to, duration = 700 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (to === 0) { setVal(0); return }
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [to, duration])
  return <>{val}</>
}

// ─── DonutChart ───────────────────────────────────────────────────
function DonutChart({ segments, total, ready }: {
  segments: { label: string; count: number; color: string; drawLen: number; gap: number; startAngle: number }[]
  total: number; ready: boolean
}) {
  const size = 220, cx = 110, cy = 110, r = 80, strokeW = 11
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '8px auto 0' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
        {ready && segments.map((seg, i) => (
          <circle key={seg.label} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
            strokeWidth={strokeW} strokeDasharray={`${seg.drawLen} ${seg.gap}`}
            strokeLinecap="butt" transform={`rotate(${seg.startAngle} ${cx} ${cy})`}
            className={`donut-segment delay-${(i * 100) as 0 | 100 | 200 | 300}`}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="dash-count" style={{ fontSize: 36, fontWeight: 700, color: '#111', lineHeight: 1 }}>
          {ready ? <CountUp to={total} /> : 0}
        </span>
        <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Jobs</span>
      </div>
    </div>
  )
}

// ─── Activity row card ───────────────────────────────────────────
function ActivityRow({ item, ready, delay }: { item: ActivityItem; ready: boolean; delay: number }) {
  // derive 2-letter initials from the item title for the avatar
  const initials = item.title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')

  return (
    <Link href={item.href}
      className={ready ? 'dash-fade-up' : ''}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px',
        background: '#fff', flexShrink: 0, textDecoration: 'none',
        animationDelay: `${delay}ms`, opacity: ready ? undefined : 0,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fafafa'}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fff'}
    >
      {/* avatar with coloured badge dot */}
      <AlertAvatar initials={initials} iconBg={item.color} />

      {/* time column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, minWidth: 110 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {item.badge ?? 'Event'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap' }}>{item.time}</span>
      </div>

      <div style={{ width: 1, height: 32, background: '#e5e7eb', flexShrink: 0 }} />

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, color: '#111', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </p>
        {item.sub && (
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.sub}
          </p>
        )}
      </div>

      {/* badge chip */}
      {item.badge && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, flexShrink: 0,
          background: `${item.badgeColor ?? item.color}18`, color: item.badgeColor ?? item.color }}>
          {item.badge}
        </span>
      )}

      <ArrowRight style={{ width: 13, height: 13, color: '#d1d5db', flexShrink: 0 }} />
    </Link>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { jobs, loading: jLoading } = useJobsContext()
  const { user }                    = useAuth()

  // fetch candidates directly so we get full ApiCandidate shape
  const [candidates, setCandidates] = useState<ApiCandidate[]>([])
  const [cLoading, setCLoading]     = useState(true)
  useEffect(() => {
    setCLoading(true)
    get<ApiCandidate[]>('/api/v1/candidates?page_size=500')
      .then(r => setCandidates(Array.isArray(r) ? r : []))
      .catch(() => setCandidates([]))
      .finally(() => setCLoading(false))
  }, [])

  // applications
  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [aLoading, setALoading]         = useState(false)
  const jobIdKey = useMemo(() => jobs.map(j => j.id).join(','), [jobs])
  useEffect(() => {
    if (!jobs.length) return
    setALoading(true)
    Promise.all(jobs.map(j =>
      get<ApiApplication[]>(`/api/v1/applications/job/${j.id}`).catch(() => [] as ApiApplication[])
    ))
      .then(r => setApplications(r.flat()))
      .finally(() => setALoading(false))
  }, [jobIdKey])

  // calendar events
  const [calEvents, setCalEvents]   = useState<CalendarEvent[]>([])
  const [calLoading, setCalLoading] = useState(false)
  useEffect(() => {
    setCalLoading(true)
    const now = new Date()
    // fetch current month + next month so "this week" near month boundaries still works
    const fetches = [
      get<CalendarEvent[]>(`/api/v1/calendar/events?month=${now.getMonth() + 1}&year=${now.getFullYear()}`).catch(() => []),
    ]
    // also fetch next month if we're in the last week
    if (now.getDate() > 22) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      fetches.push(get<CalendarEvent[]>(`/api/v1/calendar/events?month=${next.getMonth() + 1}&year=${next.getFullYear()}`).catch(() => []))
    }
    Promise.all(fetches)
      .then(results => {
        const seen = new Set<string>()
        const merged: CalendarEvent[] = []
        for (const evs of results) {
          for (const ev of (evs as CalendarEvent[])) {
            if (!seen.has(ev.id)) { seen.add(ev.id); merged.push(ev) }
          }
        }
        setCalEvents(merged)
      })
      .finally(() => setCalLoading(false))
  }, [])

  // ready animation gate
  const loading = jLoading || cLoading || aLoading
  const [ready, setReady] = useState(false)
  const hasSetReady = useRef(false)
  useEffect(() => {
    if (!loading && !hasSetReady.current) {
      hasSetReady.current = true
      setTimeout(() => setReady(true), 30)
    }
  }, [loading])

  // ── toolbar state ──────────────────────────────────────────────
  const [dateRange, setDateRange]     = useState<DateRange>(presetToRange('6m'))
  const [datePreset, setDatePreset]   = useState<Preset>('6m')
  const [granularity, setGranularity] = useState<Granularity>('Monthly')
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(new Set(STATUS_FILTERS))
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>('today')

  const [openPicker,      setOpenPicker]      = useState<'date' | 'gran' | 'filter' | 'activity' | null>(null)
  const toggle = (p: typeof openPicker) => setOpenPicker(v => v === p ? null : p)

  // ── filter helpers ────────────────────────────────────────────
  const filteredJobs = useMemo(() =>
    jobs.filter(j => statusFilters.has(j.status as StatusFilter)),
    [jobs, statusFilters])

  const filteredApplications = useMemo(() =>
    applications.filter(a => {
      const d = new Date(a.created_at)
      return d >= dateRange.from && d <= dateRange.to
    }),
    [applications, dateRange])

  // ── donut counts ──────────────────────────────────────────────
  const activeCount = filteredJobs.filter(j => j.status === 'active').length
  const pausedCount = filteredJobs.filter(j => j.status === 'paused').length
  const draftCount  = filteredJobs.filter(j => j.status === 'draft').length
  const closedCount = filteredJobs.filter(j => j.status === 'closed').length

  const donutSegments = useMemo(() => {
    const raw = [
      { label: 'Active', count: activeCount, color: '#a78bfa' },
      { label: 'Paused', count: pausedCount, color: '#fde68a' },
      { label: 'Draft',  count: draftCount,  color: '#f9a8d4' },
      { label: 'Closed', count: closedCount, color: '#bef264' },
    ]
    const circ  = 2 * Math.PI * 80
    const total = raw.reduce((s, d) => s + d.count, 0) || 1
    const gap   = 3
    let off     = -90
    return raw.map(seg => {
      const pct     = seg.count / total
      const drawLen = Math.max(pct * circ - gap, 0)
      const sa      = off
      off += pct * 360
      return { ...seg, drawLen, gap: circ - drawLen, startAngle: sa }
    })
  }, [activeCount, pausedCount, draftCount, closedCount])

  // ── hiring table rows ─────────────────────────────────────────
  const hiringRows = useMemo(() => [...filteredJobs]
    .sort((a, b) =>
      filteredApplications.filter(x => x.job_id === b.id).length -
      filteredApplications.filter(x => x.job_id === a.id).length
    )
    .slice(0, 6)
    .map(job => {
      const jobApps = filteredApplications.filter(a => a.job_id === job.id)
      const stageCounts: Record<string, number> = Object.fromEntries(STAGES.map(s => [s, 0]))
      jobApps.forEach(a => {
        const raw   = (a.current_stage ?? '').toLowerCase().trim()
        const stage = raw === 'applied' ? 'sourced' : raw
        if (stageCounts[stage] !== undefined) stageCounts[stage]++
      })
      return { job, stageCounts, total: jobApps.length }
    }), [filteredJobs, filteredApplications])

  // ── top candidates ────────────────────────────────────────────
  const candidateById = useMemo(
    () => Object.fromEntries(candidates.map(c => [c.id, c])),
    [candidates])

  const topApplications = useMemo(() =>
    [...filteredApplications].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0)).slice(0, 6),
    [filteredApplications])

  // ── calendar events filtered by activity period ───────────────
  const filteredCalEvents = useMemo(() => {
    const now   = new Date()
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end   = new Date(now); end.setHours(23, 59, 59, 999)
    if (activityPeriod === 'week') {
      start.setDate(now.getDate() - now.getDay())
      end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    } else if (activityPeriod === 'month') {
      start.setDate(1)
      end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999)
    }
    return calEvents
      .filter(e => { const d = new Date(e.start); return d >= start && d <= end })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [calEvents, activityPeriod])

  // ── build unified activity feed from BOTH calendar events AND
  //    real application/pipeline changes ─────────────────────────
  const activityItems = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []

    // 1. Calendar events → activity rows
    for (const ev of filteredCalEvents) {
      const cfg     = EVENT_CFG[ev.type] ?? EVENT_CFG.other
      const startDt = new Date(ev.start)
      const endDt   = new Date(ev.end)
      const timeStr = ev.all_day
        ? 'All day'
        : `${startDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${endDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

      const sub = [ev.candidate_name, ev.location, ev.meet_link ? 'Google Meet' : null].filter(Boolean).join(' · ')

      items.push({
        id:         ev.id,
        color:      cfg.color,
        Icon:       cfg.Icon,
        time:       timeStr,
        title:      ev.title,
        sub:        sub || cfg.label,
        badge:      ev.type !== 'other' ? cfg.label : undefined,
        badgeColor: cfg.color,
        href:       '/calendar',
      })
    }

    // 2. Real pipeline activity: recently updated applications within the period
    const now   = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    if (activityPeriod === 'week')  start.setDate(now.getDate() - now.getDay())
    if (activityPeriod === 'month') start.setDate(1)

    // collect latest application updates in the window
    const recentApps = applications
      .filter(a => {
        const d = new Date(a.updated_at)
        return d >= start && d <= now
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 12)

    for (const app of recentApps) {
      const stage   = (app.current_stage ?? '').toLowerCase()
      const updTime = new Date(app.updated_at)
      const timeStr = updTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const dateStr = updTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const displayTime = activityPeriod === 'today' ? timeStr : dateStr

      let color = '#9ca3af', Icon: any = BriefcaseBusiness, badge = '', badgeColor = '#9ca3af'

      if (stage === 'hired') {
        color = '#22c55e'; Icon = CheckCircle2; badge = 'Hired';      badgeColor = '#22c55e'
      } else if (stage === 'offer') {
        color = '#a855f7'; Icon = Star;         badge = 'Offer';      badgeColor = '#a855f7'
      } else if (stage === 'interview') {
        color = '#f59e0b'; Icon = CalendarCheck; badge = 'Interview'; badgeColor = '#f59e0b'
      } else if (stage === 'screening') {
        color = '#3b82f6'; Icon = MessageSquare; badge = 'Screening'; badgeColor = '#3b82f6'
      } else if (stage === 'sourced' || stage === 'applied') {
        color = '#6366f1'; Icon = UserPlus;      badge = 'New';       badgeColor = '#6366f1'
      } else if (app.ai_score != null) {
        color = '#f59e0b'; Icon = TrendingUp;    badge = `${app.ai_score}%`; badgeColor = '#f59e0b'
      }

      // avoid duplicate if a calendar interview event already covers this
      const alreadyCovered = filteredCalEvents.some(
        ev => ev.type === 'interview' && ev.candidate_name &&
          app.job_title && ev.title.toLowerCase().includes((app.job_title ?? '').toLowerCase().slice(0, 8))
      )
      if (alreadyCovered && stage === 'interview') continue

      items.push({
        id:         `app_${app.id}`,
        color,
        Icon,
        time:       displayTime,
        title:      app.job_title ?? 'Application update',
        sub:        badge ? `Moved to ${badge}` : 'Updated',
        badge,
        badgeColor,
        href:       '/pipeline',
      })
    }

    // deduplicate by id, keep insertion order (calendar events first)
    const seen = new Set<string>()
    return items.filter(it => { if (seen.has(it.id)) return false; seen.add(it.id); return true })
  }, [filteredCalEvents, applications, activityPeriod])

  // ── misc ──────────────────────────────────────────────────────
  const activeFilterCount = STATUS_FILTERS.length - statusFilters.size
  const activityLabel     = ACTIVITY_PERIODS.find(p => p.key === activityPeriod)?.label ?? 'Today'
  const todayStr          = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ paddingTop: 28 }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '3px 0 0' }}>{todayStr}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Date range */}
            <Dropdown open={openPicker === 'date'} onClose={() => setOpenPicker(null)}
              anchor={
                <Pill onClick={() => toggle('date')} active={openPicker === 'date'}>
                  <CalendarDays style={{ width: 13, height: 13 }} />
                  <span>{fmtDate(dateRange.from)} — {fmtDate(dateRange.to)}</span>
                </Pill>
              }
            >
              <MenuHeader label="Date Range" />
              {PRESETS.map(p => (
                <MenuItem key={p.key} label={p.label} active={datePreset === p.key}
                  onClick={() => { setDateRange(presetToRange(p.key)); setDatePreset(p.key); setOpenPicker(null) }} />
              ))}
              <div style={{ padding: '8px 14px 10px', borderTop: '0.5px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Custom</p>
                <CustomDateInputs
                  initial={dateRange}
                  onApply={(r) => { setDateRange(r); setDatePreset('custom'); setOpenPicker(null) }}
                />
              </div>
            </Dropdown>

            {/* Granularity */}
            <Dropdown open={openPicker === 'gran'} onClose={() => setOpenPicker(null)}
              anchor={
                <Pill onClick={() => toggle('gran')} active={openPicker === 'gran'}>
                  <span>{granularity}</span>
                  <ChevronDown style={{ width: 13, height: 13 }} />
                </Pill>
              }
            >
              <MenuHeader label="Granularity" />
              {GRANULARITIES.map(g => (
                <MenuItem key={g} label={g} active={granularity === g}
                  onClick={() => { setGranularity(g); setOpenPicker(null) }} />
              ))}
            </Dropdown>

            {/* Filter */}
            <Dropdown open={openPicker === 'filter'} onClose={() => setOpenPicker(null)}
              anchor={
                <Pill onClick={() => toggle('filter')} active={openPicker === 'filter'} badge={activeFilterCount || undefined}>
                  <SlidersHorizontal style={{ width: 13, height: 13 }} />
                  <span>Filter</span>
                </Pill>
              }
            >
              <StatusFilterPanel active={statusFilters}
                onChange={s => { setStatusFilters(s); setOpenPicker(null) }} />
            </Dropdown>

            {/* Export */}
            <Pill onClick={() => exportCSV(filteredApplications, dateRange)}>
              <UploadIcon style={{ width: 13, height: 13 }} />
              <span>Export</span>
            </Pill>

          </div>
        </div>

        {/* ── ROW 1: Hiring table + Jobs Summary ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 24 }}>

          {/* Hiring */}
          <div className={ready ? 'dash-fade-up delay-0' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', opacity: ready ? undefined : 0 }}>
            <div style={{ padding: '16px 20px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={H}>Hiring</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 11px', fontSize: 12, color: '#374151', cursor: 'pointer', background: '#fff' }}>
                    <span>All Departments</span>
                    <ChevronDown style={{ width: 12, height: 12, color: '#9ca3af' }} />
                  </div>
                </div>
                <Link href="/pipeline" style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 13px', fontSize: 11, color: '#111', background: '#fff', textDecoration: 'none', letterSpacing: '0.04em' }}>
                  VIEW ALL <ArrowRight style={{ width: 11, height: 11 }} />
                </Link>
              </div>
              {activeFilterCount > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {STATUS_FILTERS.filter(s => !statusFilters.has(s)).map(s => (
                    <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fef2f2', color: '#b91c1c', border: '0.5px solid #fecaca' }}>{s} hidden</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Jobs</th>
                    {STAGES.map(s => <th key={s} style={thStyle}>{STAGE_LABELS[s]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
                      <Loader2 style={{ width: 18, height: 18, display: 'inline', marginRight: 8, animation: 'spin 1s linear infinite' }} />Loading…
                    </td></tr>
                  ) : hiringRows.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>No jobs match current filters.</td></tr>
                  ) : hiringRows.map(({ job, stageCounts, total }, rowIdx) => {
                    const pal = ROW_PALETTES[rowIdx % ROW_PALETTES.length]
                    return (
                      <tr key={job.id} className={ready ? 'dash-fade-up' : ''} style={{ animationDelay: `${rowIdx * 40}ms`, opacity: ready ? undefined : 0 }}>
                        <td style={{ padding: '10px 16px', minWidth: 160, borderTop: '1px solid #f3f4f6' }}>
                          <p style={{ fontSize: 12.5, fontWeight: 500, color: '#111', margin: 0 }}>{job.title}</p>
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {total} Application{total !== 1 ? 's' : ''}
                          </p>
                        </td>
                        {STAGES.map(stage => {
                          const count = stageCounts[stage] ?? 0
                          return (
                            <td key={stage} style={{ padding: '8px 6px', borderTop: '1px solid #f3f4f6' }}>
                              <div style={{ padding: '10px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: count > 0 ? pal.bg : '#f3f4f6', color: count > 0 ? pal.text : '#d1d5db', textAlign: 'center', minWidth: 84, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', transition: 'background 0.3s, color 0.3s' }}>
                                {count > 0 ? `${count} Candidate${count !== 1 ? 's' : ''}` : '—'}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Jobs Summary */}
          <div className={ready ? 'dash-fade-up delay-100' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', opacity: ready ? undefined : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={H}>Jobs Summary</h2>
              <MoreVertical style={{ width: 16, height: 16, color: '#9ca3af', cursor: 'pointer' }} />
            </div>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: 20, height: 20, color: '#d1d5db' }} />
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <DonutChart segments={donutSegments} total={filteredJobs.length} ready={ready} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', marginTop: 20, padding: '0 4px' }}>
                  {donutSegments.map((seg, i) => (
                    <div key={seg.label} className={ready ? 'dash-fade-up' : ''}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, animationDelay: `${120 + i * 60}ms`, opacity: ready ? undefined : 0 }}>
                      <div style={{ width: 3, height: 28, borderRadius: 99, background: seg.color, flexShrink: 0 }} />
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span className={ready ? 'dash-count' : ''} style={{ fontSize: 22, fontWeight: 700, color: '#111', lineHeight: 1, animationDelay: `${150 + i * 60}ms` }}>
                          {ready ? <CountUp to={seg.count} duration={600} /> : 0}
                        </span>
                        <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{seg.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 2: Live Activity + Top Candidates ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

          {/* Live Activity */}
          <div className={ready ? 'dash-fade-up delay-150' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: ready ? undefined : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 14px' }}>
              <h2 style={H}>Live Activity</h2>

              {/* Period picker */}
              <Dropdown open={openPicker === 'activity'} onClose={() => setOpenPicker(null)}
                anchor={
                  <div onClick={() => toggle('activity')} style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 11px', fontSize: 12, color: '#374151', background: '#fff', cursor: 'pointer', userSelect: 'none' }}>
                    <span>{activityLabel}</span>
                    <ChevronDown style={{ width: 12, height: 12, color: '#9ca3af' }} />
                  </div>
                }
              >
                <MenuHeader label="Show activity" />
                {ACTIVITY_PERIODS.map(p => (
                  <MenuItem key={p.key} label={p.label} active={activityPeriod === p.key}
                    onClick={() => { setActivityPeriod(p.key); setOpenPicker(null) }} />
                ))}
              </Dropdown>

              <div style={{ flex: 1 }} />
              <Link href="/calendar" style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 13px', fontSize: 11, color: '#111', background: '#fff', textDecoration: 'none', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                VIEW TASKS <ArrowRight style={{ width: 11, height: 11 }} />
              </Link>
            </div>

            <div style={{ overflowY: 'auto', height: 430, padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {calLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Loader2 style={{ width: 18, height: 18, color: '#d1d5db' }} />
                </div>
              ) : activityItems.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                  <CalendarCheck style={{ width: 28, height: 28, color: '#e5e7eb' }} />
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>No activity for {activityLabel.toLowerCase()}</p>
                  <Link href="/calendar" style={{ fontSize: 12, color: '#7c6fe0', textDecoration: 'none' }}>+ Schedule something →</Link>
                </div>
              ) : activityItems.map((item, i) => (
                <ActivityRow key={item.id} item={item} ready={ready} delay={160 + i * 40} />
              ))}
            </div>
          </div>

          {/* Top Candidates */}
          <div className={ready ? 'dash-fade-up delay-200' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: ready ? undefined : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px' }}>
              <h2 style={H}>Top Candidates</h2>
              <Link href="/candidates" style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 13px', fontSize: 11, color: '#111', background: '#fff', textDecoration: 'none', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                VIEW ALL <ArrowRight style={{ width: 11, height: 11 }} />
              </Link>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 430 }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <Loader2 style={{ width: 18, height: 18, color: '#d1d5db' }} />
                </div>
              ) : topApplications.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 40 }}>No candidates in this period.</p>
              ) : topApplications.map((app, i) => {
                const c = candidateById[app.candidate_id]
                const name = c?.name ?? 'Unknown Candidate'
                const hue = name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360
                return (
                  <Link key={app.id} href={`/candidates/${app.candidate_id}`}
                    className={ready ? 'dash-fade-up' : ''}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid #f9fafb', textDecoration: 'none', animationDelay: `${200 + i * 45}ms`, opacity: ready ? undefined : 0, transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fafafa'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
                  >
                    {(() => {
                      const avatarSrc = getAvatarUrl(c?.avatar_url, c?.github_url)
                      return avatarSrc ? (
                        <img src={avatarSrc} alt={name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `hsl(${hue},55%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(name)}
                        </div>
                      )
                    })()}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c?.title || app.job_title}{c?.location ? ` · ${c.location}` : ''}
                      </p>
                    </div>
                    {app.ai_score != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 7px', flexShrink: 0, background: app.ai_score >= 80 ? '#dcfce7' : app.ai_score >= 60 ? '#fef9c3' : '#fee2e2', color: app.ai_score >= 80 ? '#15803d' : app.ai_score >= 60 ? '#854d0e' : '#b91c1c' }}>
                        {app.ai_score}%
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Custom date range inputs (keeps local state, fires onApply) ──
function CustomDateInputs({ initial, onApply }: { initial: DateRange; onApply: (r: DateRange) => void }) {
  const [from, setFrom] = useState(initial.from.toISOString().slice(0, 10))
  const [to,   setTo]   = useState(initial.to.toISOString().slice(0, 10))
  const apply = () => {
    const f = new Date(from); const t = new Date(to)
    if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f <= t) onApply({ from: f, to: t })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          style={{ flex: 1, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 8px', color: '#374151', outline: 'none' }} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          style={{ flex: 1, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 8px', color: '#374151', outline: 'none' }} />
      </div>
      <button onClick={apply}
        style={{ width: '100%', background: '#111', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Apply
      </button>
    </div>
  )
}

// ─── Status filter panel ──────────────────────────────────────────
function StatusFilterPanel({ active, onChange }: { active: Set<StatusFilter>; onChange: (s: Set<StatusFilter>) => void }) {
  const [local, setLocal] = useState(new Set(active))
  const toggle = (s: StatusFilter) => {
    const n = new Set(local); if (n.has(s)) n.delete(s); else n.add(s); setLocal(n)
  }
  return (
    <div style={{ width: 200 }}>
      <MenuHeader label="Filter by Status" />
      {STATUS_FILTERS.map(s => (
        <button key={s} onClick={() => toggle(s)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fafafa'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
        >
          <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid', borderColor: local.has(s) ? STATUS_COLORS[s] : '#d1d5db', background: local.has(s) ? STATUS_COLORS[s] : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {local.has(s) && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
          </div>
          <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize', flex: 1 }}>{s}</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[s], flexShrink: 0 }} />
        </button>
      ))}
      <div style={{ padding: '8px 14px', borderTop: '0.5px solid #f3f4f6', display: 'flex', gap: 8 }}>
        <button onClick={() => setLocal(new Set(STATUS_FILTERS))}
          style={{ flex: 1, fontSize: 11, color: '#7c6fe0', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>All</button>
        <button onClick={() => onChange(local)}
          style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#fff', background: '#111', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 0' }}>Apply</button>
      </div>
    </div>
  )
}

// ─── Inline Upload icon (not in lucide default tree) ─────────────
function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px 10px', fontSize: 12, fontWeight: 700, color: '#111',
  textAlign: 'left', whiteSpace: 'nowrap', background: '#fff',
}
