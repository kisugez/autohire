import { get, post, delete as del } from '@/lib/api'

export interface PlatformIntegration {
  id: string
  platform: 'linkedin' | 'indeed' | 'bayt'
  email: string
  connected: boolean
}

export interface ConnectRequest {
  platform: string
  email: string
  password: string
  verification_code?: string
}

export interface PlatformPostStatus {
  platform: string
  /** pending | posting | posted | error | not_connected | unsupported */
  status: string
  external_url?: string | null
  detail?: string | null
}

export const integrationsApi = {
  list: () =>
    get<PlatformIntegration[]>('/api/v1/integrations'),

  verify: (data: { platform: string; email: string; password: string }) =>
    post<{ ok: boolean; detail?: string | null }>(
      '/api/v1/integrations/connect/verify',
      data,
      { timeout: 60_000 }, // Playwright browser login takes 20-30s
    ),

  connect: (data: ConnectRequest) =>
    post<PlatformIntegration>('/api/v1/integrations/connect', data),

  disconnect: (platform: string) =>
    del(`/api/v1/integrations/${platform}`),

  /** Enqueue background posting tasks — returns immediate "posting" status rows */
  publishJob: (jobId: string, platforms: string[]) =>
    post<PlatformPostStatus[]>(`/api/v1/integrations/jobs/${jobId}/publish`, { platforms }),

  /** Poll for real-time posting results */
  getPublishStatus: (jobId: string) =>
    get<PlatformPostStatus[]>(`/api/v1/integrations/jobs/${jobId}/status`),
}
