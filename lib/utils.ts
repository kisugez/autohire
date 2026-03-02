import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

export function getMatchScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10 text-green-400 border-green-500/20'
  if (score >= 60) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  return 'bg-red-500/10 text-red-400 border-red-500/20'
}

export function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'Competitive'
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`
  if (!max) return `${fmt(min!)}+`
  if (!min) return `Up to ${fmt(max)}`
  return `${fmt(min)} – ${fmt(max)}`
}
