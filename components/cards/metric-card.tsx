'use client'

import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  suffix?: string
  delay?: number
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-[#6366F1]',
  iconBg = 'bg-[#6366F1]/10',
  suffix,
  delay = 0,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isNeutral = change === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-[#374151] transition-all duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#9CA3AF] text-xs font-medium uppercase tracking-wider mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[#F9FAFB] text-2xl font-bold tracking-tight">{value}</span>
            {suffix && <span className="text-[#9CA3AF] text-sm">{suffix}</span>}
          </div>
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              isPositive && 'text-green-400',
              isNegative && 'text-red-400',
              isNeutral && 'text-[#9CA3AF]',
            )}>
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {isNeutral && <Minus className="w-3 h-3" />}
              <span>
                {isPositive ? '+' : ''}{change}%
                {changeLabel && <span className="text-[#6B7280] font-normal ml-1">{changeLabel}</span>}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 duration-200',
          iconBg,
        )}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </motion.div>
  )
}
