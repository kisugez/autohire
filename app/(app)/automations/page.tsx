'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Zap, Play, Pause, Trash2, ChevronRight, X, Check,
  Loader2, AlertCircle, Mail, Brain, GitBranch, Clock,
  RefreshCw, ArrowRight, ToggleLeft, ToggleRight, Eye,
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

// ─── Catalogue (what can be picked) ───────────────────────────────────────────

const TRIGGERS = [
  { id: 'application_submitted', label: 'Application Submitted', icon: '📥', description: 'Fires when a candidate submits an application' },
  { id: 'ai_screening_done',     label: 'AI Screening Complete', icon: '🤖', description: 'Fires after AI scores the candidate' },
  { id: 'stage_changed',         label: 'Stage Changed',         icon: '🔀', description: 'Fires when a candidate moves to a new pipeline stage' },
  { id: 'interview_scheduled',   label: 'Interview Scheduled',   icon: '📅', description: 'Fires when an interview is booked' },
]

const CONDITIONS = [
  { id: 'ai_score_gte',  label: 'AI Score ≥',        type: 'number', placeholder: '60', description: 'Only run if AI score is at or above this value' },
  { id: 'ai_score_lt',   label: 'AI Score <',         type: 'number', placeholder: '40', description: 'Only run if AI score is below this value' },
  { id: 'ai_label',      label: 'AI Label is',        type: 'select', options: ['strong_fit','good_fit','reserve'], description: 'Only run for a specific AI label' },
  { id: 'stage',         label: 'Stage is',           type: 'select', options: ['sourced','screening','interview','offer','hired','rejected'], description: 'Only run when candidate is in this stage' },
]

const ACTIONS = [
  { id: 'send_email',  label: 'Send Email',         icon: '✉️',  description: 'Send a customisable email to the candidate', fields: ['subject','body'] },
  { id: 'move_stage',  label: 'Move to Stage',      icon: '🔀',  description: 'Move the candidate to a pipeline stage',    fields: ['stage'] },
  { id: 'ai_rescan',   label: 'Re-run AI Scan',     icon: '🤖',  description: 'Trigger the AI to re-screen this candidate', fields: [] },
]

const STAGE_OPTIONS = ['sourced','screening','interview','offer','hired','rejected']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const triggerMeta  = (id: string) => TRIGGERS.find(t => t.id === id)
const actionMeta   = (id: string) => ACTIONS.find(a => a.id === id)

function TriggerBadge({ id }: { id: string }) {
  const t = triggerMeta(id)
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
      <span>{t?.icon ?? '⚡'}</span>{t?.label ?? id}
    </span>
  )
}

function ActionBadge({ id }: { id: string }) {
  const a = actionMeta(id)
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
      <span>{a?.icon ?? '▶'}</span>{a?.label ?? id}
    </span>
  )
}

// ─── Builder wizard ───────────────────────────────────────────────────────────

type Step = 'trigger' | 'condition' | 'action' | 'config' | 'name'

interface Draft {
  name: string
  description: string
  trigger: string
  conditionKey: string
  conditionValue: string
  action: string
  actionConfig: Record<string, string>
}

const EMPTY_DRAFT: Draft = {
  name: '', description: '', trigger: '', conditionKey: '', conditionValue: '', action: '', actionConfig: {},
}

function BuilderModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<Step>('trigger')
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const reset = () => { setStep('trigger'); setDraft(EMPTY_DRAFT); setErr(null) }
  const close = () => { reset(); onClose() }

  const set = (k: keyof Draft, v: any) => setDraft(p => ({ ...p, [k]: v }))
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
        name:          draft.name.trim(),
        description:   draft.description.trim() || null,
        trigger:       draft.trigger,
        conditions:    Object.keys(conditions).length ? conditions : null,
        action:        draft.action,
        action_config: Object.keys(draft.actionConfig).length ? draft.actionConfig : null,
      })
      onSaved(); close()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save automation')
    } finally {
      setSaving(false)
    }
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            <span className="text-neutral-900 text-sm font-semibold">New Automation</span>
          </div>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-700 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-6 pt-4 pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className={cn('h-1.5 flex-1 rounded-full transition-all', i <= stepIdx ? 'bg-indigo-500' : 'bg-neutral-200')} />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-4 min-h-[320px]">
          <AnimatePresence mode="wait">

            {/* STEP 1 — Trigger */}
            {step === 'trigger' && (
              <motion.div key="trigger" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">1 · Choose Trigger</p>
                <div className="space-y-2">
                  {TRIGGERS.map(t => (
                    <button key={t.id} onClick={() => { set('trigger', t.id); setStep('condition') }}
                      className={cn('w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all',
                        draft.trigger === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50')}>
                      <span className="text-xl mt-0.5">{t.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{t.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{t.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 ml-auto mt-1 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Condition */}
            {step === 'condition' && (
              <motion.div key="condition" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">2 · Add Condition <span className="normal-case font-normal">(optional)</span></p>
                <p className="text-xs text-neutral-400 mb-3">Only run this automation when the condition is met.</p>
                <div className="space-y-2 mb-4">
                  <button onClick={() => { set('conditionKey', ''); set('conditionValue', ''); setStep('action') }}
                    className={cn('w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                      !draft.conditionKey ? 'border-indigo-400 bg-indigo-50' : 'border-neutral-200 hover:border-neutral-300')}>
                    <span className="text-xl">🔓</span>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">No condition — always run</p>
                    </div>
                  </button>
                  {CONDITIONS.map(c => (
                    <button key={c.id} onClick={() => set('conditionKey', draft.conditionKey === c.id ? '' : c.id)}
                      className={cn('w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all',
                        draft.conditionKey === c.id ? 'border-amber-400 bg-amber-50' : 'border-neutral-200 hover:border-neutral-300')}>
                      <span className="text-xl mt-0.5"><GitBranch className="w-4 h-4 text-amber-600 mt-0.5" /></span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">{c.label}</p>
                        <p className="text-xs text-neutral-500">{c.description}</p>
                        {draft.conditionKey === c.id && (
                          <div className="mt-2">
                            {c.type === 'number' && (
                              <input type="number" value={draft.conditionValue} placeholder={c.placeholder}
                                onChange={e => set('conditionValue', e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="w-24 px-2 py-1 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-indigo-400" />
                            )}
                            {c.type === 'select' && (
                              <select value={draft.conditionValue} onChange={e => set('conditionValue', e.target.value)}
                                onClick={e => e.stopPropagation()}
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

            {/* STEP 3 — Action */}
            {step === 'action' && (
              <motion.div key="action" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">3 · Choose Action</p>
                <div className="space-y-2">
                  {ACTIONS.map(a => (
                    <button key={a.id} onClick={() => { set('action', a.id); setStep(a.fields.length ? 'config' : 'name') }}
                      className={cn('w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all',
                        draft.action === a.id ? 'border-emerald-400 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-300')}>
                      <span className="text-xl mt-0.5">{a.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{a.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{a.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 ml-auto mt-1 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Config (action-specific fields) */}
            {step === 'config' && selectedAction && (
              <motion.div key="config" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">4 · Configure: {selectedAction.label}</p>

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
                      <textarea rows={6} value={draft.actionConfig.body ?? ''} onChange={e => setCfg('body', e.target.value)}
                        placeholder="Hi {{candidate_name}}, thank you for applying to {{job_title}}…"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-400 resize-none" />
                      <p className="text-xs text-neutral-400 mt-1">
                        Variables: <code className="bg-neutral-100 px-1 rounded">{'{{candidate_name}}'}</code>{' '}
                        <code className="bg-neutral-100 px-1 rounded">{'{{job_title}}'}</code>{' '}
                        <code className="bg-neutral-100 px-1 rounded">{'{{ai_score}}'}</code>{' '}
                        <code className="bg-neutral-100 px-1 rounded">{'{{ai_label}}'}</code>
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

            {/* STEP 5 — Name & save */}
            {step === 'name' && (
              <motion.div key="name" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">5 · Name & Save</p>

                {/* Summary */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-xs w-20 flex-shrink-0">Trigger</span>
                    <TriggerBadge id={draft.trigger} />
                  </div>
                  {draft.conditionKey && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 text-xs w-20 flex-shrink-0">If</span>
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        {CONDITIONS.find(c => c.id === draft.conditionKey)?.label} {draft.conditionValue}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-xs w-20 flex-shrink-0">Action</span>
                    <ActionBadge id={draft.action} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">Automation name <span className="text-red-500">*</span></label>
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

        {/* Back nav */}
        {step !== 'trigger' && (
          <div className="px-6 pb-4">
            <button onClick={() => {
              const prev: Record<Step, Step> = { trigger: 'trigger', condition: 'trigger', action: 'condition', config: 'action', name: selectedAction?.fields.length ? 'config' : 'action' }
              setStep(prev[step])
            }} className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
              ← Back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Detail panel ──────────────────────────────────────────────────────────────

function AutomationDetail({ automation, onToggle, onDelete, onClose }: {
  automation: Automation
  onToggle: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const t = triggerMeta(automation.trigger)
  const a = actionMeta(automation.action)
  const conds = automation.conditions ?? {}
  const cfg = automation.action_config ?? {}

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-full flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="text-neutral-900 text-sm font-semibold truncate">{automation.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onToggle}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
              automation.active
                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100')}>
            {automation.active ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Enable</>}
          </button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
            <Trash2 className="w-3 h-3" />Delete
          </button>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors ml-1"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {automation.description && (
          <p className="text-neutral-500 text-sm">{automation.description}</p>
        )}

        {/* Visual flow */}
        <div className="space-y-2">
          {/* Trigger */}
          <div className="flex items-start gap-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">Trigger</p>
              <p className="text-sm font-medium text-neutral-900">{t?.label ?? automation.trigger}</p>
              <p className="text-xs text-neutral-500">{t?.description}</p>
            </div>
          </div>

          <div className="flex justify-center"><div className="w-px h-4 bg-neutral-300" /></div>

          {/* Condition */}
          {Object.keys(conds).length > 0 && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Condition</p>
                  {Object.entries(conds).map(([k, v]) => {
                    const meta = CONDITIONS.find(c => c.id === k)
                    return <p key={k} className="text-sm font-medium text-neutral-900">{meta?.label ?? k}: <span className="text-amber-700">{String(v).replace('_',' ')}</span></p>
                  })}
                </div>
              </div>
              <div className="flex justify-center"><div className="w-px h-4 bg-neutral-300" /></div>
            </>
          )}

          {/* Action */}
          <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="w-full">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Action</p>
              <p className="text-sm font-medium text-neutral-900">{a?.label ?? automation.action}</p>
              {automation.action === 'send_email' && cfg.subject && (
                <div className="mt-2 bg-white border border-emerald-200 rounded-lg p-2.5 space-y-1">
                  <p className="text-xs font-medium text-neutral-700">Subject: {cfg.subject}</p>
                  {cfg.body && <p className="text-xs text-neutral-500 line-clamp-3 whitespace-pre-wrap">{cfg.body}</p>}
                </div>
              )}
              {automation.action === 'move_stage' && cfg.stage && (
                <p className="text-xs text-neutral-600 mt-1">→ <span className="capitalize font-medium">{cfg.stage}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
            <p className="text-xs text-neutral-400 mb-0.5">Times triggered</p>
            <p className="text-xl font-bold text-neutral-900">{automation.trigger_count}</p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
            <p className="text-xs text-neutral-400 mb-0.5">Last triggered</p>
            <p className="text-sm font-medium text-neutral-700">
              {automation.last_triggered ? formatRelativeTime(automation.last_triggered) : '—'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Automation | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await get<Automation[]>('/api/v1/automations')
      setAutomations(data)
    } catch {
      setAutomations([])
    } finally {
      setLoading(false)
    }
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
    setDeleting(a.id)
    try {
      await api.delete(`/api/v1/automations/${a.id}`)
      setAutomations(prev => prev.filter(x => x.id !== a.id))
      if (selected?.id === a.id) setSelected(null)
    } catch {} finally {
      setDeleting(null)
    }
  }

  const active  = automations.filter(a => a.active).length
  const total   = automations.length
  const fired   = automations.reduce((s, a) => s + a.trigger_count, 0)

  return (
    <div className="space-y-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Automations</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Build trigger → condition → action workflows</p>
        </div>
        <button onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: total },
          { label: 'Active', value: active },
          { label: 'Total Triggers', value: fired },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-neutral-500 text-xs mb-1">{s.label}</p>
            <p className="text-neutral-950 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-3 gap-5 items-start">

        {/* Left — automation list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-neutral-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : automations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-neutral-900 text-sm font-semibold mb-1">No automations yet</p>
              <p className="text-neutral-400 text-xs mb-4">Create your first workflow to get started.</p>
              <button onClick={() => setBuilderOpen(true)}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
                <Plus className="w-4 h-4" /> Create automation
              </button>
            </div>
          ) : (
            automations.map((a, i) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(selected?.id === a.id ? null : a)}
                className={cn(
                  'bg-white border rounded-xl p-4 cursor-pointer transition-all group',
                  selected?.id === a.id ? 'border-indigo-400 ring-1 ring-indigo-200 shadow-sm' : 'border-neutral-200 hover:border-neutral-300',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', a.active ? 'bg-emerald-50' : 'bg-neutral-100')}>
                      <Zap className={cn('w-3 h-3', a.active ? 'text-emerald-600' : 'text-neutral-400')} />
                    </div>
                    <span className="text-neutral-900 text-sm font-medium truncate">{a.name}</span>
                  </div>
                  {/* inline toggle */}
                  <button onClick={e => { e.stopPropagation(); toggle(a) }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {a.active
                      ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                      : <ToggleLeft className="w-5 h-5 text-neutral-400" />}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <TriggerBadge id={a.trigger} />
                  <span className="text-neutral-300 text-xs self-center">→</span>
                  <ActionBadge id={a.action} />
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>{a.trigger_count} triggers</span>
                  {a.last_triggered
                    ? <span>Last {formatRelativeTime(a.last_triggered)}</span>
                    : <span className="italic">Never triggered</span>}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Right — detail panel */}
        <div className="col-span-2 min-h-[500px]">
          <AnimatePresence mode="wait">
            {selected ? (
              <AutomationDetail
                key={selected.id}
                automation={selected}
                onToggle={() => toggle(selected)}
                onDelete={() => remove(selected)}
                onClose={() => setSelected(null)}
              />
            ) : (
              <motion.div key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-neutral-50 border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center h-full min-h-[500px]"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                  <Eye className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-neutral-700 text-sm font-semibold mb-1">Select an automation</p>
                <p className="text-neutral-400 text-xs">Click any automation on the left to see its details</p>
                <button onClick={() => setBuilderOpen(true)}
                  className="mt-5 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  <Plus className="w-4 h-4" /> Or create a new one
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Builder modal */}
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
