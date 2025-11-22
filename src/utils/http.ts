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

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')  // ✅ 使用驼峰
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log('发送请求:', config.url, 'Token:', token ? 'exists' : 'missing')
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.code === 401) {
      console.log('检测到业务状态码 401,token 已过期')
      const error: any = new Error('Token expired')
      error.response = {
        status: 401,
        data: response.data,
        config: response.config
      }
      return Promise.reject(error)
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    const is401 = error.response?.status === 401 || 
                  (error.response?.data as any)?.code === 401

    console.log('响应错误:', {
      url: originalRequest?.url,
      status: error.response?.status,
      businessCode: (error.response?.data as any)?.code,
      is401,
      isRetried: originalRequest?._retry
    })

    if (is401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        console.log('正在刷新 token,将请求加入队列:', originalRequest.url)
        return new Promise((resolve, reject) => {
          failedQueue.push({ 
            resolve, 
            reject,
            config: originalRequest 
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshTokenValue = localStorage.getItem('refreshToken')  // ✅ 使用驼峰
        if (!refreshTokenValue) {
          throw new Error('没有 refresh token')
        }

        console.log('开始刷新 token...')
        
        // ✅ 刷新 token,返回驼峰命名
        const newTokens = await refreshToken(refreshTokenValue)
        
        console.log('Token 刷新成功')
        
        // ✅ 更新存储的 token (驼峰命名)
        localStorage.setItem('accessToken', newTokens.accessToken)
        localStorage.setItem('refreshToken', newTokens.refreshToken)
        
        // 更新原请求的 token
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
        
        processQueue();
        isRefreshing = false;
        
        console.log('重试原请求:', originalRequest.url)
        return apiClient(originalRequest)
      } catch (refreshError) {
        console.error('Token 刷新失败:', refreshError)
        
        processQueue(refreshError);
        isRefreshing = false;
        
        // ✅ 清除驼峰命名的 token
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        ElMessage.error('登录已过期,请重新登录')
        
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
        
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient;