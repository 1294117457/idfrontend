// idfrontend/src/utils/http.ts
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { refreshToken } from '@/api/components/apiLogin'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_API,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(apiClient(config));
    }
  });
  failedQueue = [];
};

// ✅ 优化：提取清除 token 的逻辑
const clearTokensAndRedirect = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  // ✅ 清除用户信息（如果需要）
  // const userStore = useUserStore()
  // userStore.clearAll()
  
  ElMessage.error('登录已过期，请重新登录')
  setTimeout(() => {
    window.location.href = '/login'
  }, 1000)
}

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const code = response.data?.code
    
    // ✅ 401: Refresh Token无效，必须重新登录
    if (code === 401) {
      console.log('收到401状态码，清除token并跳转登录')
      clearTokensAndRedirect()
      const error: any = new Error('登录信息已过期，请重新登录')
      error.response = { status: 401, data: response.data, config: response.config }
      return Promise.reject(error)
    }
    
    // ✅ 403: Access Token过期，尝试刷新
    if (code === 403) {
      console.log('收到403状态码，准备刷新token')
      const error: any = new Error('Access Token过期')
      error.response = { status: 403, data: response.data, config: response.config }
      return Promise.reject(error)
    }
    
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // ✅ 401: Refresh Token无效，直接重新登录
    if (error.response?.status === 401 || (error.response?.data as any)?.code === 401) {
      console.log('HTTP 401或业务401，直接跳转登录')
      clearTokensAndRedirect()
      return Promise.reject(error)
    }

    // ✅ 403: Access Token过期，尝试刷新
    const isTokenExpired = error.response?.status === 403 || (error.response?.data as any)?.code === 403

    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      // 防重复刷新
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshTokenValue = localStorage.getItem('refreshToken')
        if (!refreshTokenValue) {
          throw new Error('没有 refresh token')
        }

        console.log('开始刷新token...')
        const newTokens = await refreshToken(refreshTokenValue)
        
        // ✅ 更新本地存储
        localStorage.setItem('accessToken', newTokens.accessToken)
        localStorage.setItem('refreshToken', newTokens.refreshToken)
        
        // ✅ 更新原请求的token
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
        
        console.log('token刷新成功，重新发送请求')
        processQueue();
        isRefreshing = false;
        
        // ✅ 重新发送原请求
        return apiClient(originalRequest)
        
      } catch (refreshError) {
        console.error('Token 刷新失败:', refreshError)
        
        processQueue(refreshError);
        isRefreshing = false;
        
        // ✅ 刷新失败，清除token并跳转登录
        clearTokensAndRedirect()
        
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient;