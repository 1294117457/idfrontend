import apiClient from '@/utils/http'

const apiBaseUrl = import.meta.env.VITE_BASE_API

/** 通用响应 */
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

/** 发送消息 */
export const sendMessage = async (message: string): Promise<ApiResponse<string>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/chat/send`, { message })
  return response.data
}

/** 清除对话历史 */
export const clearConversation = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/chat/clear`)
  return response.data
}