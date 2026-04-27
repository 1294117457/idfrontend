import apiClient from '@/utils/http'
import axios from 'axios'
import { STORAGE_KEYS } from '@common/constants/storage'

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
  return await apiClient.get('/api/bonus-template/list')
}

/**
 * ✅ 获取模板详情
 */
export const getTemplateDetail = async (templateId: string) => {
  return await apiClient.get(`/api/bonus-template/${templateId}`)
}

// ==================== ✅ 申请相关接口 ====================

/**
 * ✅ 提交加分申请
 */
export const submitBonusApplication = async (data: SubmitBonusApplicationDto) => {
  return await apiClient.post('/api/application/submit', data, {
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * ✅ 查询我的申请记录
 */
export const getMyRecords = async () => {
  return await apiClient.get('/api/application/my-records')
}

/**
 * 撤销申请（后端已禁止，保留兼容）
 */
export const cancelBonusRecord = async (recordId: number) => {
  return await apiClient.delete(`/api/application/cancel/${recordId}`)
}

/**
 * 学生重新提交被驳回或已撤销的申请
 */
export const resubmitApplication = async (recordId: number) => {
  return await apiClient.post(`/api/application/resubmit/${recordId}`)
}

/**
 * 学生重新提交被驳回的证明材料
 */
export const resubmitProof = async (
  proofId: number,
  data: { proofFileId: number; proofValue: number; remark?: string }
) => {
  return await apiClient.put(`/api/proof/${proofId}/resubmit`, data)
}

/**
 * ✅ 计算学生总分
 */
export const calculateScore = async () => {
  return await apiClient.get('/api/student/calculate-score')
}

// ==================== ✅ 证明材料相关接口 ====================

/**
 * ✅ 获取申请的所有证明材料
 */
export const getApplicationProofs = async (applicationId: number) => {
  return await apiClient.get(`/api/proof/list/${applicationId}`)
}

/**
 * ✅ 审核证明材料 - 通过
 */
export const approveProof = async (proofId: number, comment?: string) => {
  return await apiClient.post(`/api/proof/${proofId}/approve`, null, {
    params: { comment }
  })
}

/**
 * ✅ 审核证明材料 - 驳回
 */
export const rejectProof = async (proofId: number, comment?: string) => {
  return await apiClient.post(`/api/proof/${proofId}/reject`, null, {
    params: { comment }
  })
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

  const res = await apiClient.post('/api/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  return {
    fileId: res.data.fileId,
    fileName: res.data.originalName
  }
}

/**
 * ✅ 根据 fileId 获取预览 URL
 */
export const getFilePreviewById = async (fileId: number, expiryMinutes: number = 60) => {
  const res = await apiClient.get(`/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  return res.data
}

/**
 * ✅ 下载文件
 */
export const downloadFileById = async (fileId: number, fileName: string) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const response = await axios.get(`${apiBaseUrl}/api/file/download/${fileId}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
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
  return await apiClient.get('/api/file/preview-by-name', {
    params: { 
      objectName: fileUrl,
      expiryMinutes: 60
    }
  })
}

export const getFilePreviewUrl = async (fileUrl: string) => {
  return await apiClient.get('/api/file/preview-by-name', {
    params: { 
      objectName: fileUrl,
      expiryMinutes: 60
    }
  })
}