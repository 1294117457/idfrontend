import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/profile'  // ✅ 导入 useUserStore
import homeRoutes from './home'
import loginRoutes from './login'

const routes = [
  ...loginRoutes,
  homeRoutes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ✅ 全局前置守卫 - 统一处理用户信息获取
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // 公开页面,直接放行
  const publicPages = ['/login', '/register', '/forgot', '/']
  if (publicPages.includes(to.path)) {
    // 如果已登录，访问登录页时跳转到首页
    if (to.path === '/login' && userStore.hasToken) {
      next('/home')
      return
    }
    next()
    return
  }
  
  // 检查是否有 token
  const token = localStorage.getItem('accessToken')
  if (!token) {
    ElMessage.warning('请先登录')
    next('/login')
    return
  }
  
  // ✅ 如果有 token 但没有用户信息,自动从服务器获取
  if (!userStore.userInfo) {
    console.log('🔄 检测到 token,正在获取用户信息...')
    
    try {
      const success = await userStore.fetchUserData()
      
      if (!success) {
        throw new Error('获取用户信息失败')
      }
      
      next()
    } catch (error: any) {
      console.error('❌ 获取用户信息失败:', error)
      
      // 清除无效 token
      userStore.clearAll()
      
      ElMessage.error('登录状态已过期,请重新登录')
      next('/login')
    }
  } else {
    // 已有用户信息,直接放行
    next()
  }
})

export default router