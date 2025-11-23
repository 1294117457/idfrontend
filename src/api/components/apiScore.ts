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

export const getMyRecords = async (studentId: string) => {
  const response = await apiClient.get('/api/student-bonus/my-records', {
    params: { studentId }  // ✅ 使用查询参数
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
/**
 * ✅ 获取文件预览URL
 */
export const getFilePreviewUrl = async (fileUrl: string) => {
  const response = await apiClient.get('/api/student-bonus/file/preview', {
    params: { fileUrl }
  })
  return response.data  // ✅ 返回完整响应数据
}


/**
 * ✅ 获取文件URL (预览/下载统一接口)
 * @param fileUrl 文件URL
 * @param type 0=预览, 1=下载
 */
export const getFileUrl = async (fileUrl: string, type: number = 0) => {
  const response = await apiClient.get('/api/student-bonus/file/url', {
    params: { fileUrl, type }
  })
  return response.data
}

/**
 * ✅ 批量获取文件URL
 */
export const getFileUrls = async (fileUrls: string[]) => {
  const response = await apiClient.post('/api/student-bonus/files/urls', {
    fileUrls
  })
  return response.data
}