'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Star, Briefcase, ChevronRight } from 'lucide-react'
import { MOCK_CANDIDATES } from '@/lib/constants'
import StatusBadge from '@/components/cards/status-badge'
import SearchInput from '@/components/cards/search-input'
import FilterDropdown from '@/components/cards/filter-dropdown'
import { getInitials, getMatchScoreBg, formatRelativeTime, cn } from '@/lib/utils'

const stageOptions = [
  { label: 'All Stages', value: '' },
  { label: 'Sourced', value: 'sourced' },
  { label: 'Screening', value: 'screening' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
]

const sourceOptions = [
  { label: 'All Sources', value: '' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'GitHub', value: 'github' },
  { label: 'Referral', value: 'referral' },
  { label: 'Website', value: 'website' },
]

const scoreOptions = [
  { label: 'Any Score', value: '' },
  { label: '90%+ Match', value: '90' },
  { label: '80%+ Match', value: '80' },
  { label: '70%+ Match', value: '70' },
]

export default function CandidatesPage() {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [scoreFilter, setScoreFilter] = useState('')

  const filtered = MOCK_CANDIDATES.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
    const matchStage = !stageFilter || c.stage === stageFilter
    const matchSource = !sourceFilter || c.source === sourceFilter
    const matchScore = !scoreFilter || c.matchScore >= parseInt(scoreFilter)
    return matchSearch && matchStage && matchSource && matchScore
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Candidates</h1>
          <p className="text-neutral-400 text-sm mt-0.5">{MOCK_CANDIDATES.length} total in database</p>
        </div>
        <button className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Candidate
        </button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, skills, email..." className="w-72" />
        <FilterDropdown label="Stage" options={stageOptions} value={stageFilter} onChange={setStageFilter} />
        <FilterDropdown label="Source" options={sourceOptions} value={sourceFilter} onChange={setSourceFilter} />
        <FilterDropdown label="AI Score" options={scoreOptions} value={scoreFilter} onChange={setScoreFilter} />
        <span className="text-neutral-400 text-sm ml-auto">{filtered.length} candidates</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {['Candidate', 'Skills', 'Exp', 'AI Match', 'Stage', 'Source', 'Updated', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((candidate, i) => (
              <motion.tr
                key={candidate.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="hover:bg-neutral-50 transition-colors group"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(candidate.name)}
                    </div>
                    <div>
                      <Link href={`/candidates/${candidate.id}`}>
                        <p className="text-neutral-900 text-sm font-medium hover:text-accent transition-colors">{candidate.name}</p>
                      </Link>
                      <p className="text-neutral-400 text-xs">{candidate.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {candidate.skills.slice(0, 3).map(skill => (
                      <span key={skill} className="px-1.5 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600 border border-neutral-200">{skill}</span>
                    ))}
                    {candidate.skills.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-xs text-neutral-400">+{candidate.skills.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 text-neutral-500 text-sm">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                    {candidate.experience}y
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-neutral-300" />
                    <span className={cn('text-sm font-semibold px-2 py-0.5 rounded-md border', getMatchScoreBg(candidate.matchScore))}>
                      {candidate.matchScore}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={candidate.stage} type="stage" /></td>
                <td className="px-5 py-3.5"><span className="text-neutral-500 text-sm capitalize">{candidate.source}</span></td>
                <td className="px-5 py-3.5"><span className="text-neutral-400 text-sm">{formatRelativeTime(candidate.updatedAt)}</span></td>
                <td className="px-5 py-3.5">
                  <Link href={`/candidates/${candidate.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
