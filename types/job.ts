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

export interface FormField {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'file'
  required: boolean
  enabled: boolean
  placeholder?: string | null
}

export interface JobLinkResponse {
  id: string
  job_id: string
  slug: string
  source: string
  label: string | null
  active: boolean
  click_count: number
  form_schema: FormField[] | null
  created_at: string
}

// ── Backend API shapes ────────────────────────────────────────────
export interface ApiJob {
  id: string
  org_id: string
  title: string
  description: string | null
  department: string | null
  location: string | null
  remote: boolean
  job_type: JobType
  status: JobStatus
  requirements: { skills: string[]; min_experience?: number } | null
  salary_min: number | null
  salary_max: number | null
  hiring_manager: string | null
  min_ai_score: number
  pipeline_stages: string[] | null
  created_at: string
  updated_at: string
}

export interface ApiJobsResponse {
  items: ApiJob[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ApiApplication {
  id: string
  job_id: string
  candidate_id: string
  status: string
  current_stage: string
  ai_score: number | null
  ai_reasoning: string | null
  ai_label: string | null
  job_title: string | null
  created_at: string
  updated_at: string
}
