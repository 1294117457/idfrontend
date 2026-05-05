import apiClient from '@/utils/http'

const apiBaseUrl = import.meta.env.VITE_BASE_API

/** ???? */
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

/** AI ?????? */
export interface AnalyzeSuggestion {
  templateId: number
  templateName: string
  ruleId: number
  ruleName: string
  estimatedScore: number
  reason: string
}

/** ?????? */
export interface AnalyzeCertificateResult {
  certificateText: string
  suggestions: AnalyzeSuggestion[]
}

/** ?????? */
export interface GenerateApplicationResult {
  templateName: string
  templateType: string
  scoreType: number
  applyScore: number
  ruleId: number
  remark: string
}

/** ???? */
export const sendMessage = async (message: string): Promise<ApiResponse<string>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/chat/send`, { message }, { timeout: 120000 })
  return response.data
}

/**
 * ???????SSE?
 * ?? AbortController??? .abort() ?????
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
        onError('????')
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
          const data = line.slice(5).trim()
          if (data === '[DONE]') { onDone(); return }
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) onToken(parsed.token)
            if (parsed.error) { onError(parsed.error); return }
          } catch { /* ??? JSON ? */ }
        }
      }
      onDone()
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      onError('??????????')
    }
  }

  run()
  return controller
}

/** ?????? */
export const clearConversation = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/chat/clear`)
  return response.data
}

/** ?? PDF ????? AI ???? */
export const analyzeCertificate = async (file: File): Promise<ApiResponse<AnalyzeCertificateResult>> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post(`${apiBaseUrl}/api/ai/analyze/certificate`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return response.data
}

/** ??????????????????? */
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

// ????????????????????????????????????????????????????????????
// Agent?LangGraph???
// ????????????????????????????????????????????????????????????

/** SSE ???? */
export interface AgentSSEEvent {
  type: 'token' | 'interrupt' | 'result' | 'error' | 'session' | 'context_limit'
  data: any
}

/** Agent ???? */
export interface AgentResult {
  interrupted?: boolean
  question?: string
  reply: string
  intent: string
  documentText?: string
  suggestions?: any[]
  sessionId?: string
}

/** Agent ????? */
export interface AgentStreamCallbacks {
  onToken?: (content: string) => void
  onInterrupt?: (question: string, extra?: { suggestions?: any[]; requireFiles?: boolean }) => void
  onContextLimit?: (message: string) => void
  onResult?: (result: AgentResult) => void
  onSession?: (sessionId: string) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/** ?? SSE ?????? */
async function consumeSSE(response: Response, callbacks?: AgentStreamCallbacks) {
  if (!response.ok || !response.body) {
    callbacks?.onError?.(`????: ${response.status}`)
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
          case 'token':         callbacks?.onToken?.(event.data.content); break
          case 'interrupt':     callbacks?.onInterrupt?.(event.data.question, event.data); break
          case 'context_limit': callbacks?.onContextLimit?.(event.data.message); break
          case 'result':        callbacks?.onResult?.(event.data); break
          case 'session':       callbacks?.onSession?.(event.data.sessionId); break
          case 'error':         callbacks?.onError?.(event.data.message); break
        }
      } catch { /* skip malformed */ }
    }
  }
  callbacks?.onDone?.()
}

/**
 * Agent ?????SSE?
 * ?? AbortController ???
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

  fetch(`${apiBaseUrl}/api/ai/agent/stream`, {
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

/** Agent interrupt ????? SSE? */
export function agentResumeStream(
  sessionId: string, supplement: string, callbacks?: AgentStreamCallbacks,
): AbortController {
  const controller = new AbortController()
  const token = localStorage.getItem('accessToken') || ''

  fetch(`${apiBaseUrl}/api/ai/agent/resume-stream`, {
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

// ─────────────────────────────────────────────────────────────────
// 会话持久化 API（会话数据存储在 idagent SQLite）
// ─────────────────────────────────────────────────────────────────

/** 会话元数据 */
export interface ConversationMeta {
  id: number
  user_id: string
  session_id: string
  title: string
  status: number
  is_deleted: number
  created_at: string
  updated_at: string
  message_count: number
  last_message: string | null
}

/** 消息记录 */
export interface MessageRecord {
  id: number
  session_id: string
  role: 'user' | 'assistant' | 'interrupt'
  content: string
  msg_type: string
  extra_data: string | null
  created_at: string
}

/** 获取会话列表 */
export const getConversationsApi = async (limit = 50, offset = 0): Promise<ApiResponse<{ list: ConversationMeta[]; total: number }>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/ai/conversation/list?limit=${limit}&offset=${offset}`)
  return response.data
}

/** 搜索会话 */
export const searchConversationsApi = async (keyword: string): Promise<ApiResponse<ConversationMeta[]>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/ai/conversation/search?keyword=${encodeURIComponent(keyword)}`)
  return response.data
}

/** 创建新会话（返回 sessionId） */
export const createConversationApi = async (firstMessage = ''): Promise<ApiResponse<{ id: number; sessionId: string; title: string }>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/ai/conversation/create`, { firstMessage })
  return response.data
}

/** 获取指定会话详情 */
export const getConversationApi = async (sessionId: string): Promise<ApiResponse<ConversationMeta>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/ai/conversation/${encodeURIComponent(sessionId)}`)
  return response.data
}

/** 获取指定会话的消息列表 */
export const getMessagesApi = async (sessionId: string): Promise<ApiResponse<MessageRecord[]>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/ai/conversation/${encodeURIComponent(sessionId)}/messages`)
  return response.data
}

/** 更新会话标题 */
export const updateConversationTitleApi = async (sessionId: string, title: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.put(`${apiBaseUrl}/api/ai/conversation/${encodeURIComponent(sessionId)}/title`, { title })
  return response.data
}

/** 归档会话 */
export const archiveConversationApi = async (sessionId: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.post(`${apiBaseUrl}/api/ai/conversation/${encodeURIComponent(sessionId)}/archive`)
  return response.data
}

/** 删除会话 */
export const deleteConversationApi = async (sessionId: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete(`${apiBaseUrl}/api/ai/conversation/${encodeURIComponent(sessionId)}`)
  return response.data
}

/** 清空会话消息（保留会话） */
export const clearMessagesApi = async (sessionId: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete(`${apiBaseUrl}/api/ai/conversation/${encodeURIComponent(sessionId)}/messages`)
  return response.data
}
