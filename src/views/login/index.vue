<script setup lang="ts">
import UI1 from './component/ui1.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  type LoginDto,
  type CaptchaResponse,
  loginPost,
  getCaptcha,
} from '@/api/components/apiLogin'
import { useUserStore } from '@/stores/profile'
import { STORAGE_KEYS } from '@common/constants/storage'

const userStore = useUserStore()
const router = useRouter()

const captchaUrl = ref('')
const captchaData = ref<CaptchaResponse | null>(null)
const isLoggingIn = ref(false)

const refreshCaptcha = async () => {
  try {
    captchaData.value = await getCaptcha()
    loginBody.value.captchaId = captchaData.value.captchaId
    captchaUrl.value = captchaData.value.base64
  } catch (error) {
    console.error('获取验证码失败:', error)
    ElMessage.error('获取验证码失败，请重试')
  }
}

const loginBody = ref<LoginDto>({
  username: '',
  password: '',
  verifyCode: '',
  captchaId: '',
})

const validate = (): boolean => {
  if (!loginBody.value.username) {
    ElMessage.error('请输入用户名')
    return false
  }
  if (!loginBody.value.password) {
    ElMessage.error('请输入密码')
    return false
  }
  if (!loginBody.value.verifyCode) {
    ElMessage.error('请输入验证码')
    return false
  }
  return true
}

const submitLogin = async () => {
  if (isLoggingIn.value) return
  if (!validate()) return
  isLoggingIn.value = true
  try {
    const res = await loginPost(loginBody.value)
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, res.data.accessToken)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, res.data.refreshToken)
    const success = await userStore.fetchUserBasicInfo()
    await router.push('/home')
    if (!success) {
      ElMessage.warning('请绑定学生信息')
    }
  } catch {
    // interceptor already showed error toast
  } finally {
    isLoggingIn.value = false
    refreshCaptcha()
  }
}

const handleRegister = () => {
  router.push('/register')
}

const forgotPassword = () => {
  router.push('/forgot')
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<template>
  <div class="login-page">
    <UI1 />

    <!-- 左侧品牌区 -->
    <div class="login-brand">
      <h1 class="brand-title">推免材料处理平台</h1>
      <p class="brand-subtitle">高效管理保研材料，助力推免之路</p>
    </div>

    <!-- 右侧登录卡片 -->
    <div class="login-card-wrap">
      <div class="login-card">
        <h2 class="card-title">欢迎登录</h2>
        <p class="card-desc">统一身份认证</p>

        <div class="tab-content">
          <form class="login-form" @submit.prevent="submitLogin">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input v-model="loginBody.username" type="text" placeholder="请输入用户名" autofocus class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <input v-model="loginBody.password" type="password" placeholder="请输入密码" class="form-input" autocomplete="current-password" />
            </div>
            <div class="form-group">
              <label class="form-label">验证码</label>
              <div class="captcha-row">
                <input v-model="loginBody.verifyCode" type="text" placeholder="请输入验证码" class="form-input" />
                <img :src="captchaUrl" alt="验证码" class="captcha-img" @click="refreshCaptcha" title="点击刷新" />
              </div>
            </div>
            <button type="submit" :disabled="isLoggingIn" class="submit-btn">
              {{ isLoggingIn ? '登录中...' : '登 录' }}
            </button>
          </form>
          <div class="form-footer">
            <span @click="handleRegister()">注册账号</span>
            <span @click="forgotPassword">忘记密码</span>
          </div>
        </div>

        <div class="card-version">v1.0.0</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, rgba(15,23,42,0.35) 0%, rgba(30,58,138,0.25) 50%, rgba(15,23,42,0.4) 100%),
              url('@/assets/images/bg2.jpg') center/cover no-repeat;
  position: relative;
  overflow: hidden;
}

.login-brand {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  position: relative;
  z-index: 1;
}

.brand-title {
  font-family: 'ZNtitle', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 12px rgba(0,0,0,0.3);
}

.brand-subtitle {
  color: rgba(255,255,255,0.8);
  font-size: 1rem;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 8px rgba(0,0,0,0.2);
}

.login-card-wrap {
  flex: 0 0 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  z-index: 2;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  padding: 2.5rem 2rem;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem;
}

.card-desc {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0 0 1.5rem;
}

.tab-content {
  min-height: 280px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: #1e293b;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
}

.form-input::placeholder {
  color: #cbd5e1;
}

.captcha-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.captcha-row .form-input {
  flex: 1;
}

.captcha-img {
  height: 44px;
  width: 120px;
  border-radius: 10px;
  cursor: pointer;
  object-fit: cover;
  border: 1.5px solid #e2e8f0;
  flex-shrink: 0;
}

.submit-btn {
  width: 100%;
  height: 46px;
  margin-top: 0.5rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.25s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #64748b;
}

.form-footer span {
  cursor: pointer;
  transition: color 0.2s;
}

.form-footer span:hover {
  color: #4f46e5;
}

.card-version {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: #cbd5e1;
}

@media (max-width: 900px) {
  .login-page {
    flex-direction: column;
  }
  .login-brand {
    padding: 2rem 1.5rem 1rem;
  }
  .login-card-wrap {
    flex: none;
    padding: 0 1.5rem 2rem;
  }
}
</style>
