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
  return await apiClient.get('/api/field-config/list', { params: { type: 'SCORE' } })
}
