'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Kanban,
  Zap,
  Mail,
  BarChart3,
  Puzzle,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/automations', label: 'Automations', icon: Zap },
  { href: '/outreach', label: 'Outreach', icon: Mail },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-neutral-50 border-r border-neutral-100 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-neutral-100">
        <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <span className="text-neutral-950 font-semibold text-sm tracking-tight">AutoHyre</span>
          <div className="text-neutral-400 text-[10px] leading-none mt-0.5">AI Recruiting OS</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 cursor-pointer',
                  active
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/70'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    active ? 'text-neutral-950' : 'text-neutral-400 group-hover:text-neutral-600'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="w-1.5 h-1.5 rounded-full bg-neutral-950"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Footer / Workspace */}
      <div className="px-3 py-3 border-t border-neutral-100">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/70 cursor-pointer transition-colors group">
          <div className="w-6 h-6 rounded-md bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            AC
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-neutral-800 text-xs font-medium truncate">Acme Corp</div>
            <div className="text-neutral-400 text-[10px]">Pro Plan</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
