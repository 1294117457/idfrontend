import apiClient from '@/utils/http'

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

export interface FieldConfig {
  id: number
  fieldKey: string
  displayName: string
  fieldType: 'SCORE' | 'DEMAND'
  maxScore?: number
  sortOrder: number
}

export const getScoreFieldConfigs = async (): Promise<ApiResponse<FieldConfig[]>> => {
  return await apiClient.get('/api/field-config/list', { params: { type: 'SCORE' } })
}
