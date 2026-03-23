'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Briefcase, DollarSign, Clock,
  Users, CalendarCheck, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import { formatDate, formatSalary, getInitials, getMatchScoreBg, cn } from '@/lib/utils'
import { get } from '@/lib/api'
import type { ApiJob, ApiApplication } from '@/types/job'
import type { ApiCandidate } from '@/types/candidate'

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, setJob]               = useState<ApiJob | null>(null)
  const [applications, setApps]     = useState<ApiApplication[]>([])
  const [candidates, setCandidates] = useState<Record<string, ApiCandidate>>({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      get<ApiJob>(`/api/v1/jobs/${params.id}`),
      get<ApiApplication[]>(`/api/v1/applications/job/${params.id}`),
      get<ApiCandidate[]>('/api/v1/candidates'),
    ])
      .then(([jobData, apps, allCandidates]) => {
        setJob(jobData)
        setApps(apps)
        setCandidates(Object.fromEntries(allCandidates.map((c) => [c.id, c])))
      })
      .catch(() => setError('Failed to load job details.'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-neutral-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error ?? 'Job not found.'}
      </div>
    )
  }

  const stageOrder = ['sourced', 'screening', 'interview', 'offer', 'hired']
  const stageCounts = stageOrder.map((s) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    count: applications.filter((a) => a.current_stage === s).length,
    color: { sourced: '#6366F1', screening: '#818CF8', interview: '#A5B4FC', offer: '#22C55E', hired: '#16A34A' }[s] ?? '#6B7280',
  }))
  const totalApps = applications.length

  const topApps = [...applications]
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/jobs" className="mt-1 w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-neutral-950 text-2xl font-bold tracking-tight">{job.title}</h1>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
              <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.department}</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />{job.location}
                {job.remote && <span className="text-indigo-500 ml-1">· Remote OK</span>}
              </span>
              {job.salary_min && job.salary_max && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {formatSalary(job.salary_min)}–{formatSalary(job.salary_max)}
                </span>
              )}
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Posted {formatDate(job.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:text-neutral-900 transition-colors">
            Edit Job
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            View Posting
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: totalApps,                                icon: Users,         color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'In Interview',        value: stageCounts[2].count,                    icon: CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Offers Extended',     value: stageCounts[3].count,                    icon: Briefcase,     color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Hiring Manager',      value: job.hiring_manager,                      icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', stat.bg)}>
              <stat.icon className={cn('w-5 h-5', stat.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-neutral-400 text-xs">{stat.label}</p>
              <p className="text-neutral-950 text-lg font-bold truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Applications list */}
        <div className="col-span-2">
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-neutral-900 text-sm font-semibold">
                Applications <span className="text-neutral-400 font-normal ml-1">({totalApps})</span>
              </h2>
              <Link href="/candidates" className="text-xs text-indigo-600 hover:text-indigo-700">View all candidates</Link>
            </div>
            {topApps.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-neutral-400 text-sm">No applications yet.</div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {topApps.map((app) => {
                  const c = candidates[app.candidate_id]
                  if (!c) return null
                  return (
                    <div key={app.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/candidates/${c.id}`}>
                          <p className="text-neutral-900 text-sm font-medium hover:text-indigo-600 truncate">{c.name}</p>
                        </Link>
                        <p className="text-neutral-400 text-xs truncate">{c.title} · {c.experience}y exp</p>
                      </div>
                      {app.ai_score !== null && (
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border flex-shrink-0', getMatchScoreBg(app.ai_score ?? 0))}>
                          {app.ai_score}%
                        </span>
                      )}
                      <StatusBadge status={app.current_stage} type="stage" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Funnel */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-4">Hiring Funnel</h3>
            <div className="space-y-3.5">
              {stageCounts.map((stage, i) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-neutral-600">{stage.label}</span>
                    <span className="text-neutral-900 font-semibold">{stage.count}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: totalApps > 0 ? `${Math.max((stage.count / totalApps) * 100, stage.count > 0 ? 4 : 0)}%` : '0%' }}
                      transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: stage.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-4">Job Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Hiring Manager', value: job.hiring_manager },
                { label: 'Type',           value: job.job_type },
                { label: 'Remote',         value: job.remote ? 'Yes' : 'No' },
                { label: 'Min AI Score',   value: `${job.min_ai_score}%` },
                { label: 'Department',     value: job.department },
                { label: 'Posted',         value: formatDate(job.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-neutral-400">{label}</span>
                  <span className="text-neutral-800 font-medium capitalize text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          {(job.requirements?.skills?.length ?? 0) > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-neutral-900 text-sm font-semibold mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.requirements?.skills?.map((skill) => (
                  <span key={skill} className="px-2.5 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 border border-neutral-200">
                    {skill}
                  </span>
                ))}
              </div>
              {job.requirements?.min_experience && (
                <p className="text-neutral-400 text-xs mt-3">
                  Min. {job.requirements.min_experience} years experience
                </p>
              )}
            </div>
          )}

          {/* Pipeline stages */}
          {job.pipeline_stages?.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-neutral-900 text-sm font-semibold mb-3">Pipeline Stages</h3>
              <div className="space-y-1.5">
                {job.pipeline_stages.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-2 text-sm text-neutral-600">
                    <span className="w-4 h-4 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-bold text-neutral-400 flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {stage}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
