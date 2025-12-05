import apiClient from '@/utils/http'

const apiBaseUrl = import.meta.env.VITE_BASE_API

// ==================== 类型定义 ====================

// ✅ 文件信息接口
export interface ProofFileItem {
  fileId: number
  fileName: string
}

// ✅ 提交申请 DTO
export interface SubmitBonusApplicationDto {
  studentId: string
  studentName: string
  major: string
  enrollmentYear: number
  templateName: string
  scoreType: number
  calculatedScore: number
  ruleValues: Record<string, any>
  reviewCount: number
  proofFiles: ProofFileItem[]  // ✅ [{fileId, fileName}] 格式
  remark?: string
}

// ==================== API 方法 ====================

export const getAvailableTemplates = async () => {
  const response = await apiClient.get('/api/student-bonus/templates')
  return response.data
}

export const getTemplateDetail = async (templateId: string) => {
  const response = await apiClient.get(`/api/student-bonus/template/${templateId}`)
  return response.data
}

// ✅ 上传证明文件
export const uploadProofFile = async (file: File): Promise<{ fileId: number; fileName: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileCategory', 'SCORE_PROOF')
  formData.append('filePurpose', '加分申请证明材料')

  const response = await apiClient.post(`${apiBaseUrl}/api/file/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  if (response.data.code === 200) {
    return {
      fileId: response.data.data.fileId,
      fileName: response.data.data.originalName
    }
  } else {
    throw new Error(response.data.msg || '文件上传失败')
  }
}

// ✅ 提交申请
export const submitBonusApplication = async (data: SubmitBonusApplicationDto) => {
  const response = await apiClient.post('/api/student-bonus/submit', data, {
    headers: { 'Content-Type': 'application/json' }
  })
  return response.data
}

// ✅ 根据 fileId 获取预览 URL
export const getFilePreviewById = async (fileId: number, expiryMinutes: number = 60) => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  return response.data
}

// ✅ 根据 fileId 下载文件
export const downloadFileById = async (fileId: number, fileName: string) => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/download/${fileId}`, {
    responseType: 'blob'
  })
  
  const blob = new Blob([response.data])
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// ==================== 其他接口 ====================

export const getMyRecords = async (studentId: string) => {
  const response = await apiClient.get('/api/student-bonus/my-records', {
    params: { studentId }
  })
  return response.data
}

export const calculateScore = async () => {
  const response = await apiClient.get('/api/student-bonus/calculate-score')
  return response.data
}

export const cancelBonusRecord = async (recordId: string) => {
  const response = await apiClient.delete(`/api/student-bonus/cancel/${recordId}`)
  return response.data
}

// ✅ 兼容旧接口（通过 objectName 获取 URL）
export const getFileUrl = async (fileUrl: string, type: number = 0) => {
  const response = await apiClient.get('/api/student-bonus/file/url', {
    params: { fileUrl, type }
  })
  return response.data
}

export const getFilePreviewUrl = async (fileUrl: string) => {
  return getFileUrl(fileUrl, 0)
}