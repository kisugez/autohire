import { get, post } from '@/lib/api'

export interface ParsedQuery {
  location: string | null
  job_title: string | null
  experience_min: number | null
  industry: string | null
  skills: string[]
  detected: string[]
}

export interface SourcingRunCreate {
  job_id: string
  platforms: string[]
  criteria: {
    keywords: string
    location?: string
    title?: string
    skills?: string[]
    experience_min?: number
    industry?: string
    limit?: number
  }
}

export interface SourcingRun {
  id: string
  job_id?: string | null
  org_id?: string | null
  platforms?: string[]
  criteria: Record<string, unknown>
  status: 'queued' | 'running' | 'completed' | 'failed'
  candidates_found?: number
  candidates_scored?: number
  created_at: string
  completed_at?: string | null
}

export interface RawExperience {
  title: string
  company: string
  date?: string
}

export interface RawEducation {
  degree: string
  school: string
  date?: string
}

export interface RawSkillSection {
  label: string
  skills: string[]
}

export interface SourcingCandidate {
  id: string
  run_id?: string
  candidate_id?: string
  job_id?: string
  ai_score: number | null
  ai_reasoning: string | null
  outreach_status?: string
  created_at?: string
  candidate: {
    id?: string
    name: string
    email?: string | null
    title?: string | null
    company?: string | null
    location?: string | null
    experience?: number | null
    skills?: string[] | null
    linkedin_url?: string | null
    github_url?: string | null
    source?: string
    raw_profile?: {
      photo_url?: string
      headline?: string
      summary?: string
      education_raw?: string[]
      experience_raw?: string[]
      experiences?: RawExperience[]
      educations?: RawEducation[]
      skill_sections?: RawSkillSection[]
      tags?: string[]
      company_logo?: string
      top_repos?: { name: string; stars: number; language: string; url: string }[]
      [key: string]: unknown
    } | null
  }
}

export const sourcingApi = {
  parseQuery: (query: string) =>
    post<ParsedQuery>('/api/v1/sourcing/parse-query', { query }),

  createRun: (data: SourcingRunCreate) =>
    post<SourcingRun>('/api/v1/sourcing/runs', data),

  getRun: (runId: string) =>
    get<SourcingRun>(`/api/v1/sourcing/runs/${runId}`),

  listRuns: () =>
    get<SourcingRun[]>('/api/v1/sourcing/runs'),

  getResults: (runId: string) =>
    get<SourcingCandidate[]>(`/api/v1/sourcing/runs/${runId}/results`),

  shortlist: (candidateIds: string[], jobId: string) =>
    post<{ created: number; skipped: number }>('/api/v1/sourcing/shortlist', {
      candidate_ids: candidateIds,
      job_id: jobId,
    }),
}
