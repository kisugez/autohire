export type NodeType = 'trigger' | 'condition' | 'action' | 'delay' | 'ai_task'

export type AutomationStatus = 'active' | 'paused' | 'draft' | 'error'

export interface AutomationNode {
  id: string
  type: NodeType
  label: string
  description?: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

export interface AutomationEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface Automation {
  id: string
  name: string
  description?: string
  status: AutomationStatus
  nodes: AutomationNode[]
  edges: AutomationEdge[]
  triggerCount: number
  lastTriggered?: string
  createdAt: string
  updatedAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  category: 'outreach' | 'followup' | 'interview' | 'offer' | 'rejection'
  createdAt: string
}

export interface EmailSequence {
  id: string
  name: string
  templateIds: string[]
  delayDays: number[]
  status: 'active' | 'paused'
  candidateCount: number
  openRate: number
  replyRate: number
}

export interface OutreachMessage {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  sequenceId?: string
  templateId?: string
  subject: string
  status: 'scheduled' | 'sent' | 'opened' | 'replied' | 'bounced'
  scheduledAt?: string
  sentAt?: string
  openedAt?: string
  repliedAt?: string
}
