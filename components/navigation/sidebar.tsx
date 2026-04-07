'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Mail,
  Calendar,
  Briefcase,
  Users,
  ScanSearch,
  FileText,
  Puzzle,
  BarChart3,
  Settings,
  Kanban,
  Zap,
  BookMarked,
} from 'lucide-react'

const topNavItems = [
  { href: '/dashboard', label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/outreach',  label: 'Outreach',         icon: Mail },
  { href: '/calendar',  label: 'Calendar & Todos', icon: Calendar },
]

const recruitmentItems = [
  { href: '/jobs',         label: 'Jobs',         icon: Briefcase },
  { href: '/candidates',   label: 'Candidates',   icon: Users },
  { href: '/automations', label: 'Automations', icon: Zap },
  { href: '/sourcing',     label: 'Sourcing',      icon: ScanSearch },
  { href: '/pipeline',     label: 'Pipeline',      icon: Kanban },
]

const organisationItems = [
  { href: '/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/settings',     label: 'Settings',     icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100%',
        width: '220px',
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
    >
      {/* ── Brand ── */}
      <div style={{ padding: '24px 20px 18px' }}>
        <span style={{
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}>
          AutoHyre
        </span>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '18px 10px 8px' }}>

        {topNavItems.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <SectionLabel>RECRUITMENT</SectionLabel>
        {recruitmentItems.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <SectionLabel>ORGANISATION</SectionLabel>
        {organisationItems.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}

      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: '10px 12px 20px' }}>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />

        <button style={{
          width: '100%',
          padding: '10px 0',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '12.5px',
          fontWeight: 400,
          cursor: 'pointer',
        }}>
          Need Help?
        </button>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0 10px' }} />

        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.25)',
          fontSize: '10px',
          margin: 0,
        }}>
          © 2025 AutoHyre, Inc.
        </p>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: 'rgba(255,255,255,0.35)',
      fontSize: '9px',
      fontWeight: 600,
      letterSpacing: '0.13em',
      textTransform: 'uppercase',
      padding: '22px 10px 8px',
      margin: 0,
    }}>
      {children}
    </p>
  )
}

function NavItem({
  item,
  active,
}: {
  item: { href: string; label: string; icon: React.ElementType }
  active: boolean
}) {
  const Icon = item.icon

  return (
    <Link href={item.href} style={{ display: 'block', position: 'relative', textDecoration: 'none' }}>
      {active && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: '18px',
          borderRadius: '0 3px 3px 0',
          background: '#84cc16',
        }} />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          padding: '9px 10px 9px 16px',
          borderRadius: '5px',
          fontSize: '13px',
          fontWeight: 300,
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'opacity 0.12s',
          opacity: active ? 1 : 0.88,
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLDivElement).style.opacity = '1'
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLDivElement).style.opacity = '0.88'
        }}
      >
        <Icon style={{ width: '15px', height: '15px', flexShrink: 0, color: '#ffffff' }} />
        <span style={{ color: '#ffffff' }}>{item.label}</span>
      </div>
    </Link>
  )
}
