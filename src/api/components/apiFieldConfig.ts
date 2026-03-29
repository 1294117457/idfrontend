import apiClient from '@/utils/http'

export interface FieldConfig {
  id: number
  fieldKey: string
  displayName: string
  fieldType: 'SCORE' | 'DEMAND'
  maxScore?: number
  sortOrder: number
}

export const getScoreFieldConfigs = async () => {
  const response = await apiClient.get<{ code: number; msg: string; data: FieldConfig[] }>(
    '/api/field-config/list',
    { params: { type: 'SCORE' } }
  )
  return response.data
}
