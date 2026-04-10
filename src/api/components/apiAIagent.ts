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

// ────────────────────────────────────────────────────────────
// 新 Agent（LangGraph）接口
// ────────────────────────────────────────────────────────────

/** SSE 事件类型 */
export interface AgentSSEEvent {
  type: 'token' | 'interrupt' | 'result' | 'error' | 'session'
  data: any
}

/** Agent 返回结果 */
export interface AgentResult {
  interrupted?: boolean
  question?: string
  reply: string
  intent: string
  documentText?: string
  suggestions?: any[]
  sessionId?: string
}

/** Agent 流式回调集 */
export interface AgentStreamCallbacks {
  onToken?: (content: string) => void
  onInterrupt?: (question: string) => void
  onResult?: (result: AgentResult) => void
  onSession?: (sessionId: string) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/** 解析 SSE 流的通用逻辑 */
async function consumeSSE(response: Response, callbacks?: AgentStreamCallbacks) {
  if (!response.ok || !response.body) {
    callbacks?.onError?.(`请求失败: ${response.status}`)
    callbacks?.onDone?.()
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
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.replace(/^data:\s*/, '').trim()
      if (payload === '[DONE]') { callbacks?.onDone?.(); return }
      try {
        const event: AgentSSEEvent = JSON.parse(payload)
        switch (event.type) {
          case 'token':    callbacks?.onToken?.(event.data.content); break
          case 'interrupt': callbacks?.onInterrupt?.(event.data.question); break
          case 'result':   callbacks?.onResult?.(event.data); break
          case 'session':  callbacks?.onSession?.(event.data.sessionId); break
          case 'error':    callbacks?.onError?.(event.data.message); break
        }
      } catch { /* skip malformed */ }
    }
  }
  callbacks?.onDone?.()
}

/**
 * Agent 流式对话（SSE）
 * 返回 AbortController 可中断
 */
export function agentStreamChat(
  message: string, sessionId: string, file?: File, callbacks?: AgentStreamCallbacks,
): AbortController {
  const controller = new AbortController()
  const token = localStorage.getItem('accessToken') || ''
  const formData = new FormData()
  formData.append('message', message)
  formData.append('sessionId', sessionId)
  if (file) formData.append('file', file)

  fetch(`${apiBaseUrl}/api/agent/stream`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal: controller.signal,
  })
    .then(resp => consumeSSE(resp, callbacks))
    .catch(err => {
      if (err.name !== 'AbortError') callbacks?.onError?.(String(err))
      callbacks?.onDone?.()
    })
  return controller
}

/** Agent interrupt 恢复（流式 SSE） */
export function agentResumeStream(
  sessionId: string, supplement: string, callbacks?: AgentStreamCallbacks,
): AbortController {
  const controller = new AbortController()
  const token = localStorage.getItem('accessToken') || ''

  fetch(`${apiBaseUrl}/api/agent/resume-stream`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, supplement }),
    signal: controller.signal,
  })
    .then(resp => consumeSSE(resp, callbacks))
    .catch(err => {
      if (err.name !== 'AbortError') callbacks?.onError?.(String(err))
      callbacks?.onDone?.()
    })
  return controller
}
