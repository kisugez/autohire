'use client'

import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const candidatesPerJob = [
  { job: 'Frontend', count: 34 },
  { job: 'Backend', count: 28 },
  { job: 'ML Eng', count: 19 },
  { job: 'Designer', count: 15 },
  { job: 'DevOps', count: 12 },
  { job: 'Data Sci', count: 22 },
]

const conversionData = [
  { month: 'Aug', rate: 4.2 },
  { month: 'Sep', rate: 3.8 },
  { month: 'Oct', rate: 5.1 },
  { month: 'Nov', rate: 4.7 },
  { month: 'Dec', rate: 5.9 },
]

const responseRateData = [
  { week: 'W1', linkedin: 32, github: 48, referral: 78, website: 22 },
  { week: 'W2', linkedin: 38, github: 52, referral: 82, website: 28 },
  { week: 'W3', linkedin: 35, github: 44, referral: 75, website: 31 },
  { week: 'W4', linkedin: 42, github: 58, referral: 88, website: 25 },
  { week: 'W5', linkedin: 45, github: 61, referral: 91, website: 30 },
]

const timeToHireData = [
  { month: 'Aug', days: 28 },
  { month: 'Sep', days: 25 },
  { month: 'Oct', days: 22 },
  { month: 'Nov', days: 20 },
  { month: 'Dec', days: 18 },
]

const sourceData = [
  { name: 'LinkedIn', value: 45, color: '#6366F1' },
  { name: 'GitHub', value: 22, color: '#8B5CF6' },
  { name: 'Referral', value: 18, color: '#22C55E' },
  { name: 'Website', value: 10, color: '#F59E0B' },
  { name: 'Other', value: 5, color: '#9CA3AF' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 shadow-xl text-xs">
        <p className="text-[#9CA3AF] mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.fill }} />
            <span className="text-[#9CA3AF] capitalize">{entry.dataKey}:</span>
            <span className="text-[#F9FAFB] font-medium">{entry.value}{entry.dataKey === 'rate' ? '%' : entry.dataKey === 'days' ? 'd' : ''}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[#F9FAFB] text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-[#9CA3AF] text-sm mt-0.5">Recruitment performance insights</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Hires (YTD)', value: '24', change: '+33%', positive: true },
          { label: 'Avg. Time to Hire', value: '18d', change: '-28%', positive: true },
          { label: 'Cost per Hire', value: '$4.2k', change: '-12%', positive: true },
          { label: 'Offer Acceptance', value: '87%', change: '+5%', positive: true },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#111827] border border-[#1F2937] rounded-xl p-4"
          >
            <p className="text-[#9CA3AF] text-xs mb-1">{kpi.label}</p>
            <p className="text-[#F9FAFB] text-2xl font-bold">{kpi.value}</p>
            <p className={`text-xs mt-1 font-medium ${kpi.positive ? 'text-green-400' : 'text-red-400'}`}>
              {kpi.change} vs last quarter
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Candidates Per Job */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111827] border border-[#1F2937] rounded-xl p-5"
        >
          <h2 className="text-[#F9FAFB] text-sm font-semibold mb-1">Candidates Per Job</h2>
          <p className="text-[#9CA3AF] text-xs mb-4">Active job listings</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={candidatesPerJob}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="job" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Interview Conversion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#111827] border border-[#1F2937] rounded-xl p-5"
        >
          <h2 className="text-[#F9FAFB] text-sm font-semibold mb-1">Interview Conversion Rate</h2>
          <p className="text-[#9CA3AF] text-xs mb-4">Sourced → Hired %</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={conversionData}>
              <defs>
                <linearGradient id="conversionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" stroke="#22C55E" strokeWidth={2} fill="url(#conversionGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Response Rate by Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111827] border border-[#1F2937] rounded-xl p-5"
        >
          <h2 className="text-[#F9FAFB] text-sm font-semibold mb-1">Response Rate by Source</h2>
          <p className="text-[#9CA3AF] text-xs mb-4">Outreach reply rates %</p>
          <div className="flex items-center gap-4 mb-3 text-xs text-[#9CA3AF]">
            {[
              { label: 'LinkedIn', color: '#6366F1' },
              { label: 'GitHub', color: '#8B5CF6' },
              { label: 'Referral', color: '#22C55E' },
              { label: 'Website', color: '#F59E0B' },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={responseRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="linkedin" stroke="#6366F1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="github" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="referral" stroke="#22C55E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="website" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Source Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#111827] border border-[#1F2937] rounded-xl p-5"
        >
          <h2 className="text-[#F9FAFB] text-sm font-semibold mb-1">Top Candidate Sources</h2>
          <p className="text-[#9CA3AF] text-xs mb-4">Distribution by channel</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {sourceData.map(source => (
                <div key={source.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: source.color }} />
                    <span className="text-[#9CA3AF]">{source.name}</span>
                  </div>
                  <span className="text-[#F9FAFB] font-semibold">{source.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Time to Hire */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#111827] border border-[#1F2937] rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[#F9FAFB] text-sm font-semibold">Time to Hire Trend</h2>
            <p className="text-[#9CA3AF] text-xs">Average days from source to hire</p>
          </div>
          <span className="text-green-400 text-sm font-semibold">↓ 35% improvement</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={timeToHireData}>
            <defs>
              <linearGradient id="tthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="days" stroke="#6366F1" strokeWidth={2.5} fill="url(#tthGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
