'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, Video, Phone, MapPin, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { post } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  candidateId: string
  candidateName: string
  candidateEmail: string
  jobId?: string
  gcalConnected: boolean
}

const INTERVIEW_TYPES = [
  { value: 'video',      label: 'Video Call',  icon: Video   },
  { value: 'phone',      label: 'Phone',        icon: Phone   },
  { value: 'onsite',     label: 'On-site',      icon: MapPin  },
  { value: 'technical',  label: 'Technical',    icon: Video   },
]

const DURATIONS = [30, 45, 60, 90, 120]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

const FIELD = 'w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

export default function ScheduleInterviewModal({
  open, onClose, candidateId, candidateName, candidateEmail, jobId, gcalConnected,
}: Props) {
  const [form, setForm] = useState({
    title: `Interview with ${candidateName}`,
    description: '',
    interview_type: 'video',
    date: '',
    time: '',
    duration_minutes: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: '',
    add_google_meet: true,
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<{ meetLink?: string; gcalId?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.date || !form.time) { setError('Please pick a date and time.'); return }
    setSaving(true)
    setError(null)
    try {
      const scheduled_at = new Date(`${form.date}T${form.time}:00`).toISOString()
      const result = await post<any>('/api/v1/interviews', {
        candidate_id: candidateId,
        job_id: jobId ?? null,
        title: form.title,
        description: form.description || null,
        interview_type: form.interview_type,
        scheduled_at,
        duration_minutes: form.duration_minutes,
        timezone: form.timezone,
        location: form.location || null,
        add_google_meet: form.add_google_meet && gcalConnected,
      })
      setDone({ meetLink: result.meet_link, gcalId: result.gcal_event_id })
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to schedule interview.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setDone(null)
    setError(null)
    setForm(f => ({ ...f, date: '', time: '', description: '', location: '' }))
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-neutral-950 text-sm font-semibold">Schedule Interview</h2>
                  <p className="text-neutral-400 text-xs">{candidateName} · {candidateEmail}</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {done ? (
                <div className="flex flex-col items-center py-8 gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-neutral-950 font-semibold mb-1">Interview Scheduled!</h3>
                    <p className="text-neutral-500 text-sm">A calendar invite was sent to {candidateName}.</p>
                  </div>
                  {done.meetLink && (
                    <a
                      href={done.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      Open Google Meet
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={handleClose} className="text-sm text-neutral-500 hover:text-neutral-700">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Title */}
                  <div>
                    <label className={LABEL}>Interview Title</label>
                    <input className={FIELD} value={form.title} onChange={e => set('title', e.target.value)} />
                  </div>

                  {/* Type */}
                  <div>
                    <label className={LABEL}>Interview Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {INTERVIEW_TYPES.map(t => {
                        const Icon = t.icon
                        return (
                          <button
                            key={t.value}
                            onClick={() => set('interview_type', t.value)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all',
                              form.interview_type === t.value
                                ? 'border-neutral-950 bg-neutral-950 text-white'
                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Date + Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Date</label>
                      <input
                        type="date"
                        className={FIELD}
                        value={form.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => set('date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Time</label>
                      <input
                        type="time"
                        className={FIELD}
                        value={form.time}
                        onChange={e => set('time', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Duration + Timezone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Duration</label>
                      <select className={FIELD} value={form.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))}>
                        {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Timezone</label>
                      <select className={FIELD} value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className={LABEL}>Notes / Agenda (optional)</label>
                    <textarea
                      rows={3}
                      className={cn(FIELD, 'resize-none')}
                      placeholder="Topics to cover, preparation notes…"
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                    />
                  </div>

                  {/* Google Meet toggle */}
                  {gcalConnected && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => set('add_google_meet', !form.add_google_meet)}
                        className={cn(
                          'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors',
                          form.add_google_meet ? 'bg-indigo-600' : 'bg-neutral-200',
                        )}
                      >
                        <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform', form.add_google_meet ? 'translate-x-4' : 'translate-x-0')} />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-700 font-medium">Add Google Meet link</p>
                        <p className="text-xs text-neutral-400">Auto-generates a Meet link and saves to both calendars</p>
                      </div>
                    </label>
                  )}

                  {!gcalConnected && (
                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Connect Google Calendar in <strong>Integrations</strong> to auto-add to both your and the candidate's calendar.</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            {!done && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
                <button onClick={handleClose} className="px-4 py-2 text-sm text-neutral-600 border border-neutral-200 bg-white rounded-lg hover:border-neutral-300 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scheduling…</> : <><Calendar className="w-3.5 h-3.5" /> Schedule Interview</>}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
