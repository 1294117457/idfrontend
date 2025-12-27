import apiClient from '@/utils/http'

const apiBaseUrl = import.meta.env.VITE_BASE_API

// ==================== 类型定义 ====================

export interface ProofFileItem {
  fileId: number
  fileName: string
}

export interface ProofItemInput {
  fileId: number
  fileName: string
  proofValue: number
  reviewCount?: number  // ✅ 新增
  remark?: string
}

export interface SubmitBonusApplicationDto {
  studentId: string
  studentName: string
  major: string
  enrollmentYear: number
  templateName: string
  templateType: string
  scoreType: number
  applyScore: number
  applyInput?: number
  ruleId?: number
  reviewCount: number
  proofItems: Array<{
    proofFileId: number
    proofValue: number
    reviewCount?: number  // ✅ 新增
    remark?: string
  }>
  remark?: string
}

// ==================== ✅ 模板相关接口 ====================

/**
 * ✅ 获取所有启用的模板
 */
export const getAvailableTemplates = async () => {
  const response = await apiClient.get('/api/bonus-template/list')
  return response.data
}

/**
 * ✅ 获取模板详情
 */
export const getTemplateDetail = async (templateId: string) => {
  const response = await apiClient.get(`/api/bonus-template/${templateId}`)
  return response.data
}

// ==================== ✅ 申请相关接口 ====================

/**
 * ✅ 提交加分申请
 */
export const submitBonusApplication = async (data: SubmitBonusApplicationDto) => {
  const response = await apiClient.post('/api/application/submit', data, {
    headers: { 'Content-Type': 'application/json' }
  })
  return response.data
}

/**
 * ✅ 查询我的申请记录
 */
export const getMyRecords = async () => {
  const response = await apiClient.get('/api/application/my-records')
  return response.data
}

/**
 * ✅ 撤销申请
 */
export const cancelBonusRecord = async (recordId: number) => {
  const response = await apiClient.delete(`/api/application/cancel/${recordId}`)
  return response.data
}

/**
 * ✅ 计算学生总分
 */
export const calculateScore = async () => {
  const response = await apiClient.get('/api/student/calculate-score')
  return response.data
}

// ==================== ✅ 证明材料相关接口 ====================

/**
 * ✅ 获取申请的所有证明材料
 */
export const getApplicationProofs = async (applicationId: number) => {
  const response = await apiClient.get(`/api/proof/list/${applicationId}`)
  return response.data
}

/**
 * ✅ 审核证明材料 - 通过
 */
export const approveProof = async (proofId: number, comment?: string) => {
  const response = await apiClient.post(`/api/proof/${proofId}/approve`, null, {
    params: { comment }
  })
  return response.data
}

/**
 * ✅ 审核证明材料 - 驳回
 */
export const rejectProof = async (proofId: number, comment?: string) => {
  const response = await apiClient.post(`/api/proof/${proofId}/reject`, null, {
    params: { comment }
  })
  return response.data
}

// ==================== ✅ 文件相关接口 ====================

/**
 * ✅ 上传证明文件
 */
export const uploadProofFile = async (file: File): Promise<{ fileId: number; fileName: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileCategory', 'PROOF')
  formData.append('filePurpose', '加分证明材料')

  const response = await apiClient.post('/api/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  if (response.data.code === 200) {
    return {
      fileId: response.data.data.fileId,
      fileName: response.data.data.originalName
    }
  } else {
    throw new Error(response.data.message || '上传失败')
  }
}

/**
 * ✅ 根据 fileId 获取预览 URL
 */
export const getFilePreviewById = async (fileId: number, expiryMinutes: number = 60) => {
  const response = await apiClient.get(`/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  if (response.data.code === 200) {
    return response.data.data
  } else {
    throw new Error(response.data.message || '获取预览链接失败')
  }
}

/**
 * ✅ 下载文件
 */
export const downloadFileById = async (fileId: number, fileName: string) => {
  const response = await apiClient.get(`/api/file/download/${fileId}`, {
    responseType: 'blob'
  })

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * ✅ 兼容旧接口 - 根据 objectName 获取预览 URL
 */
export const getFileUrl = async (fileUrl: string, type: number = 0) => {
  const response = await apiClient.get('/api/file/preview-by-name', {
    params: { 
      objectName: fileUrl,
      expiryMinutes: 60
    }
  })
  return response.data
}

export const getFilePreviewUrl = async (fileUrl: string) => {
  const response = await apiClient.get('/api/file/preview-by-name', {
    params: { 
      objectName: fileUrl,
      expiryMinutes: 60
    }
  })
  return response.data
}