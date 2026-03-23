'use client'

import { motion } from 'framer-motion'
import {
  Briefcase, Users, CalendarCheck, MessageSquare, Clock,
  TrendingUp, ArrowRight, Bot, Bell, CheckCircle2, TrendingDown, Loader2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import StatusBadge from '@/components/cards/status-badge'
import { getInitials, formatRelativeTime, getMatchScoreBg } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useJobs, useCandidates, useAllApplications } from '@/lib/hooks'
import type { ApiApplication } from '@/types/job'

const activityData = [
  { date: 'Mar 3',  sourced: 8,  interviews: 2, offers: 0 },
  { date: 'Mar 8',  sourced: 12, interviews: 3, offers: 1 },
  { date: 'Mar 13', sourced: 15, interviews: 4, offers: 1 },
  { date: 'Mar 18', sourced: 18, interviews: 5, offers: 2 },
  { date: 'Mar 21', sourced: 10, interviews: 3, offers: 1 },
  { date: 'Mar 23', sourced: 20, interviews: 6, offers: 2 },
]

const alerts = [
  { id: 1, message: 'AI sourced 12 new candidates for ML Engineer',          time: '10m ago', icon: Bot,          dotColor: 'bg-indigo-500' },
  { id: 2, message: 'Alex Rivera replied to outreach — ready to screen',     time: '1h ago',  icon: MessageSquare, dotColor: 'bg-green-500' },
  { id: 3, message: 'Interview with Marcus Johnson in 2 hours',               time: '2h',      icon: Bell,          dotColor: 'bg-amber-500' },
  { id: 4, message: "Yuki Tanaka accepted Senior Product Designer offer",    time: '3h ago',  icon: CheckCircle2,  dotColor: 'bg-blue-500' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-lg">
      <p className="text-neutral-500 text-xs mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-neutral-500 capitalize">{entry.dataKey}:</span>
          <span className="text-neutral-900 font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { jobs, loading: jLoading } = useJobs()
  const { candidates, loading: cLoading } = useCandidates()
  const { applications, loading: aLoading } = useAllApplications(jobs)

  const loading = jLoading || cLoading || aLoading

  // Compute real metrics
  const activeJobs    = jobs.filter((j) => j.status === 'active').length
  const totalCandidates = candidates.length

  const stageCount = (stage: string) =>
    applications.filter((a: ApiApplication) => a.current_stage === stage).length

  const interviewCount = stageCount('interview')
  const offerCount     = stageCount('offer')
  const hiredCount     = stageCount('hired')
  const screeningCount = stageCount('screening')
  const sourcedCount   = applications.filter((a) =>
    !['interview', 'offer', 'hired', 'screening'].includes(a.current_stage)
  ).length

  const totalApps  = applications.length
  const responseRate = totalApps > 0 ? Math.round((interviewCount / totalApps) * 100) : 0

  const funnelData = [
    { stage: 'Sourced',   count: sourcedCount + totalCandidates,  pct: 100, color: '#6366F1' },
    { stage: 'Screening', count: screeningCount, pct: totalCandidates ? Math.round((screeningCount / totalCandidates) * 100) : 0, color: '#818CF8' },
    { stage: 'Interview', count: interviewCount, pct: totalCandidates ? Math.round((interviewCount / totalCandidates) * 100) : 0, color: '#A5B4FC' },
    { stage: 'Offer',     count: offerCount,     pct: totalCandidates ? Math.round((offerCount / totalCandidates) * 100) : 0,     color: '#22C55E' },
    { stage: 'Hired',     count: hiredCount,     pct: totalCandidates ? Math.round((hiredCount / totalCandidates) * 100) : 0,     color: '#16A34A' },
  ]

  const metrics = [
    { label: 'Active Jobs',          value: String(activeJobs),      unit: '',      change: +0,  icon: Briefcase,       invertChange: false },
    { label: 'Candidates',           value: String(totalCandidates), unit: '',      change: +0,  icon: Users,           invertChange: false },
    { label: 'In Interview',         value: String(interviewCount),  unit: '',      change: +0,  icon: CalendarCheck,   invertChange: false },
    { label: 'Response Rate',        value: String(responseRate),    unit: '%',     change: +0,  icon: MessageSquare,   invertChange: false },
    { label: 'Offers Extended',      value: String(offerCount),      unit: '',      change: +0,  icon: Clock,           invertChange: false },
  ]

  // Recent candidates: top 5 by ai_score
  const topApplications = [...applications]
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 5)

  const candidateById = Object.fromEntries(candidates.map((c) => [c.id, c]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Dashboard</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Sunday, March 23, 2026</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
          All automations running
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-neutral-500 text-xs font-medium">{m.label}</p>
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-neutral-600" />
                </div>
              </div>
              {loading ? (
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">—</span>
                </div>
              ) : (
                <p className="text-neutral-950 text-2xl font-semibold tracking-tight">
                  {m.value}<span className="text-base font-normal text-neutral-400">{m.unit}</span>
                </p>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="col-span-2 bg-white border border-neutral-200 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-neutral-900 text-sm font-semibold">Hiring Activity</h2>
              <p className="text-neutral-400 text-xs mt-0.5">Last 6 weeks</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Sourced</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" />Interviews</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Offers</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gSourced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInterviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOffers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEFEF" />
              <XAxis dataKey="date" tick={{ fill: '#ABABAB', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#ABABAB', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sourced"    stroke="#6366F1" strokeWidth={1.5} fill="url(#gSourced)" />
              <Area type="monotone" dataKey="interviews" stroke="#A78BFA" strokeWidth={1.5} fill="url(#gInterviews)" />
              <Area type="monotone" dataKey="offers"     stroke="#22C55E" strokeWidth={1.5} fill="url(#gOffers)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Funnel — live data */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="bg-white border border-neutral-200 rounded-xl p-5"
        >
          <div className="mb-5">
            <h2 className="text-neutral-900 text-sm font-semibold">Hiring Funnel</h2>
            <p className="text-neutral-400 text-xs mt-0.5">All active jobs</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-neutral-300">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3.5">
              {funnelData.map((item, i) => (
                <div key={item.stage}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-neutral-600">{item.stage}</span>
                    <span className="text-neutral-900 font-semibold">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(item.pct, item.count > 0 ? 4 : 0)}%` }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Hire rate</span>
            <span className="text-green-700 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {totalCandidates > 0 ? `${Math.round((hiredCount / totalCandidates) * 100)}%` : '—'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Top Candidates by AI Score */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="col-span-2 bg-white border border-neutral-200 rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
            <h2 className="text-neutral-900 text-sm font-semibold">Top Candidates</h2>
            <Link href="/candidates" className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-neutral-300 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : topApplications.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-neutral-400 text-sm">
              No candidates yet.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {topApplications.map((app) => {
                const candidate = candidateById[app.candidate_id]
                if (!candidate) return null
                return (
                  <div key={app.id} className="flex items-center gap-3.5 px-5 py-3 hover:bg-neutral-50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {getInitials(candidate.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/candidates/${candidate.id}`}>
                        <p className="text-neutral-900 text-sm font-medium hover:text-indigo-600 transition-colors truncate">
                          {candidate.name}
                        </p>
                      </Link>
                      <p className="text-neutral-400 text-xs truncate">{candidate.title} · {app.job_title}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {app.ai_score !== null && (
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border', getMatchScoreBg(app.ai_score ?? 0))}>
                          {app.ai_score}%
                        </span>
                      )}
                      <StatusBadge status={app.current_stage} type="stage" />
                      <span className="text-neutral-400 text-xs">{formatRelativeTime(app.updated_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Live Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
            <h2 className="text-neutral-900 text-sm font-semibold">Live Alerts</h2>
            <span className="text-xs bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5 font-medium">
              {alerts.length} new
            </span>
          </div>
          <div className="divide-y divide-neutral-100">
            {alerts.map((alert) => {
              const Icon = alert.icon
              return (
                <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors cursor-pointer">
                  <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-neutral-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-800 text-xs leading-relaxed">{alert.message}</p>
                    <p className="text-neutral-400 text-xs mt-0.5">{alert.time}</p>
                  </div>
                  <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', alert.dotColor)} />
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
