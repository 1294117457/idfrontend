import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { STORAGE_KEYS } from '@common/constants/storage'
import type { TokenResponse } from '@/api/types'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_API,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
  config: InternalAxiosRequestConfig
}> = []

const processQueue = (error: any = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error)
    } else {
      resolve(apiClient(config))
    }
  })
  failedQueue = []
}

const clearTokensAndRedirect = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)

  ElMessage.error('登录已过期，请重新登录')
  setTimeout(() => {
    window.location.href = '/login'
  }, 1000)
}

/**
 * Refresh token using raw axios to avoid interceptor loops.
 * Imported inline to break the circular dependency with api modules.
 */
const doRefreshToken = async (token: string): Promise<TokenResponse> => {
  const response = await axios.post<{
    code: number
    msg: string
    data: TokenResponse
  }>(
    `${import.meta.env.VITE_BASE_API}/api/authserver/refresh`,
    { refreshToken: token },
    { headers: { 'Content-Type': 'application/json' } },
  )

  if (response.data.code !== 200) {
    throw new Error(response.data.msg || '刷新失败')
  }

  return response.data.data
}

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => {
    const code = response.data?.code

    if (code === 401) {
      clearTokensAndRedirect()
      const error: any = new Error('登录信息已过期，请重新登录')
      error.response = { status: 401, data: response.data, config: response.config }
      return Promise.reject(error)
    }

    if (code === 403) {
      const error: any = new Error('Access Token过期')
      error.response = { status: 403, data: response.data, config: response.config }
      return Promise.reject(error)
    }

    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 || (error.response?.data as any)?.code === 401) {
      clearTokensAndRedirect()
      return Promise.reject(error)
    }

    const isTokenExpired =
      error.response?.status === 403 || (error.response?.data as any)?.code === 403

    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        if (!refreshTokenValue) {
          throw new Error('没有 refresh token')
        }

        const newTokens = await doRefreshToken(refreshTokenValue)

        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newTokens.accessToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refreshToken)

        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`

        processQueue()
        isRefreshing = false

        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        isRefreshing = false

        clearTokensAndRedirect()

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
