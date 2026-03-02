'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building, Users, Mail, Zap, Key, CreditCard, ChevronRight, Eye, EyeOff, Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'organization', label: 'Organization', icon: Building },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'automation', label: 'Automation Settings', icon: Zap },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

const teamMembers = [
  { name: 'Sarah Mitchell', email: 'sarah@acme.com', role: 'Admin', avatar: 'SM' },
  { name: 'Tom Walker', email: 'tom@acme.com', role: 'Recruiter', avatar: 'TW' },
  { name: 'Lisa Park', email: 'lisa@acme.com', role: 'Recruiter', avatar: 'LP' },
  { name: 'Rachel Green', email: 'rachel@acme.com', role: 'Hiring Manager', avatar: 'RG' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('organization')
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const apiKey = 'sk_live_autohyre_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  const maskedKey = 'sk_live_autohyre_••••••••••••••••••••••••••'

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[#F9FAFB] text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[#9CA3AF] text-sm mt-0.5">Manage your workspace preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  activeSection === section.id
                    ? 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20'
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#111827]'
                )}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeSection === 'organization' && (
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 space-y-6">
                <h2 className="text-[#F9FAFB] text-base font-semibold">Organization Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Company Name', value: 'Acme Corporation' },
                    { label: 'Industry', value: 'Technology' },
                    { label: 'Company Size', value: '51-200 employees' },
                    { label: 'Website', value: 'acmecorp.com' },
                    { label: 'Timezone', value: 'America/Los_Angeles' },
                    { label: 'Language', value: 'English (US)' },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-[#9CA3AF] text-xs mb-1.5">{field.label}</label>
                      <input
                        type="text"
                        defaultValue={field.value}
                        className="w-full bg-[#0B0F19] border border-[#1F2937] text-[#F9FAFB] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <button className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558DD] text-white text-sm font-medium rounded-lg transition-colors">
                  Save Changes
                </button>
              </div>
            )}

            {activeSection === 'users' && (
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2937]">
                  <h2 className="text-[#F9FAFB] text-base font-semibold">Team Members</h2>
                  <button className="text-sm text-white bg-[#6366F1] hover:bg-[#5558DD] px-3 py-1.5 rounded-lg transition-colors">
                    Invite Member
                  </button>
                </div>
                <div className="divide-y divide-[#1F2937]">
                  {teamMembers.map(member => (
                    <div key={member.email} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold">
                        {member.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="text-[#F9FAFB] text-sm font-medium">{member.name}</p>
                        <p className="text-[#9CA3AF] text-xs">{member.email}</p>
                      </div>
                      <select className="bg-[#1F2937] border border-[#374151] text-[#9CA3AF] text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6366F1]">
                        <option>Admin</option>
                        <option>Recruiter</option>
                        <option>Hiring Manager</option>
                        <option>Viewer</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'email' && (
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 space-y-5">
                <h2 className="text-[#F9FAFB] text-base font-semibold">Email Settings</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Sender Name', value: 'Sarah from Acme Recruiting' },
                    { label: 'Reply-To Email', value: 'recruiting@acmecorp.com' },
                    { label: 'Email Signature', value: 'Best regards,\nSarah Mitchell\nHead of Talent @ Acme Corp' },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-[#9CA3AF] text-xs mb-1.5">{field.label}</label>
                      {field.label === 'Email Signature' ? (
                        <textarea
                          defaultValue={field.value}
                          rows={3}
                          className="w-full bg-[#0B0F19] border border-[#1F2937] text-[#F9FAFB] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6366F1] resize-none transition-colors"
                        />
                      ) : (
                        <input
                          type="text"
                          defaultValue={field.value}
                          className="w-full bg-[#0B0F19] border border-[#1F2937] text-[#F9FAFB] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6366F1] transition-colors"
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3 border-t border-[#1F2937]">
                    <div>
                      <p className="text-[#F9FAFB] text-sm font-medium">Track Email Opens</p>
                      <p className="text-[#9CA3AF] text-xs">Know when candidates open your emails</p>
                    </div>
                    <div className="w-10 h-6 bg-[#6366F1] rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558DD] text-white text-sm font-medium rounded-lg transition-colors">
                  Save Settings
                </button>
              </div>
            )}

            {activeSection === 'automation' && (
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 space-y-5">
                <h2 className="text-[#F9FAFB] text-base font-semibold">Automation Settings</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Auto-score new candidates with AI', enabled: true },
                    { label: 'Auto-send outreach to high-match candidates', enabled: true },
                    { label: 'Send interview reminders automatically', enabled: true },
                    { label: 'Auto-reject below threshold candidates', enabled: false },
                    { label: 'Weekly digest email summary', enabled: true },
                  ].map(setting => (
                    <div key={setting.label} className="flex items-center justify-between py-3 border-b border-[#1F2937] last:border-0">
                      <p className="text-[#F9FAFB] text-sm">{setting.label}</p>
                      <div className={cn(
                        'w-10 h-6 rounded-full relative cursor-pointer transition-colors',
                        setting.enabled ? 'bg-[#6366F1]' : 'bg-[#374151]'
                      )}>
                        <div className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                          setting.enabled ? 'right-1' : 'left-1'
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'api' && (
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 space-y-5">
                <h2 className="text-[#F9FAFB] text-base font-semibold">API Keys</h2>
                <p className="text-[#9CA3AF] text-sm">Use these keys to integrate AutoHyre with your custom tools.</p>
                <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#F9FAFB] text-sm font-medium">Production API Key</span>
                    <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#111827] border border-[#1F2937] text-[#9CA3AF] text-xs rounded-lg px-3 py-2 font-mono">
                      {showApiKey ? apiKey : maskedKey}
                    </code>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="w-9 h-9 flex items-center justify-center bg-[#111827] border border-[#1F2937] rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyKey}
                      className="w-9 h-9 flex items-center justify-center bg-[#111827] border border-[#1F2937] rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors">
                  + Generate new API key
                </button>
              </div>
            )}

            {activeSection === 'billing' && (
              <div className="space-y-4">
                <div className="bg-[#111827] border border-[#6366F1]/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[#F9FAFB] text-base font-semibold">Pro Plan</h2>
                      <p className="text-[#9CA3AF] text-sm">$199/month · Renews Dec 15, 2024</p>
                    </div>
                    <span className="text-xs bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 px-3 py-1 rounded-full font-medium">
                      Current Plan
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#1F2937]">
                    {[
                      { label: 'Active Jobs', used: 12, limit: 25 },
                      { label: 'AI Credits', used: 1240, limit: 5000 },
                      { label: 'Team Members', used: 4, limit: 10 },
                    ].map(usage => (
                      <div key={usage.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#9CA3AF]">{usage.label}</span>
                          <span className="text-[#F9FAFB]">{usage.used}/{usage.limit}</span>
                        </div>
                        <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#6366F1]"
                            style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full py-3 text-sm font-medium text-[#6366F1] bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl hover:bg-[#6366F1]/10 transition-colors">
                  Upgrade to Enterprise
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
