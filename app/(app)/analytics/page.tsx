'use client'

import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Users, Briefcase, CheckCircle2, Loader2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { useAnalytics } from '@/lib/hooks'
import { useJobs, useCandidates, useAllApplications } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const SOURCE_COLORS: Record<string, string> = {
  linkedin: '#6366F1',
  github:   '#8B5CF6',
  referral: '#22C55E',
  website:  '#F59E0B',
  indeed:   '#3B82F6',
  other:    '#9CA3AF',
}

const STAGE_ORDER = ['sourced', 'screening', 'interview', 'offer', 'hired', 'rejected']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="text-neutral-500 mb-2 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey ?? entry.name} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color ?? entry.fill }} />
          <span className="text-neutral-500 capitalize">{entry.dataKey ?? entry.name}:</span>
          <span className="text-neutral-900 font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function LoadingState({ height = 180 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-neutral-300" style={{ height }}>
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  )
}

function EmptyState({ height = 180 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-neutral-400 text-sm" style={{ height }}>
      No data yet
    </div>
  )
}

export default function AnalyticsPage() {
  const { funnel, sources, timeline, loading, error } = useAnalytics()
  const { jobs } = useJobs()
  const { candidates } = useCandidates()
  const { applications } = useAllApplications(jobs)

  const totalHires     = funnel.hired     ?? 0
  const totalOffer     = funnel.offer     ?? 0
  const totalInterview = funnel.interview ?? 0
  const totalApps      = applications.length
  const acceptanceRate = totalOffer > 0 ? Math.round((totalHires     / totalOffer) * 100) : 0
  const conversionRate = totalApps  > 0 ? Math.round((totalHires     / totalApps)  * 100) : 0
  const interviewRate  = totalApps  > 0 ? Math.round((totalInterview / totalApps)  * 100) : 0

  const appsByJob = jobs.map(j => ({
    job:   j.title.length > 16 ? j.title.slice(0, 16) + '…' : j.title,
    count: applications.filter(a => a.job_id === j.id).length,
  })).filter(j => j.count > 0)

  const funnelBars = STAGE_ORDER
    .map(s => ({ stage: s.charAt(0).toUpperCase() + s.slice(1), count: funnel[s] ?? 0 }))
    .filter(s => s.count > 0)

  const sourceEntries = Object.entries(sources)
    .map(([name, value]) => ({
      name:  name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SOURCE_COLORS[name] ?? '#9CA3AF',
    }))
    .sort((a, b) => b.value - a.value)
  const sourceTotal = sourceEntries.reduce((s, e) => s + e.value, 0)

  const timelineData = timeline.map(t => ({
    date:  t.date.slice(5),
    count: t.count,
  }))

  if (error) return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl max-w-lg">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {error}
    </div>
  )

  // ── stage conversion rows ─────────────────────────────────────
  const stagesForSummary = STAGE_ORDER.filter(s => s !== 'rejected')
  const maxStageCount    = Math.max(...stagesForSummary.map(s => funnel[s] ?? 0), 1)

  const stageConfig: Record<string, { bar: string; text: string; bg: string; border: string }> = {
    sourced:   { bar: '#6366F1', text: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100'  },
    screening: { bar: '#8B5CF6', text: 'text-violet-600', bg: 'bg-violet-50',  border: 'border-violet-100'  },
    interview: { bar: '#3B82F6', text: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100'    },
    offer:     { bar: '#10B981', text: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-100' },
    hired:     { bar: '#059669', text: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-100'   },
  }

  return (
    <div className="space-y-8 pb-10 pt-2">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-neutral-950 text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-neutral-400 text-sm mt-1">Recruitment performance overview</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span className="text-indigo-700 text-sm font-semibold">{conversionRate}% hire rate</span>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Hires',
            value:  loading ? null : totalHires,
            sub:    'all time',
            icon:   CheckCircle2,
            color:  'text-emerald-600',
            bg:     'bg-emerald-50',
            border: 'border-emerald-100',
            trend:  null,
          },
          {
            label: 'Candidates',
            value:  loading ? null : candidates.length,
            sub:    'in database',
            icon:   Users,
            color:  'text-indigo-600',
            bg:     'bg-indigo-50',
            border: 'border-indigo-100',
            trend:  null,
          },
          {
            label: 'Offer Acceptance',
            value:  loading ? null : `${acceptanceRate}%`,
            sub:    'offers → hired',
            icon:   TrendingUp,
            color:  'text-amber-600',
            bg:     'bg-amber-50',
            border: 'border-amber-100',
            trend:  acceptanceRate >= 70 ? 'up' : acceptanceRate >= 40 ? 'flat' : 'down',
          },
          {
            label: 'Interview Rate',
            value:  loading ? null : `${interviewRate}%`,
            sub:    'sourced → interview',
            icon:   Briefcase,
            color:  'text-violet-600',
            bg:     'bg-violet-50',
            border: 'border-violet-100',
            trend:  interviewRate >= 40 ? 'up' : interviewRate >= 20 ? 'flat' : 'down',
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn('bg-white border rounded-xl p-5 flex items-start justify-between gap-3', kpi.border)}
          >
            <div>
              <p className="text-neutral-400 text-xs font-medium mb-2">{kpi.label}</p>
              {loading
                ? <div className="h-8 w-16 bg-neutral-100 rounded-lg animate-pulse mt-1 mb-2" />
                : <p className="text-neutral-950 text-3xl font-bold tracking-tight leading-none mb-1.5">{kpi.value}</p>
              }
              <p className="text-neutral-400 text-xs">{kpi.sub}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', kpi.bg)}>
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Charts row 1: 3-column ── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Candidates per Job */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="col-span-2 bg-white border border-neutral-200 rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-neutral-900 text-sm font-semibold">Candidates Per Job</h2>
              <p className="text-neutral-400 text-xs mt-0.5">Applications per active role</p>
            </div>
            {!loading && appsByJob.length > 0 && (
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                {appsByJob.length} roles
              </span>
            )}
          </div>
          {loading ? <LoadingState /> : appsByJob.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={appsByJob} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="job" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F3FF' }} />
                <Bar dataKey="count" fill="#6366F1" radius={[5, 5, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Source Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white border border-neutral-200 rounded-xl p-5"
        >
          <div className="mb-4">
            <h2 className="text-neutral-900 text-sm font-semibold">Candidate Sources</h2>
            <p className="text-neutral-400 text-xs mt-0.5">Distribution by channel</p>
          </div>
          {loading ? <LoadingState /> : sourceEntries.length === 0 ? <EmptyState /> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={sourceEntries} cx="50%" cy="50%"
                    innerRadius={38} outerRadius={60}
                    paddingAngle={3} dataKey="value" strokeWidth={0}
                  >
                    {sourceEntries.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}`, 'Candidates']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {sourceEntries.map(src => (
                  <div key={src.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: src.color }} />
                    <span className="text-xs text-neutral-500 flex-1 truncate">{src.name}</span>
                    <span className="text-xs text-neutral-900 font-semibold">{src.value}</span>
                    <span className="text-[10px] text-neutral-400 w-8 text-right">
                      {sourceTotal > 0 ? `${Math.round((src.value / sourceTotal) * 100)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Application Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="col-span-2 bg-white border border-neutral-200 rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-neutral-900 text-sm font-semibold">Application Activity</h2>
              <p className="text-neutral-400 text-xs mt-0.5">New applications per day — last 30 days</p>
            </div>
            {!loading && timelineData.length > 0 && (
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                {timelineData.reduce((s, d) => s + d.count, 0)} total
              </span>
            )}
          </div>
          {loading ? <LoadingState /> : timelineData.length === 0
            ? <EmptyState />
            : (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={timelineData} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#6366F1' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Pipeline Funnel vertical */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white border border-neutral-200 rounded-xl p-5"
        >
          <div className="mb-4">
            <h2 className="text-neutral-900 text-sm font-semibold">Pipeline Breakdown</h2>
            <p className="text-neutral-400 text-xs mt-0.5">Candidates per stage</p>
          </div>
          {loading ? <LoadingState /> : funnelBars.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F3FF' }} />
                <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={18}>
                  {funnelBars.map(entry => {
                    const colors: Record<string, string> = {
                      Sourced:   '#6366F1', Screening: '#8B5CF6',
                      Interview: '#3B82F6', Offer:     '#10B981',
                      Hired:     '#059669', Rejected:  '#F87171',
                    }
                    return <Cell key={entry.stage} fill={colors[entry.stage] ?? '#9CA3AF'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* ── Stage Conversion Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white border border-neutral-200 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-neutral-900 text-sm font-semibold">Stage Conversion</h2>
            <p className="text-neutral-400 text-xs mt-0.5">How candidates progress through your pipeline</p>
          </div>
          {!loading && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-neutral-400">Overall hire rate</p>
                <p className="text-sm font-bold text-emerald-600">{conversionRate}%</p>
              </div>
              <div className="w-px h-8 bg-neutral-200" />
              <div className="text-right">
                <p className="text-xs text-neutral-400">Interview rate</p>
                <p className="text-sm font-bold text-indigo-600">{interviewRate}%</p>
              </div>
            </div>
          )}
        </div>

        {loading ? <LoadingState height={80} /> : (
          <div className="space-y-3">
            {stagesForSummary.map((stage, i) => {
              const count  = funnel[stage] ?? 0
              const pct    = totalApps > 0 ? Math.round((count / totalApps) * 100) : 0
              const barPct = Math.round((count / maxStageCount) * 100)
              const c      = stageConfig[stage] ?? { bar: '#9CA3AF', text: 'text-neutral-500', bg: 'bg-neutral-50', border: 'border-neutral-100' }

              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 + i * 0.05 }}
                  className="flex items-center gap-4"
                >
                  {/* label */}
                  <div className="w-24 flex-shrink-0">
                    <span className={cn('text-xs font-medium capitalize', c.text)}>{stage}</span>
                  </div>

                  {/* progress bar */}
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ delay: 0.4 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: c.bar }}
                    />
                  </div>

                  {/* count + pct */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn('text-sm font-bold w-8 text-right', c.text)}>{count}</span>
                    <span className="text-xs text-neutral-400 w-12 text-right">{pct}% of all</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

    </div>
  )
}