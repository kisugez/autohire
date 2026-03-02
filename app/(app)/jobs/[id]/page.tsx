'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, MapPin, Users, CalendarCheck, Briefcase, DollarSign, Clock, ExternalLink, MoreHorizontal } from 'lucide-react'
import { MOCK_JOBS, MOCK_CANDIDATES } from '@/lib/constants'
import StatusBadge from '@/components/cards/status-badge'
import { formatDate, formatSalary, getInitials, getMatchScoreBg, cn } from '@/lib/utils'

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const job = MOCK_JOBS.find(j => j.id === params.id) || MOCK_JOBS[0]
  const candidates = MOCK_CANDIDATES.filter(c => c.jobId === params.id || true).slice(0, 5)

  const stageData = [
    { label: 'Sourced', value: job.candidateCount, color: 'bg-slate-500' },
    { label: 'Screening', value: Math.floor(job.candidateCount * 0.57), color: 'bg-blue-500' },
    { label: 'Interview', value: job.interviewCount, color: 'bg-purple-500' },
    { label: 'Offer', value: Math.floor(job.hiresCount * 2), color: 'bg-yellow-500' },
    { label: 'Hired', value: job.hiresCount, color: 'bg-green-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/jobs" className="mt-0.5 w-8 h-8 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#374151] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[#F9FAFB] text-2xl font-bold">{job.title}</h1>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-[#9CA3AF]">
              <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.department}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}{job.remote && ' · Remote OK'}</span>
              <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Posted {formatDate(job.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm text-[#9CA3AF] bg-[#111827] border border-[#1F2937] rounded-lg hover:border-[#374151] hover:text-[#F9FAFB] transition-colors">
            Edit Job
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#6366F1] hover:bg-[#5558DD] rounded-lg transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            View Posting
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Candidates', value: job.candidateCount, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Interviews', value: job.interviewCount, icon: CalendarCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Hired', value: job.hiresCount, icon: Briefcase, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Avg. Time to Hire', value: '18 days', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bg)}>
              <stat.icon className={cn('w-5 h-5', stat.color)} />
            </div>
            <div>
              <p className="text-[#9CA3AF] text-xs">{stat.label}</p>
              <p className="text-[#F9FAFB] text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Candidates List */}
        <div className="col-span-2 space-y-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2937]">
              <h2 className="text-[#F9FAFB] text-sm font-semibold">Candidates</h2>
              <Link href="/candidates" className="text-[#6366F1] text-xs hover:text-[#818CF8]">View all</Link>
            </div>
            <div className="divide-y divide-[#1F2937]">
              {candidates.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1F2937]/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/candidates/${c.id}`}>
                      <p className="text-[#F9FAFB] text-sm font-medium hover:text-[#6366F1] truncate">{c.name}</p>
                    </Link>
                    <p className="text-[#9CA3AF] text-xs">{c.title}</p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border', getMatchScoreBg(c.matchScore))}>
                    {c.matchScore}%
                  </span>
                  <StatusBadge status={c.stage} type="stage" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Funnel */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <h3 className="text-[#F9FAFB] text-sm font-semibold mb-4">Hiring Funnel</h3>
            <div className="space-y-3">
              {stageData.map((stage, i) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#9CA3AF]">{stage.label}</span>
                    <span className="text-[#F9FAFB] font-medium">{stage.value}</span>
                  </div>
                  <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stage.value / stageData[0].value) * 100}%` }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className={cn('h-full rounded-full', stage.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <h3 className="text-[#F9FAFB] text-sm font-semibold mb-4">Job Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Hiring Manager</span>
                <span className="text-[#F9FAFB]">{job.hiringManager}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Type</span>
                <span className="text-[#F9FAFB] capitalize">{job.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Remote</span>
                <span className="text-[#F9FAFB]">{job.remote ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Salary</span>
                <span className="text-[#F9FAFB]">{formatSalary(job.salaryMin, job.salaryMax)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
