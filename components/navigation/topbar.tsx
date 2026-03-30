'use client'

<<<<<<< Updated upstream
import { useState } from 'react'
<<<<<<< HEAD
import Link from 'next/link'
=======
=======
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
>>>>>>> Stashed changes
>>>>>>> c943086 (feat: closes #13 closes #12)
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Bell, ChevronDown, LogOut, User, CreditCard,
  HelpCircle, CheckCircle, AlertCircle, X, Briefcase, Users,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
<<<<<<< HEAD
import { useAuth } from '@/lib/auth-context'
=======
<<<<<<< Updated upstream
=======
import { useAuth } from '@/lib/auth-context'
import { useJobsContext } from '@/lib/jobs-context'
import { useCandidates } from '@/lib/hooks'
>>>>>>> Stashed changes
>>>>>>> c943086 (feat: closes #13 closes #12)

const notifications = [
  { id: '1', type: 'success', message: 'Alex Rivera replied to your outreach', time: '5m ago' },
  { id: '2', type: 'info',    message: 'Interview scheduled with Marcus Johnson', time: '1h ago' },
  { id: '3', type: 'success', message: 'Automation "High-Match Outreach" triggered 12 times today', time: '2h ago' },
  { id: '4', type: 'warning', message: 'LinkedIn integration needs reauthorization', time: '3h ago' },
]

export default function Topbar() {
<<<<<<< HEAD
  const { user, logout } = useAuth()
=======
<<<<<<< Updated upstream
>>>>>>> c943086 (feat: closes #13 closes #12)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchValue, setSearchValue] = useState('')

<<<<<<< HEAD
  const displayName = user?.name ?? 'Account'
  const displayInitials = user ? getInitials(user.name) : '?'

=======
=======
  const { user, logout } = useAuth()
  const router = useRouter()
  const { jobs } = useJobsContext()
  const { candidates } = useCandidates()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu]           = useState(false)
  const [searchValue, setSearchValue]             = useState('')
  const [showResults, setShowResults]             = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const displayName     = user?.name ?? 'Account'
  const displayInitials = user ? getInitials(user.name) : '?'

  // ⌘K focuses the search bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = searchValue.trim().toLowerCase()

  const matchedJobs = q
    ? jobs
        .filter(j =>
          j.title.toLowerCase().includes(q) ||
          (j.department ?? '').toLowerCase().includes(q) ||
          (j.location ?? '').toLowerCase().includes(q)
        )
        .slice(0, 4)
    : []

  const matchedCandidates = q
    ? candidates
        .filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.title ?? '').toLowerCase().includes(q) ||
          (c.skills ?? []).some((s: string) => s.toLowerCase().includes(q))
        )
        .slice(0, 4)
    : []

  const hasResults = matchedJobs.length > 0 || matchedCandidates.length > 0

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowResults(false)
      inputRef.current?.blur()
    }
    if (e.key === 'Enter' && q) {
      setShowResults(false)
      inputRef.current?.blur()
      const dest = matchedCandidates.length >= matchedJobs.length ? 'candidates' : 'jobs'
      router.push(`/${dest}?q=${encodeURIComponent(q)}`)
      setSearchValue('')
    }
  }

  const handleResultClick = () => {
    setShowResults(false)
    setSearchValue('')
  }

>>>>>>> Stashed changes
>>>>>>> c943086 (feat: closes #13 closes #12)
  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white/90 backdrop-blur-xl border-b border-neutral-100 flex items-center px-6 z-30">

      {/* Search */}
      <div className="flex-1 max-w-sm" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search candidates, jobs…"
            value={searchValue}
<<<<<<< Updated upstream
            onChange={(e) => setSearchValue(e.target.value)}
<<<<<<< HEAD
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-lg pr-10 py-1.5 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
=======
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-lg pl-8.5 pr-10 py-1.5 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
=======
            onChange={(e) => { setSearchValue(e.target.value); setShowResults(true) }}
            onFocus={() => { if (searchValue) setShowResults(true) }}
            onKeyDown={handleKeyDown}
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-lg pr-10 py-1.5 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
>>>>>>> Stashed changes
>>>>>>> c943086 (feat: closes #13 closes #12)
            style={{ paddingLeft: '2.25rem' }}
          />
          {searchValue ? (
            <button
              onClick={() => { setSearchValue(''); setShowResults(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-neutral-400 bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
          )}

          {/* Live results dropdown */}
          <AnimatePresence>
            {showResults && q && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-50"
              >
                {!hasResults ? (
                  <div className="px-4 py-5 text-center text-sm text-neutral-400">
                    No results for &ldquo;{searchValue}&rdquo;
                  </div>
                ) : (
                  <>
                    {/* Jobs */}
                    {matchedJobs.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                          <Briefcase className="w-3 h-3 text-neutral-400" />
                          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Jobs</span>
                        </div>
                        {matchedJobs.map(job => (
                          <Link
                            key={job.id}
                            href={`/jobs/${job.id}`}
                            onClick={handleResultClick}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 transition-colors group"
                          >
                            <div>
                              <p className="text-sm text-neutral-800 font-medium group-hover:text-indigo-600 transition-colors">
                                {job.title}
                              </p>
                              <p className="text-xs text-neutral-400">
                                {[job.department, job.location].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${
                              job.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                              job.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-neutral-100 text-neutral-500 border-neutral-200'
                            }`}>
                              {job.status}
                            </span>
                          </Link>
                        ))}
                        {matchedJobs.length === 4 && (
                          <Link
                            href={`/jobs?q=${encodeURIComponent(q)}`}
                            onClick={handleResultClick}
                            className="block px-4 py-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            See all job results →
                          </Link>
                        )}
                      </div>
                    )}

                    {matchedJobs.length > 0 && matchedCandidates.length > 0 && (
                      <div className="border-t border-neutral-100 mx-4" />
                    )}

                    {/* Candidates */}
                    {matchedCandidates.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                          <Users className="w-3 h-3 text-neutral-400" />
                          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Candidates</span>
                        </div>
                        {matchedCandidates.map(c => (
                          <Link
                            key={c.id}
                            href={`/candidates/${c.id}`}
                            onClick={handleResultClick}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors group"
                          >
                            <div className="w-6 h-6 rounded-md bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {getInitials(c.name)}
                            </div>
                            <div>
                              <p className="text-sm text-neutral-800 font-medium group-hover:text-indigo-600 transition-colors">
                                {c.name}
                              </p>
                              <p className="text-xs text-neutral-400">{c.title ?? c.email}</p>
                            </div>
                          </Link>
                        ))}
                        {matchedCandidates.length === 4 && (
                          <Link
                            href={`/candidates?q=${encodeURIComponent(q)}`}
                            onClick={handleResultClick}
                            className="block px-4 py-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            See all candidate results →
                          </Link>
                        )}
                      </div>
                    )}

                    <div className="border-t border-neutral-100 px-4 py-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
                      <kbd className="bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                      to search all results
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Live status */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-500 bg-green-50 border border-green-200 rounded-full px-3 py-1 mr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
          Automations active
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 border-2 border-white" />
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
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : n.type === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
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
              {displayInitials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-neutral-800 text-xs font-medium">{displayName}</div>
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
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors text-sm"
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </Link>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors text-sm">
                  <CreditCard className="w-3.5 h-3.5" />
                  Billing
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors text-sm">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Help &amp; Support
                </button>
                <div className="border-t border-neutral-100">
                  <button
                    onClick={() => { setShowUserMenu(false); logout() }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm"
                  >
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
