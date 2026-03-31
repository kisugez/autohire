'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import {
  ChevronDown, CalendarDays,
  SlidersHorizontal, Upload, MoreVertical, Clock,
  CheckCircle2, Bot, Users, CalendarCheck, MessageSquare,
  Loader2, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import { get } from '@/lib/api'
import { useCandidates } from '@/lib/hooks'
import { useJobsContext } from '@/lib/jobs-context'
import { useAuth } from '@/lib/auth-context'
import type { ApiApplication } from '@/types/job'

const STAGES = ['sourced', 'screening', 'interview', 'offer', 'hired']
const STAGE_LABELS: Record<string, string> = {
  sourced:   'Sourced',
  screening: 'Screening',
  interview: 'Interview',
  offer:     'Offer',
  hired:     'Hired',
}

const ROW_PALETTES = [
  { bg: '#fce7f3', text: '#be185d' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#fef9c3', text: '#854d0e' },
]

// ── Animated count-up number ──────────────────────────────────────
function CountUp({ to, duration = 700 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (to === 0) { setVal(0); return }
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      // ease out cubic
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * to))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [to, duration])
  return <>{val}</>
}

// ── Donut chart — defined OUTSIDE so React never remounts it ──────
function DonutChart({
  segments, total, ready,
}: {
  segments: { label: string; count: number; color: string; drawLen: number; gap: number; startAngle: number }[]
  total: number
  ready: boolean
}) {
  const size = 220, cx = 110, cy = 110, r = 80, strokeW = 11
  const circumference = 2 * Math.PI * r

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '8px auto 0' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* grey track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
        {ready && segments.map((seg, i) => (
          <circle
            key={seg.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${seg.drawLen} ${seg.gap}`}
            strokeLinecap="butt"
            transform={`rotate(${seg.startAngle} ${cx} ${cy})`}
            className={`donut-segment delay-${i * 100 as 0 | 100 | 200 | 300}`}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="dash-count" style={{ fontSize: 36, fontWeight: 700, color: '#111', lineHeight: 1 }}>
          {ready ? <CountUp to={total} /> : 0}
        </span>
        <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Total Jobs
        </span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { jobs, loading: jLoading } = useJobsContext()
  const { candidates, loading: cLoading } = useCandidates()
  const { user } = useAuth()

  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [aLoading, setALoading] = useState(false)
  // track whether data has ever resolved so we can trigger animations exactly once
  const [ready, setReady] = useState(false)

  const jobIdKey = useMemo(() => jobs.map(j => j.id).join(','), [jobs])

  useEffect(() => {
    if (!jobs.length) return
    setALoading(true)
    Promise.all(
      jobs.map(j =>
        get<ApiApplication[]>(`/api/v1/applications/job/${j.id}`).catch(() => [] as ApiApplication[])
      )
    )
      .then(results => setApplications(results.flat()))
      .finally(() => setALoading(false))
  }, [jobIdKey])

  const loading = jLoading || cLoading || aLoading

  // flip ready exactly once when loading goes false for the first time
  const hasSetReady = useRef(false)
  useEffect(() => {
    if (!loading && !hasSetReady.current) {
      hasSetReady.current = true
      // tiny delay so browser paints the skeleton first, then triggers animation
      setTimeout(() => setReady(true), 30)
    }
  }, [loading])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const activeCount = jobs.filter(j => j.status === 'active').length
  const pausedCount = jobs.filter(j => j.status === 'paused').length
  const draftCount  = jobs.filter(j => j.status === 'draft').length
  const closedCount = jobs.filter(j => j.status === 'closed').length
  const totalJobs   = jobs.length

  const donutSegments = useMemo(() => {
    const raw = [
      { label: 'Active', count: activeCount, color: '#a78bfa' },
      { label: 'Paused', count: pausedCount, color: '#fde68a' },
      { label: 'Draft',  count: draftCount,  color: '#f9a8d4' },
      { label: 'Closed', count: closedCount, color: '#bef264' },
    ]
    const circumference = 2 * Math.PI * 80
    const total = raw.reduce((s, d) => s + d.count, 0) || 1
    const gap = 3
    let offsetAngle = -90
    return raw.map(seg => {
      const pct = seg.count / total
      const arcLen = pct * circumference
      const drawLen = Math.max(arcLen - gap, 0)
      const startAngle = offsetAngle
      offsetAngle += pct * 360
      return { ...seg, drawLen, gap: circumference - drawLen, startAngle }
    })
  }, [activeCount, pausedCount, draftCount, closedCount])

  const hiringRows = useMemo(() => [...jobs]
    .sort((a, b) => {
      const aApps = applications.filter(x => x.job_id === a.id).length
      const bApps = applications.filter(x => x.job_id === b.id).length
      return bApps - aApps
    })
    .slice(0, 6)
    .map(job => {
      const jobApps = applications.filter(a => a.job_id === job.id)
      const stageCounts: Record<string, number> = {}
      STAGES.forEach(s => { stageCounts[s] = 0 })
      jobApps.forEach(a => {
        const raw = (a.current_stage ?? '').toLowerCase().trim()
        const stage = raw === 'applied' ? 'sourced' : raw
        if (stageCounts[stage] !== undefined) stageCounts[stage]++
      })
      return { job, stageCounts, total: jobApps.length }
    }), [jobs, applications])

  const candidateById = useMemo(
    () => Object.fromEntries(candidates.map(c => [c.id, c])),
    [candidates]
  )

  const topApplications = useMemo(() =>
    [...applications].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0)).slice(0, 6),
    [applications]
  )

  const stageCount      = (s: string) => applications.filter(a => a.current_stage === s).length
  const interviewCount  = stageCount('interview')
  const offerCount      = stageCount('offer')
  const hiredCount      = stageCount('hired')
  const recentInterview = applications.find(a => a.current_stage === 'interview')
  const recentHire      = applications.find(a => a.current_stage === 'hired')

  const alerts = [
    activeCount > 0 && { id: 1, time: '09:00 - 10:00', message: `${activeCount} active job${activeCount !== 1 ? 's' : ''} open — AI scoring enabled`, icon: Bot, color: '#6366f1' },
    recentInterview && { id: 2, time: '10:00 - 11:00', message: `Candidate moved to interview for "${recentInterview.job_title}"`, icon: CalendarCheck, color: '#f59e0b' },
    candidates.length > 0 && { id: 3, time: '11:00 - 12:00', message: `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} in your talent pool`, icon: Users, color: '#3b82f6' },
    recentHire && { id: 4, time: '12:00 - 13:00', message: `New hire confirmed for "${recentHire.job_title}"`, icon: CheckCircle2, color: '#22c55e' },
    offerCount > 0 && { id: 5, time: '13:00 - 14:00', message: `${offerCount} offer${offerCount !== 1 ? 's' : ''} currently extended — awaiting response`, icon: MessageSquare, color: '#a855f7' },
    interviewCount > 0 && { id: 6, time: '14:00 - 15:00', message: `${interviewCount} candidate${interviewCount !== 1 ? 's' : ''} currently in interview stage`, icon: CalendarCheck, color: '#f97316' },
    hiredCount > 0 && { id: 7, time: '15:00 - 16:00', message: `${hiredCount} total hire${hiredCount !== 1 ? 's' : ''} recorded across all jobs`, icon: CheckCircle2, color: '#10b981' },
  ].filter(Boolean) as { id: number; time: string; message: string; icon: any; color: string }[]

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ paddingTop: 28 }}>

        {/* Header — always visible, no animation needed */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '3px 0 0' }}>{today}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill><CalendarDays style={{ width: 13, height: 13 }} /><span>Feb 18 — Nov 18</span></Pill>
            <Pill><span>Monthly</span><ChevronDown style={{ width: 13, height: 13 }} /></Pill>
            <Pill><SlidersHorizontal style={{ width: 13, height: 13 }} /><span>Filter</span></Pill>
            <Pill><Upload style={{ width: 13, height: 13 }} /><span>Export</span></Pill>
          </div>
        </div>

        {/* ROW 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 24 }}>

          {/* Hiring table */}
          <div
            className={ready ? 'dash-fade-up delay-0' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', opacity: ready ? undefined : 0 }}
          >
            <div style={{ padding: '20px 20px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0, minWidth: 210 }}>Hiring</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#374151', cursor: 'pointer', background: '#fff', minWidth: 180 }}>
                    <span style={{ flex: 1 }}>All Departments</span>
                    <ChevronDown style={{ width: 13, height: 13, color: '#9ca3af', flexShrink: 0 }} />
                  </div>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 16px', fontSize: 12, color: '#111', background: '#fff', cursor: 'pointer', letterSpacing: '0.04em' }}>
                  VIEW ALL <ArrowRight style={{ width: 12, height: 12 }} />
                </button>
              </div>
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
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
                        <Loader2 style={{ width: 18, height: 18, display: 'inline', marginRight: 8, animation: 'spin 1s linear infinite' }} />Loading…
                      </td>
                    </tr>
                  ) : hiringRows.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>No jobs yet.</td></tr>
                  ) : hiringRows.map(({ job, stageCounts, total }, rowIdx) => {
                    const palette = ROW_PALETTES[rowIdx % ROW_PALETTES.length]
                    return (
                      <tr
                        key={job.id}
                        className={ready ? `dash-fade-up` : ''}
                        style={{ animationDelay: `${rowIdx * 40}ms`, opacity: ready ? undefined : 0 }}
                      >
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
                              <div style={{
                                padding: '10px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                background: count > 0 ? palette.bg : '#f3f4f6',
                                color: count > 0 ? palette.text : '#d1d5db',
                                textAlign: 'center', minWidth: 84, minHeight: 36,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                whiteSpace: 'nowrap',
                                transition: 'background 0.3s ease, color 0.3s ease',
                              }}>
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
          <div
            className={ready ? 'dash-fade-up delay-100' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', opacity: ready ? undefined : 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111', margin: 0 }}>Jobs Summary</h2>
              <MoreVertical style={{ width: 16, height: 16, color: '#9ca3af', cursor: 'pointer' }} />
            </div>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: 20, height: 20, color: '#d1d5db' }} />
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <DonutChart segments={donutSegments} total={totalJobs} ready={ready} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', marginTop: 20, padding: '0 4px' }}>
                  {donutSegments.map((seg, i) => (
                    <div
                      key={seg.label}
                      className={ready ? 'dash-fade-up' : ''}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, animationDelay: `${120 + i * 60}ms`, opacity: ready ? undefined : 0 }}
                    >
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

        {/* ROW 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

          {/* Live Alerts */}
          <div
            className={ready ? 'dash-fade-up delay-150' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: ready ? undefined : 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px 14px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0, flexShrink: 0 }}>Live Alerts</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
                <span>Today</span><ChevronDown style={{ width: 13, height: 13, color: '#9ca3af' }} />
              </div>
              <div style={{ flex: 1 }} />
              <Link href="/calendar" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 16px', fontSize: 12, color: '#111', background: '#fff', textDecoration: 'none', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                + ADD TASK
              </Link>
            </div>
            <div style={{ overflowY: 'auto', height: 430, padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <Loader2 style={{ width: 18, height: 18, color: '#d1d5db' }} />
                </div>
              ) : alerts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 40 }}>No alerts yet.</p>
              ) : alerts.map((alert, i) => (
                <div
                  key={alert.id}
                  className={ready ? 'dash-fade-up' : ''}
                  style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#fff', flexShrink: 0, animationDelay: `${160 + i * 50}ms`, opacity: ready ? undefined : 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#fff'}
                >
                  <div style={{ width: 5, alignSelf: 'stretch', background: alert.color, flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px', flexShrink: 0, minWidth: 155 }}>
                    <Clock style={{ width: 20, height: 20, color: '#111', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap' }}>{alert.time}</span>
                  </div>
                  <div style={{ width: 1, height: 32, background: '#e5e7eb', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.4, flex: 1, padding: '18px 20px' }}>{alert.message}</p>
                  <div style={{ padding: '18px 18px', flexShrink: 0 }}>
                    <CheckCircle2 style={{ width: 20, height: 20, color: '#d1d5db' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Candidates */}
          <div
            className={ready ? 'dash-fade-up delay-200' : ''}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: ready ? undefined : 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>Top Candidates</h2>
              <Link href="/candidates" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 16px', fontSize: 12, color: '#111', background: '#fff', textDecoration: 'none', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                VIEW ALL <ArrowRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 430 }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <Loader2 style={{ width: 18, height: 18, color: '#d1d5db' }} />
                </div>
              ) : topApplications.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 40 }}>No candidates yet.</p>
              ) : topApplications.map((app, i) => {
                const candidate = candidateById[app.candidate_id]
                if (!candidate) return null
                return (
                  <div
                    key={app.id}
                    className={ready ? 'dash-fade-up' : ''}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid #f9fafb', cursor: 'pointer', animationDelay: `${200 + i * 45}ms`, opacity: ready ? undefined : 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(candidate.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/candidates/${candidate.id}`} style={{ textDecoration: 'none' }}>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{candidate.name}</p>
                      </Link>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>{candidate.title ?? app.job_title}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0' }}>{app.job_title}</p>
                    </div>
                    {app.ai_score != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 7px', flexShrink: 0,
                        background: app.ai_score >= 80 ? '#dcfce7' : app.ai_score >= 60 ? '#fef9c3' : '#fee2e2',
                        color: app.ai_score >= 80 ? '#15803d' : app.ai_score >= 60 ? '#854d0e' : '#b91c1c',
                      }}>
                        {app.ai_score}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 12px', fontSize: 12.5, color: '#374151', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px 10px',
  fontSize: 12,
  fontWeight: 700,
  color: '#111',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  background: '#fff',
}
