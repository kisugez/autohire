'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, MapPin, Users, CalendarCheck, ChevronRight } from 'lucide-react'
import { MOCK_JOBS } from '@/lib/constants'
import StatusBadge from '@/components/cards/status-badge'
import SearchInput from '@/components/cards/search-input'
import FilterDropdown from '@/components/cards/filter-dropdown'
import { formatDate, formatSalary, cn } from '@/lib/utils'

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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  const filtered = MOCK_JOBS.filter(job => {
    const matchSearch = job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || job.status === statusFilter
    const matchDept = !deptFilter || job.department === deptFilter
    return matchSearch && matchStatus && matchDept
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Jobs</h1>
          <p className="text-neutral-400 text-sm mt-0.5">{MOCK_JOBS.filter(j => j.status === 'active').length} active positions</p>
        </div>
        <button className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Post New Job
        </button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search jobs..." className="w-64" />
        <FilterDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <FilterDropdown label="Department" options={departmentOptions} value={deptFilter} onChange={setDeptFilter} />
        <span className="text-neutral-400 text-sm ml-auto">{filtered.length} results</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {['Job Title', 'Department', 'Location', 'Candidates', 'Interviews', 'Status', 'Created', ''].map((h) => (
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
                  <Link href={`/jobs/${job.id}`} className="text-neutral-900 text-sm font-medium hover:text-accent transition-colors">
                    {job.title}
                  </Link>
                  <p className="text-neutral-400 text-xs mt-0.5 capitalize">{job.type}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-neutral-600 text-sm">{job.department}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 text-neutral-500 text-sm">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {job.location}
                    {job.remote && <span className="ml-1 text-xs text-accent">· Remote</span>}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 text-neutral-800 text-sm font-medium">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    {job.candidateCount}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 text-neutral-800 text-sm font-medium">
                    <CalendarCheck className="w-3.5 h-3.5 text-neutral-400" />
                    {job.interviewCount}
                  </div>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={job.status} /></td>
                <td className="px-5 py-3.5"><span className="text-neutral-400 text-sm">{formatDate(job.createdAt)}</span></td>
                <td className="px-5 py-3.5">
                  <Link href={`/jobs/${job.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
