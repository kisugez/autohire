import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 text-center',
      className
    )}>
      <div className="w-14 h-14 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#6B7280]" />
      </div>
      <h3 className="text-[#F9FAFB] text-sm font-semibold mb-1">{title}</h3>
      <p className="text-[#9CA3AF] text-sm max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
