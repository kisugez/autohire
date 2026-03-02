'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterOption {
  label: string
  value: string
}

interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function FilterDropdown({ label, options, value, onChange, className }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-neutral-200 text-sm text-neutral-600 rounded-lg px-3 py-2 hover:border-neutral-300 hover:text-neutral-900 transition-all"
      >
        <span>{selected?.label || label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1.5 left-0 min-w-[160px] bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => { onChange(option.value); setOpen(false) }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
              >
                {option.label}
                {value === option.value && <Check className="w-3.5 h-3.5 text-accent" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}
