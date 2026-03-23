'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { get, patch } from '@/lib/api'
import type { ApiJob, ApiJobsResponse, ApiApplication } from '@/types/job'
import type { ApiCandidate } from '@/types/candidate'

export function useActiveRoute() {
  const pathname = usePathname()
  
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }
  
  return { pathname, isActive }
}

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })
  
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(error)
    }
  }
  
  return [storedValue, setValue] as const
}

export function useJobs(page = 1, pageSize = 50) {
  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    get<ApiJobsResponse>(`/api/v1/jobs?page=${page}&page_size=${pageSize}`)
      .then((data) => { setJobs(data.items); setTotal(data.total) })
      .catch(() => setError('Failed to load jobs'))
      .finally(() => setLoading(false))
  }, [page, pageSize])

  return { jobs, total, loading, error }
}

export function useCandidates() {
  const [candidates, setCandidates] = useState<ApiCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    get<ApiCandidate[]>('/api/v1/candidates')
      .then(setCandidates)
      .catch(() => setError('Failed to load candidates'))
      .finally(() => setLoading(false))
  }, [])

  return { candidates, loading, error }
}

export function useApplicationsByJob(jobId: string) {
  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    setLoading(true)
    get<ApiApplication[]>(`/api/v1/applications/job/${jobId}`)
      .then(setApplications)
      .catch(() => setError('Failed to load applications'))
      .finally(() => setLoading(false))
  }, [jobId])

  return { applications, loading, error }
}

// Combined hook: all applications across all jobs (fetches jobs first then their apps)
export function useAllApplications(jobs: ApiJob[]) {
  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jobs.length) return
    setLoading(true)
    Promise.all(
      jobs.map((j) =>
        get<ApiApplication[]>(`/api/v1/applications/job/${j.id}`).catch(() => [] as ApiApplication[])
      )
    )
      .then((results) => setApplications(results.flat()))
      .finally(() => setLoading(false))
  }, [jobs])

  return { applications, loading }
}

export interface AnalyticsFunnel {
  sourced?: number
  screening?: number
  interview?: number
  offer?: number
  hired?: number
  rejected?: number
  [key: string]: number | undefined
}

export interface AnalyticsSources {
  [source: string]: number
}

export interface AnalyticsTimelineEntry {
  date: string
  count: number
}

export interface OrgData {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}

export function useAnalytics() {
  const [funnel, setFunnel]     = useState<AnalyticsFunnel>({})
  const [sources, setSources]   = useState<AnalyticsSources>({})
  const [timeline, setTimeline] = useState<AnalyticsTimelineEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      get<AnalyticsFunnel>('/api/v1/analytics/funnel'),
      get<AnalyticsSources>('/api/v1/analytics/sources'),
      get<AnalyticsTimelineEntry[]>('/api/v1/analytics/timeline?days=30'),
    ])
      .then(([f, s, t]) => { setFunnel(f); setSources(s); setTimeline(t) })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  return { funnel, sources, timeline, loading, error }
}

export function useOrg() {
  const [org, setOrg]         = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    get<OrgData>('/api/v1/organisations/me')
      .then(setOrg)
      .catch(() => setError('Failed to load organisation'))
      .finally(() => setLoading(false))
  }, [])

  const updateOrg = async (payload: Partial<Pick<OrgData, 'name' | 'slug'>>) => {
    const updated = await patch<OrgData>('/api/v1/organisations/me', payload)
    setOrg(updated)
  }

  return { org, loading, error, updateOrg }
}
