import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '@common/constants/storage'
import {
  getUserBasicInfo,
  getStudentBasicInfo,
  getAvatarPreviewUrl,
  type UserBasicInfo,
  type StudentBasicInfo,
} from '@/api/components/apiProfile'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserBasicInfo | null>(null)
  const studentInfo = ref<StudentBasicInfo | null>(null)

  const avatarUrl = ref<string>('')
  const avatarUrlExpireTime = ref<number>(0)

  const isLoggedIn = computed(() => !!userInfo.value)
  const hasToken = computed(() => !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN))
  const hasStudentInfo = computed(() => !!studentInfo.value?.fullName)

  const fetchUserBasicInfo = async (): Promise<boolean> => {
    try {
      const response = await getUserBasicInfo()
      if (response.code === 200) {
        userInfo.value = response.data
        await loadAvatarUrl()
        return true
      } else {
        throw new Error(response.msg || '获取用户信息失败')
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return false
    }
  }

  const fetchStudentInfo = async (): Promise<boolean> => {
    try {
      const response = await getStudentBasicInfo()
      if (response.code === 200) {
        studentInfo.value = response.data
        return true
      } else {
        throw new Error(response.msg || '获取学生信息失败')
      }
    } catch (error) {
      console.error('获取学生信息失败:', error)
      return false
    }
  }

  const loadAvatarUrl = async (forceRefresh: boolean = false): Promise<string> => {
    const avatar = userInfo.value?.avatar

    if (!avatar) {
      avatarUrl.value = ''
      return ''
    }

    if (avatar.startsWith('http')) {
      avatarUrl.value = avatar
      avatarUrlExpireTime.value = Number.MAX_SAFE_INTEGER
      return avatar
    }

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
      console.error('获取头像预览失败:', error)
      avatarUrl.value = ''
    }

    return avatarUrl.value
  }

  const fetchAllData = async (): Promise<{ user: boolean; student: boolean }> => {
    const userSuccess = await fetchUserBasicInfo()
    const studentSuccess = await fetchStudentInfo()
    return { user: userSuccess, student: studentSuccess }
  }

  const updateUserInfo = (partialInfo: Partial<UserBasicInfo>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...partialInfo }

      if (partialInfo.avatar !== undefined) {
        loadAvatarUrl(true)
      }
    }
  }

  const updateStudentInfo = (partialInfo: Partial<StudentBasicInfo>) => {
    if (studentInfo.value) {
      studentInfo.value = { ...studentInfo.value, ...partialInfo }
    }
  }

  const clearAll = () => {
    userInfo.value = null
    studentInfo.value = null
    avatarUrl.value = ''
    avatarUrlExpireTime.value = 0
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
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
    clearAll,
  }
})
