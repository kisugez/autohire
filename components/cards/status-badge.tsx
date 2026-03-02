import { cn } from '@/lib/utils'
import { STAGE_COLORS, STATUS_COLORS } from '@/lib/constants'
import { CandidateStage } from '@/types/candidate'
import { JobStatus, AutomationStatus } from '@/types/job'

interface StatusBadgeProps {
  status: CandidateStage | JobStatus | AutomationStatus | string
  type?: 'stage' | 'status' | 'custom'
  className?: string
}

export default function StatusBadge({ status, type = 'status', className }: StatusBadgeProps) {
  const colorClass = type === 'stage' 
    ? STAGE_COLORS[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    : STATUS_COLORS[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize',
        colorClass,
        className,
      )}
    >
      {status}
    </span>
  )
}
