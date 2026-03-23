'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import api, { post, patch, tokenStorage } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  org_id: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface RegisterPayload {
  org_name: string
  org_slug: string
  name: string
  email: string
  password: string
}

export interface UpdateProfilePayload {
  name?: string
  email?: string
  current_password?: string
  new_password?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setIsLoading(false)
      return
    }
    api
      .get<AuthUser>('/api/v1/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await post<TokenResponse>('/api/v1/auth/login', { email, password })
    tokenStorage.set(data.access_token, data.refresh_token)

    const me = await api.get<AuthUser>('/api/v1/auth/me')
    setUser(me.data)
    router.push('/dashboard')
  }, [router])

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await post<TokenResponse>('/api/v1/auth/register', payload)
    tokenStorage.set(data.access_token, data.refresh_token)
    const me = await api.get<AuthUser>('/api/v1/auth/me')
    setUser(me.data)
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(async () => {
    try {
      await post('/api/v1/auth/logout')
    } finally {
      tokenStorage.clear()
      setUser(null)
      router.push('/login')
    }
  }, [router])

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await patch<AuthUser>('/api/v1/auth/me', payload)
    setUser(updated)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
