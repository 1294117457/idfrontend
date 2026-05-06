import { createRouter, createWebHistory } from 'vue-router'
import { STORAGE_KEYS } from '@common/constants/storage'
import homeRoutes from './home'
import loginRoutes from './login'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot']

const routes = [...loginRoutes, homeRoutes]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const isPublicRoute = PUBLIC_ROUTES.includes(to.path)

  if (isPublicRoute) {
    if (token && to.path === '/login') {
      return '/home/index'
    }
    return true
  }

  if (!token) {
    return '/login'
  }

  const { useUserStore } = await import('@/stores/user')
  const userStore = useUserStore()
  if (!userStore.userInfo) {
    const success = await userStore.fetchUserBasicInfo()
    if (!success) {
      userStore.clearAll()
      return '/login'
    }
  }

  return true
})

export default router
