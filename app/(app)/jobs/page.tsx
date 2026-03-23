'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, MapPin, Users, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import StatusBadge from '@/components/cards/status-badge'
import SearchInput from '@/components/cards/search-input'
import FilterDropdown from '@/components/cards/filter-dropdown'
import { formatDate, formatSalary, cn } from '@/lib/utils'
import { useJobs } from '@/lib/hooks'
import type { ApiJob } from '@/types/job'

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
  { label: 'Draft', value: 'draft' },
]

const departmentOptions = [
  { label: 'All Departments', value: '' },
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Design', value: 'Design' },
  { label: 'AI/ML', value: 'AI/ML' },
  { label: 'Analytics', value: 'Analytics' },
  { label: 'Infrastructure', value: 'Infrastructure' },
]

export default function JobsPage() {
  const { jobs, total, loading, error } = useJobs()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  const filtered = jobs.filter((job: ApiJob) => {
    const matchSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || job.status === statusFilter
    const matchDept = !deptFilter || job.department === deptFilter
    return matchSearch && matchStatus && matchDept
  })

  const activeCount = jobs.filter((j) => j.status === 'active').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Jobs</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${activeCount} active position${activeCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Post New Job
        </button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search jobs…" className="w-64" />
        <FilterDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <FilterDropdown label="Department" options={departmentOptions} value={deptFilter} onChange={setDeptFilter} />
        <span className="text-neutral-400 text-sm ml-auto">
          {loading ? '—' : `${filtered.length} results`}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-neutral-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading jobs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 text-sm gap-2">
            <span>No jobs match your filters.</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                {['Job Title', 'Department', 'Location', 'Salary', 'Status', 'Created', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((job, i) => (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-neutral-50 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <Link href={`/jobs/${job.id}`} className="text-neutral-900 text-sm font-medium hover:text-indigo-600 transition-colors">
                      {job.title}
                    </Link>
                    <p className="text-neutral-400 text-xs mt-0.5 capitalize">{job.job_type}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-neutral-600 text-sm">{job.department}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-neutral-500 text-sm">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {job.location}
                      {job.remote && <span className="ml-1 text-xs text-indigo-500">· Remote</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {job.salary_min && job.salary_max ? (
                      <span className="text-neutral-600 text-sm">
                        {formatSalary(job.salary_min)}–{formatSalary(job.salary_max)}
                      </span>
                    ) : (
                      <span className="text-neutral-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-neutral-400 text-sm">{formatDate(job.created_at)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/jobs/${job.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
