'use client'

import { Switch } from '@headlessui/react'
import { GripVertical, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormField } from '@/types/job'

interface Props {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
}

const LOCKED = new Set(['name', 'email']) // always on + required

export default function FormBuilder({ fields, onChange }: Props) {
  const toggle = (id: string, key: 'enabled' | 'required', value: boolean) => {
    onChange(fields.map(f => f.id === id ? { ...f, [key]: value } : f))
  }

  return (
    <div className="space-y-2">
      {fields.map(field => {
        const locked = LOCKED.has(field.id)
        return (
          <div
            key={field.id}
            className={cn(
              'flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-colors',
              field.enabled ? 'bg-white border-neutral-200' : 'bg-neutral-50 border-neutral-100 opacity-60',
            )}
          >
            {/* drag handle (visual only) */}
            <GripVertical className="w-4 h-4 text-neutral-300 flex-shrink-0 cursor-grab" />

            {/* label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800 truncate">{field.label}</p>
              <p className="text-xs text-neutral-400 capitalize">{field.type}</p>
            </div>

            {/* required toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-400">Required</span>
              {locked ? (
                <Lock className="w-3.5 h-3.5 text-neutral-300" />
              ) : (
                <button
                  type="button"
                  disabled={!field.enabled}
                  onClick={() => toggle(field.id, 'required', !field.required)}
                  className={cn(
                    'relative inline-flex h-4 w-7 rounded-full border-2 border-transparent transition-colors focus:outline-none',
                    field.required && field.enabled ? 'bg-indigo-500' : 'bg-neutral-200',
                    !field.enabled && 'cursor-not-allowed',
                  )}
                >
                  <span className={cn(
                    'inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform',
                    field.required && field.enabled ? 'translate-x-3' : 'translate-x-0',
                  )} />
                </button>
              )}
            </div>

            {/* enabled toggle */}
            <div className="flex items-center gap-1.5 border-l border-neutral-100 pl-3">
              <span className="text-xs text-neutral-400">Show</span>
              {locked ? (
                <Lock className="w-3.5 h-3.5 text-neutral-300" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(field.id, 'enabled', !field.enabled)}
                  className={cn(
                    'relative inline-flex h-4 w-7 rounded-full border-2 border-transparent transition-colors focus:outline-none',
                    field.enabled ? 'bg-neutral-900' : 'bg-neutral-200',
                  )}
                >
                  <span className={cn(
                    'inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform',
                    field.enabled ? 'translate-x-3' : 'translate-x-0',
                  )} />
                </button>
              )}
            </div>
          </div>
        )
      })}
      <p className="text-xs text-neutral-400 pt-1 px-1">
        <Lock className="w-3 h-3 inline mr-1" />
        Name and Email are always required and cannot be disabled.
      </p>
    </div>
  )
}
