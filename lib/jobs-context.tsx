'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { get, post, patch, delete as del } from '@/lib/api'
import type { ApiJob, ApiJobsResponse } from '@/types/job'

interface JobsContextValue {
  jobs: ApiJob[]
  total: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createJob: (payload: Partial<ApiJob>) => Promise<ApiJob>
  updateJob: (id: string, payload: Partial<ApiJob>) => Promise<ApiJob>
  archiveJob: (id: string) => Promise<void>
}

const JobsContext = createContext<JobsContextValue | null>(null)

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs]       = useState<ApiJob[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await get<ApiJobsResponse>('/api/v1/jobs?page=1&page_size=100')
      setJobs(data.items)
      setTotal(data.total)
      setError(null)
    } catch {
      setError('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const createJob = useCallback(async (payload: Partial<ApiJob>) => {
    const created = await post<ApiJob>('/api/v1/jobs', payload)
    setJobs(prev => [created, ...prev])
    setTotal(prev => prev + 1)
    return created
  }, [])

  const updateJob = useCallback(async (id: string, payload: Partial<ApiJob>) => {
    const updated = await patch<ApiJob>(`/api/v1/jobs/${id}`, payload)
    setJobs(prev => prev.map(j => j.id === id ? updated : j))
    return updated
  }, [])

  const archiveJob = useCallback(async (id: string) => {
    await patch(`/api/v1/jobs/${id}`, { status: 'closed' })
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'closed' as const } : j))
  }, [])

  return (
    <JobsContext.Provider value={{ jobs, total, loading, error, refresh, createJob, updateJob, archiveJob }}>
      {children}
    </JobsContext.Provider>
  )
}

export function useJobsContext() {
  const ctx = useContext(JobsContext)
  if (!ctx) throw new Error('useJobsContext must be used inside <JobsProvider>')
  return ctx
}
