import apiClient from '@/utils/http'
const apiBaseUrl = import.meta.env.VITE_BASE_API

// ========== 用户基本信息相关 ==========

/** 用户基本信息 */
export interface UserBasicInfo {
  userId: number
  username: string
  email: string
  phone?: string
  avatar?: string        // ✅ 头像（存储 fileId）
  nickname?: string
  role: string
  status: string
}

/** 学生基本信息 */
export interface StudentBasicInfo {
  studentId: string
  studentEmail: string
  fullName: string
  enrollmentYear: number
  graduationYear?: number
  major: string
  gpa?: number
  academicScore: number
  specialtyScore: number
  comprehensiveScore: number
  isConfirmed: boolean
  demandValue?: string
  demandFiles?: string
}

/** 用户信息更新参数 */
export interface UserBasicInfoUpdate {
  nickname?: string
  avatar?: string        // ✅ 头像（fileId字符串）
  phone?: string
}

/** ✅ 头像上传返回 */
export interface AvatarUploadResult {
  fileId: number         // 文件ID
  originalName: string
  fileSizeFormatted: string
}

/** 通用响应 */
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

// ========== API 方法 ==========

// ✅ 获取用户基本信息
export const getUserBasicInfo = async (): Promise<ApiResponse<UserBasicInfo>> => {
  const response = await apiClient.get('/api/userinfo/getUserBasicInfo')
  return response.data
}

// ✅ 获取学生信息
export const getStudentBasicInfo = async (): Promise<ApiResponse<StudentBasicInfo>> => {
  const response = await apiClient.get('/api/userinfo/getStudentBasicInfo')
  return response.data
}

// ✅ 更新用户基本信息（昵称、头像、手机号）
export const updateUserBasicInfo = async (updateData: UserBasicInfoUpdate): Promise<ApiResponse<string>> => {
  const response = await apiClient.put('/api/userinfo/updateUserBasicInfo', updateData)
  return response.data
}

// ✅ 上传头像（专用接口）
export const uploadAvatar = async (file: File): Promise<ApiResponse<AvatarUploadResult>> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post(`${apiBaseUrl}/api/file/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

// ✅ 获取头像预览URL（通过 fileId）
export const getAvatarPreviewUrl = async (
  fileId: number, 
  expiryMinutes: number = 60
): Promise<ApiResponse<string>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  return response.data
}

// 发送验证码
export interface EmailItem {
  status: string
  validMinutes: number
}

export const sendEmailCode = async (email: string): Promise<ApiResponse<EmailItem>> => {
  const response = await apiClient.post('/api/userinfo/sendEmailCode', { email })
  return response.data
}

// 绑定学生信息
export interface StudentItem {
  email: string
  code: string
  fullName: string
  major: string
  enrollmentYear: number
  graduationYear: number
}

export interface BindItem {
  status: string
  studentId: string
}

export const bindStudentInfo = async (studentData: StudentItem): Promise<ApiResponse<BindItem>> => {
  const response = await apiClient.post('/api/userinfo/bindStudentInfo', studentData)
  return response.data
}

// 查询用户完整信息
export interface UserInfoItem {
  userId: number
  username: string
  phone?: string
  email: string
  studentId: string
  studentEmail: string
  fullName: string
  enrollmentYear: number
  graduationYear: number
  major: string
  gpa?: number
  academicScore: number
  specialtyScore: number
  comprehensiveScore: number
  isConfirmed: boolean
  demandValue?: string
  demandFiles?: string
}

export const getUserInfo = async (): Promise<ApiResponse<UserInfoItem>> => {
  const response = await apiClient.get('/api/userinfo/getUserInfo')
  return response.data
}

// 更新学生信息(需要验证码)
export interface UpdateStudentItem {
  email: string
  code: string
  fullName: string
  major: string
}

export const updateStudentInfo = async (updateData: UpdateStudentItem): Promise<ApiResponse<string>> => {
  const response = await apiClient.put('/api/userinfo/updateStudentInfo', updateData)
  return response.data
}

// ✅ 学生确认信息
export const confirmStudentInfo = async (): Promise<ApiResponse<string>> => {
  const response = await apiClient.post('/api/userinfo/confirmStudentInfo')
  return response.data
}