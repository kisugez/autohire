export type JobStatus = 'active' | 'paused' | 'closed' | 'draft'
export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship'

export interface Job {
  id: string
  title: string
  department: string
  location: string
  type: JobType
  status: JobStatus
  description?: string
  requirements?: string[]
  salaryMin?: number
  salaryMax?: number
  candidateCount: number
  interviewCount: number
  hiresCount: number
  createdAt: string
  updatedAt: string
  closingDate?: string
  hiringManager: string
  remote: boolean
}

export interface JobMetrics {
  jobId: string
  sourced: number
  screening: number
  interview: number
  offer: number
  hired: number
  rejected: number
  responseRate: number
  avgTimeToHire: number
}
