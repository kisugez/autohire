'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Shield, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { UpdateProfilePayload } from '@/lib/auth-context'

const tabs = [
  { id: 'general', label: 'General', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

type Status = { type: 'success' | 'error'; message: string } | null

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('general')

  // General form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [generalStatus, setGeneralStatus] = useState<Status>(null)
  const [generalLoading, setGeneralLoading] = useState(false)

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityStatus, setSecurityStatus] = useState<Status>(null)
  const [securityLoading, setSecurityLoading] = useState(false)

  // Notification preferences (local-only for now)
  const [notifPrefs, setNotifPrefs] = useState({
    newApplicant: true,
    interviewScheduled: true,
    automationTriggered: false,
    weeklyDigest: true,
    productUpdates: false,
  })

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const handleGeneralSave = async () => {
    if (!name.trim() || !email.trim()) {
      setGeneralStatus({ type: 'error', message: 'Name and email are required.' })
      return
    }
    setGeneralLoading(true)
    setGeneralStatus(null)
    try {
      const payload: UpdateProfilePayload = {}
      if (name !== user?.name) payload.name = name
      if (email !== user?.email) payload.email = email
      if (Object.keys(payload).length === 0) {
        setGeneralStatus({ type: 'success', message: 'No changes to save.' })
        return
      }
      await updateProfile(payload)
      setGeneralStatus({ type: 'success', message: 'Profile updated successfully.' })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to update profile.'
      setGeneralStatus({ type: 'error', message: msg })
    } finally {
      setGeneralLoading(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityStatus({ type: 'error', message: 'All password fields are required.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setSecurityStatus({ type: 'error', message: 'New password must be at least 8 characters.' })
      return
    }
    setSecurityLoading(true)
    setSecurityStatus(null)
    try {
      await updateProfile({ current_password: currentPassword, new_password: newPassword })
      setSecurityStatus({ type: 'success', message: 'Password changed successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to change password.'
      setSecurityStatus({ type: 'error', message: msg })
    } finally {
      setSecurityLoading(false)
    }
  }

  const getInitials = (n: string) =>
    n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-neutral-950 text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Manage your personal account settings</p>
      </div>

      {/* Avatar + name summary */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {user ? getInitials(user.name) : '?'}
        </div>
        <div>
          <div className="text-neutral-900 font-semibold">{user?.name ?? '—'}</div>
          <div className="text-neutral-500 text-sm">{user?.email ?? '—'}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full capitalize">
            <Shield className="w-3 h-3" />
            {user?.role ?? 'member'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100"
      >
        {/* ── GENERAL ─────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-5">
            <h2 className="text-neutral-900 font-semibold text-sm">Personal Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all placeholder-neutral-400"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all placeholder-neutral-400"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Role</label>
              <input
                type="text"
                value={user?.role ?? ''}
                readOnly
                className="w-full bg-neutral-100 border border-neutral-200 text-neutral-400 text-sm rounded-lg px-3 py-2 cursor-not-allowed capitalize"
              />
              <p className="text-neutral-400 text-xs mt-1">Role is managed by your organization admin.</p>
            </div>

            {generalStatus && (
              <div className={cn(
                'flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg',
                generalStatus.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              )}>
                {generalStatus.type === 'success'
                  ? <Check className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                }
                {generalStatus.message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleGeneralSave}
                disabled={generalLoading}
                className="flex items-center gap-2 bg-neutral-950 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {generalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ── SECURITY ─────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-5">
            <h2 className="text-neutral-900 font-semibold text-sm">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all placeholder-neutral-400"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all placeholder-neutral-400"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all placeholder-neutral-400"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            {/* Password strength hints */}
            {newPassword.length > 0 && (
              <ul className="space-y-1">
                {[
                  { ok: newPassword.length >= 8, label: 'At least 8 characters' },
                  { ok: /[A-Z]/.test(newPassword), label: 'One uppercase letter' },
                  { ok: /[0-9]/.test(newPassword), label: 'One number' },
                ].map(hint => (
                  <li key={hint.label} className={cn('flex items-center gap-1.5 text-xs', hint.ok ? 'text-green-600' : 'text-neutral-400')}>
                    <Check className={cn('w-3 h-3', hint.ok ? 'opacity-100' : 'opacity-30')} />
                    {hint.label}
                  </li>
                ))}
              </ul>
            )}

            {securityStatus && (
              <div className={cn(
                'flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg',
                securityStatus.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              )}>
                {securityStatus.type === 'success'
                  ? <Check className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                }
                {securityStatus.message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handlePasswordSave}
                disabled={securityLoading}
                className="flex items-center gap-2 bg-neutral-950 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {securityLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Update Password
              </button>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ─────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="p-6 space-y-5">
            <h2 className="text-neutral-900 font-semibold text-sm">Email Notifications</h2>

            <div className="space-y-3">
              {([
                { key: 'newApplicant', label: 'New applicant', description: 'When someone applies to one of your open roles' },
                { key: 'interviewScheduled', label: 'Interview scheduled', description: 'When an interview is confirmed in your calendar' },
                { key: 'automationTriggered', label: 'Automation triggered', description: 'Each time an automation workflow runs' },
                { key: 'weeklyDigest', label: 'Weekly digest', description: 'A summary of pipeline activity every Monday' },
                { key: 'productUpdates', label: 'Product updates', description: 'New features and improvements to AutoHyre' },
              ] as const).map(item => (
                <div key={item.key} className="flex items-start justify-between gap-4 py-3 border-b border-neutral-100 last:border-0">
                  <div>
                    <div className="text-neutral-900 text-sm font-medium">{item.label}</div>
                    <div className="text-neutral-500 text-xs mt-0.5">{item.description}</div>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={cn(
                      'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
                      notifPrefs[item.key] ? 'bg-neutral-950' : 'bg-neutral-200'
                    )}
                  >
                    <span className={cn(
                      'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
                      notifPrefs[item.key] ? 'translate-x-4' : 'translate-x-0'
                    )} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button className="bg-neutral-950 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors">
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
