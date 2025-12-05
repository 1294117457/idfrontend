import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getUserBasicInfo, getStudentBasicInfo, getAvatarPreviewUrl } from '@/api/components/apiProfile'

// ✅ 用户基本信息接口（用于认证）
export interface UserInfo {
  userId: number
  username: string
  email: string
  phone?: string
  avatar?: string          // ✅ 头像 fileId
  nickname?: string
  role: string
  status: string
}

// ✅ 学生信息接口（用于业务）
export interface StudentInfo {
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

export const useUserStore = defineStore('user', () => {
  // ✅ 用户基本信息
  const userInfo = ref<UserInfo | null>(null)
  
  // ✅ 学生信息
  const studentInfo = ref<StudentInfo | null>(null)

  // ✅ 头像 URL 缓存
  const avatarUrl = ref<string>('')
  const avatarUrlExpireTime = ref<number>(0) // 过期时间戳

  // 登录状态
  const isLoggedIn = computed(() => !!userInfo.value)
  const hasToken = computed(() => !!localStorage.getItem('accessToken'))
  const hasStudentInfo = computed(() => !!studentInfo.value?.studentId)

  /**
   * ✅ 获取用户基本信息
   */
  const fetchUserBasicInfo = async (): Promise<boolean> => {
    try {
      const response = await getUserBasicInfo()
      if (response.code === 200) {
        userInfo.value = response.data
        console.log('✅ 用户基本信息获取成功:', response.data)
        
        // ✅ 自动加载头像
        await loadAvatarUrl()
        
        return true
      } else {
        throw new Error(response.msg || '获取用户信息失败')
      }
    } catch (error) {
      console.error('❌ 获取用户信息失败:', error)
      return false
    }
  }

  /**
   * ✅ 获取学生信息
   */
  const fetchStudentInfo = async (): Promise<boolean> => {
    try {
      const response = await getStudentBasicInfo()
      if (response.code === 200) {
        studentInfo.value = response.data
        console.log('✅ 学生信息获取成功:', response.data)
        return true
      } else {
        throw new Error(response.msg || '获取学生信息失败')
      }
    } catch (error) {
      console.error('❌ 获取学生信息失败:', error)
      return false
    }
  }

  /**
   * ✅ 加载头像 URL（带缓存和自动刷新）
   */
  const loadAvatarUrl = async (forceRefresh: boolean = false): Promise<string> => {
    const avatar = userInfo.value?.avatar
    
    // 1. 无头像 fileId
    if (!avatar) {
      avatarUrl.value = ''
      return ''
    }

    // 2. 检查缓存是否有效（提前 5 分钟刷新）
    const now = Date.now()
    const bufferTime = 5 * 60 * 1000 // 5分钟缓冲
    if (!forceRefresh && avatarUrl.value && avatarUrlExpireTime.value > now + bufferTime) {
      console.log('✅ 使用缓存的头像 URL')
      return avatarUrl.value
    }

    // 3. 解析 fileId
    const avatarId = parseInt(avatar)
    if (isNaN(avatarId) || avatarId <= 0) {
      avatarUrl.value = ''
      return ''
    }

    // 4. 请求新的预签名 URL
    try {
      const expiryMinutes = 60 // 60分钟有效期
      const response = await getAvatarPreviewUrl(avatarId, expiryMinutes)
      
      if (response.code === 200) {
        avatarUrl.value = response.data
        avatarUrlExpireTime.value = now + expiryMinutes * 60 * 1000
        console.log('✅ 头像 URL 加载成功，过期时间:', new Date(avatarUrlExpireTime.value))
        return avatarUrl.value
      }
    } catch (error) {
      console.error('❌ 获取头像预览失败:', error)
      avatarUrl.value = ''
    }

    return avatarUrl.value
  }

  /**
   * ✅ 获取所有数据（用户+学生）
   */
  const fetchAllData = async (): Promise<{ user: boolean; student: boolean }> => {
    const userSuccess = await fetchUserBasicInfo()
    const studentSuccess = await fetchStudentInfo()
    return { user: userSuccess, student: studentSuccess }
  }

  /**
   * ✅ 更新用户信息（局部更新）- 用于修改后同步状态
   */
  const updateUserInfo = (partialInfo: Partial<UserInfo>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...partialInfo }
      console.log('✅ Pinia 用户信息已更新:', userInfo.value)
      
      // ✅ 如果头像变更，重新加载 URL
      if (partialInfo.avatar !== undefined) {
        loadAvatarUrl(true) // 强制刷新
      }
    }
  }

  /**
   * ✅ 更新学生信息（局部更新）
   */
  const updateStudentInfo = (partialInfo: Partial<StudentInfo>) => {
    if (studentInfo.value) {
      studentInfo.value = { ...studentInfo.value, ...partialInfo }
    }
  }

  /**
   * ✅ 清除所有数据（登出）
   */
  const clearAll = () => {
    userInfo.value = null
    studentInfo.value = null
    avatarUrl.value = ''
    avatarUrlExpireTime.value = 0
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  return {
    // 状态
    userInfo,
    studentInfo,
    avatarUrl,          // ✅ 导出头像 URL
    isLoggedIn,
    hasToken,
    hasStudentInfo,
    
    // 方法
    fetchUserBasicInfo,
    fetchStudentInfo,
    fetchAllData,
    loadAvatarUrl,      // ✅ 导出加载方法
    updateUserInfo,
    updateStudentInfo,
    clearAll
  }
})