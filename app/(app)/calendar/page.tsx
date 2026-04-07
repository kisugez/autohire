'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2,
  RefreshCw, ExternalLink, Video, MapPin, Clock,
  Users, ChevronDown, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { get, post, delete as del } from '@/lib/api'

type EventType = 'interview' | 'task' | 'time_off' | 'holiday' | 'meeting' | 'other'
type FilterType = 'All' | 'Interview' | 'Task' | 'Time Off' | 'Holiday' | 'Meeting'

interface CalendarEvent {
  id: string; title: string; start: string; end: string; type: EventType
  location?: string; meet_link?: string; description?: string; all_day?: boolean
  candidate_name?: string; job_title?: string; google_event_id?: string
  attendees?: { name: string; email: string; avatar?: string }[]
}
interface GoogleCalStatus { gcal_connected: boolean; gmail_email?: string }

const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_FULL    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const EVENT_COLORS: Record<EventType, string> = {
  interview:'bg-violet-500', task:'bg-blue-500', time_off:'bg-rose-400',
  holiday:'bg-amber-400', meeting:'bg-emerald-500', other:'bg-neutral-400',
}
const EVENT_TEXT: Record<EventType, string> = {
  interview:'text-violet-700', task:'text-blue-700', time_off:'text-rose-700',
  holiday:'text-amber-700', meeting:'text-emerald-700', other:'text-neutral-600',
}
const FILTER_MAP: Record<FilterType, EventType | null> = {
  'All':null,'Interview':'interview','Task':'task','Time Off':'time_off','Holiday':'holiday','Meeting':'meeting',
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()
}
function isToday(d: Date) { return isSameDay(d, new Date()) }
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate() }
function getFirstDOW(y: number, m: number)    { return new Date(y, m, 1).getDay() }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })
}
function fmtRange(s: string, e: string) { return `${fmtTime(s)} – ${fmtTime(e)}` }
function eventOnDay(ev: CalendarEvent, d: Date) {
  const s = new Date(new Date(ev.start).toDateString())
  const e = new Date(new Date(ev.end).toDateString())
  const t = new Date(d.toDateString())
  return t >= s && t <= e
}
function getInitials(n: string) { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) }

function Avatar({ name, size=22, src }: { name:string; size?:number; src?:string }) {
  const [failed, setFailed] = useState(false)
  const palette = ['bg-violet-200 text-violet-700','bg-blue-200 text-blue-700','bg-emerald-200 text-emerald-700','bg-amber-200 text-amber-700','bg-rose-200 text-rose-700']
  const col = palette[name.charCodeAt(0)%palette.length]
  if (src && !failed)
    return <img src={src} onError={()=>setFailed(true)} className="rounded-full object-cover flex-shrink-0" style={{width:size,height:size}} alt={name}/>
  return <div className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0',col)} style={{width:size,height:size,fontSize:size*0.4}}>{getInitials(name)}</div>
}

function EventLine({ event, onClick }: { event:CalendarEvent; onClick:()=>void }) {
  const bar  = EVENT_COLORS[event.type]??'bg-neutral-400'
  const text = EVENT_TEXT[event.type]??'text-neutral-600'
  return (
    <button onClick={e=>{e.stopPropagation();onClick()}} className="w-full text-left flex items-stretch hover:opacity-80 transition-opacity">
      <div className={cn('w-[3px] rounded-sm flex-shrink-0 mr-1.5',bar)}/>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[11px] truncate leading-snug font-medium',text)}>{event.title}</p>
        {!event.all_day && <p className="text-[10px] text-neutral-400 leading-snug truncate">{fmtTime(event.start)}</p>}
      </div>
    </button>
  )
}

function EventModal({ event, onClose }: { event:CalendarEvent; onClose:()=>void }) {
  const bar  = EVENT_COLORS[event.type]??'bg-neutral-400'
  const text = EVENT_TEXT[event.type]??'text-neutral-600'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.97,y:6}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97}}
        className="relative bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-md z-10 overflow-hidden">
        <div className={cn('h-1',bar)}/>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={cn('text-[10px] font-bold uppercase tracking-widest',text)}>{event.type.replace(/_/g,' ')}</span>
              <h3 className="text-neutral-900 text-[16px] font-semibold mt-0.5 leading-snug">{event.title}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 flex-shrink-0 ml-3"><X size={14}/></button>
          </div>
          <div className="space-y-2.5 text-[13px]">
            {!event.all_day && (
              <div className="flex items-center gap-2 text-neutral-600">
                <Clock size={13} className="text-neutral-400 flex-shrink-0"/>
                <span>{fmtRange(event.start,event.end)}</span>
                <span className="text-neutral-300">·</span>
                <span className="text-neutral-400">{new Date(event.start).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span>
              </div>
            )}
            {event.location && <div className="flex items-center gap-2 text-neutral-600"><MapPin size={13} className="text-neutral-400 flex-shrink-0"/><span>{event.location}</span></div>}
            {event.meet_link && (
              <a href={event.meet_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <Video size={13} className="flex-shrink-0"/>Join Google Meet
              </a>
            )}
            {event.candidate_name && (
              <div className="flex items-center gap-2 text-neutral-600">
                <Users size={13} className="text-neutral-400 flex-shrink-0"/>
                <span>{event.candidate_name}</span>
                {event.job_title && <span className="text-neutral-400">· {event.job_title}</span>}
              </div>
            )}
            {event.description && <p className="text-[12px] text-neutral-500 leading-relaxed border-t border-neutral-100 pt-2">{event.description}</p>}
            {event.attendees && event.attendees.length>0 && (
              <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Attendees</p>
                {event.attendees.map(a=>(
                  <div key={a.email} className="flex items-center gap-2">
                    <Avatar name={a.name} size={20} src={a.avatar}/>
                    <span className="text-neutral-700">{a.name}</span>
                    <span className="text-neutral-400 text-[11px]">{a.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100">
            {event.meet_link && (
              <a href={event.meet_link} target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2 bg-blue-600 text-white text-[12px] font-medium rounded-md flex items-center justify-center gap-1.5 hover:bg-blue-700">
                <Video size={12}/> Join Meeting
              </a>
            )}
            {event.google_event_id && (
              <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 border border-neutral-200 text-neutral-600 text-[12px] rounded-md flex items-center gap-1.5 hover:bg-neutral-50">
                <ExternalLink size={11}/> GCal
              </a>
            )}
            <button onClick={onClose} className="px-3 py-2 border border-neutral-200 text-neutral-600 text-[12px] rounded-md hover:bg-neutral-50">Close</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function QuickAddModal({ date, onClose, onSaved }: { date:Date; onClose:()=>void; onSaved:()=>void }) {
  const [title,setTitle] = useState('')
  const [type,setType]   = useState<EventType>('meeting')
  const [start,setStart] = useState('09:00')
  const [end,setEnd]     = useState('10:00')
  const [loc,setLoc]     = useState('')
  const [allDay,setAllDay] = useState(false)
  const [saving,setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    const ds = date.toISOString().slice(0,10)
    try {
      await post('/api/v1/calendar/events', {
        title, type,
        start: allDay ? new Date(date.getFullYear(),date.getMonth(),date.getDate()).toISOString() : new Date(`${ds}T${start}:00`).toISOString(),
        end:   allDay ? new Date(date.getFullYear(),date.getMonth(),date.getDate()+1).toISOString() : new Date(`${ds}T${end}:00`).toISOString(),
        location: loc||undefined, all_day:allDay, sync_to_google:true,
      })
      onSaved(); onClose()
    } catch { setSaving(false) }
  }

  const TYPES: { id:EventType; label:string; color:string }[] = [
    {id:'interview',label:'Interview',color:'bg-violet-500'},
    {id:'meeting',  label:'Meeting',  color:'bg-emerald-500'},
    {id:'task',     label:'Task',     color:'bg-blue-500'},
    {id:'time_off', label:'Time Off', color:'bg-rose-400'},
    {id:'holiday',  label:'Holiday',  color:'bg-amber-400'},
    {id:'other',    label:'Other',    color:'bg-neutral-400'},
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.97,y:6}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97}}
        className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-sm z-10">
        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-neutral-100">
          <div>
            <p className="text-[14px] font-semibold text-neutral-900">New Event</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">{date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400"><X size={14}/></button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()}
            placeholder="Event title…"
            className="w-full px-3.5 py-2.5 rounded-md border border-neutral-200 text-[13px] placeholder:text-neutral-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"/>
          <div className="grid grid-cols-3 gap-1.5">
            {TYPES.map(t=>(
              <button key={t.id} onClick={()=>setType(t.id)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium border transition-all',
                  type===t.id?'border-neutral-900 bg-neutral-900 text-white':'border-neutral-200 text-neutral-600 hover:border-neutral-300')}>
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0',t.color)}/>{t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-neutral-600">All day</span>
            <button onClick={()=>setAllDay(v=>!v)} className={cn('w-9 h-5 rounded-full transition-colors relative flex-shrink-0',allDay?'bg-violet-500':'bg-neutral-200')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',allDay?'translate-x-4':'translate-x-0.5')}/>
            </button>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              {([['Start',start,setStart],['End',end,setEnd]] as const).map(([label,val,setter])=>(
                <div key={label}>
                  <p className="text-[11px] text-neutral-400 mb-1">{label}</p>
                  <input type="time" value={val} onChange={e=>setter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-neutral-200 text-[12px] text-neutral-700 focus:outline-none focus:border-violet-400 transition-all"/>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-md border border-neutral-200 focus-within:border-violet-400 transition-all">
            <MapPin size={12} className="text-neutral-400 flex-shrink-0"/>
            <input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="Location (optional)"
              className="flex-1 text-[12px] placeholder:text-neutral-400 focus:outline-none bg-transparent"/>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Syncs to Google Calendar automatically
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-md border border-neutral-200 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
          <button onClick={save} disabled={!title.trim()||saving}
            className="flex-1 py-2 rounded-md bg-violet-600 text-white text-[13px] font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {saving?<><Loader2 size={13} className="animate-spin"/> Saving…</>:'Save Event'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function MonthDropdown({ year, month, onChange }: { year:number; month:number; onChange:(y:number,m:number)=>void }) {
  const [open,setOpen]             = useState(false)
  const [pickerYear,setPickerYear] = useState(year)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(()=>{ setPickerYear(year) },[year])
  useEffect(()=>{
    if (!open) return
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false) }
    document.addEventListener('mousedown',h)
    return ()=>document.removeEventListener('mousedown',h)
  },[open])
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(v=>!v)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
        Month <ChevronDown size={12}/>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,y:-4,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4,scale:0.98}} transition={{duration:0.12}}
            className="absolute top-full mt-1.5 right-0 bg-white border border-neutral-200 rounded-lg shadow-lg z-40 w-[220px] p-3">
            <div className="flex items-center justify-between mb-2.5">
              <button onClick={()=>setPickerYear(y=>y-1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500"><ChevronLeft size={13}/></button>
              <span className="text-[13px] font-semibold text-neutral-800">{pickerYear}</span>
              <button onClick={()=>setPickerYear(y=>y+1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500"><ChevronRight size={13}/></button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((m,i)=>(
                <button key={m} onClick={()=>{onChange(pickerYear,i);setOpen(false)}}
                  className={cn('py-1.5 rounded-md text-[12px] font-medium transition-colors',
                    pickerYear===year&&i===month?'bg-neutral-900 text-white':'text-neutral-600 hover:bg-neutral-100')}>
                  {m}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Toast({ msg }: { msg:string }) {
  return (
    <motion.div
      initial={{opacity:0,y:-20,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-20,scale:0.95}}
      className="fixed top-4 right-4 z-[100] flex items-center gap-2.5 bg-neutral-950 text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-xl">
      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0"/>
      {msg}
    </motion.div>
  )
}

// ─── Reads ?gcal=connected — MUST be its own component inside <Suspense> ──────
function OAuthHandler({ onConnected }: { onConnected: () => void }) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  useEffect(() => {
    if (searchParams.get('gcal') === 'connected') {
      onConnected()
      router.replace('/calendar')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // run once on mount — params are stable on first render after redirect
  return null
}

// ─── Main calendar UI ─────────────────────────────────────────────────────────
function CalendarInner() {
  const today = new Date()

  const [current,setCurrent]       = useState(new Date(today.getFullYear(),today.getMonth(),1))
  const [events,setEvents]         = useState<CalendarEvent[]>([])
  const [loading,setLoading]       = useState(true)
  const [syncing,setSyncing]       = useState(false)
  const [connecting,setConnecting]     = useState(false)
  const [disconnecting,setDisconnecting] = useState(false)
  const [gcal,setGcal]             = useState<GoogleCalStatus>({ gcal_connected:false })
  const [filter,setFilter]         = useState<FilterType>('All')
  const [activeEvent,setActive]    = useState<CalendarEvent|null>(null)
  const [addDate,setAddDate]       = useState<Date|null>(null)
  const [toast,setToast]           = useState<string|null>(null)

  const year  = current.getFullYear()
  const month = current.getMonth()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(()=>setToast(null), 4500)
  }

  const fetchStatus = useCallback(async () => {
    try {
      const st = await get<GoogleCalStatus>('/api/v1/google/status')
      setGcal(st)
    } catch {}
  }, [])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const [ev, st] = await Promise.all([
        get<CalendarEvent[]>(`/api/v1/calendar/events?year=${year}&month=${month+1}`),
        get<GoogleCalStatus>('/api/v1/google/status').catch(()=>({ gcal_connected:false } as GoogleCalStatus)),
      ])
      setEvents(ev)
      setGcal(st)
    } catch {}
    finally { setLoading(false) }
  }, [year, month])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Called by OAuthHandler the moment ?gcal=connected is detected in the URL
  const handleOAuthReturn = useCallback(() => {
    showToast('Google Calendar connected! Loading your events…')
    // Re-fetch status immediately, then fetch events (which may take a moment)
    fetchEvents()
  }, [fetchStatus, fetchEvents])

  const sync = async () => {
    setSyncing(true)
    try {
      await post('/api/v1/calendar/sync')
      await fetchEvents()
      showToast('Calendar synced!')
    } catch {
      showToast('Sync failed — please try again.')
    } finally { setSyncing(false) }
  }

  const connectGoogle = async () => {
    setConnecting(true)
    try {
      const { url } = await get<{ url:string }>('/api/v1/google/calendar/connect?return_to=/calendar')
      window.location.href = url
    } catch {
      showToast('Could not start Google Calendar sign-in. Try again.')
      setConnecting(false)
    }
  }

  const disconnectGoogle = async () => {
    setDisconnecting(true)
    try {
      await del('/api/v1/google/calendar/disconnect')
      setGcal({ gcal_connected: false })
      showToast('Google Calendar disconnected.')
    } catch {
      showToast('Failed to disconnect. Please try again.')
    } finally {
      setDisconnecting(false)
    }
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDOW    = getFirstDOW(year, month)
  const prevDays    = getDaysInMonth(year, month-1)
  const cells: { date:Date; cur:boolean }[] = []
  for (let i=firstDOW-1; i>=0; i--)
    cells.push({ date:new Date(year,month-1,prevDays-i), cur:false })
  for (let d=1; d<=daysInMonth; d++)
    cells.push({ date:new Date(year,month,d), cur:true })
  while (cells.length<42)
    cells.push({ date:new Date(year,month+1,cells.length-daysInMonth-firstDOW+1), cur:false })

  const shown = filter==='All' ? events : events.filter(e=>e.type===FILTER_MAP[filter])
  const now   = new Date()
  const upcoming = [...shown]
    .filter(e=>new Date(e.end)>=now)
    .sort((a,b)=>+new Date(a.start)-+new Date(b.start))
    .slice(0,25)

  const FILTERS: FilterType[] = ['All','Interview','Meeting','Task','Time Off','Holiday']

  return (
    <div className="flex flex-col" style={{ height:'calc(100vh - 64px)', padding:'12px 16px 12px' }}>

      {/* ── OAuth return detector — needs its own Suspense boundary ── */}
      <Suspense fallback={null}>
        <OAuthHandler onConnected={handleOAuthReturn}/>
      </Suspense>

      {/* Toast */}
      <AnimatePresence>{toast && <Toast msg={toast}/>}</AnimatePresence>

      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={()=>setCurrent(new Date(year,month-1,1))}
            className="w-7 h-7 rounded-md border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors">
            <ChevronLeft size={13}/>
          </button>
          <h1 className="text-[17px] font-semibold text-neutral-900 px-2 min-w-[150px] text-center">
            {MONTHS[month]} <span className="text-neutral-400 font-normal">{year}</span>
          </h1>
          <button onClick={()=>setCurrent(new Date(year,month+1,1))}
            className="w-7 h-7 rounded-md border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors">
            <ChevronRight size={13}/>
          </button>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center bg-neutral-100 rounded-md p-0.5">
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={cn('px-3 py-1.5 rounded-md text-[12px] font-medium transition-all whitespace-nowrap',
                  filter===f?'bg-white text-neutral-900 shadow-sm':'text-neutral-500 hover:text-neutral-700')}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <MonthDropdown year={year} month={month} onChange={(y,m)=>setCurrent(new Date(y,m,1))}/>
          <button onClick={()=>setCurrent(new Date(today.getFullYear(),today.getMonth(),1))}
            className="px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            Today
          </button>
          <button onClick={sync} disabled={syncing||!gcal.gcal_connected}
            title={gcal.gcal_connected?'Sync Google Calendar':'Connect Google Calendar first'}
            className="w-7 h-7 rounded-md border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors disabled:opacity-40">
            {syncing?<Loader2 size={13} className="animate-spin"/>:<RefreshCw size={13}/>}
          </button>
        </div>
      </div>

      {/* ── Content: grid + sidebar ── */}
      <div className="flex gap-0 flex-1 min-h-0">

        {/* Calendar grid */}
        <div className="flex-1 min-w-0 flex flex-col border border-neutral-200 rounded-l-lg overflow-hidden bg-white">
          <div className="grid grid-cols-7 border-b border-neutral-200 flex-shrink-0">
            {DAYS_FULL.map((day,i)=>(
              <div key={day} className={cn(
                'py-2 text-center text-[11.5px] font-medium border-r border-neutral-200 last:border-r-0',
                today.getFullYear()===year&&today.getMonth()===month&&today.getDay()===i
                  ?'text-blue-600 font-semibold':'text-neutral-500')}>
                <span className="hidden lg:inline">{day}</span>
                <span className="lg:hidden">{DAYS_SHORT[i]}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-neutral-400 text-sm">
              <Loader2 size={16} className="animate-spin"/> Loading…
            </div>
          ) : (
            <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows:'repeat(6, 1fr)' }}>
              {cells.map(({date,cur},idx)=>{
                const dayEvs    = shown.filter(e=>eventOnDay(e,date))
                const isNow     = isToday(date)
                const isWeekend = date.getDay()===0||date.getDay()===6
                const MAX = 3
                return (
                  <div key={idx} onClick={()=>setAddDate(date)}
                    className={cn(
                      'border-b border-r border-neutral-200 last:border-r-0 p-1.5 cursor-pointer relative group transition-colors',
                      !cur&&'bg-[repeating-linear-gradient(-45deg,_transparent,_transparent_8px,_rgba(0,0,0,0.025)_8px,_rgba(0,0,0,0.025)_9px)]',
                      isWeekend&&cur&&'bg-neutral-50/60',
                      idx>=35&&'border-b-0',
                    )}>
                    <div className="flex justify-end mb-0.5">
                      <div className={cn('w-6 h-6 flex items-center justify-center rounded-md text-[12px] font-medium',
                        isNow?'bg-neutral-900 text-white font-bold':cur?'text-neutral-700':'text-neutral-300')}>
                        {date.getDate()}
                      </div>
                    </div>
                    {isNow && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500"/>}
                    <div className="space-y-0.5">
                      {dayEvs.slice(0,MAX).map(ev=><EventLine key={ev.id} event={ev} onClick={()=>setActive(ev)}/>)}
                      {dayEvs.length>MAX && (
                        <p className="text-[10px] text-neutral-400 pl-1.5 cursor-pointer hover:text-neutral-600"
                          onClick={e=>{e.stopPropagation();setActive(dayEvs[MAX])}}>
                          +{dayEvs.length-MAX} more
                        </p>
                      )}
                    </div>
                    <button onClick={e=>{e.stopPropagation();setAddDate(date)}}
                      className="absolute top-1 left-1 w-5 h-5 rounded-md flex items-center justify-center text-neutral-400 hover:text-violet-600 hover:bg-violet-50 opacity-0 group-hover:opacity-100 transition-all">
                      <Plus size={11}/>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="w-[280px] flex-shrink-0 border border-l-0 border-neutral-200 rounded-r-lg bg-white flex flex-col overflow-hidden">

          {/* GCal connection card */}
          <div className="border-b border-neutral-200 p-4">
            {gcal.gcal_connected ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md overflow-hidden border border-neutral-200 flex-shrink-0">
                    <GCalIcon day={today.getDate()}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-neutral-900">Google Calendar</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                      <p className="text-[11px] text-emerald-600 truncate">Connected{gcal.gmail_email ? ` · ${gcal.gmail_email}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={sync} disabled={syncing} className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 transition-colors" title="Sync now">
                    <RefreshCw size={12} className={cn(syncing&&'animate-spin')}/>
                  </button>
                </div>
                <button
                  onClick={disconnectGoogle}
                  disabled={disconnecting}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-red-200 text-red-500 text-[11.5px] font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 size={11} className="animate-spin"/> : <X size={11}/>}
                  {disconnecting ? 'Disconnecting…' : 'Disconnect Calendar'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-[13px] font-semibold text-neutral-900 mb-1">Connect Calendar</p>
                <p className="text-[11.5px] text-neutral-500 mb-3 leading-relaxed">
                  Sync your interviews, holidays and meetings from Google Calendar.
                </p>
                <button onClick={connectGoogle} disabled={connecting}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-neutral-200 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-60">
                  {connecting
                    ?<><Loader2 size={13} className="animate-spin"/> Connecting…</>
                    :<><GCalIcon day={today.getDate()} size={18}/> Connect Google Calendar</>}
                </button>
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-neutral-900">Upcoming</p>
              {events.length>0 && <span className="text-[11px] text-neutral-400">{events.length} event{events.length!==1?'s':''}</span>}
            </div>
            <div className="divide-y divide-neutral-100">
              {upcoming.length===0 ? (
                <div className="flex flex-col items-center py-10 text-neutral-400 gap-2">
                  <p className="text-[12px]">{gcal.gcal_connected?'No upcoming events':'Connect Google Calendar to see events'}</p>
                </div>
              ) : (
                upcoming.map(ev=>{
                  const bar          = EVENT_COLORS[ev.type]??'bg-neutral-400'
                  const isLive       = now>=new Date(ev.start)&&now<=new Date(ev.end)
                  const attendeeName = ev.candidate_name??ev.attendees?.[0]?.name??null
                  return (
                    <button key={ev.id} onClick={()=>setActive(ev)}
                      className="w-full text-left flex items-stretch gap-2.5 px-4 py-3 hover:bg-neutral-50 transition-colors">
                      <div className={cn('w-1 rounded-sm flex-shrink-0',bar)}/>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-[12.5px] font-medium leading-snug truncate',isLive?'text-violet-700':'text-neutral-800')}>
                          {ev.title}
                          {isLive&&<span className="ml-1.5 text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">LIVE</span>}
                        </p>
                        {!ev.all_day
                          ?<p className="text-[11px] text-neutral-400 mt-0.5">{fmtTime(ev.start)} – {fmtTime(ev.end)}</p>
                          :<p className="text-[11px] text-neutral-400 mt-0.5">All day</p>}
                        {attendeeName && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Avatar name={attendeeName} size={16} src={ev.attendees?.[0]?.avatar}/>
                            <span className="text-[11px] text-neutral-500 truncate">{attendeeName}</span>
                          </div>
                        )}
                      </div>
                      {ev.meet_link && (
                        <a href={ev.meet_link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                          className="flex-shrink-0 self-center w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-colors">
                          <Video size={11}/>
                        </a>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="border-t border-neutral-200 p-3">
            <button onClick={()=>setAddDate(today)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-violet-600 text-white text-[12.5px] font-medium hover:bg-violet-700 transition-colors">
              <Plus size={13}/> New Event
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeEvent && <EventModal event={activeEvent} onClose={()=>setActive(null)}/>}
        {addDate     && <QuickAddModal date={addDate} onClose={()=>setAddDate(null)} onSaved={fetchEvents}/>}
      </AnimatePresence>
    </div>
  )
}

// ─── Default export — CalendarInner already contains its own <Suspense> ───────
export default function CalendarPage() {
  return <CalendarInner/>
}

function GCalIcon({ day, size=32 }: { day:number; size?:number }) {
  return (
    <svg viewBox="0 0 32 32" style={{ width:size, height:size }}>
      <rect width="32" height="32" fill="white"/>
      <rect x="3" y="3" width="26" height="26" rx="3" fill="white" stroke="#dadce0" strokeWidth="1.5"/>
      <rect x="3" y="3" width="26" height="10" rx="3" fill="#1A73E8"/>
      <rect x="3" y="9" width="26" height="4" fill="#1A73E8"/>
      <text x="16" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1A73E8">{day}</text>
      <rect x="9" y="1" width="3" height="6" rx="1.5" fill="#5F6368"/>
      <rect x="20" y="1" width="3" height="6" rx="1.5" fill="#5F6368"/>
    </svg>
  )
}
