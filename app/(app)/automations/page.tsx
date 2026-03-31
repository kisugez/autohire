'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Zap, Play, Pause, Trash2, X, Check,
  Loader2, AlertCircle, GitBranch, ArrowRight,
  ToggleLeft, ToggleRight, ChevronRight, MoreHorizontal,
  Settings, Filter, ListChecks, MoveRight, Mail, Layers,
} from 'lucide-react'
import api, { get, post, patch } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Automation {
  id: string
  name: string
  description: string | null
  trigger: string
  conditions: Record<string, any> | null
  action: string
  action_config: Record<string, any> | null
  active: boolean
  trigger_count: number
  last_triggered: string | null
  created_at: string
  updated_at: string
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

const TRIGGERS = [
  { id: 'application_submitted', label: 'Application Submitted', description: 'Fires when a candidate submits an application', color: 'indigo' },
  { id: 'ai_screening_done',     label: 'AI Screening Complete', description: 'Fires after AI scores the candidate',           color: 'violet' },
  { id: 'stage_changed',         label: 'Stage Changed',         description: 'Fires when a candidate moves stages',           color: 'blue'   },
  { id: 'interview_scheduled',   label: 'Interview Scheduled',   description: 'Fires when an interview is booked',             color: 'sky'    },
]

const CONDITIONS = [
  { id: 'ai_score_gte', label: 'AI Score ≥',  type: 'number', placeholder: '60', description: 'Only run if AI score ≥ value' },
  { id: 'ai_score_lt',  label: 'AI Score <',   type: 'number', placeholder: '40', description: 'Only run if AI score < value'  },
  { id: 'ai_label',     label: 'AI Label is',  type: 'select', options: ['strong_fit','good_fit','reserve'], description: 'Match a specific AI label' },
  { id: 'stage',        label: 'Stage is',     type: 'select', options: ['sourced','screening','interview','offer','hired','rejected'], description: 'Match pipeline stage' },
]

const ACTIONS = [
  { id: 'send_email', label: 'Send Email',    description: 'Send an email to the candidate', fields: ['subject','body'] },
  { id: 'move_stage', label: 'Move to Stage', description: 'Move candidate to a stage',      fields: ['stage'] },
  { id: 'ai_rescan',  label: 'Re-run AI Scan',description: 'Re-screen with AI',              fields: [] },
]

const STAGE_OPTIONS = ['sourced','screening','interview','offer','hired','rejected']

const triggerMeta = (id: string) => TRIGGERS.find(t => t.id === id)
const actionMeta  = (id: string) => ACTIONS.find(a => a.id === id)

// ─── Diagram node icons ────────────────────────────────────────────────────────

function TriggerIcon() {
  return (
    <div className="w-6 h-6 rounded-md bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 16 16" className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v3l2 2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function FilterIcon() {
  return (
    <div className="w-6 h-6 rounded-md bg-rose-100 border border-rose-200 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 16 16" className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function TaskIcon() {
  return (
    <div className="w-6 h-6 rounded-md bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 16 16" className="w-3 h-3 text-violet-600" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="2" width="10" height="12" rx="1.5" />
        <path d="M6 6h4M6 9h4M6 12h2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function IfElseIcon() {
  return (
    <div className="w-6 h-6 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 16 16" className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 3v4M5 10l3-3 3 3M5 13h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ─── Single diagram node card — smaller size ──────────────────────────────────

function DiagramCard({
  type, title, subtitle, badge, delay = 0,
}: {
  type: 'trigger' | 'filter' | 'task' | 'ifelse'
  title: string
  subtitle?: string
  badge?: string
  delay?: number
}) {
  const headerColors: Record<string, string> = {
    trigger: 'bg-indigo-50 border-b border-indigo-100',
    filter:  'bg-rose-50 border-b border-rose-100',
    task:    'bg-violet-50 border-b border-violet-100',
    ifelse:  'bg-amber-50 border-b border-amber-100',
  }
  const headerTextColors: Record<string, string> = {
    trigger: 'text-indigo-600',
    filter:  'text-rose-500',
    task:    'text-violet-600',
    ifelse:  'text-amber-600',
  }
  const typeLabels: Record<string, string> = {
    trigger: 'Trigger',
    filter:  'Filter',
    task:    'Task',
    ifelse:  'Condition',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      className="w-[220px] bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden"
    >
      {/* header row */}
      <div className={cn('flex items-center justify-between px-2.5 py-1.5', headerColors[type])}>
        <div className="flex items-center gap-1">
          {type === 'trigger' && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4.5"/><path d="M6 3.5v2.5l1.5 1.5" strokeLinecap="round"/></svg>}
          {type === 'filter'  && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-rose-500"   fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3h10M3 6h6M5 9h2" strokeLinecap="round"/></svg>}
          {type === 'task'    && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1.5" width="8" height="9" rx="1.5"/><path d="M4 5h4M4 7h4M4 9h2" strokeLinecap="round"/></svg>}
          {type === 'ifelse'  && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-amber-500"  fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v3M4 7.5l2-2.5 2 2.5M4 10h4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          <span className={cn('text-[9px] font-semibold uppercase tracking-wide', headerTextColors[type])}>
            {typeLabels[type]}
          </span>
        </div>
        {badge && (
          <span className="text-[9px] font-medium text-neutral-500 bg-white border border-neutral-200 px-1.5 py-px rounded-full">
            {badge}
          </span>
        )}
      </div>

      {/* body */}
      <div className="px-2.5 py-2 flex items-start gap-2">
        {type === 'trigger' && <TriggerIcon />}
        {type === 'filter'  && <FilterIcon />}
        {type === 'task'    && <TaskIcon />}
        {type === 'ifelse'  && <IfElseIcon />}
        <div className="min-w-0 pt-px">
          <p className="text-xs font-semibold text-neutral-900 leading-tight">{title}</p>
          {subtitle && <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Connector between nodes ───────────────────────────────────────────────────

function Connector({ label, delay = 0 }: { label?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      className="flex flex-col items-center relative"
    >
      <div className="w-px h-5 bg-neutral-300" />
      {label && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
          <span className="text-[9px] text-emerald-600 font-medium bg-white border border-emerald-200 px-1.5 py-px rounded-full shadow-sm">
            {label}
          </span>
        </div>
      )}
      <div className="w-px h-5 bg-neutral-300" />
      <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-neutral-400 -mt-px" />
    </motion.div>
  )
}

// ─── Branch connector for if/else ────────────────────────────────────────────

function BranchConnectors({
  leftLabel, rightLabel, delay = 0
}: { leftLabel: string; rightLabel: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      className="relative flex justify-center w-full"
      style={{ height: 70 }}
    >
      <svg viewBox="0 0 520 70" className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
        <line x1="260" y1="0" x2="260" y2="16" stroke="#d1d5db" strokeWidth="1.5"/>
        <line x1="130" y1="16" x2="390" y2="16" stroke="#d1d5db" strokeWidth="1.5"/>
        <line x1="130" y1="16" x2="130" y2="55" stroke="#d1d5db" strokeWidth="1.5"/>
        <line x1="390" y1="16" x2="390" y2="55" stroke="#d1d5db" strokeWidth="1.5"/>
        <polygon points="127,53 133,53 130,59" fill="#9ca3af"/>
        <polygon points="387,53 393,53 390,59" fill="#9ca3af"/>
      </svg>
      <div className="absolute" style={{ left: 'calc(25% - 20px)', top: 22 }}>
        <span className="text-[9px] text-emerald-600 font-medium bg-white border border-emerald-200 px-1.5 py-px rounded-full shadow-sm">
          {leftLabel}
        </span>
      </div>
      <div className="absolute" style={{ right: 'calc(25% - 20px)', top: 22 }}>
        <span className="text-[9px] text-neutral-500 font-medium bg-white border border-neutral-200 px-1.5 py-px rounded-full shadow-sm">
          {rightLabel}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Full automation diagram ───────────────────────────────────────────────────

function AutomationDiagram({ automation }: { automation: Automation }) {
  const t     = triggerMeta(automation.trigger)
  const a     = actionMeta(automation.action)
  const conds = automation.conditions ?? {}
  const cfg   = automation.action_config ?? {}
  const hasCond = Object.keys(conds).length > 0

  const condSummary = Object.entries(conds).map(([k, v]) => {
    const m = CONDITIONS.find(c => c.id === k)
    return `${m?.label ?? k}: ${String(v).replace('_',' ')}`
  }).join(' · ')

  const actionSubtitle =
    automation.action === 'send_email' && cfg.subject ? `Subject: ${cfg.subject}` :
    automation.action === 'move_stage' && cfg.stage   ? `→ ${String(cfg.stage).replace('_',' ')}` :
    a?.description ?? ''

  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        background: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#f1f5f9',
      }}
    >
      <div className="flex flex-col items-center py-8 px-6 min-h-full min-w-[320px]">

        {/* Trigger */}
        <DiagramCard
          type="trigger"
          title={t?.label ?? automation.trigger}
          subtitle={t?.description ?? 'Fires when the event occurs'}
          badge="Customer Action"
          delay={0.05}
        />

        <Connector label="Completed" delay={0.15} />

        {/* Condition / Filter */}
        {hasCond && (
          <>
            <DiagramCard
              type="filter"
              title="Filter"
              subtitle={condSummary || 'No description'}
              badge="Conditions"
              delay={0.2}
            />
            <Connector label="Completed" delay={0.3} />
          </>
        )}

        {/* Action */}
        <DiagramCard
          type="task"
          title={a?.label ?? automation.action}
          subtitle={actionSubtitle || a?.description}
          badge="Task"
          delay={hasCond ? 0.35 : 0.2}
        />

        {/* If the action is send_email, show an if/else branch below as example */}
        {automation.action === 'send_email' && (
          <>
            <Connector label="Completed" delay={0.45} />
            <DiagramCard
              type="ifelse"
              title="If / Else"
              subtitle="No description"
              badge="Conditions"
              delay={0.5}
            />
            <BranchConnectors leftLabel="is true" rightLabel="is false" delay={0.6} />
            <div className="flex items-start gap-14 w-full justify-center">
              <DiagramCard
                type="task"
                title="Find Records"
                subtitle="No description"
                badge="Task"
                delay={0.65}
              />
              <DiagramCard
                type="task"
                title="Find List Entries"
                subtitle="No description"
                badge="Task"
                delay={0.7}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Right overview sidebar ────────────────────────────────────────────────────

function AutomationPanel({
  automation, onToggle, onDelete, onClose,
}: {
  automation: Automation
  onToggle: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const runHistory = Array.from({ length: 18 }, (_, i) => ({
    id: automation.trigger_count - i,
    status: i === 5 || i === 10 ? 'failed' : i === 0 ? 'ongoing' : 'success',
    time: i === 0 ? 'On Going' : `${i + 1} minutes ago`,
  })).filter(r => r.id > 0)

  return (
    <motion.div
      key={automation.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col h-full bg-white border border-neutral-200 rounded-xl overflow-hidden"
    >
      {/* panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50/80 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', automation.active ? 'bg-emerald-100' : 'bg-neutral-100')}>
            <Zap className={cn('w-3 h-3', automation.active ? 'text-emerald-600' : 'text-neutral-400')} />
          </div>
          <span className="text-sm font-semibold text-neutral-900 truncate">{automation.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
              automation.active
                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
            )}
          >
            {automation.active ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Enable</>}
          </button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* diagram fills full width, overview sits to the right */}
      <div className="flex flex-1 overflow-hidden">

        {/* diagram — full remaining space */}
        <AutomationDiagram automation={automation} />

        {/* overview sidebar */}
        <div className="w-[200px] flex-shrink-0 border-l border-neutral-100 overflow-y-auto bg-white">
          <div className="px-3 pt-4 pb-4">
            <p className="text-xs font-semibold text-neutral-900 mb-3">Overview</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {[
                { label: 'In Progress', value: automation.active ? Math.min(2, automation.trigger_count) : 0, unit: '' },
                { label: 'Avg. runtime', value: 12, unit: 'sec' },
                { label: 'Completed', value: automation.trigger_count, unit: '' },
                { label: 'Failed', value: 2, unit: '' },
              ].map(s => (
                <div key={s.label} className="bg-neutral-50 border border-neutral-200 rounded-lg p-2">
                  <p className="text-[9px] text-neutral-400 mb-0.5">{s.label}</p>
                  <p className="text-xl font-bold text-neutral-900 leading-none">
                    {s.value}
                    {s.unit && <span className="text-[9px] text-neutral-400 font-normal ml-0.5">{s.unit}</span>}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-neutral-900 mb-2">Run History</p>
            <div className="space-y-1.5">
              {runHistory.map((run) => (
                <div key={run.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {run.status === 'ongoing' ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 bg-white flex-shrink-0" />
                    ) : run.status === 'failed' ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <X className="w-2 h-2 text-white" />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                    <span className="text-[11px] text-neutral-700 font-medium">Run #{run.id}</span>
                  </div>
                  <span className="text-[9px] text-neutral-400 whitespace-nowrap">{run.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Builder modal ────────────────────────────────────────────────────────────

type Step = 'trigger' | 'condition' | 'action' | 'config' | 'name'

interface Draft {
  name: string; description: string; trigger: string
  conditionKey: string; conditionValue: string
  action: string; actionConfig: Record<string, string>
}

const EMPTY_DRAFT: Draft = { name: '', description: '', trigger: '', conditionKey: '', conditionValue: '', action: '', actionConfig: {} }

function BuilderModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [step, setStep]     = useState<Step>('trigger')
  const [draft, setDraft]   = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  const reset = () => { setStep('trigger'); setDraft(EMPTY_DRAFT); setErr(null) }
  const close = () => { reset(); onClose() }
  const set   = (k: keyof Draft, v: any) => setDraft(p => ({ ...p, [k]: v }))
  const setCfg = (k: string, v: string) => setDraft(p => ({ ...p, actionConfig: { ...p.actionConfig, [k]: v } }))

  const save = async () => {
    if (!draft.name.trim()) { setErr('Please give this automation a name.'); return }
    setSaving(true); setErr(null)
    try {
      const conditions: Record<string, any> = {}
      if (draft.conditionKey && draft.conditionValue) {
        const meta = CONDITIONS.find(c => c.id === draft.conditionKey)
        conditions[draft.conditionKey] = meta?.type === 'number' ? Number(draft.conditionValue) : draft.conditionValue
      }
      await post('/api/v1/automations', {
        name: draft.name.trim(), description: draft.description.trim() || null,
        trigger: draft.trigger, conditions: Object.keys(conditions).length ? conditions : null,
        action: draft.action, action_config: Object.keys(draft.actionConfig).length ? draft.actionConfig : null,
      })
      onSaved(); close()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save automation')
    } finally { setSaving(false) }
  }

  if (!open) return null
  const STEPS: Step[] = ['trigger','condition','action','config','name']
  const stepIdx = STEPS.indexOf(step)
  const selectedAction = ACTIONS.find(a => a.id === draft.action)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            <span className="text-neutral-900 text-sm font-semibold">New Automation</span>
          </div>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-700 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* progress bar */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full transition-all', i <= stepIdx ? 'bg-indigo-500' : 'bg-neutral-200')} />
          ))}
        </div>

        <div className="px-6 py-4 min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 'trigger' && (
              <motion.div key="trigger" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">1 · Choose Trigger</p>
                <div className="space-y-2">
                  {TRIGGERS.map(t => (
                    <button key={t.id} onClick={() => { set('trigger', t.id); setStep('condition') }}
                      className={cn('w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all',
                        draft.trigger === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50')}>
                      <TriggerIcon />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">{t.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{t.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 mt-1 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'condition' && (
              <motion.div key="condition" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">2 · Add Condition <span className="normal-case font-normal">(optional)</span></p>
                <div className="space-y-2 mb-4">
                  <button onClick={() => { set('conditionKey', ''); set('conditionValue', ''); setStep('action') }}
                    className={cn('w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                      !draft.conditionKey ? 'border-indigo-400 bg-indigo-50' : 'border-neutral-200 hover:border-neutral-300')}>
                    <div className="w-6 h-6 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 16 16" className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
                    </div>
                    <p className="text-sm font-medium text-neutral-900">No condition — always run</p>
                  </button>
                  {CONDITIONS.map(c => (
                    <button key={c.id} onClick={() => set('conditionKey', draft.conditionKey === c.id ? '' : c.id)}
                      className={cn('w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all',
                        draft.conditionKey === c.id ? 'border-amber-400 bg-amber-50' : 'border-neutral-200 hover:border-neutral-300')}>
                      <FilterIcon />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">{c.label}</p>
                        <p className="text-xs text-neutral-500">{c.description}</p>
                        {draft.conditionKey === c.id && (
                          <div className="mt-2" onClick={e => e.stopPropagation()}>
                            {c.type === 'number' && (
                              <input type="number" value={draft.conditionValue} placeholder={c.placeholder}
                                onChange={e => set('conditionValue', e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-indigo-400" />
                            )}
                            {c.type === 'select' && (
                              <select value={draft.conditionValue} onChange={e => set('conditionValue', e.target.value)}
                                className="px-2 py-1 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-indigo-400">
                                <option value="">Pick one…</option>
                                {c.options?.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep('action')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 'action' && (
              <motion.div key="action" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">3 · Choose Action</p>
                <div className="space-y-2">
                  {ACTIONS.map(a => (
                    <button key={a.id} onClick={() => { set('action', a.id); setStep(a.fields.length ? 'config' : 'name') }}
                      className={cn('w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all',
                        draft.action === a.id ? 'border-emerald-400 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-300')}>
                      <TaskIcon />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">{a.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{a.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 mt-1 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'config' && selectedAction && (
              <motion.div key="config" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">4 · Configure: {selectedAction.label}</p>
                {draft.action === 'send_email' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1">Subject</label>
                      <input value={draft.actionConfig.subject ?? ''} onChange={e => setCfg('subject', e.target.value)}
                        placeholder="e.g. Thanks for applying to {{job_title}}"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1">Body</label>
                      <textarea rows={5} value={draft.actionConfig.body ?? ''} onChange={e => setCfg('body', e.target.value)}
                        placeholder="Hi {{candidate_name}}, thank you for applying…"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-400 resize-none" />
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Variables: <code className="bg-neutral-100 px-1 rounded">{'{{candidate_name}}'}</code>{' '}
                        <code className="bg-neutral-100 px-1 rounded">{'{{job_title}}'}</code>
                      </p>
                    </div>
                  </div>
                )}
                {draft.action === 'move_stage' && (
                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">Move to stage</label>
                    <select value={draft.actionConfig.stage ?? ''} onChange={e => setCfg('stage', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-400">
                      <option value="">Choose a stage…</option>
                      {STAGE_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={() => setStep('name')}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 'name' && (
              <motion.div key="name" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">5 · Name & Save</p>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-xs w-16">Trigger</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                      {triggerMeta(draft.trigger)?.label ?? draft.trigger}
                    </span>
                  </div>
                  {draft.conditionKey && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 text-xs w-16">If</span>
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        {CONDITIONS.find(c => c.id === draft.conditionKey)?.label} {draft.conditionValue}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-xs w-16">Action</span>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {actionMeta(draft.action)?.label ?? draft.action}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">Name <span className="text-red-500">*</span></label>
                    <input value={draft.name} onChange={e => set('name', e.target.value)}
                      placeholder="e.g. Thank you email on submission"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">Description <span className="text-neutral-400 font-normal">(optional)</span></label>
                    <input value={draft.description} onChange={e => set('description', e.target.value)}
                      placeholder="What does this automation do?"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
                {err && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{err}
                  </div>
                )}
                <button onClick={save} disabled={saving}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save Automation</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step !== 'trigger' && (
          <div className="px-6 pb-4">
            <button onClick={() => {
              const prev: Record<Step, Step> = { trigger: 'trigger', condition: 'trigger', action: 'condition', config: 'action', name: selectedAction?.fields.length ? 'config' : 'action' }
              setStep(prev[step])
            }} className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">← Back</button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Automation | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await get<Automation[]>('/api/v1/automations')
      setAutomations(data)
    } catch { setAutomations([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (a: Automation) => {
    try {
      const updated = await patch<Automation>(`/api/v1/automations/${a.id}`, { active: !a.active })
      setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, active: updated.active } : x))
      if (selected?.id === a.id) setSelected(s => s ? { ...s, active: updated.active } : s)
    } catch {}
  }

  const remove = async (a: Automation) => {
    if (!confirm(`Delete "${a.name}"?`)) return
    try {
      await api.delete(`/api/v1/automations/${a.id}`)
      setAutomations(prev => prev.filter(x => x.id !== a.id))
      if (selected?.id === a.id) setSelected(null)
    } catch {}
  }

  const active = automations.filter(a => a.active).length
  const total  = automations.length
  const fired  = automations.reduce((s, a) => s + a.trigger_count, 0)

  const getProcesses = (a: Automation) => {
    const t  = triggerMeta(a.trigger)?.label ?? a.trigger
    const ac = actionMeta(a.action)?.label ?? a.action
    const hasCond = a.conditions && Object.keys(a.conditions).length > 0
    return [t, ...(hasCond ? ['Filter'] : []), ac]
  }

  return (
    <div className="flex flex-col h-full space-y-4 px-1 pt-2">

      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Automations</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${total} automation${total !== 1 ? 's' : ''} · ${active} active`}
          </p>
        </div>
        <button
          onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Automation
        </button>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',          value: total,  sub: 'automations' },
          { label: 'Active',         value: active, sub: 'running now' },
          { label: 'Total Triggers', value: fired,  sub: 'all time'    },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-xl px-4 py-3">
            <p className="text-neutral-400 text-xs mb-0.5">{s.label}</p>
            <p className="text-neutral-950 text-2xl font-semibold leading-none">{s.value}</p>
            <p className="text-neutral-400 text-[11px] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* list table — always full width */}
      <div className="flex flex-col bg-white border border-neutral-200 rounded-xl overflow-hidden flex-1 min-h-0">
        {/* table header */}
        <div
          className="grid border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5"
          style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr auto' }}
        >
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Name</span>
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Process</span>
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Owner</span>
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Updated</span>
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider"><Settings className="w-3 h-3" /></span>
        </div>

        {/* rows */}
        <div className="divide-y divide-neutral-100 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : automations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-neutral-900 text-sm font-semibold mb-1">No automations yet</p>
              <p className="text-neutral-400 text-xs mb-3">Build your first trigger → action workflow.</p>
              <button onClick={() => setBuilderOpen(true)} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Create automation
              </button>
            </div>
          ) : (
            automations.map((a, i) => {
              const processes  = getProcesses(a)
              const isSelected = selected?.id === a.id

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelected(isSelected ? null : a)}
                  className={cn(
                    'grid items-center px-4 py-3 cursor-pointer transition-colors group',
                    isSelected ? 'bg-indigo-50/60' : 'hover:bg-neutral-50',
                  )}
                  style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr auto' }}
                >
                  {/* name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', a.active ? 'bg-emerald-500' : 'bg-neutral-300')} />
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isSelected ? 'text-indigo-700' : 'text-neutral-900')}>{a.name}</p>
                    </div>
                  </div>

                  {/* process chain */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {processes.map((p, pi) => (
                      <span key={pi} className="flex items-center gap-1">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border',
                          pi === 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          pi === processes.length - 1 ? 'bg-violet-50 text-violet-700 border-violet-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {pi === 0 && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="3.5"/></svg>}
                          {pi > 0 && pi < processes.length - 1 && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5h6M5 2l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {pi === processes.length - 1 && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1.5" width="6" height="7" rx="1"/></svg>}
                          {p}
                        </span>
                        {pi < processes.length - 1 && (
                          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 5h6M6 3l2 2-2 2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* owner */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">M</div>
                    <span className="text-xs text-neutral-600">me</span>
                  </div>

                  {/* updated */}
                  <span className="text-xs text-neutral-400">{formatRelativeTime(a.updated_at)}</span>

                  {/* row actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); toggle(a) }} className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                      {a.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={e => e.stopPropagation()} className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* detail panel — full-width overlay below the table */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="min-h-[480px] flex-shrink-0"
          >
            <AutomationPanel
              automation={selected}
              onToggle={() => toggle(selected)}
              onDelete={() => remove(selected)}
              onClose={() => setSelected(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {builderOpen && (
          <BuilderModal
            open={builderOpen}
            onClose={() => setBuilderOpen(false)}
            onSaved={() => { load(); setBuilderOpen(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}