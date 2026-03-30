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

/**
 * 流式发送消息（SSE）
 * - onToken: 每收到一个 token 回调
 * - onDone:  流结束回调
 * - onError: 出错回调
 * - 返回 AbortController，调用 .abort() 可中断请求
 */
export const sendMessageStream = (
  message: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController => {
  const controller = new AbortController()
  const token = localStorage.getItem('accessToken')

  const run = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        onError('网络异常')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()   // 兼容 "data:x" 和 "data: x"
          if (data === '[DONE]') { onDone(); return }
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) onToken(parsed.token)
            if (parsed.error) { onError(parsed.error); return }
          } catch { /* 忽略非 JSON 行 */ }
        }
      }
      onDone()
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return  // 用户主动取消，不报错
      onError('网络异常，请检查连接')
    }
  }

  run()
  return controller
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
