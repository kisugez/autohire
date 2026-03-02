'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  CreditCard,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

const notifications = [
  { id: '1', type: 'success', message: 'Alex Rivera replied to your outreach', time: '5m ago' },
  { id: '2', type: 'info',    message: 'Interview scheduled with Marcus Johnson', time: '1h ago' },
  { id: '3', type: 'success', message: 'Automation "High-Match Outreach" triggered 12 times today', time: '2h ago' },
  { id: '4', type: 'warning', message: 'LinkedIn integration needs reauthorization', time: '3h ago' },
]

export default function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white/90 backdrop-blur-xl border-b border-neutral-100 flex items-center px-6 z-30">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search candidates, jobs..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-lg pl-8.5 pr-10 py-1.5 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
            style={{ paddingLeft: '2.25rem' }}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-neutral-400 bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Live status */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-500 bg-success-50 border border-success-200 rounded-full px-3 py-1 mr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success-700 animate-pulse" />
          Automations active
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent border-2 border-white" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                  <span className="text-neutral-900 text-sm font-semibold">Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-neutral-100">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors">
                      {n.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-success-700 mt-0.5 flex-shrink-0" />
                      ) : n.type === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-warning-700 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Bell className="w-4 h-4 text-info-700 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-neutral-800 text-xs leading-relaxed">{n.message}</p>
                        <p className="text-neutral-400 text-xs mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-5 bg-neutral-200 mx-1" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold">
              {getInitials('Sarah Mitchell')}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-neutral-800 text-xs font-medium">Sarah Mitchell</div>
            </div>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden"
              >
                {[
                  { icon: User, label: 'Profile' },
                  { icon: CreditCard, label: 'Billing' },
                  { icon: HelpCircle, label: 'Help & Support' },
                ].map((item) => (
                  <button key={item.label} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors text-sm">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-neutral-100">
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-error-700 hover:bg-error-50 transition-colors text-sm">
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {(showNotifications || showUserMenu) && (
        <div className="fixed inset-0 z-[-1]" onClick={() => { setShowNotifications(false); setShowUserMenu(false) }} />
      )}
    </header>
  )
}
