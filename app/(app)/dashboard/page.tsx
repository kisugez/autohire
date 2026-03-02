'use client'

import { motion } from 'framer-motion'
import {
  Briefcase, Users, CalendarCheck, MessageSquare, Clock,
  TrendingUp, ArrowRight, Bot, Bell, CheckCircle2, TrendingDown,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import StatusBadge from '@/components/cards/status-badge'
import { MOCK_CANDIDATES } from '@/lib/constants'
import { getInitials, formatRelativeTime, getMatchScoreBg } from '@/lib/utils'
import { cn } from '@/lib/utils'

const funnelData = [
  { stage: 'Sourced',   count: 156, pct: 100, color: '#6366F1' },
  { stage: 'Screening', count: 89,  pct: 57,  color: '#818CF8' },
  { stage: 'Interview', count: 42,  pct: 27,  color: '#A5B4FC' },
  { stage: 'Offer',     count: 14,  pct: 9,   color: '#22C55E' },
  { stage: 'Hired',     count: 8,   pct: 5,   color: '#16A34A' },
]

const activityData = [
  { date: 'Nov 18', sourced: 12, interviews: 4, offers: 1 },
  { date: 'Nov 19', sourced: 19, interviews: 6, offers: 2 },
  { date: 'Nov 20', sourced: 8,  interviews: 3, offers: 0 },
  { date: 'Nov 21', sourced: 15, interviews: 7, offers: 1 },
  { date: 'Nov 22', sourced: 22, interviews: 5, offers: 3 },
  { date: 'Nov 23', sourced: 11, interviews: 4, offers: 2 },
  { date: 'Nov 24', sourced: 28, interviews: 9, offers: 2 },
  { date: 'Nov 25', sourced: 17, interviews: 6, offers: 1 },
  { date: 'Nov 26', sourced: 20, interviews: 8, offers: 4 },
  { date: 'Nov 27', sourced: 25, interviews: 11, offers: 2 },
  { date: 'Nov 28', sourced: 14, interviews: 5,  offers: 1 },
  { date: 'Dec 2',  sourced: 31, interviews: 13, offers: 3 },
]

const alerts = [
  { id: 1, message: 'AI sourced 12 new candidates for ML Engineer', time: '10m ago', icon: Bot,          dotColor: 'bg-accent' },
  { id: 2, message: 'Alex Rivera replied to outreach — ready to screen', time: '1h ago',  icon: MessageSquare, dotColor: 'bg-success-700' },
  { id: 3, message: 'Interview with Marcus Johnson in 2 hours', time: '2h',      icon: Bell,          dotColor: 'bg-warning-700' },
  { id: 4, message: "James O'Brien accepted Engineering Manager offer", time: '3h ago',  icon: CheckCircle2,  dotColor: 'bg-info-700' },
]

const metrics = [
  { label: 'Active Jobs',         value: '12',   unit: '',     change: +8,  icon: Briefcase },
  { label: 'Candidates Sourced',  value: '156',  unit: '',     change: +24, icon: Users },
  { label: 'Interviews Scheduled',value: '28',   unit: '',     change: +12, icon: CalendarCheck },
  { label: 'Response Rate',       value: '68',   unit: '%',    change: +5,  icon: MessageSquare },
  { label: 'Avg. Time to Hire',   value: '18',   unit: ' days',change: -12, icon: Clock, invertChange: true },
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
  const recentCandidates = MOCK_CANDIDATES.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Dashboard</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Monday, December 2, 2024</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-success-700 bg-success-50 border border-success-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success-700 animate-pulse" />
          All automations running
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon
          const isPositive = m.invertChange ? m.change < 0 : m.change > 0
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
              <p className="text-neutral-950 text-2xl font-semibold tracking-tight">
                {m.value}<span className="text-base font-normal text-neutral-400">{m.unit}</span>
              </p>
              <div className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', isPositive ? 'text-success-700' : 'text-error-700')}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(m.change)}{m.unit === '%' ? 'pp' : m.unit === ' days' ? ' days' : ''} vs last month
              </div>
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
              <p className="text-neutral-400 text-xs mt-0.5">Last 12 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" />Sourced</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" />Interviews</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success-700" />Offers</span>
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

        {/* Funnel */}
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
                    animate={{ width: `${item.pct}%` }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Conversion rate</span>
            <span className="text-success-700 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />5.1%
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent Candidates */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="col-span-2 bg-white border border-neutral-200 rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
            <h2 className="text-neutral-900 text-sm font-semibold">Recent Candidates</h2>
            <Link href="/candidates" className="text-xs text-accent hover:text-primary-600 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-neutral-100">
            {recentCandidates.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-3.5 px-5 py-3 hover:bg-neutral-50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {getInitials(candidate.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/candidates/${candidate.id}`}>
                    <p className="text-neutral-900 text-sm font-medium hover:text-accent transition-colors truncate">
                      {candidate.name}
                    </p>
                  </Link>
                  <p className="text-neutral-400 text-xs truncate">{candidate.title}</p>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 rounded-md px-2 py-0.5">
                    {candidate.matchScore}%
                  </span>
                  <StatusBadge status={candidate.stage} type="stage" />
                  <span className="text-neutral-400 text-xs">{formatRelativeTime(candidate.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts */}
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
