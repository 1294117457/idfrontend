<template>
  <header
    class="fixed top-0 left-0 right-0 z-10 transition-all duration-300"
    :class="{ 'shadow-md': isScrolled }"
    :style="headerStyle"
  >
    <div class="mx-auto flex items-center justify-between transition-all duration-300 px-6" :style="{ height: barHeight }">
      <!-- Logo -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <div
          class="font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-300"
          :style="{ fontSize: logoSize }"
          style="font-family: 'ZNtitle', sans-serif"
        >
          推免助手
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="flex-1 flex items-center justify-center">
        <el-menu
          :default-active="activePath"
          mode="horizontal"
          class="nav-menu bg-transparent border-none"
          @select="handleSelect"
        >
          <template v-for="item in sortedMenuRoutes" :key="item.path">
            <el-sub-menu v-if="hasChildren(item)" :index="item.path">
              <template #title>
                <component v-if="item.meta?.icon" :is="item.meta.icon" class="w-5 h-5 inline-block" />
                <span>{{ item.meta?.title || item.path }}</span>
              </template>
              <el-menu-item
                v-for="sub in getChildren(item)"
                :key="sub.path"
                :index="`${item.path}/${sub.path}`"
              >
                {{ sub.meta?.title || sub.path }}
              </el-menu-item>
            </el-sub-menu>

            <el-menu-item v-else :index="item.path">
              <component v-if="item.meta?.icon" :is="item.meta.icon" class="w-5 h-5 inline-block" />
              <span>{{ item.meta?.title || item.path }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </nav>

      <!-- User Info -->
      <div class="flex items-center flex-shrink-0">
        <el-dropdown @command="handleCommand" class="cursor-pointer">
          <div class="flex items-center gap-2 outline-none transition-colors hover:opacity-80">
            <el-avatar
              :size="avatarSize"
              :src="userAvatarUrl || defaultAvatar"
              class="border-2 border-white/60"
            >
              <el-icon :size="16"><User /></el-icon>
            </el-avatar>
            <span class="text-sm font-medium transition-all duration-300" :style="{ color: textColor }">
              {{ userStore.userInfo?.fullName || userStore.userInfo?.username }}
            </span>
          </div>
          <template #dropdown>
            <el-dropdown-menu class="select-none">
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                修改账户信息
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><Logout /></el-icon>
                注销
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </header>
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

const headerStyle = computed(() => {
  if (props.isScrolled) {
    return {
      background: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
    }
  }
  return {
    background: 'transparent',
    backdropFilter: 'none',
    borderBottom: '1px solid transparent',
  }
})

const textColor = computed(() => props.isScrolled ? '#334155' : '#fff')
const barHeight = computed(() => props.isScrolled ? '3.5rem' : '4.5rem')
const logoSize = computed(() => props.isScrolled ? '1.4rem' : '1.8rem')
const avatarSize = computed(() => props.isScrolled ? 28 : 32)

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
      console.error('获取头像预览失败:', e)
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

const homeRoute = router.options.routes.find((r) => r.path === '/home')
const menuRoutes = homeRoute?.children?.filter((r) => !r.redirect && !r.meta?.hidden) || []

const sortedMenuRoutes = computed(() =>
  [...menuRoutes].sort((a, b) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))
)

const hasChildren = (item: any) => {
  return item.children && item.children.length > 0
}

const getChildren = (item: any) => {
  if (!item.children) return []
  return item.children
    .filter((child: any) => !child.redirect && !child.meta?.hidden)
    .sort((a: any, b: any) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))
}

watch(
  () => route.path,
  (newPath) => {
    activePath.value = newPath.replace('/home/', '')
  },
  { immediate: true }
)

const handleSelect = (path: string) => {
  router.push(`/home/${path}`)
  activePath.value = path
}

const handleCommand = (command: string) => {
  if (command === 'profile') {
    router.push('/home/profile')
  } else if (command === 'logout') {
    logout()
  }
}

const logout = () => {
  userStore.clearAll()
  ElMessage.success('已注销')
  router.push('/login')
}
</script>

<style scoped>
.nav-menu {
  --el-menu-border-color: transparent;
  --el-menu-hover-bg-color: transparent;
}

.nav-menu :deep(.el-menu.el-menu--horizontal) {
  border-bottom: none !important;
}

.nav-menu :deep(.el-menu) {
  border: none !important;
}

.nav-menu :deep(.el-menu-item),
.nav-menu :deep(.el-sub-menu) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 0 18px !important;
}

.nav-menu :deep(.el-menu-item) {
  background-color: transparent !important;
  color: v-bind(textColor) !important;
  border-bottom: 2px solid transparent !important;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.25s;
  height: 100%;
}

.nav-menu :deep(.el-menu-item:hover) {
  color: #4f46e5 !important;
  border-bottom-color: #c7d2fe !important;
}

.nav-menu :deep(.el-menu-item.is-active) {
  /* color: #4f46e5 !important; */
  border-bottom-color: #4f46e5 !important;
  font-weight: 600;
  background-color: transparent !important;
}

.nav-menu :deep(.el-sub-menu__title) {
  background-color: transparent !important;
  color: v-bind(textColor) !important;
  border-bottom: 2px solid transparent !important;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.25s;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  padding: 0 18px !important;
  width: 100% !important;
}

.nav-menu :deep(.el-sub-menu__title:hover) {
  color: #4f46e5 !important;
}

.nav-menu :deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: #4f46e5 !important;
  border-bottom-color: #4f46e5 !important;
  font-weight: 600;
}

.nav-menu :deep(.el-sub-menu__icon-arrow) {
  display: none !important;
}

.nav-menu :deep(.el-sub-menu__title span),
.nav-menu :deep(.el-menu-item span) {
  white-space: nowrap;
  color: inherit;
}

.nav-menu :deep(.el-menu--popup) {
  background-color: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(12px);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
  padding: 4px;
}

.nav-menu :deep(.el-menu--popup .el-menu-item) {
  color: #334155 !important;
  border-radius: 8px;
  margin: 2px 0;
  border-bottom: none !important;
}

.nav-menu :deep(.el-menu--popup .el-menu-item:hover) {
  background-color: #f1f5f9 !important;
  color: #4f46e5 !important;
}

.nav-menu :deep(.el-menu--popup .el-menu-item.is-active) {
  background-color: #eef2ff !important;
  color: #4f46e5 !important;
  font-weight: 600;
}
.nav-menu {
  --el-menu-bg-color: transparent; /* 【新增这一行】强制覆盖菜单底色为透明 */
  --el-menu-border-color: transparent;
  --el-menu-hover-bg-color: transparent;
}
</style>
