import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { 
  getUserBasicInfo, 
  getStudentBasicInfo, 
  getAvatarPreviewUrl,
  type UserBasicInfo,
  type StudentBasicInfo
} from '@/api/components/apiProfile'

export const useUserStore = defineStore('user', () => {
  // ✅ 用户基本信息
  const userInfo = ref<UserBasicInfo | null>(null)
  
  // ✅ 学生信息
  const studentInfo = ref<StudentBasicInfo | null>(null)

  // ✅ 头像 URL 缓存
  const avatarUrl = ref<string>('')
  const avatarUrlExpireTime = ref<number>(0)

  // 登录状态
  const isLoggedIn = computed(() => !!userInfo.value)
  const hasToken = computed(() => !!localStorage.getItem('accessToken'))
  const hasStudentInfo = computed(() => !!studentInfo.value?.fullName)

  /**
   * ✅ 获取用户基本信息
   */
  const fetchUserBasicInfo = async (): Promise<boolean> => {
    try {
      const response = await getUserBasicInfo()
      if (response.code === 200) {
        userInfo.value = response.data
        console.log('✅ 用户基本信息获取成功:', response.data)
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
   * ✅ 加载头像 URL
   * 新版：avatar 字段存储的是直链 URL（http://...），直接使用；
   * 兼容旧版：若 avatar 是纯数字 fileId，走预签名 URL 流程
   */
  const loadAvatarUrl = async (forceRefresh: boolean = false): Promise<string> => {
    const avatar = userInfo.value?.avatar

    if (!avatar) {
      avatarUrl.value = ''
      return ''
    }

    // 新版：直链 URL，直接使用
    if (avatar.startsWith('http')) {
      avatarUrl.value = avatar
      avatarUrlExpireTime.value = Number.MAX_SAFE_INTEGER
      return avatar
    }

    // 旧版兼容：fileId 数字字符串，走预签名流程
    const now = Date.now()
    const bufferTime = 5 * 60 * 1000
    if (!forceRefresh && avatarUrl.value && avatarUrlExpireTime.value > now + bufferTime) {
      return avatarUrl.value
    }

    const avatarId = parseInt(avatar)
    if (isNaN(avatarId) || avatarId <= 0) {
      avatarUrl.value = ''
      return ''
    }

    try {
      const expiryMinutes = 60
      const response = await getAvatarPreviewUrl(avatarId, expiryMinutes)

      if (response.code === 200) {
        avatarUrl.value = response.data
        avatarUrlExpireTime.value = now + expiryMinutes * 60 * 1000
        return avatarUrl.value
      }
    } catch (error) {
      console.error('❌ 获取头像预览失败:', error)
      avatarUrl.value = ''
    }

    return avatarUrl.value
  }

  /**
   * ✅ 获取所有数据
   */
  const fetchAllData = async (): Promise<{ user: boolean; student: boolean }> => {
    const userSuccess = await fetchUserBasicInfo()
    const studentSuccess = await fetchStudentInfo()
    return { user: userSuccess, student: studentSuccess }
  }

  /**
   * ✅ 更新用户信息
   */
  const updateUserInfo = (partialInfo: Partial<UserBasicInfo>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...partialInfo }
      
      if (partialInfo.avatar !== undefined) {
        loadAvatarUrl(true)
      }
    }
  }

  /**
   * ✅ 更新学生信息
   */
  const updateStudentInfo = (partialInfo: Partial<StudentBasicInfo>) => {
    if (studentInfo.value) {
      studentInfo.value = { ...studentInfo.value, ...partialInfo }
    }
  }

  /**
   * ✅ 清除所有数据
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
    userInfo,
    studentInfo,
    avatarUrl,
    isLoggedIn,
    hasToken,
    hasStudentInfo,
    fetchUserBasicInfo,
    fetchStudentInfo,
    fetchAllData,
    loadAvatarUrl,
    updateUserInfo,
    updateStudentInfo,
    clearAll
  }
})