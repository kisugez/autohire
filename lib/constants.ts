// Shared UI constants — no mock data, no business logic

export const STAGE_COLORS: Record<string, string> = {
  sourced:   'bg-neutral-100 text-neutral-600 border-neutral-200',
  screening: 'bg-info-50 text-info-700 border-info-200',
  interview: 'bg-primary-50 text-primary-600 border-primary-100',
  offer:     'bg-warning-50 text-warning-700 border-warning-200',
  hired:     'bg-success-50 text-success-700 border-success-200',
  rejected:  'bg-error-50 text-error-700 border-error-200',
}

export const STATUS_COLORS: Record<string, string> = {
  active:  'bg-success-50 text-success-700 border-success-200',
  paused:  'bg-warning-50 text-warning-700 border-warning-200',
  closed:  'bg-neutral-100 text-neutral-600 border-neutral-200',
  draft:   'bg-info-50 text-info-700 border-info-200',
  error:   'bg-error-50 text-error-700 border-error-200',
}

export const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',   icon: 'LayoutDashboard' },
  { href: '/jobs',         label: 'Jobs',         icon: 'Briefcase' },
  { href: '/candidates',   label: 'Candidates',   icon: 'Users' },
  { href: '/pipeline',     label: 'Pipeline',     icon: 'Kanban' },
  { href: '/sourcing',     label: 'Sourcing',     icon: 'Search' },
  { href: '/automations',  label: 'Automations',  icon: 'Zap' },
  { href: '/outreach',     label: 'Outreach',     icon: 'Mail' },
  { href: '/analytics',    label: 'Analytics',    icon: 'BarChart3' },
  { href: '/integrations', label: 'Integrations', icon: 'Puzzle' },
  { href: '/settings',     label: 'Settings',     icon: 'Settings' },
]

export const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'github',   label: 'GitHub',   icon: '🐙' },
  { id: 'indeed',   label: 'Indeed',   icon: '🔍' },
]
