export type CandidateStage = 
  | 'sourced' 
  | 'screening' 
  | 'interview' 
  | 'offer' 
  | 'hired' 
  | 'rejected'

export type CandidateSource = 
  | 'linkedin' 
  | 'github' 
  | 'referral' 
  | 'website' 
  | 'indeed' 
  | 'other'

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  title: string
  company?: string
  location: string
  skills: string[]
  experience: number // years
  matchScore: number // 0-100
  stage: CandidateStage
  source: CandidateSource
  jobId?: string
  jobTitle?: string
  tags: string[]
  notes?: string
  resumeUrl?: string
  linkedinUrl?: string
  githubUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CandidateActivity {
  id: string
  candidateId: string
  type: 'email' | 'interview' | 'note' | 'stage_change' | 'ai_score'
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface Interview {
  id: string
  candidateId: string
  jobId: string
  scheduledAt: string
  duration: number // minutes
  type: 'phone' | 'video' | 'onsite' | 'technical'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  interviewers: string[]
  notes?: string
  feedback?: string
  rating?: number
}

// ── Backend API shape ─────────────────────────────────────────────
export interface ApiCandidate {
  id: string
  org_id: string
  email: string
  name: string
  phone: string | null
  title: string
  company: string | null
  location: string
  experience: number
  skills: string[]
  source: CandidateSource
  created_at: string
}
