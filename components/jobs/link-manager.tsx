'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, Copy, Check, ExternalLink, Loader2, Plus, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import { get, post, patch } from '@/lib/api'
import { cn } from '@/lib/utils'
import FormBuilder from './form-builder'
import type { JobLinkResponse, FormField } from '@/types/job'

const DEFAULT_FIELDS: FormField[] = [
  { id: 'name',         label: 'Full Name',          type: 'text',     required: true,  enabled: true  },
  { id: 'email',        label: 'Email Address',       type: 'email',    required: true,  enabled: true  },
  { id: 'phone',        label: 'Phone Number',        type: 'tel',      required: false, enabled: true  },
  { id: 'linkedin_url', label: 'LinkedIn URL',        type: 'url',      required: false, enabled: true  },
  { id: 'github_url',   label: 'GitHub URL',          type: 'url',      required: false, enabled: false },
  { id: 'cover_letter', label: 'Cover Letter',        type: 'textarea', required: false, enabled: false },
  { id: 'cv',           label: 'Upload CV / Résumé',  type: 'file',     required: false, enabled: true  },
]

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

interface Props {
  jobId: string
  jobTitle: string
}

export default function LinkManager({ jobId, jobTitle }: Props) {
  const [links, setLinks]           = useState<JobLinkResponse[]>([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editFields, setEditFields] = useState<FormField[]>([])
  const [saving, setSaving]         = useState(false)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await get<JobLinkResponse[]>(`/api/v1/jobs/${jobId}/links`)
      setLinks(data)
    } catch {
      setLinks([])
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const createLink = async () => {
    setCreating(true)
    try {
      const link = await post<JobLinkResponse>(`/api/v1/jobs/${jobId}/links`, {
        source: 'direct',
        label: `Link ${links.length + 1}`,
        form_schema: DEFAULT_FIELDS,
      })
      setLinks(prev => [...prev, link])
      // immediately open the form builder for the new link
      setEditingId(link.id)
      setEditFields(link.form_schema ?? DEFAULT_FIELDS)
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (link: JobLinkResponse) => {
    try {
      const updated = await patch<JobLinkResponse>(`/api/v1/jobs/${jobId}/links/${link.id}`, {
        active: !link.active,
      })
      setLinks(prev => prev.map(l => l.id === link.id ? updated : l))
    } catch {}
  }

  const saveFormSchema = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const updated = await patch<JobLinkResponse>(`/api/v1/jobs/${jobId}/links/${editingId}`, {
        form_schema: editFields,
      })
      setLinks(prev => prev.map(l => l.id === editingId ? updated : l))
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const copy = (slug: string, id: string) => {
    const url = `${BASE_URL}/apply/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-8 justify-center text-neutral-400 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading links…
    </div>
  )

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          Each link has its own form config. Share the URL with candidates — no login required.
        </p>
        <button
          onClick={createLink}
          disabled={creating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Generate Link
        </button>
      </div>

      {links.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 text-sm gap-3">
          <Link2 className="w-6 h-6" />
          <p>No links yet — generate one to get a shareable application URL.</p>
        </div>
      )}

      {/* link list */}
      <div className="space-y-3">
        {links.map(link => {
          const url = `${BASE_URL}/apply/${link.slug}`
          const isEditing = editingId === link.id

          return (
            <div key={link.id} className="border border-neutral-200 rounded-xl overflow-hidden">
              {/* link row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', link.active ? 'bg-green-500' : 'bg-neutral-300')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{link.label ?? link.slug}</p>
                  <p className="text-xs text-neutral-400 truncate font-mono">{url}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* clicks */}
                  <span className="text-xs text-neutral-400 mr-1">{link.click_count} view{link.click_count !== 1 ? 's' : ''}</span>

                  {/* copy */}
                  <button
                    onClick={() => copy(link.slug, link.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title="Copy link"
                  >
                    {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* open */}
                  <a
                    href={url} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* edit form */}
                  <button
                    onClick={() => {
                      if (isEditing) { setEditingId(null) }
                      else { setEditingId(link.id); setEditFields(link.form_schema ?? DEFAULT_FIELDS) }
                    }}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                      isEditing ? 'text-indigo-600 bg-indigo-50' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100',
                    )}
                    title="Edit form fields"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* toggle active */}
                  <button
                    onClick={() => toggleActive(link)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title={link.active ? 'Deactivate link' : 'Activate link'}
                  >
                    {link.active
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* inline form builder */}
              {isEditing && (
                <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-4 space-y-3">
                  <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Application Form Fields</p>
                  <FormBuilder fields={editFields} onChange={setEditFields} />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-neutral-600 border border-neutral-200 bg-white rounded-lg hover:border-neutral-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveFormSchema}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Save Form
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
