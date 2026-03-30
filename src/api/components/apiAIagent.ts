import apiClient from '@/utils/http'

const apiBaseUrl = import.meta.env.VITE_BASE_API

/** 通用响应 */
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

/** AI 分析推荐项 */
export interface AnalyzeSuggestion {
  templateId: number
  templateName: string
  ruleId: number
  ruleName: string
  estimatedScore: number
  reason: string
}

/** 证书分析结果 */
export interface AnalyzeCertificateResult {
  certificateText: string
  suggestions: AnalyzeSuggestion[]
}

/** 生成申请预填结果 */
export interface GenerateApplicationResult {
  templateName: string
  templateType: string
  scoreType: number
  applyScore: number
  ruleId: number
  remark: string
}

/** 发送消息 */
export const sendMessage = async (message: string): Promise<ApiResponse<string>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/chat/send`, { message }, { timeout: 120000 })
  return response.data
}

/** 清除对话历史 */
export const clearConversation = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/chat/clear`)
  return response.data
}

/** 上传 PDF 证书，获取加分项推荐 */
export const analyzeCertificate = async (file: File): Promise<ApiResponse<AnalyzeCertificateResult>> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post(`${apiBaseUrl}/api/ai/analyze/certificate`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return response.data
}

/** 根据选定模板和规则，生成申请表单预填数据 */
export const generateApplication = async (
  certificateText: string,
  selectedTemplateId: number,
  selectedRuleId: number,
): Promise<ApiResponse<GenerateApplicationResult>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/ai/analyze/generate`, {
    certificateText,
    selectedTemplateId,
    selectedRuleId,
  }, { timeout: 120000 })
  return response.data
}
