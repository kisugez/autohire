'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Linkedin, Github, Mail, MessageSquare, Calendar, Database, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const integrations = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Source candidates from LinkedIn Recruiter and track profile views',
    icon: Linkedin,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    connected: true,
    lastSync: '5 minutes ago',
    category: 'Sourcing',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Discover developers via repositories, stars, and contribution graphs',
    icon: Github,
    color: 'text-[#9CA3AF]',
    bg: 'bg-[#374151]',
    border: 'border-[#4B5563]',
    connected: true,
    lastSync: '1 hour ago',
    category: 'Sourcing',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send and track outreach emails directly from your Gmail account',
    icon: Mail,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    connected: true,
    lastSync: '2 minutes ago',
    category: 'Communication',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get real-time notifications and hiring updates in your Slack workspace',
    icon: MessageSquare,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    connected: false,
    lastSync: null,
    category: 'Notifications',
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Automatically schedule and sync interviews with candidate availability',
    icon: Calendar,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    connected: true,
    lastSync: '30 minutes ago',
    category: 'Scheduling',
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse ATS',
    description: 'Sync candidate data, job postings and interview feedback with Greenhouse',
    icon: Database,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    connected: false,
    lastSync: null,
    category: 'ATS',
  },
  {
    id: 'lever',
    name: 'Lever ATS',
    description: 'Bi-directional sync with Lever for pipeline and candidate management',
    icon: Database,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    connected: false,
    lastSync: null,
    category: 'ATS',
  },
  {
    id: 'workday',
    name: 'Workday',
    description: 'Enterprise HR integration for seamless hiring workflow management',
    icon: Database,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    connected: false,
    lastSync: null,
    category: 'ATS',
  },
]

const categories = ['All', 'Sourcing', 'Communication', 'Notifications', 'Scheduling', 'ATS']

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const filtered = activeCategory === 'All'
    ? integrations
    : integrations.filter(i => i.category === activeCategory)

  const handleConnect = (id: string) => {
    setConnectingId(id)
    setTimeout(() => setConnectingId(null), 1500)
  }

  const connectedCount = integrations.filter(i => i.connected).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F9FAFB] text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-[#9CA3AF] text-sm mt-0.5">{connectedCount} of {integrations.length} connected</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeCategory === cat
                ? 'bg-[#6366F1] text-white'
                : 'bg-[#111827] text-[#9CA3AF] border border-[#1F2937] hover:border-[#374151] hover:text-[#F9FAFB]'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((integration, i) => {
          const Icon = integration.icon
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'bg-[#111827] border rounded-xl p-5 hover:border-[#374151] transition-all duration-200',
                integration.connected ? 'border-[#1F2937]' : 'border-[#1F2937]'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', integration.bg, integration.border)}>
                    <Icon className={cn('w-5 h-5', integration.color)} />
                  </div>
                  <div>
                    <p className="text-[#F9FAFB] text-sm font-semibold">{integration.name}</p>
                    <span className="text-xs text-[#6B7280]">{integration.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {integration.connected ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span className="text-[#6B7280]">Not connected</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-[#9CA3AF] text-xs mb-4">{integration.description}</p>

              <div className="flex items-center justify-between">
                <div>
                  {integration.lastSync ? (
                    <p className="text-[#6B7280] text-xs flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Last sync: {integration.lastSync}
                    </p>
                  ) : (
                    <p className="text-[#6B7280] text-xs">Never synced</p>
                  )}
                </div>
                <button
                  onClick={() => handleConnect(integration.id)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-lg transition-all',
                    integration.connected
                      ? 'text-[#9CA3AF] bg-[#1F2937] border border-[#374151] hover:border-[#6B7280]'
                      : 'text-white bg-[#6366F1] hover:bg-[#5558DD]',
                    connectingId === integration.id && 'opacity-70 cursor-wait'
                  )}
                >
                  {connectingId === integration.id
                    ? 'Connecting...'
                    : integration.connected
                    ? 'Manage'
                    : 'Connect'
                  }
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
