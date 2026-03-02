'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Mail, Clock, CheckCircle, Eye, MessageSquare, Send, Calendar } from 'lucide-react'
import { MOCK_OUTREACH } from '@/lib/constants'
import SearchInput from '@/components/cards/search-input'
import FilterDropdown from '@/components/cards/filter-dropdown'
import { formatDate, cn } from '@/lib/utils'

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Sent', value: 'sent' },
  { label: 'Opened', value: 'opened' },
  { label: 'Replied', value: 'replied' },
  { label: 'Bounced', value: 'bounced' },
]

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  scheduled: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Calendar },
  sent: { color: 'text-[#9CA3AF]', bg: 'bg-[#374151] border-[#4B5563]', icon: Send },
  opened: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Eye },
  replied: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: MessageSquare },
  bounced: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: Mail },
}

const templates = [
  { id: 't1', name: 'Initial Outreach', category: 'outreach', uses: 234 },
  { id: 't2', name: '3-Day Follow-up', category: 'followup', uses: 189 },
  { id: 't3', name: 'Interview Invitation', category: 'interview', uses: 98 },
  { id: 't4', name: 'Offer Letter Template', category: 'offer', uses: 45 },
  { id: 't5', name: 'Rejection (Positive)', category: 'rejection', uses: 122 },
]

export default function OutreachPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'messages' | 'templates' | 'sequences'>('messages')

  const filtered = MOCK_OUTREACH.filter(m => {
    const matchSearch = m.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || m.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F9FAFB] text-2xl font-bold tracking-tight">Outreach</h1>
          <p className="text-[#9CA3AF] text-sm mt-0.5">Manage automated candidate communications</p>
        </div>
        <button className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#5558DD] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          New Sequence
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Sent Today', value: '34', icon: Send, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Open Rate', value: '68%', icon: Eye, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Reply Rate', value: '24%', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Scheduled', value: '12', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.bg)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div>
              <p className="text-[#9CA3AF] text-xs">{stat.label}</p>
              <p className="text-[#F9FAFB] text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#111827] border border-[#1F2937] rounded-lg p-1 w-fit">
        {(['messages', 'templates', 'sequences'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
              activeTab === tab
                ? 'bg-[#6366F1] text-white'
                : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'messages' && (
        <>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search messages..." className="w-72" />
            <FilterDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  {['Candidate', 'Subject', 'Status', 'Sent', 'Opened', 'Replied'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]">
                {filtered.map((msg, i) => {
                  const config = statusConfig[msg.status]
                  const StatusIcon = config.icon
                  return (
                    <motion.tr
                      key={msg.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-[#1F2937]/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[#F9FAFB] text-sm font-medium">{msg.candidateName}</p>
                        <p className="text-[#9CA3AF] text-xs">{msg.candidateEmail}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[#9CA3AF] text-sm truncate max-w-[280px]">{msg.subject}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border capitalize', config.bg, config.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#9CA3AF] text-sm">{msg.sentAt ? formatDate(msg.sentAt) : msg.scheduledAt ? `Scheduled ${formatDate(msg.scheduledAt)}` : '—'}</td>
                      <td className="px-5 py-3.5 text-[#9CA3AF] text-sm">{msg.openedAt ? formatDate(msg.openedAt) : '—'}</td>
                      <td className="px-5 py-3.5 text-[#9CA3AF] text-sm">{msg.repliedAt ? formatDate(msg.repliedAt) : '—'}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>
        </>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-[#374151] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#6366F1]" />
                  </div>
                  <span className="text-[#F9FAFB] text-sm font-semibold">{template.name}</span>
                </div>
                <span className="text-xs text-[#9CA3AF] bg-[#1F2937] px-2 py-0.5 rounded capitalize">{template.category}</span>
              </div>
              <p className="text-[#9CA3AF] text-xs">{template.uses} uses</p>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'sequences' && (
        <div className="space-y-3">
          {[
            { name: 'High-Match Outreach Sequence', steps: 3, active: 12, openRate: 72, replyRate: 28 },
            { name: 'Passive Candidate Nurture', steps: 5, active: 34, openRate: 58, replyRate: 14 },
          ].map((seq, i) => (
            <motion.div
              key={seq.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-[#374151] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#6366F1]" />
                  </div>
                  <div>
                    <p className="text-[#F9FAFB] text-sm font-semibold">{seq.name}</p>
                    <p className="text-[#9CA3AF] text-xs">{seq.steps} emails · {seq.active} active candidates</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <p className="text-[#9CA3AF]">Open Rate</p>
                    <p className="text-yellow-400 font-semibold">{seq.openRate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#9CA3AF]">Reply Rate</p>
                    <p className="text-green-400 font-semibold">{seq.replyRate}%</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
