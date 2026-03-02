'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Briefcase, Mail, ExternalLink, Star, Github, Linkedin,
  MessageSquare, Calendar, FileText, Brain, ChevronRight, Phone, Clock, CheckCircle2,
} from 'lucide-react'
import { MOCK_CANDIDATES } from '@/lib/constants'
import StatusBadge from '@/components/cards/status-badge'
import { getInitials, getMatchScoreBg, formatDate, cn } from '@/lib/utils'

const timeline = [
  { id: 1, type: 'stage', text: 'Moved to Interview stage', time: '2 days ago', icon: ChevronRight, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 2, type: 'email', text: 'Sent interview confirmation email', time: '2 days ago', icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 3, type: 'interview', text: 'Technical screening completed — Score: 8/10', time: '5 days ago', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 4, type: 'email', text: 'Replied to initial outreach', time: '1 week ago', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 5, type: 'ai', text: 'AI match score calculated: 94%', time: '2 weeks ago', icon: Brain, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
]

const aiInsights = [
  { label: 'Technical Skills Match', score: 96, detail: 'React, TypeScript, GraphQL — all required skills present' },
  { label: 'Experience Level', score: 88, detail: '6 years vs 5 required — exceeds requirements' },
  { label: 'Communication', score: 92, detail: 'Quick email responses, professional communication' },
  { label: 'Cultural Fit', score: 85, detail: 'Values aligned based on LinkedIn profile analysis' },
]

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const candidate = MOCK_CANDIDATES.find(c => c.id === params.id) || MOCK_CANDIDATES[0]

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/candidates" className="mt-1 w-8 h-8 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#374151] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xl font-bold">
              {getInitials(candidate.name)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[#F9FAFB] text-2xl font-bold">{candidate.name}</h1>
                <span className={cn('text-sm font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5', getMatchScoreBg(candidate.matchScore))}>
                  <Star className="w-3.5 h-3.5" />
                  {candidate.matchScore}% Match
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-[#9CA3AF]">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{candidate.title}</span>
                {candidate.company && <span>{candidate.company}</span>}
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{candidate.location}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{candidate.email}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={candidate.stage} type="stage" className="text-sm px-3 py-1" />
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#6366F1] hover:bg-[#5558DD] rounded-lg transition-colors">
            <Mail className="w-3.5 h-3.5" />
            Send Outreach
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#1F2937] hover:bg-[#374151] border border-[#374151] rounded-lg transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            Schedule Interview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="col-span-2 space-y-4">
          {/* Resume / Overview */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F9FAFB] text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6B7280]" />
                Overview
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#9CA3AF] mb-1">Experience</p>
                <p className="text-[#F9FAFB] font-medium">{candidate.experience} years</p>
              </div>
              <div>
                <p className="text-[#9CA3AF] mb-1">Source</p>
                <p className="text-[#F9FAFB] font-medium capitalize">{candidate.source}</p>
              </div>
              <div>
                <p className="text-[#9CA3AF] mb-1">Applied For</p>
                <p className="text-[#F9FAFB] font-medium">{candidate.jobTitle || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[#9CA3AF] mb-1">Added</p>
                <p className="text-[#F9FAFB] font-medium">{formatDate(candidate.createdAt)}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[#9CA3AF] text-sm mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 rounded-lg text-xs bg-[#1F2937] text-[#9CA3AF] border border-[#374151]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            {candidate.tags.length > 0 && (
              <div className="mt-4">
                <p className="text-[#9CA3AF] text-sm mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <h2 className="text-[#F9FAFB] text-sm font-semibold flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-[#6366F1]" />
              AI Insights
            </h2>
            <div className="space-y-4">
              {aiInsights.map((insight, i) => (
                <div key={insight.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-[#F9FAFB] font-medium">{insight.label}</span>
                    <span className={cn('font-semibold', insight.score >= 90 ? 'text-green-400' : insight.score >= 75 ? 'text-yellow-400' : 'text-red-400')}>
                      {insight.score}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden mb-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${insight.score}%` }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                      className={cn('h-full rounded-full', insight.score >= 90 ? 'bg-green-500' : insight.score >= 75 ? 'bg-yellow-500' : 'bg-red-500')}
                    />
                  </div>
                  <p className="text-[#6B7280] text-xs">{insight.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Communication */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <h2 className="text-[#F9FAFB] text-sm font-semibold flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#6B7280]" />
              Communication History
            </h2>
            <div className="space-y-3 text-sm">
              {[
                { from: 'AutoHyre', message: 'Hi Alex, I came across your profile and was impressed by your work at Meta...', time: '2 weeks ago', status: 'replied' },
                { from: 'Alex Rivera', message: 'Thanks for reaching out! I\'m definitely interested in learning more about the role...', time: '2 weeks ago', status: 'received' },
                { from: 'AutoHyre', message: 'Great! Could we schedule a 30-minute call to discuss the position?', time: '12 days ago', status: 'opened' },
              ].map((msg, i) => (
                <div key={i} className={cn('p-3 rounded-lg', msg.from === 'AutoHyre' ? 'bg-[#1F2937] border border-[#374151]' : 'bg-[#6366F1]/5 border border-[#6366F1]/10 ml-6')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#F9FAFB] font-medium text-xs">{msg.from}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded',
                        msg.status === 'replied' ? 'text-green-400 bg-green-500/10' :
                        msg.status === 'opened' ? 'text-blue-400 bg-blue-500/10' :
                        'text-[#9CA3AF] bg-[#374151]'
                      )}>
                        {msg.status}
                      </span>
                      <span className="text-[#6B7280] text-xs">{msg.time}</span>
                    </div>
                  </div>
                  <p className="text-[#9CA3AF] text-xs">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Links */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <h3 className="text-[#F9FAFB] text-sm font-semibold mb-3">Profiles</h3>
            <div className="space-y-2">
              {[
                { icon: Linkedin, label: 'LinkedIn Profile', href: '#' },
                { icon: Github, label: 'GitHub Profile', href: '#' },
                { icon: ExternalLink, label: 'Portfolio', href: '#' },
                { icon: FileText, label: 'View Resume', href: '#' },
              ].map((link) => (
                <a key={link.label} href={link.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1F2937] transition-colors text-sm text-[#9CA3AF] hover:text-[#F9FAFB]">
                  <link.icon className="w-4 h-4" />
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <h3 className="text-[#F9FAFB] text-sm font-semibold mb-4">Activity Timeline</h3>
            <div className="space-y-4">
              {timeline.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', item.color)} />
                    </div>
                    <div>
                      <p className="text-[#F9FAFB] text-xs">{item.text}</p>
                      <p className="text-[#6B7280] text-xs mt-0.5">{item.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <h3 className="text-[#F9FAFB] text-sm font-semibold mb-3">Interview Notes</h3>
            <textarea
              placeholder="Add interview notes..."
              rows={4}
              className="w-full bg-[#0B0F19] border border-[#1F2937] text-[#F9FAFB] text-xs rounded-lg p-3 placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] resize-none transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
