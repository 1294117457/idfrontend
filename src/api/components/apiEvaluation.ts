import apiClient from '@/utils/http'

// ✅ 提交申请请求 - 添加 gpa
export interface EvaluationApplicationRequest {
  foreignLanguageLevel: string
  disciplinaryViolations: number
  failedCourses: number
  specialSkillsRemark: string
  applicationReason: string
  requiredApprovals?: number  // ✅ 需要几个人审批,默认1
}
// ✅ 单条审批记录
export interface ApprovalRecord {
  reviewerId: number
  reviewerName: string
  reviewComment: string
  reviewAction: string // approved/rejected
  reviewedAt: string
}
// 附件文件信息
export interface AttachmentFile {
  objectName: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

// ✅ 申请详情 - 添加 gpa
export interface EvaluationApplication {
  id: number
  userId: number
  studentId: string
  studentName: string
  foreignLanguageLevel: string
  disciplinaryViolations: number
  failedCourses: number
  specialSkillsRemark: string
  attachmentFiles: AttachmentFile[]
  applicationReason: string
  status: string // pending, in_review, approved, rejected
  requiredApprovals: number          // ✅ 需要的审批次数
  currentApprovals: number           // ✅ 当前已审批次数
  approvalRecords: ApprovalRecord[]  // ✅ 审批记录列表
  createdAt: string
  updatedAt: string
}

// ✅ 提交申请 - 使用 apiClient 支持 token 刷新
export const submitApplication = async (
  data: EvaluationApplicationRequest,
  files: File[]
) => {
  const formData = new FormData()
  
  // 添加JSON数据
  formData.append('data', new Blob([JSON.stringify(data)], { 
    type: 'application/json' 
  }))
  
  // 添加文件
  files.forEach(file => {
    formData.append('files', file)
  })
  
  const response = await apiClient.post<{
    code: number
    msg: string
    data: EvaluationApplication
  }>('/api/evaluation/submit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  return response.data
}

// 查询我的申请列表
export const getMyApplications = async () => {
  const response = await apiClient.get<{
    code: number
    msg: string
    data: EvaluationApplication[]
  }>('/api/evaluation/myApplications')
  
  return response.data
}

// 查询申请详情
export const getApplicationDetail = async (applicationId: number) => {
  const response = await apiClient.get<{
    code: number
    msg: string
    data: EvaluationApplication
  }>(`/api/evaluation/detail/${applicationId}`)
  
  return response.data
}

// 撤销申请
export const cancelApplication = async (applicationId: number) => {
  const response = await apiClient.delete<{
    code: number
    msg: string
    data: string
  }>(`/api/evaluation/cancel/${applicationId}`)
  
  return response.data
}

// 查询最新通过的申请
export const getLatestApprovedApplication = async () => {
  const response = await apiClient.get<{
    code: number
    msg: string
    data: EvaluationApplication
  }>('/api/evaluation/latestApproved')
  
  return response.data
}