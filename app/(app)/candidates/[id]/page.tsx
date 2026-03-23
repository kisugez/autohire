'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Briefcase, Mail, Star, Github, Linkedin,
  MessageSquare, Calendar, FileText, Brain, ChevronRight, Phone,
  CheckCircle2, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import { getInitials, getMatchScoreBg, formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { get } from '@/lib/api'
import type { ApiCandidate } from '@/types/candidate'
import type { ApiApplication } from '@/types/job'

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const [candidate, setCandidate] = useState<ApiCandidate | null>(null)
  const [application, setApplication] = useState<ApiApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    // Fetch candidate + all candidates list (to get the one by id) + all applications
    Promise.all([
      get<ApiCandidate[]>('/api/v1/candidates'),
      // We don't have a single candidate endpoint, so fetch all and find
    ])
      .then(([all]) => {
        const found = all.find((c) => c.id === params.id)
        if (!found) { setError('Candidate not found.'); return }
        setCandidate(found)
      })
      .catch(() => setError('Failed to load candidate.'))
      .finally(() => setLoading(false))
  }, [params.id])

  // Once we have the candidate, try to find their application across jobs
  useEffect(() => {
    if (!candidate) return
    // Fetch applications by searching — no direct endpoint, so we skip for now
    // and rely on what comes back per job. We'll show what we have.
  }, [candidate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-neutral-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl max-w-lg">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error ?? 'Candidate not found.'}
        <Link href="/candidates" className="ml-auto text-red-600 underline text-xs">Back</Link>
      </div>
    )
  }

  const aiLabelColor: Record<string, string> = {
    strong_fit: 'text-green-700 bg-green-50 border-green-200',
    good_fit:   'text-blue-700 bg-blue-50 border-blue-200',
    reserve:    'text-amber-700 bg-amber-50 border-amber-200',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/candidates"
            className="mt-1 w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-neutral-950 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {getInitials(candidate.name)}
            </div>
            <div>
              <h1 className="text-neutral-950 text-2xl font-bold tracking-tight mb-1">{candidate.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{candidate.title}</span>
                {candidate.company && <span className="text-neutral-400">{candidate.company}</span>}
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{candidate.location}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{candidate.email}</span>
                {candidate.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{candidate.phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:text-neutral-900 transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            Schedule Interview
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors">
            <Mail className="w-3.5 h-3.5" />
            Send Outreach
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="col-span-2 space-y-4">

          {/* Overview */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="text-neutral-900 text-sm font-semibold flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-neutral-400" />
              Overview
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              {[
                { label: 'Experience',   value: `${candidate.experience} years` },
                { label: 'Source',       value: candidate.source },
                { label: 'Location',     value: candidate.location },
                { label: 'Added',        value: formatDate(candidate.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-neutral-400 text-xs mb-0.5">{label}</p>
                  <p className="text-neutral-900 font-medium capitalize">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-neutral-400 text-xs mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 border border-neutral-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AI Scoring placeholder — shown when application data is available */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="text-neutral-900 text-sm font-semibold flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-indigo-500" />
              AI Assessment
            </h2>
            {application ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={cn('text-2xl font-bold px-3 py-1.5 rounded-xl border', getMatchScoreBg(application.ai_score ?? 0))}>
                    {application.ai_score ?? '—'}%
                  </span>
                  {application.ai_label && (
                    <span className={cn('text-sm font-medium px-3 py-1 rounded-full border capitalize', aiLabelColor[application.ai_label] ?? 'bg-neutral-100 text-neutral-500 border-neutral-200')}>
                      {application.ai_label.replace('_', ' ')}
                    </span>
                  )}
                  <StatusBadge status={application.current_stage} type="stage" />
                </div>
                {application.ai_reasoning && (
                  <p className="text-neutral-600 text-sm leading-relaxed bg-neutral-50 border border-neutral-100 rounded-lg px-4 py-3">
                    {application.ai_reasoning}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm">
                No application on record yet — AI score will appear once this candidate applies to a role.
              </p>
            )}
          </div>

          {/* Communication stub */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="text-neutral-900 text-sm font-semibold flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-neutral-400" />
              Communication History
            </h2>
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400 text-sm gap-2">
              <MessageSquare className="w-8 h-8 text-neutral-200" />
              <span>No messages yet.</span>
              <button className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 transition-colors">
                <Mail className="w-3.5 h-3.5" /> Send first outreach
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Profiles */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-3">Profiles</h3>
            <div className="space-y-1">
              {[
                { icon: Linkedin,     label: 'LinkedIn Profile', show: true },
                { icon: Github,       label: 'GitHub Profile',   show: true },
                { icon: ExternalLink, label: 'Portfolio',        show: true },
                { icon: FileText,     label: 'View Resume',      show: true },
              ].map((link) => (
                <button
                  key={link.label}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors text-sm text-neutral-500 hover:text-neutral-800"
                >
                  <link.icon className="w-4 h-4 flex-shrink-0" />
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
                </button>
              ))}
            </div>
          </div>

          {/* Activity timeline */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-4">Activity Timeline</h3>
            <div className="space-y-4">
              {[
                { icon: Brain,         color: 'text-indigo-500', bg: 'bg-indigo-50', text: 'Candidate profile imported',                          time: formatRelativeTime(candidate.created_at) },
                { icon: CheckCircle2,  color: 'text-green-500',  bg: 'bg-green-50',  text: `Sourced via ${candidate.source}`,                      time: formatRelativeTime(candidate.created_at) },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', item.color)} />
                    </div>
                    <div>
                      <p className="text-neutral-800 text-xs">{item.text}</p>
                      <p className="text-neutral-400 text-xs mt-0.5">{item.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-neutral-900 text-sm font-semibold mb-3">Interview Notes</h3>
            <textarea
              placeholder="Add notes about this candidate…"
              rows={4}
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs rounded-lg p-3 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white resize-none transition-colors"
            />
            <button className="mt-2 w-full py-1.5 text-xs text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors">
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
