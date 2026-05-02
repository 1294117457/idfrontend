import apiClient from '@/utils/http'

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
  username: string  // 即学校邮箱
  fullName?: string
  phone?: string
  avatar?: string
  role: string
  status: string
}

/** 用户信息更新参数 */
export interface UserBasicInfoUpdate {
  avatar?: string
  phone?: string
}

// ✅ 用户 API（对应后端 /api/user/*）

/**
 * 获取用户基本信息
 */
export const getUserBasicInfo = async (): Promise<ApiResponse<UserBasicInfo>> => {
  return await apiClient.get('/api/user/profile')
}

/**
 * 更新用户基本信息（昵称、头像、手机号）
 */
export const updateUserBasicInfo = async (updateData: UserBasicInfoUpdate): Promise<ApiResponse<string>> => {
  return await apiClient.put('/api/user/profile', updateData)
}

/**
 * 上传头像，返回直接访问的公开 URL
 */
export const uploadAvatar = async (file: File): Promise<ApiResponse<string>> => {
  const formData = new FormData()
  formData.append('file', file)

  return await apiClient.post('/api/file/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 获取头像预览URL（兼容旧版 fileId 模式，新版使用直链不需要此接口）
 */
export const getAvatarPreviewUrl = async (
  fileId: number,
  expiryMinutes: number = 60
): Promise<ApiResponse<string>> => {
  return await apiClient.get(`/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
}

// ========== 学生信息相关（业务功能）==========

/** 学生基本信息 */
export interface StudentBasicInfo {
  studentId: string       // 学号
  enrollmentYear: number  // 入学年份
  fullName: string
  major: string
  grade: number               // 年级（1-5：大一到大五）
  graduationYear?: number
  gpa?: number
  academicScore: number
  specialtyScore: number
  comprehensiveScore: number
  isConfirmed: boolean
  demandValue?: string
  demandFiles?: string
}

/** 学生信息绑定参数 */
export interface StudentItem {
  fullName: string
  major: string
  grade?: number
  graduationYear?: number
  enrollmentYear?: number
  email?: string
  code?: string
}

/** 学生信息更新参数 */
export interface UpdateStudentItem {
  fullName?: string
  major?: string
  grade?: number
  graduationYear?: number
  enrollmentYear?: number
  email?: string
  code?: string
}

/** 绑定返回 */
export interface BindItem {
  status: string
  userId: number
}

// ✅ 学生 API（对应后端 /api/user/student/*）

/**
 * 绑定学生信息（无需验证码，注册时已通过学校邮箱验证）
 */
export const bindStudentInfo = async (studentData: StudentItem): Promise<ApiResponse<BindItem>> => {
  return await apiClient.post('/api/user/student/bind', studentData)
}

/**
 * 获取学生基本信息
 */
export const getStudentBasicInfo = async (): Promise<ApiResponse<StudentBasicInfo>> => {
  return await apiClient.get('/api/user/student/info')
}

/**
 * 更新学生信息
 */
export const updateStudentInfo = async (updateData: UpdateStudentItem): Promise<ApiResponse<string>> => {
  return await apiClient.put('/api/user/student/info', updateData)
}

/**
 * 确认学生信息
 */
export const confirmStudentInfo = async (): Promise<ApiResponse<string>> => {
  return await apiClient.post('/api/user/student/confirm')
}

/**
 * 发送学生邮箱验证码
 */
export const sendEmailCode = async (email: string): Promise<ApiResponse<string>> => {
  return await apiClient.post('/api/user/student/sendEmailCode', { email })
}

// ========== 完整用户信息（包含学生信息）==========

/** 用户完整信息 */
export interface UserInfoItem {
  // 用户信息
  userId: number
  username: string  // 即学校邮箱
  phone?: string
  avatar?: string
  email?: string            // 邮箱
  studentEmail?: string     // 学生邮箱

  // 学生信息
  studentId?: string
  enrollmentYear?: number   // 入学年份
  fullName?: string
  major?: string
  grade?: number
  graduationYear?: number
  gpa?: number
  academicScore?: number
  specialtyScore?: number
  comprehensiveScore?: number
  isConfirmed?: boolean
  demandValue?: string
  demandFiles?: string

  // 评优信息
  foreignLanguageLevel?: string
  disciplinaryViolations?: number
  failedCourses?: number
  specialSkillsRemark?: string
  recommendationStatus?: string
}

/**
 * 获取用户完整信息（包含学生信息）
 */
export const getUserInfo = async (): Promise<ApiResponse<UserInfoItem>> => {
  return await apiClient.get('/api/user/complete-info')
}