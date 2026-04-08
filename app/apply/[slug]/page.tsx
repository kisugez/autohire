'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  MapPin, Briefcase, DollarSign, Wifi, CheckCircle2,
  Loader2, AlertCircle, Upload, X, Building2, ArrowRight,
  ArrowLeft, User, Mail, Phone, Globe, Github, Linkedin,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  enabled: boolean
  placeholder?: string | null
}

interface JobForm {
  job_id: string
  job_title: string
  job_description: string | null
  department: string | null
  location: string | null
  remote: boolean
  job_type: string
  salary_min: number | null
  salary_max: number | null
  slug: string
  form_fields: FormField[]
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

const STEPS = [
  { number: 1, label: 'Personal Info' },
  { number: 2, label: 'Profile Links' },
  { number: 3, label: 'Your CV' },
]

export default function PublicJobPage() {
  const { slug } = useParams<{ slug: string }>()

  const [job, setJob]           = useState<JobForm | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState(1)

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [gender,    setGender]    = useState<'male' | 'female' | 'other' | ''>('')

  const [values, setValues] = useState<Record<string, string>>({})
  const [cvFile, setCvFile] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${BASE}/api/v1/applications/form/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const set = (id: string, v: string) => setValues(p => ({ ...p, [id]: v }))

  const handleNext = () => {
    setError(null)
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return }
      setStep(2)
    } else if (step === 2) {
      const emailField = job?.form_fields.find(f => f.id === 'email' && f.enabled && f.required)
      if (emailField && !(values['email'] ?? '').trim()) { setError('Email is required.'); return }
      setStep(3)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      let resume_url:  string | null = null
      let resume_text: string | null = null
      if (cvFile) {
        const fd = new FormData()
        fd.append('file', cvFile)
        const up = await fetch(`${BASE}/api/v1/applications/upload-cv`, { method: 'POST', body: fd })
        if (up.ok) { const j = await up.json(); resume_url = j.url ?? null; resume_text = j.resume_text ?? null }
      }
      const payload: Record<string, any> = {
        name:         `${firstName} ${lastName}`.trim(),
        email:        values['email']        ?? null,
        phone:        values['phone']        ?? null,
        linkedin_url: values['linkedin_url'] ?? null,
        github_url:   values['github_url']   ?? null,
        cover_letter: values['cover_letter'] ?? null,
        resume_url,
        resume_text,
      }
      const res = await fetch(`${BASE}/api/v1/applications/submit/${slug}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.detail ?? 'Submission failed') }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }


  if (loading) return (
    <>
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', fontFamily:"'Atyp', system-ui, sans-serif" }}>
      <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
    </div></>
  )

  if (notFound) return (
    <>
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fff', fontFamily:"'Atyp', system-ui, sans-serif" }}>
      <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <h1 className="text-gray-900 text-lg font-semibold mb-1">Position not found</h1>
      <p className="text-gray-400 text-sm">This job link may have expired or been removed.</p>
    </div></>
  )

  if (submitted) return (
    <>
    <div style={{ height:'100vh', display:'flex', overflow:'hidden', fontFamily:"'Atyp', system-ui, sans-serif" }}>
      <GifPanel />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', background:'#fff', overflowY:'auto' }}>
        <div style={{ textAlign:'center', maxWidth:340 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#111', marginBottom:8 }}>Application Submitted!</h2>
          <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>
            Thanks for applying for <strong style={{ color:'#111' }}>{job?.job_title}</strong>.<br />
            We'll be in touch if your profile is a great match.
          </p>
        </div>
      </div>
    </div></>
  )

  const enabledFields = (job?.form_fields ?? []).filter(f => f.enabled)
  const linkFields    = enabledFields.filter(f => ['email','phone','linkedin_url','github_url','portfolio_url'].includes(f.id))
  const extraFields   = enabledFields.filter(f => !['cv','name','email','phone','linkedin_url','github_url','portfolio_url'].includes(f.id))

  return (
    <>
    <div style={{ height:'100vh', display:'flex', overflow:'hidden', fontFamily:"'Atyp', system-ui, sans-serif" }}>

      {/* ── LEFT: GIF panel ── */}
      <GifPanel />

      {/* ── RIGHT: scrollable form ── */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'2.5rem 3rem', maxWidth:480, margin:'0 auto', width:'100%' }}>

          {/* ── Job details ── */}
          {job && (
            <div style={{ marginBottom:24, paddingBottom:20, borderBottom:'1px solid #f3f4f6' }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:'#111', marginBottom:10, lineHeight:1.3 }}>{job.job_title}</h1>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {job.department && (
                  <span style={{ fontSize:11, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ede9fe', padding:'2px 10px', borderRadius:4, fontWeight:500 }}>
                    {job.department}
                  </span>
                )}
                {job.location && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#6b7280', background:'#fff', border:'1px solid #e5e7eb', padding:'2px 10px', borderRadius:4 }}>
                    <MapPin size={9} />{job.location}
                  </span>
                )}
                {job.remote && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#4f46e5', background:'#eef2ff', border:'1px solid #e0e7ff', padding:'2px 10px', borderRadius:4 }}>
                    <Wifi size={9} />Remote
                  </span>
                )}
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#6b7280', background:'#fff', border:'1px solid #e5e7eb', padding:'2px 10px', borderRadius:4, textTransform:'capitalize' }}>
                  <Briefcase size={9} />{job.job_type?.replace('_', ' ')}
                </span>
                {job.salary_min && job.salary_max && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#6b7280', background:'#fff', border:'1px solid #e5e7eb', padding:'2px 10px', borderRadius:4 }}>
                    <DollarSign size={9} />{fmt(job.salary_min)} – {fmt(job.salary_max)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Progress ── */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.05em' }}>{step} of {STEPS.length} completed</span>
              <span style={{ fontSize:11, color:'#9ca3af' }}>{STEPS[step - 1].label}</span>
            </div>
            <div style={{ width:'100%', background:'#f3f4f6', borderRadius:99, height:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, background:'#7c3aed', width:`${(step / STEPS.length) * 100}%`, transition:'width .4s ease' }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
              {STEPS.map((s, i) => (
                <div key={s.number} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{
                    width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:700, flexShrink:0,
                    background: step >= s.number ? '#7c3aed' : '#f3f4f6',
                    color: step >= s.number ? '#fff' : '#9ca3af',
                  }}>
                    {step > s.number ? <CheckCircle2 size={11} /> : s.number}
                  </div>
                  <span style={{ fontSize:11, fontWeight:500, color: step >= s.number ? '#374151' : '#9ca3af' }}>{s.label}</span>
                  {i < STEPS.length - 1 && <div style={{ width:16, height:1, background:'#e5e7eb', marginLeft:2 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize:14, fontWeight:700, color:'#111', marginBottom:2 }}>Personal Info</h2>
              <p style={{ fontSize:11, color:'#9ca3af', marginBottom:16 }}>Tell us a bit about yourself to get started.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Field label="First Name" required>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="inp" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                </Field>
                <Field label="Last Name" required>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="inp" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </Field>
                <Field label="Gender">
                  <div style={{ display:'flex', gap:8 }}>
                    {(['male', 'female', 'other'] as const).map(g => (
                      <button key={g} type="button" onClick={() => setGender(g)}
                        style={{
                          display:'flex', alignItems:'center', gap:6,
                          padding:'7px 12px', borderRadius:8, border:'1px solid',
                          fontSize:12, fontWeight:500, cursor:'pointer', textTransform:'capitalize',
                          borderColor: gender === g ? '#7c3aed' : '#e5e7eb',
                          background:  gender === g ? '#f5f3ff' : '#fff',
                          color:       gender === g ? '#7c3aed' : '#6b7280',
                          transition:  'all .15s',
                        }}>
                        <span style={{
                          width:12, height:12, borderRadius:'50%', border:'2px solid',
                          borderColor: gender === g ? '#7c3aed' : '#d1d5db',
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                        }}>
                          {gender === g && <span style={{ width:6, height:6, borderRadius:'50%', background:'#7c3aed', display:'block' }} />}
                        </span>
                        {g}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              {error && <ErrBox msg={error} />}
              <div style={{ marginTop:20 }}><button className="pbtn" onClick={handleNext}>Next <ArrowRight size={13} /></button></div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize:14, fontWeight:700, color:'#111', marginBottom:2 }}>Profile & Contact</h2>
              <p style={{ fontSize:11, color:'#9ca3af', marginBottom:16 }}>Share how we can reach you and find your work.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Field label="Email Address" required>
                  <div className="relative">
                    <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" className="inp" placeholder="john@example.com" value={values['email'] ?? ''} onChange={e => set('email', e.target.value)} />
                  </div>
                </Field>
                <Field label="Phone Number">
                  <div className="relative">
                    <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" className="inp" placeholder="+1 555 000 0000" value={values['phone'] ?? ''} onChange={e => set('phone', e.target.value)} />
                  </div>
                </Field>
                {linkFields.filter(f => !['email','phone'].includes(f.id)).map(field => {
                  const Icon = field.id === 'linkedin_url' ? Linkedin : field.id === 'github_url' ? Github : Globe
                  return (
                    <Field key={field.id} label={field.label} required={field.required}>
                      <div className="relative">
                        <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="url" className="inp" placeholder={field.placeholder ?? 'https://'} value={values[field.id] ?? ''} onChange={e => set(field.id, e.target.value)} />
                      </div>
                    </Field>
                  )
                })}
                {extraFields.filter(f => f.type === 'textarea').map(field => (
                  <Field key={field.id} label={field.label} required={field.required}>
                    <textarea rows={3} className="inp-bare resize-none" placeholder={field.placeholder ?? ''} value={values[field.id] ?? ''} onChange={e => set(field.id, e.target.value)} />
                  </Field>
                ))}
              </div>
              {error && <ErrBox msg={error} />}
              <div style={{ marginTop:20, display:'flex', gap:8 }}>
                <button type="button" onClick={() => setStep(1)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, fontWeight:500, color:'#374151', background:'#fff', cursor:'pointer' }}>
                  <ArrowLeft size={11} /> Back
                </button>
                <button className="pbtn" style={{ flex:1 }} onClick={handleNext}>Next <ArrowRight size={13} /></button>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize:14, fontWeight:700, color:'#111', marginBottom:2 }}>Upload Your CV</h2>
              <p style={{ fontSize:11, color:'#9ca3af', marginBottom:16 }}>Upload your résumé so the team can review your experience.</p>
              <div onClick={() => fileRef.current?.click()}
                style={{
                  cursor:'pointer', borderRadius:10, border:'1.5px dashed',
                  borderColor: cvFile ? '#7c3aed' : '#e5e7eb',
                  background: cvFile ? '#f5f3ff' : '#fafafa',
                  padding:'2rem', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:10, transition:'all .15s',
                }}>
                {cvFile ? (
                  <>
                    <div style={{ width:44, height:44, borderRadius:10, background:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <FileText size={20} className="text-white" />
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#7c3aed' }}>{cvFile.name}</p>
                      <p style={{ fontSize:11, color:'#a78bfa', marginTop:2 }}>{(cvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setCvFile(null) }}
                      style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#f87171', background:'none', border:'none', cursor:'pointer' }}>
                      <X size={10} /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ width:44, height:44, borderRadius:10, background:'#f3f4f6', border:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Upload size={18} className="text-gray-400" />
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Click to upload CV / Résumé</p>
                      <p style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>PDF, DOCX · up to 10 MB</p>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display:'none' }} onChange={e => setCvFile(e.target.files?.[0] ?? null)} />
              {error && <ErrBox msg={error} />}
              <div style={{ marginTop:20, display:'flex', gap:8 }}>
                <button type="button" onClick={() => setStep(2)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, fontWeight:500, color:'#374151', background:'#fff', cursor:'pointer' }}>
                  <ArrowLeft size={11} /> Back
                </button>
                <button className="pbtn" style={{ flex:1 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting
                    ? <><Loader2 size={13} className="animate-spin" /> Submitting…</>
                    : <><CheckCircle2 size={13} /> Submit Application</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div></>
  )
}

/* ── Full bleed GIF panel ── */
function GifPanel() {
  return (
    <div className="hidden lg:block" style={{ width:'45%', flexShrink:0, position:'relative', height:'100%' }}>
      <img
        src="/original-a256fc211bd748036134c22b5777d44a.gif"
        alt=""
        style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%',
          objectFit:'cover', objectPosition:'center center',
          display:'block',
        }}
      />
    </div>
  )
}

/* ── Field wrapper ── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:6 }}>
        {label} {required && <span style={{ color:'#f87171' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

/* ── Error box ── */
function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginTop:12, background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontSize:12, padding:'10px 12px', borderRadius:8 }}>
      <AlertCircle style={{ width:14, height:14, flexShrink:0, marginTop:1 }} />
      {msg}
    </div>
  )
}