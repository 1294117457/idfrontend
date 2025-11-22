import apiClient from '@/utils/http'

export const getAvailableTemplates = async () => {
  const response = await apiClient.get('/api/student-bonus/templates')
  return response.data
}

export const getTemplateDetail = async (templateId: string) => {
  const response = await apiClient.get(`/api/student-bonus/template/${templateId}`)
  return response.data
}

// ✅ 提交申请 DTO (包含学生信息)
export interface SubmitBonusApplicationDto {
  // ✅ 学生信息
  studentId: string                 // 学号
  studentName: string               // 姓名
  major: string                     // 专业
  enrollmentYear: number            // 入学年份
  
  // ✅ 模板和规则信息
  templateName: string              // 模板名称
  scoreType: number                 // 分类: 0学术/1综合/2学业
  calculatedScore: number           // 前端计算好的分数
  ruleValues: Record<string, any>   // 规则填写值
  reviewCount: number               // 审核人数
  
  // 可选信息
  remark?: string                   // 备注
}

export const submitBonusApplication = async (data: SubmitBonusApplicationDto, files: File[]) => {
  const formData = new FormData()
  
  formData.append('data', new Blob([JSON.stringify(data)], { 
    type: 'application/json' 
  }))
  
  files.forEach(file => {
    formData.append('files', file)
  })
  
  const response = await apiClient.post('/api/student-bonus/submit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  return response.data
}

export const getMyRecords = async () => {
  const response = await apiClient.get('/api/student-bonus/my-records')
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