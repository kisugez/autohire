'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Star, Briefcase } from 'lucide-react'
import { Candidate } from '@/types/candidate'
import { getInitials, getMatchScoreBg, formatRelativeTime } from '@/lib/utils'
import StatusBadge from './status-badge'
import { cn } from '@/lib/utils'

interface CandidateCardProps {
  candidate: Candidate
  isDragging?: boolean
}

export default function CandidateCard({ candidate, isDragging }: CandidateCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'bg-[#111827] border border-[#1F2937] rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-[#374151] transition-all duration-200 group',
        isDragging && 'shadow-2xl shadow-black/50 border-[#6366F1]/30 rotate-2 scale-105'
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {getInitials(candidate.name)}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/candidates/${candidate.id}`}>
            <h3 className="text-[#F9FAFB] text-sm font-semibold truncate hover:text-[#6366F1] transition-colors">
              {candidate.name}
            </h3>
          </Link>
          <p className="text-[#9CA3AF] text-xs truncate">{candidate.title}</p>
        </div>
        <span className={cn(
          'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border flex-shrink-0',
          getMatchScoreBg(candidate.matchScore)
        )}>
          <Star className="w-2.5 h-2.5" />
          {candidate.matchScore}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mb-3">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{candidate.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <Briefcase className="w-3 h-3" />
          <span>{candidate.experience}y exp</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {candidate.skills.slice(0, 3).map((skill) => (
          <span
            key={skill}
            className="px-1.5 py-0.5 rounded text-xs bg-[#1F2937] text-[#9CA3AF] border border-[#374151]"
          >
            {skill}
          </span>
        ))}
        {candidate.skills.length > 3 && (
          <span className="px-1.5 py-0.5 rounded text-xs bg-[#1F2937] text-[#6B7280]">
            +{candidate.skills.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        {candidate.tags.length > 0 && (
          <span className="text-xs text-[#6366F1] font-medium">{candidate.tags[0]}</span>
        )}
        <span className="text-xs text-[#6B7280] ml-auto">{formatRelativeTime(candidate.updatedAt)}</span>
      </div>
    </motion.div>
  )
}
