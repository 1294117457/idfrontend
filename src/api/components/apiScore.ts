import apiClient from '@/utils/http'
import axios from 'axios'
import { STORAGE_KEYS } from '@common/constants/storage'

const apiBaseUrl = import.meta.env.VITE_BASE_API

// ==================== 类型定义 ==========

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

export interface ProofFileItem {
  fileId: number
  fileName: string
}

export interface ProofItemInput {
  fileId: number
  fileName: string
  proofValue: number
  reviewCount?: number
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
    reviewCount?: number
    remark?: string
  }>
  remark?: string
  // 兼容旧版字段
  calculatedScore?: number
  ruleValues?: Record<string, any>
  proofFiles?: ProofFileItem[]
}

// ==================== 模板相关接口 ====================

export const getAvailableTemplates = async (): Promise<ApiResponse<any[]>> => {
  return await apiClient.get('/api/bonus-template/list')
}

export const getTemplateDetail = async (templateId: string | number): Promise<ApiResponse<any>> => {
  return await apiClient.get(`/api/bonus-template/${templateId}`)
}

// ==================== 申请相关接口 ====================

export const submitBonusApplication = async (data: SubmitBonusApplicationDto): Promise<ApiResponse<any>> => {
  return await apiClient.post('/api/application/submit', data, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const getMyRecords = async (): Promise<ApiResponse<any[]>> => {
  return await apiClient.get('/api/application/my-records')
}

export const cancelBonusRecord = async (recordId: number): Promise<ApiResponse<any>> => {
  return await apiClient.delete(`/api/application/cancel/${recordId}`)
}

export const resubmitApplication = async (recordId: number): Promise<ApiResponse<any>> => {
  return await apiClient.post(`/api/application/resubmit/${recordId}`)
}

export const resubmitProof = async (
  proofId: number,
  data: { proofFileId: number; proofValue: number; remark?: string }
): Promise<ApiResponse<any>> => {
  return await apiClient.put(`/api/proof/${proofId}/resubmit`, data)
}

export const calculateScore = async (): Promise<ApiResponse<any>> => {
  return await apiClient.get('/api/student/calculate-score')
}

// ==================== 证明材料相关接口 ====================

export const getApplicationProofs = async (applicationId: number): Promise<ApiResponse<{ proofs: any[] }>> => {
  return await apiClient.get(`/api/proof/list/${applicationId}`)
}

export const approveProof = async (proofId: number, comment?: string): Promise<ApiResponse<any>> => {
  return await apiClient.post(`/api/proof/${proofId}/approve`, null, {
    params: { comment }
  })
}

export const rejectProof = async (proofId: number, comment?: string): Promise<ApiResponse<any>> => {
  return await apiClient.post(`/api/proof/${proofId}/reject`, null, {
    params: { comment }
  })
}

// ==================== 文件相关接口 ====================

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

export const getFilePreviewById = async (fileId: number, expiryMinutes: number = 60): Promise<ApiResponse<string>> => {
  const res = await apiClient.get(`/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  return res.data
}

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

export const getFileUrl = async (fileUrl: string, type: number = 0): Promise<ApiResponse<string>> => {
  return await apiClient.get('/api/file/preview-by-name', {
    params: {
      objectName: fileUrl,
      expiryMinutes: 60
    }
  })
}

export const getFilePreviewUrl = async (fileUrl: string): Promise<ApiResponse<string>> => {
  return await apiClient.get('/api/file/preview-by-name', {
    params: {
      objectName: fileUrl,
      expiryMinutes: 60
    }
  })
}