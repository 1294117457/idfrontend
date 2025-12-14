import apiClient from '@/utils/http'
const apiBaseUrl = import.meta.env.VITE_BASE_API

// ========== 通用响应 ==========
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

// ========== 用户信息相关（基础认证）==========

/** 用户基本信息 */
export interface UserBasicInfo {
  userId: number
  username: string
  email: string
  phone?: string
  avatar?: string
  nickname?: string
  role: string
  status: string
}

/** 用户信息更新参数 */
export interface UserBasicInfoUpdate {
  nickname?: string
  avatar?: string
  phone?: string
}

/** 头像上传返回 */
export interface AvatarUploadResult {
  fileId: number
  originalName: string
  fileSizeFormatted: string
}

// ✅ 用户 API（对应后端 /api/user/*）

/**
 * 获取用户基本信息
 */
export const getUserBasicInfo = async (): Promise<ApiResponse<UserBasicInfo>> => {
  const response = await apiClient.get('/api/user/profile')
  return response.data
}

/**
 * 更新用户基本信息（昵称、头像、手机号）
 */
export const updateUserBasicInfo = async (updateData: UserBasicInfoUpdate): Promise<ApiResponse<string>> => {
  const response = await apiClient.put('/api/user/profile', updateData)
  return response.data
}

/**
 * 上传头像
 */
export const uploadAvatar = async (file: File): Promise<ApiResponse<AvatarUploadResult>> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post(`${apiBaseUrl}/api/file/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

/**
 * 获取头像预览URL
 */
export const getAvatarPreviewUrl = async (
  fileId: number, 
  expiryMinutes: number = 60
): Promise<ApiResponse<string>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  return response.data
}

// ========== 学生信息相关（业务功能）==========

/** 学生基本信息 */
export interface StudentBasicInfo {
  studentId: string
  studentEmail: string
  fullName: string
  major: string
  grade: number               // ✅ 年级（1-4：大一到大四）
  graduationYear?: number
  gpa?: number
  academicScore: number
  specialtyScore: number
  comprehensiveScore: number
  isConfirmed: boolean
  demandValue?: string
  demandFiles?: string
}

/** 学生信息绑定/更新参数 */
export interface StudentItem {
  email: string
  code: string
  fullName: string
  major: string
  grade: number               // ✅ 改为年级
  graduationYear: number
}

/** 学生信息更新参数（需要验证码）*/
export interface UpdateStudentItem {
  email: string
  code: string
  fullName: string
  major: string
  grade?: number              // ✅ 添加年级
  graduationYear?: number
}

/** 绑定返回 */
export interface BindItem {
  status: string
  studentId: string
}

// ✅ 学生 API（对应后端 /api/student/*）

/**
 * 发送学生邮箱验证码
 */
export const sendEmailCode = async (email: string): Promise<ApiResponse<{ status: string; validMinutes: number }>> => {
  const response = await apiClient.post('/api/student/send-code', { email })
  return response.data
}

/**
 * 绑定学生信息
 */
export const bindStudentInfo = async (studentData: StudentItem): Promise<ApiResponse<BindItem>> => {
  const response = await apiClient.post('/api/student/bind', studentData)
  return response.data
}

/**
 * 获取学生基本信息
 */
export const getStudentBasicInfo = async (): Promise<ApiResponse<StudentBasicInfo>> => {
  const response = await apiClient.get('/api/student/info')
  return response.data
}

/**
 * 更新学生信息（需要验证码）
 */
export const updateStudentInfo = async (updateData: UpdateStudentItem): Promise<ApiResponse<string>> => {
  const response = await apiClient.put('/api/student/info', updateData)
  return response.data
}

/**
 * 确认学生信息
 */
export const confirmStudentInfo = async (): Promise<ApiResponse<string>> => {
  const response = await apiClient.post('/api/student/confirm')
  return response.data
}

// ========== 完整用户信息（包含学生信息）==========

/** 用户完整信息 */
export interface UserInfoItem {
  // 用户信息
  userId: number
  username: string
  phone?: string
  email: string
  
  // 学生信息
  studentId?: string
  studentEmail?: string
  fullName?: string
  major?: string
  grade?: number              // ✅ 年级（1-4）
  graduationYear?: number
  gpa?: number
  academicScore?: number
  specialtyScore?: number
  comprehensiveScore?: number
  isConfirmed?: boolean
  demandValue?: string
  demandFiles?: string
}

/**
 * 获取用户完整信息（包含学生信息）
 */
export const getUserInfo = async (): Promise<ApiResponse<UserInfoItem>> => {
  const response = await apiClient.get('/api/user/complete-info')
  return response.data
}