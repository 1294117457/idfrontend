import apiClient from '@/utils/http'
const apiBaseUrl = import.meta.env.VITE_BASE_API
export interface DemandTemplate {
    id: number
    templateName: string
    conditions?: string[] | null
    description?: string
    sortOrder?: number
    isActive?: number
    createdBy?: string
    createdAt?: string
    updatedAt?: string
  }
  export interface DemandTemplateDto {
    id?: number
    templateName: string
    conditions?: string[]
    description?: string
    sortOrder?: number
    isActive?: number
  }
export interface DemandApplicationItem {
  templateId: number
  templateName: string
  selectedCondition?: string
  inputValue: string
}

export interface DemandApplicationSubmit {
  applications: DemandApplicationItem[]
}

export interface DemandApplicationResponse {
  id: number
  studentId: string
  applications: DemandApplicationItem[]
  submitTime: string
  updatedAt: string
}
/**
 * 获取启用的模板
 */
export const getActiveTemplates = async () => {
  const response = await apiClient.get('/api/userinfo/getDemandTemplates')
  return response.data
}

/**
 * 保存需求申请
 */
export const saveDemandApplication = async (demandData: DemandApplicationItem[], files: File[]) => {
  const formData = new FormData()
  
  formData.append('demandData', JSON.stringify(demandData))
  
  files.forEach(file => {
    formData.append('files', file)
  })
  
  const response = await apiClient.post('/api/userinfo/saveDemandInfo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  return response.data
}
/**
 * 提交/更新申请
 */
export const submitApplication = async (data: DemandApplicationSubmit) => {
  const response = await apiClient.post(`${apiBaseUrl}/api/demand-application/submit`, data)
  return response.data
}

/**
 * 获取我的申请
 */
export const getMyApplication = async () => {
  const response = await apiClient.get(`${apiBaseUrl}/api/demand-application/my`)
  return response.data
}

/**
 * 删除我的申请
 */
export const deleteMyApplication = async () => {
  const response = await apiClient.delete(`${apiBaseUrl}/api/demand-application/my`)
  return response.data
}

/**
 * 获取所有申请（管理端）
 */
export const getAllApplications = async () => {
  const response = await apiClient.get(`${apiBaseUrl}/api/demand-application/all`)
  return response.data
}