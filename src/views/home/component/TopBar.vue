<template>
  <header
    class="topbar"
    :class="{ 'is-scrolled': isScrolled }"
  >
    <div class="topbar-inner">
      <!-- Logo -->
      <div class="topbar-logo">推免助手</div>

      <!-- Navigation Menu -->
      <nav class="nav-wrap">
        <el-menu
          :default-active="activePath || undefined"
          mode="horizontal"
          class="nav-menu"
          :router="false"
        >
          <template v-for="item in sortedMenuRoutes" :key="item.path">
            <el-sub-menu v-if="hasChildren(item)" :index="item.path">
              <template #title>
                <component v-if="item.meta?.icon" :is="item.meta.icon" class="w-5 h-5 inline-block" />
                <span>{{ item.meta?.title || item.path }}</span>
              </template>
              <el-menu-item
                v-for="(sub, subIndex) in getChildren(item)"
                :key="`${item.path}-${sub.path}-${subIndex}`"
                :index="item.path"
                @click="router.push(`/home/${item.path}/${sub.path}`)"
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
      <div class="topbar-user">
        <el-dropdown @command="handleCommand" class="cursor-pointer">
          <div class="user-trigger">
            <el-avatar
              :size="30"
              :src="userStore.avatarUrl || defaultAvatar"
              class="user-avatar"
            >
              <el-icon :size="16"><User /></el-icon>
            </el-avatar>
            <span class="user-name">
              {{ displayName }}
            </span>
          </div>
          <template #dropdown>
            <el-dropdown-menu class="select-none">
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                修改账户信息
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/profile'
import defaultAvatar from '@/assets/images/avatar.png'

const props = defineProps<{
  isScrolled: boolean
}>()

const router = useRouter()
const route = useRoute()
const routeRef = ref(route.path)
const userStore = useUserStore()

const isReady = ref(false)
onMounted(async () => {
  if (!userStore.userInfo) {
    await userStore.fetchUserBasicInfo()
  }
  await loadUserAvatar()
  await nextTick()
  routeRef.value = route.path
  isReady.value = true
})

watch(() => route.path, (path) => {
  routeRef.value = path
})

const activePath = computed(() => {
  const path = routeRef.value
  if (!isReady.value) return ''
  const relative = path.replace('/home/', '')
  const segments = relative.split('/')
  if (segments.length >= 2) {
    return segments[0]
  }
  return relative || 'index'
})

const displayName = computed(() => {
  const fullName = userStore.studentInfo?.fullName || userStore.userInfo?.fullName
  return fullName || userStore.userInfo?.username || ''
})

const loadUserAvatar = async () => {
  await userStore.loadAvatarUrl()
}

watch(() => userStore.userInfo?.avatar, loadUserAvatar)

const homeRoute = router.options.routes.find((r) => r.path === '/home')
const menuRoutes = homeRoute?.children?.filter((r) => !r.redirect && !r.meta?.hidden) || []

const sortedMenuRoutes = computed(() =>
  [...menuRoutes].sort((a, b) => Number(a.meta?.sort ?? Infinity) - Number(b.meta?.sort ?? Infinity))
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

const handleSelect = (path: string) => {
  router.push(path.startsWith('/home/') ? path : `/home/${path}`)
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
/* ==================== TopBar 容器 ==================== */
.topbar {
  --bar-height: 4rem;
  --text-color: rgba(255, 255, 255, 0.9);
  --text-color-hover: #fff;
  --text-color-active: #fff;
  --bar-bg: rgba(15, 23, 42, 0.15);
  --bar-blur: 12px;
  --bar-border: rgba(255, 255, 255, 0.1);
  --bar-shadow: none;
  --logo-size: 1.6rem;

  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--bar-bg);
  backdrop-filter: blur(var(--bar-blur));
  -webkit-backdrop-filter: blur(var(--bar-blur));
  border-bottom: 1px solid var(--bar-border);
  box-shadow: var(--bar-shadow);
  transition: background 0.35s ease,
              backdrop-filter 0.35s ease,
              border-color 0.35s ease,
              box-shadow 0.35s ease;
}

.topbar.is-scrolled {
  --bar-height: 3.2rem;
  --bar-bg: rgba(15, 23, 42, 0.55);
  --bar-blur: 20px;
  --bar-border: rgba(255, 255, 255, 0.08);
  --bar-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  --logo-size: 1.3rem;
}

/* ==================== 内部布局 ==================== */
.topbar-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  padding: 0 1.5rem;
  height: var(--bar-height);
  transition: height 0.35s ease;
}

/* ==================== Logo ==================== */
.topbar-logo {
  flex-shrink: 0;
  font-family: 'ZNtitle', sans-serif;
  font-weight: 700;
  font-size: var(--logo-size);
  letter-spacing: 0.06em;
  color: #fff;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.15);
  transition: font-size 0.35s ease;
}

/* ==================== 用户区 ==================== */
.topbar-user {
  flex-shrink: 0;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  outline: none;
  transition: opacity 0.2s;
}

.user-trigger:hover {
  opacity: 0.85;
}

.user-avatar {
  border: 2px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: border-color 0.25s;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
  transition: color 0.3s;
}

/* ==================== 导航菜单 ==================== */
.nav-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.nav-wrap::-webkit-scrollbar {
  display: none;
}

.nav-menu {
  --el-menu-bg-color: transparent;
  --el-menu-border-color: transparent;
  --el-menu-hover-bg-color: transparent;
  background: transparent;
  border: none;
  min-width: max-content;
}

.nav-menu :deep(.el-menu.el-menu--horizontal),
.nav-menu :deep(.el-menu) {
  border: none !important;
  border-bottom: none !important;
}

.nav-menu :deep(.el-menu-item),
.nav-menu :deep(.el-sub-menu) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 0 clamp(10px, 1.6vw, 18px) !important;
}

.nav-menu :deep(.el-menu-item) {
  background-color: transparent !important;
  color: var(--text-color) !important;
  border-bottom: 2px solid transparent !important;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.25s, border-color 0.25s;
  height: 100%;
}

.nav-menu :deep(.el-menu-item:hover) {
  color: var(--text-color-hover) !important;
  border-bottom-color: rgba(255, 255, 255, 0.5) !important;
}

.nav-menu :deep(.el-menu-item.is-active) {
  color: var(--text-color-active) !important;
  border-bottom-color: #fff !important;
  font-weight: 600;
  background-color: transparent !important;
}

.nav-menu :deep(.el-sub-menu__title) {
  background-color: transparent !important;
  color: var(--text-color) !important;
  border-bottom: 2px solid transparent !important;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.25s, border-color 0.25s;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  padding: 0 clamp(10px, 1.6vw, 18px) !important;
  width: 100% !important;
}

.nav-menu :deep(.el-sub-menu__title:hover) {
  color: var(--text-color-hover) !important;
}

.nav-menu :deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: var(--text-color-active) !important;
  border-bottom-color: #fff !important;
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

/* 下拉弹层 */
.nav-menu :deep(.el-menu--popup) {
  background-color: rgba(255, 255, 255, 0.96) !important;
  backdrop-filter: blur(16px);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12);
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
  color: #2563eb !important;
}

.nav-menu :deep(.el-menu--popup .el-menu-item.is-active) {
  background-color: #eff6ff !important;
  color: #2563eb !important;
  font-weight: 600;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .topbar-inner {
    padding-inline: 0.85rem;
    gap: 0.5rem;
  }

  .nav-wrap {
    justify-content: flex-start;
  }

  .user-name {
    display: none;
  }

  .nav-menu :deep(.el-menu-item),
  .nav-menu :deep(.el-sub-menu__title) {
    font-size: 0.82rem;
    height: 2.5rem;
  }
}
</style>
