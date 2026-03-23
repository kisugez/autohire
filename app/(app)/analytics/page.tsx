'use client'

import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, Briefcase, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
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
      <p className="text-neutral-500 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey ?? entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color ?? entry.fill }} />
          <span className="text-neutral-500 capitalize">{entry.dataKey ?? entry.name}:</span>
          <span className="text-neutral-900 font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { funnel, sources, timeline, loading, error } = useAnalytics()
  const { jobs } = useJobs()
  const { candidates } = useCandidates()
  const { applications } = useAllApplications(jobs)

  // ── Derived KPIs ──────────────────────────────────────────────
  const totalHires    = funnel.hired    ?? 0
  const totalOffer    = funnel.offer    ?? 0
  const totalInterview= funnel.interview ?? 0
  const totalApps     = applications.length
  const acceptanceRate = totalOffer > 0 ? Math.round((totalHires / totalOffer) * 100) : 0
  const conversionRate = totalApps  > 0 ? Math.round((totalHires / totalApps)  * 100) : 0
  const interviewRate  = totalApps  > 0 ? Math.round((totalInterview / totalApps) * 100) : 0

  // ── Candidates per job (bar chart) ───────────────────────────
  const appsByJob = jobs.map((j) => ({
    job:   j.title.length > 14 ? j.title.slice(0, 14) + '…' : j.title,
    count: applications.filter((a) => a.job_id === j.id).length,
  })).filter((j) => j.count > 0)

  // ── Funnel bars ───────────────────────────────────────────────
  const funnelBars = STAGE_ORDER
    .map((s) => ({ stage: s.charAt(0).toUpperCase() + s.slice(1), count: funnel[s] ?? 0 }))
    .filter((s) => s.count > 0)

  // ── Source pie ────────────────────────────────────────────────
  const sourceEntries = Object.entries(sources)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: SOURCE_COLORS[name] ?? '#9CA3AF' }))
    .sort((a, b) => b.value - a.value)
  const sourceTotal = sourceEntries.reduce((s, e) => s + e.value, 0)

  // ── Timeline chart ────────────────────────────────────────────
  const timelineData = timeline.map((t) => ({
    date:  t.date.slice(5), // MM-DD
    count: t.count,
  }))

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl max-w-lg">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-neutral-950 text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Recruitment performance insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Hires',        value: loading ? '—' : String(totalHires),        icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',   sub: 'all time' },
          { label: 'Total Candidates',   value: loading ? '—' : String(candidates.length), icon: Users,        color: 'text-indigo-600', bg: 'bg-indigo-50',  sub: 'in database' },
          { label: 'Offer Acceptance',   value: loading ? '—' : `${acceptanceRate}%`,      icon: TrendingUp,   color: 'text-amber-600',  bg: 'bg-amber-50',   sub: 'offers → hired' },
          { label: 'Conversion Rate',    value: loading ? '—' : `${conversionRate}%`,      icon: Briefcase,    color: 'text-purple-600', bg: 'bg-purple-50',  sub: 'sourced → hired' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4"
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', kpi.bg)}>
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
            </div>
            <div>
              <p className="text-neutral-400 text-xs">{kpi.label}</p>
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin text-neutral-300 mt-1" />
                : <p className="text-neutral-950 text-2xl font-bold">{kpi.value}</p>
              }
              <p className="text-neutral-400 text-xs mt-0.5">{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-6">

        {/* Candidates per Job */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-neutral-200 rounded-xl p-5"
        >
          <h2 className="text-neutral-900 text-sm font-semibold mb-0.5">Candidates Per Job</h2>
          <p className="text-neutral-400 text-xs mb-4">Applications per active role</p>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-neutral-300"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : appsByJob.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-neutral-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={appsByJob} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="job" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Pipeline Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-neutral-200 rounded-xl p-5"
        >
          <h2 className="text-neutral-900 text-sm font-semibold mb-0.5">Pipeline Breakdown</h2>
          <p className="text-neutral-400 text-xs mb-4">Candidates per stage</p>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-neutral-300"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : funnelBars.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-neutral-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelBars} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelBars.map((entry) => {
                    const colors: Record<string, string> = {
                      Sourced: '#6366F1', Screening: '#818CF8', Interview: '#A5B4FC',
                      Offer: '#22C55E', Hired: '#16A34A', Rejected: '#F87171',
                    }
                    return <Cell key={entry.stage} fill={colors[entry.stage] ?? '#9CA3AF'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-3 gap-6">

        {/* Applications Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-2 bg-white border border-neutral-200 rounded-xl p-5"
        >
          <h2 className="text-neutral-900 text-sm font-semibold mb-0.5">Application Activity</h2>
          <p className="text-neutral-400 text-xs mb-4">New applications per day (last 30 days)</p>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-neutral-300"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : timelineData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-neutral-400 text-sm">No activity in the last 30 days</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fill="url(#timelineGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Source Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-neutral-200 rounded-xl p-5"
        >
          <h2 className="text-neutral-900 text-sm font-semibold mb-0.5">Candidate Sources</h2>
          <p className="text-neutral-400 text-xs mb-4">Distribution by channel</p>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-neutral-300"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : sourceEntries.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-neutral-400 text-sm">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={sourceEntries}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceEntries.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Candidates']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sourceEntries.map((src) => (
                  <div key={src.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: src.color }} />
                      <span className="text-neutral-500">{src.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-900 font-semibold">{src.value}</span>
                      <span className="text-neutral-400">
                        {sourceTotal > 0 ? `${Math.round((src.value / sourceTotal) * 100)}%` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Interview conversion summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-neutral-200 rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-neutral-900 text-sm font-semibold">Stage Conversion Summary</h2>
            <p className="text-neutral-400 text-xs">How candidates move through the pipeline</p>
          </div>
          {!loading && (
            <span className="text-green-700 text-sm font-semibold flex items-center gap-1 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              {conversionRate}% overall hire rate
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-16 text-neutral-300"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {STAGE_ORDER.filter(s => s !== 'rejected').map((stage) => {
              const count = funnel[stage] ?? 0
              const pct   = totalApps > 0 ? Math.round((count / totalApps) * 100) : 0
              const colors: Record<string, { bar: string; text: string; bg: string }> = {
                sourced:   { bar: '#6366F1', text: 'text-indigo-600', bg: 'bg-indigo-50' },
                screening: { bar: '#818CF8', text: 'text-violet-600', bg: 'bg-violet-50' },
                interview: { bar: '#A5B4FC', text: 'text-blue-600',   bg: 'bg-blue-50'   },
                offer:     { bar: '#22C55E', text: 'text-green-600',  bg: 'bg-green-50'  },
                hired:     { bar: '#16A34A', text: 'text-green-700',  bg: 'bg-green-100' },
              }
              const c = colors[stage] ?? { bar: '#9CA3AF', text: 'text-neutral-500', bg: 'bg-neutral-50' }
              return (
                <div key={stage} className={cn('rounded-xl p-4 text-center', c.bg)}>
                  <p className="text-neutral-500 text-xs capitalize mb-2">{stage}</p>
                  <p className={cn('text-2xl font-bold', c.text)}>{count}</p>
                  <p className="text-neutral-400 text-xs mt-1">{pct}% of total</p>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
