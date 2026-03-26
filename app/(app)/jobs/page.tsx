'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, MapPin, ChevronRight, Loader2, AlertCircle, MoreHorizontal, Pencil, Archive, Link2, Copy, Check } from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import SearchInput from '@/components/cards/search-input'
import FilterDropdown from '@/components/cards/filter-dropdown'
import JobModal from '@/components/jobs/job-modal'
import { formatDate, formatSalary, cn } from '@/lib/utils'
import { useJobsContext } from '@/lib/jobs-context'
import { post } from '@/lib/api'
import type { ApiJob, JobLinkResponse } from '@/types/job'

const statusOptions = [
  { label: 'All Status',  value: '' },
  { label: 'Active',      value: 'active' },
  { label: 'Paused',      value: 'paused' },
  { label: 'Closed',      value: 'closed' },
  { label: 'Draft',       value: 'draft' },
]

const departmentOptions = [
  { label: 'All Departments', value: '' },
  { label: 'Engineering',     value: 'Engineering' },
  { label: 'Design',          value: 'Design' },
  { label: 'AI/ML',           value: 'AI/ML' },
  { label: 'Analytics',       value: 'Analytics' },
  { label: 'Infrastructure',  value: 'Infrastructure' },
  { label: 'Product',         value: 'Product' },
  { label: 'Marketing',       value: 'Marketing' },
]

export default function JobsPage() {
  const { jobs, loading, error, archiveJob } = useJobsContext()

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [deptFilter, setDept]       = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editJob, setEditJob]       = useState<ApiJob | null>(null)
  const [menuOpen, setMenuOpen]     = useState<string | null>(null)
  const [archiving, setArchiving]   = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)

  const filtered = jobs.filter((job: ApiJob) => {
    const q = search.toLowerCase()
    const matchSearch = job.title.toLowerCase().includes(q) || (job.department ?? '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || job.status === statusFilter
    const matchDept   = !deptFilter   || job.department === deptFilter
    return matchSearch && matchStatus && matchDept
  })

  const activeCount = jobs.filter(j => j.status === 'active').length

  const openEdit = (job: ApiJob) => {
    setEditJob(job)
    setModalOpen(true)
    setMenuOpen(null)
  }

  const handleArchive = async (id: string) => {
    setArchiving(id)
    setMenuOpen(null)
    try { await archiveJob(id) } finally { setArchiving(null) }
  }

  /** Quickly create a link for a job and copy its URL to clipboard */
  const handleGetLink = async (job: ApiJob) => {
    setMenuOpen(null)
    setLinkLoading(job.id)
    try {
      const link = await post<JobLinkResponse>(`/api/v1/jobs/${job.id}/links`, {
        source: 'direct',
        label: 'Direct Link',
      })
      const url = `${window.location.origin}/jobs/${link.slug}`
      await navigator.clipboard.writeText(url)
      setCopiedId(job.id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      // silently fail — user can open the modal → Links tab manually
    } finally {
      setLinkLoading(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Jobs</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${activeCount} active position${activeCount !== 1 ? 's' : ''} · ${jobs.length} total`}
          </p>
        </div>
        <button
          onClick={() => { setEditJob(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search jobs…" className="w-64" />
        <FilterDropdown label="Status"     options={statusOptions}     value={statusFilter} onChange={setStatus} />
        <FilterDropdown label="Department" options={departmentOptions} value={deptFilter}   onChange={setDept} />
        <span className="text-neutral-400 text-sm ml-auto">
          {loading ? '—' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading jobs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 text-sm gap-3">
            <span>No jobs match your filters.</span>
            <button onClick={() => { setEditJob(null); setModalOpen(true) }} className="text-indigo-600 text-xs hover:text-indigo-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Post your first job
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                {['Job Title', 'Department', 'Location', 'Salary', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((job, i) => (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn('hover:bg-neutral-50 transition-colors group', archiving === job.id && 'opacity-40')}
                >
                  <td className="px-5 py-3.5">
                    <Link href={`/jobs/${job.id}`} className="text-neutral-900 text-sm font-medium hover:text-indigo-600 transition-colors">
                      {job.title}
                    </Link>
                    <p className="text-neutral-400 text-xs mt-0.5 capitalize">{job.job_type}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-neutral-600 text-sm">{job.department ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-neutral-500 text-sm">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {job.location ?? '—'}
                      {job.remote && <span className="ml-1 text-xs text-indigo-500">· Remote</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {job.salary_min && job.salary_max
                      ? <span className="text-neutral-600 text-sm">{formatSalary(job.salary_min, job.salary_max)}</span>
                      : <span className="text-neutral-300 text-sm">—</span>}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3.5">
                    <span className="text-neutral-400 text-sm">{formatDate(job.created_at)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">

                      {/* Quick "Get Link" button */}
                      <button
                        onClick={() => handleGetLink(job)}
                        disabled={linkLoading === job.id}
                        title={copiedId === job.id ? 'Link copied!' : 'Generate & copy application link'}
                        className={cn(
                          'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                          copiedId === job.id
                            ? 'text-green-600 bg-green-50'
                            : 'text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50',
                        )}
                      >
                        {linkLoading === job.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : copiedId === job.id
                            ? <Check className="w-3.5 h-3.5" />
                            : <Link2 className="w-3.5 h-3.5" />}
                      </button>

                      {/* Three-dot menu */}
                      <button
                        onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      <Link href={`/jobs/${job.id}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </Link>

                      {/* Dropdown */}
                      {menuOpen === job.id && (
                        <div className="absolute right-0 top-8 z-20 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 w-44">
                          <button
                            onClick={() => openEdit(job)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-neutral-400" /> Edit Job
                          </button>
                          <button
                            onClick={() => { openEdit(job); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5" /> Manage Links
                          </button>
                          <div className="border-t border-neutral-100 my-1" />
                          <button
                            onClick={() => handleArchive(job.id)}
                            disabled={job.status === 'closed'}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Archive className="w-3.5 h-3.5" /> Archive
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}

      <JobModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditJob(null) }}
        job={editJob}
      />
    </div>
  )
}
