<template>
  <div 
    class="fixed top-0 left-0 right-0 z-10 transition-all duration-300"
    :class="{ 'shadow-lg': isScrolled }"
    :style="topBarStyle"
  >
    <!-- 使用 Grid 布局 -->
    <div 
      class="grid grid-cols-4 transition-all duration-300"
      :style="{ height: topBarHeight }"
    >
      <!-- 左侧 1/4：TITLEUI -->
      <div class="col-span-1 flex items-center justify-center bg-transparent">
        <div 
          class="font-bold tracking-wide leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          :style="{ fontSize: titleFontSize }"
          style="font-family: 'ZNtitle', sans-serif"
        >
          交互设计
        </div>
      </div>

      <!-- 右侧 3/4：上方为 TopNave，下方为 TopMenu -->
      <div class="col-span-3 flex flex-col bg-transparent">
        <!-- 上方：TopNave -->
        <div 
          class="flex items-center px-6 transition-all duration-300"
          :style="{ height: naveHeight }"
        >
          <h1 
            class="font-bold text-white drop-shadow-lg transition-all duration-300"
            :style="{ fontSize: naveFontSize }"
          >
            保研加分材料系统
          </h1>
          <div class="ml-auto flex items-center gap-4">
            <el-dropdown @command="handleCommand" class="cursor-pointer">
              <div class="flex items-center text-white hover:text-blue-300 transition outline-none gap-1">
                <el-avatar 
                  :size="avatarSize" 
                  :src="userAvatarUrl || defaultAvatar"
                  class="border-2 border-white/50"
                >
                  <el-icon :size="20"><User /></el-icon>
                </el-avatar>
                <span 
                  class="drop-shadow-md transition-all duration-300"
                  :style="{ fontSize: userNameFontSize }"
                >
                  {{ userStore.userInfo?.nickname || '游客' }}
                </span>
              </div>
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

        <!-- 下方：TopMenu -->
        <div 
          class="flex items-center px-6 transition-all duration-300"
          :style="{ height: menuHeight }"
        >
          <el-menu
            :default-active="activePath"
            mode="horizontal"
            class="top-menu w-full bg-transparent border-none"
            @select="handleSelect"
          >
            <!-- ✅ 遍历一级菜单 - 移除固定宽度类 -->
            <template v-for="item in sortedMenuRoutes" :key="item.path">
              <!-- 有子路由 -->
              <el-sub-menu v-if="hasChildren(item)" :index="item.path">
                <template #title>
                  <component v-if="item.meta?.icon" :is="item.meta.icon" class="w-6 h-6 inline-block" />
                  <span class="drop-shadow-md">{{ item.meta?.title || item.path }}</span>
                </template>
                <!-- 二级菜单 -->
                <el-menu-item
                  v-for="sub in getChildren(item)"
                  :key="sub.path"
                  :index="`${item.path}/${sub.path}`"
                >
                  {{ sub.meta?.title || sub.path }}
                </el-menu-item>
              </el-sub-menu>

              <!-- 无子路由 -->
              <el-menu-item v-else :index="item.path">
                <component v-if="item.meta?.icon" :is="item.meta.icon" class="w-6 h-6 inline-block" />
                <span class="drop-shadow-md">{{ item.meta?.title || item.path }}</span>
              </el-menu-item>
            </template>
          </el-menu>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/profile'
import { getAvatarPreviewUrl } from '@/api/components/apiProfile'
import defaultAvatar from '@/assets/images/avatar.png'

const props = defineProps<{
  isScrolled: boolean
}>()

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const userAvatarUrl = ref('')
const activePath = ref(route.path)

// ==================== 动态样式计算 ====================
const topBarStyle = computed(() => {
  if (props.isScrolled) {
    return {
      background: 'linear-gradient(to right, rgba(96, 165, 250, 0.85), rgba(147, 197, 253, 0.85))',
      backdropFilter: 'blur(12px)',
    }
  } else {
    return {
      background: 'transparent',
      backdropFilter: 'none',
    }
  }
})

const topBarHeight = computed(() => props.isScrolled ? '4.5rem' : '6rem')
const naveHeight = computed(() => props.isScrolled ? '2.25rem' : '3rem')
const menuHeight = computed(() => props.isScrolled ? '2.25rem' : '3rem')

const titleFontSize = computed(() => props.isScrolled ? '1.75rem' : '3rem')
const naveFontSize = computed(() => props.isScrolled ? '1.5rem' : '2rem')
const userNameFontSize = computed(() => props.isScrolled ? '1.125rem' : '1.5rem')
const avatarSize = computed(() => props.isScrolled ? 28 : 32)

// ==================== 加载用户头像 ====================
const loadUserAvatar = async () => {
  const avatar = userStore.userInfo?.avatar
  if (!avatar) {
    userAvatarUrl.value = ''
    return
  }
  
  const avatarId = parseInt(avatar)
  if (!isNaN(avatarId) && avatarId > 0) {
    try {
      const response = await getAvatarPreviewUrl(avatarId, 60)
      if (response.code === 200) {
        userAvatarUrl.value = response.data
      }
    } catch (e) {
      console.error('❌ 获取头像预览失败:', e)
      userAvatarUrl.value = ''
    }
  }
}

watch(() => userStore.userInfo?.avatar, loadUserAvatar)

onMounted(async () => {
  if (!userStore.userInfo) {
    await userStore.fetchUserBasicInfo()
  }
  loadUserAvatar()
})

// ==================== ✅ 简化菜单路由处理 ====================
const homeRoute = router.options.routes.find((r) => r.path === '/home')
const menuRoutes = homeRoute?.children?.filter((r) => !r.redirect && !r.meta?.hidden) || []

const sortedMenuRoutes = computed(() =>
  [...menuRoutes].sort((a, b) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))
)

// ✅ 判断是否有子路由
const hasChildren = (item: any) => {
  return item.children && item.children.length > 0
}

// ✅ 获取子路由（已过滤和排序）
const getChildren = (item: any) => {
  if (!item.children) return []
  return item.children
    .filter((child: any) => !child.redirect && !child.meta?.hidden)
    .sort((a: any, b: any) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))
}

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    activePath.value = newPath.replace('/home/', '')
  },
  { immediate: true }
)

// ==================== 选择菜单项 ====================
const handleSelect = (path: string) => {
  router.push(`/home/${path}`)
  activePath.value = path
}

// ==================== 处理下拉菜单命令 ====================
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

<style scoped>
  /* ==================== ✅ 去除下划线和优化样式 ==================== */
  
  /* ✅ 方法1:覆盖 CSS 变量 */
  .top-menu {
    --el-menu-border-color: transparent;
  }
  
  /* ✅ 方法2:更具体的选择器 */
  .top-menu :deep(.el-menu.el-menu--horizontal) {
    border-bottom: none !important;
  }
  
  .top-menu :deep(.el-menu) {
    border: none !important;
  }
  
  .top-menu :deep(.el-menu--horizontal) {
    border-bottom: none !important;
  }
  
  /* ✅ 统一菜单项宽度 - 移除最大宽度限制 */
  .top-menu :deep(.el-menu-item),
  .top-menu :deep(.el-sub-menu) {
    min-width: 120px !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    padding: 0 20px !important;
  }
  
  /* 一级菜单样式 */
  .top-menu :deep(.el-menu-item) {
    background-color: transparent !important;
    color: #fff !important;
    border-bottom: none !important;
    transition: all 0.3s;
  }
  
  .top-menu :deep(.el-menu-item:hover) {
    background-color: rgba(255, 255, 255, 0.1) !important;
    color: #60a5fa !important;
  }
  
  .top-menu :deep(.el-menu-item.is-active) {
    background-color: transparent !important;
    color: #60a5fa !important;
    font-weight: bold;
  }
  
  /* ✅ 一级菜单（有子菜单）样式 */
  .top-menu :deep(.el-sub-menu__title) {
    background-color: transparent !important;
    color: #fff !important;
    border-bottom: none !important;
    transition: all 0.3s;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 0 20px !important;
    width: 100% !important;
    min-height: 48px !important;
  }
  
  .top-menu :deep(.el-sub-menu__title:hover) {
    background-color: rgba(255, 255, 255, 0.1) !important;
    color: #60a5fa !important;
  }
  
  .top-menu :deep(.el-sub-menu.is-active .el-sub-menu__title) {
    color: #60a5fa !important;
    font-weight: bold;
  }
  
  /* ✅ 隐藏下拉箭头 */
  .top-menu :deep(.el-sub-menu__icon-arrow) {
    display: none !important;
  }
  
  /* ✅ 确保图标和文字正常显示 */
  .top-menu :deep(.el-sub-menu__title > *:not(.el-sub-menu__icon-arrow)),
  .top-menu :deep(.el-menu-item > *) {
    flex-shrink: 0;
  }
  
  /* ✅ 文字样式 */
  .top-menu :deep(.el-sub-menu__title span),
  .top-menu :deep(.el-menu-item span) {
    white-space: nowrap;
    color: inherit;
    font-size: inherit;
  }
  
  /* 二级菜单（下拉菜单）样式 */
  .top-menu :deep(.el-menu--popup) {
    background-color: rgba(59, 130, 246, 0.95) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .top-menu :deep(.el-menu--popup .el-menu-item) {
    background-color: transparent !important;
    color: #ffffff !important;
    transition: all 0.3s;
  }
  
  .top-menu :deep(.el-menu--popup .el-menu-item:hover) {
    background-color: rgba(255, 255, 255, 0.2) !important;
    color: #fff !important;
  }
  
  .top-menu :deep(.el-menu--popup .el-menu-item.is-active) {
    background-color: rgba(96, 165, 250, 0.3) !important;
    color: #fff !important;
    font-weight: bold;
  }
</style>