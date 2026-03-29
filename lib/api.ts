import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'

export const TOKEN_KEY = 'access_token'
export const REFRESH_KEY = 'refresh_token'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export const tokenStorage = {
  getAccess: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  getRefresh: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null,
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
    document.cookie = `${TOKEN_KEY}=${access}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`
  },
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccess()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clear()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

const get = <T = unknown>(url: string, config?: AxiosRequestConfig) =>
  api.get<T>(url, config).then((r) => r.data)

const post = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.post<T>(url, data, config).then((r) => r.data)

const patch = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.patch<T>(url, data, config).then((r) => r.data)

const put = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.put<T>(url, data, config).then((r) => r.data)

const del = <T = unknown>(url: string, config?: AxiosRequestConfig) =>
  api.delete<T>(url, config).then((r) => r.data)

export { get, post, patch, put, del as delete }
export default api
