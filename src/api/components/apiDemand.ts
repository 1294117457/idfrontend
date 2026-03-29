import apiClient from '@/utils/http'
import type { ProofFileItem } from './apiScore'  // ✅ 导入文件类型

const apiBaseUrl = import.meta.env.VITE_BASE_API

// ========== 类型定义 ==========

export interface DemandTemplate {
  id: number
  templateName: string
  conditions?: string[] | null
  placeholder?: string
  description?: string
  sortOrder?: number
  isActive?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface DemandApplicationItem {
  templateId: number
  templateName: string
  selectedCondition?: string
  inputValue: string
}

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

// ========== API 方法 ==========

/**
 * 获取启用的需求模板
 */
export const getActiveTemplates = async (): Promise<ApiResponse<DemandTemplate[]>> => {
  const response = await apiClient.get('/api/demand-template/active')
  return response.data
}

/**
 * ✅ 保存需求认证（使用 fileId 列表，新格式）
 */
export const saveDemandApplicationWithFileIds = async (
  applications: DemandApplicationItem[],
  files: ProofFileItem[]
): Promise<ApiResponse<any>> => {
  const response = await apiClient.post('/api/demand-application/submit', {
    applications: applications,
    proofFiles: files
  })
  return response.data
}

/**
 * 保存需求认证（旧接口，使用 MultipartFile）
 */
export const saveDemandApplication = async (
  demandData: DemandApplicationItem[],
  files: File[]
): Promise<ApiResponse<any>> => {
  const formData = new FormData()
  formData.append('demandData', JSON.stringify(demandData))
  
  files.forEach(file => {
    formData.append('files', file)
  })
  
  const response = await apiClient.post('/api/userinfo/saveDemandInfo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}