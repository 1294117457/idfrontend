import LoginPage from '@/views/login/index.vue'
import RegisterPage from '@/views/login/register.vue'
import ForgotPasswordPage from '@/views/login/forgot.vue'
/* login相关页面 */
export default [
  { path: '/', component: LoginPage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/forgot', component: ForgotPasswordPage },
]