<template>
  <div class="fixed top-0 left-0 right-0 h-[3rem] bg-white shadow-md flex items-center px-6">
    <h1 class="text-2xl font-bold pl-[7rem] dark:text-white">保研加分材料系统</h1>
    <div class="ml-auto flex items-center gap-4">
      <el-dropdown @command="handleCommand" class="cursor-pointer">
        <!-- ✅ 头像 - 使用预览URL -->
        <div class="flex items-center text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-300 transition outline-none gap-1">
          <el-avatar 
            :size="32" 
            :src="userAvatarUrl || defaultAvatar"
            class="border border-gray-200"
          >
            <el-icon :size="20"><User /></el-icon>
          </el-avatar>
          <span class="text-[1.5rem]">{{ userStore.userInfo?.nickname || '游客' }}</span>
        </div>
        
        <!-- 账户名称 -->
        <template #dropdown>
          <el-dropdown-menu class="select-none">
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              修改账户信息
            </el-dropdown-item>
            <el-dropdown-item command="logout">
              <el-icon><Logout /></el-icon>
              注销
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import router from '@/router'
import { useUserStore } from '@/stores/profile'
import { getAvatarPreviewUrl } from '@/api/components/apiProfile'
import defaultAvatar from '@/assets/images/avatar.png'

const userStore = useUserStore()

// ✅ 用户头像 URL
const userAvatarUrl = ref('')

// ✅ 加载用户头像
const loadUserAvatar = async () => {
  const avatar = userStore.userInfo?.avatar
  if (!avatar) {
    userAvatarUrl.value = ''
    return
  }
  
  // ✅ 解析 avatar（可能是数字ID或字符串）
  const avatarId = parseInt(avatar)
  if (!isNaN(avatarId) && avatarId > 0) {
    try {
      const response = await getAvatarPreviewUrl(avatarId, 60)  // 60分钟有效期
      if (response.code === 200) {
        userAvatarUrl.value = response.data  // ✅ 临时预览URL
        console.log('✅ 头像URL加载成功:', userAvatarUrl.value)
      }
    } catch (e) {
      console.error('❌ 获取头像预览失败:', e)
      userAvatarUrl.value = ''
    }
  }
}

// ✅ 监听 userInfo.avatar 变化
watch(
  () => userStore.userInfo?.avatar,
  (newAvatar) => {
    console.log('✅ 头像ID变化:', newAvatar)
    loadUserAvatar()
  }
)

// ✅ 组件挂载时加载
onMounted(async () => {
  console.log('✅ TopNave 挂载，开始加载用户信息')
  
  // 如果 userInfo 为空，先加载用户信息
  if (!userStore.userInfo) {
    await userStore.fetchUserBasicInfo()
  }
  
  // 加载头像
  await loadUserAvatar()
})

const handleCommand = (command: string) => {
  if (command === 'profile') {
    router.push('/home/profile')
  } else if (command === 'logout') {
    logout()
  }
}

const logout = () => {
  userStore.clearAll()
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('theme')
  ElMessage.success('已注销')
  router.push('/login')
}
</script>