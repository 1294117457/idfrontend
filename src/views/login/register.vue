<script setup lang="ts">
import UI1 from './component/ui1.vue'
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { sentEmailCode, type RegisterItem, regesterRequest } from '@/api/components/apiLogin'
const router = useRouter()
const step = ref(1)
const codeInputs = ref(['', '', '', '', '', ''])
const countdown = ref(600)
const sending = ref(false)
let timer: number | null = null

const formData = ref({
  username: '',
  password: '',
  passwordSecond: '',
  verifyCode: '',
  captchaId: '',
  code: ''
})

const apiBaseUrl = import.meta.env.VITE_BASE_API;
const captchaUrl = ref('')

const refreshCaptcha = async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/authserver/captcha/generate`)
    formData.value.captchaId = response.data.captchaId;
    captchaUrl.value = response.data.base64
  } catch (error) {
    console.error('获取验证码失败', error)
  }
}

const nextStep = async () => {
  if (!formData.value.username || !formData.value.username.endsWith('xmu.edu.cn')) {
    ElMessage.error('请输入有效的学校邮箱（以 xmu.edu.cn 结尾）');
    return;
  }

  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  if (!formData.value.password || !passwordRegex.test(formData.value.password)) {
    ElMessage.error('密码必须是数字和字母的组合，且不少于8位');
    return;
  }

  if (formData.value.password !== formData.value.passwordSecond) {
    ElMessage.error('两次输入的密码不一致');
    return;
  }

  if (!formData.value.verifyCode) {
    ElMessage.error('请输入图形验证码');
    return;
  }

  try {
    const response = await sentEmailCode(formData.value.username);
    if (response.code !== 200) {
      ElMessage.error(response.msg || '发送验证码失败，请重试');
      refreshCaptcha();
      return;
    }
    ElMessage.success('验证码已发送至邮箱，请检查');
    step.value = 2;
    startCountdown();
  } catch (e) {
    console.error('发送验证码失败', e);
    ElMessage.error('发送失败，请检查网络重试');
  }
};

const handleKeydown = (e: KeyboardEvent, i: number) => {
  if (e.key === 'Backspace' && !codeInputs.value[i] && i > 0) {
    nextTick(() => {
      const prevInput = document.querySelector(`[data-code-input="${i - 1}"]`) as HTMLInputElement
      prevInput?.focus()
    })
  }
}

const handleInput = (i: number) => {
  codeInputs.value[i] = codeInputs.value[i].replace(/[^0-9]/g, '')
  if (codeInputs.value[i].length === 1 && i < 5) {
    nextTick(() => {
      const nextInput = document.querySelector(`[data-code-input="${i + 1}"]`) as HTMLInputElement
      nextInput?.focus()
    })
  }
  if (codeInputs.value.join('').length === 6) {
    verifyCodeStep()
  }
}

const startCountdown = () => {
  sending.value = true
  countdown.value = 600
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      sending.value = false
      clearInterval(timer!)
    }
  }, 1000)
}

const resendCode = async () => {
  startCountdown()
  try {
    const response = await sentEmailCode(formData.value.username);
    if (response.code !== 200) {
      ElMessage.error(response.msg || '发送验证码失败，请重试');
      return;
    }
    ElMessage.success('验证码已重新发送至邮箱，请检查');
  } catch (e) {
    console.error('发送验证码失败', e);
    ElMessage.error('发送失败，请检查网络重试');
  }
}

const verifyCodeStep = async () => {
  const code = codeInputs.value.join('')
  if (code.length !== 6) {
    ElMessage.error('请输入完整的验证码')
    return
  }

  const registerData: RegisterItem = {
    username: formData.value.username,
    password: formData.value.password,
    code: code
  }

  try {
    const response = await regesterRequest(registerData);
    if (response.code === 200) {
      ElMessage.success('注册成功，请登录')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } else {
      ElMessage.error(response.msg || '注册失败')
    }
  } catch (error) {
    console.error('注册请求失败', error)
    ElMessage.error('注册失败，请稍后重试')
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<template>
  <div class="auth-page">
    <UI1 />
    <div class="auth-center">
      <div class="auth-card">
        <a href="/login" class="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          返回登录
        </a>

        <h2 class="card-title">注册账号</h2>
        <p class="card-desc">请按照步骤完成注册</p>

        <!-- Step Indicator -->
        <div class="step-bar">
          <div :class="['step-dot', step >= 1 && 'active']">1</div>
          <div class="step-line" :class="{ active: step >= 2 }"></div>
          <div :class="['step-dot', step >= 2 && 'active']">2</div>
        </div>

        <!-- Step 1 -->
        <form v-if="step === 1" class="auth-form" @submit.prevent="nextStep">
          <div class="form-group">
            <label class="form-label">学校邮箱</label>
            <input v-model="formData.username" type="email" placeholder="xxx@stu.xmu.edu.cn" autofocus class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input v-model="formData.password" type="password" placeholder="字母+数字，不少于8位" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">确认密码</label>
            <input v-model="formData.passwordSecond" type="password" placeholder="再次输入密码" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">图形验证码</label>
            <div class="captcha-row">
              <input v-model="formData.verifyCode" type="text" placeholder="请输入验证码" class="form-input" />
              <img :src="captchaUrl" alt="验证码" class="captcha-img" @click="refreshCaptcha" title="点击刷新" />
            </div>
          </div>
          <button type="submit" class="submit-btn">下一步</button>
        </form>

        <!-- Step 2 -->
        <form v-if="step === 2" class="auth-form" @submit.prevent="verifyCodeStep">
          <p class="code-sent-tip">验证码已发送至 <strong>{{ formData.username }}</strong></p>
          <div class="code-inputs">
            <input
              v-for="(v, i) in codeInputs"
              :key="i"
              v-model="codeInputs[i]"
              maxlength="1"
              type="text"
              :data-code-input="i"
              class="code-box"
              @input="handleInput(i)"
              @keydown="handleKeydown($event, i)"
            />
          </div>
          <button type="button" class="resend-btn" :disabled="sending" @click="resendCode">
            重新发送验证码<span v-if="sending"> ({{ countdown }}s)</span>
          </button>
          <button type="submit" class="submit-btn">验证并注册</button>
        </form>

        <div class="card-version">v1.0.0</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f1f5f9 100%);
  position: relative;
  overflow: hidden;
}

.auth-center {
  position: relative;
  z-index: 2;
  padding: 2rem;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 24px;
  padding: 2.5rem 2rem;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 20px 40px -4px rgba(79, 70, 229, 0.08);
  position: relative;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  text-decoration: none;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #4f46e5;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem;
}

.card-desc {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0 0 1.25rem;
}

.step-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 1.5rem;
}

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  border: 2px solid #e2e8f0;
  color: #94a3b8;
  background: #fff;
  transition: all 0.3s;
}

.step-dot.active {
  border-color: #4f46e5;
  background: #4f46e5;
  color: #fff;
}

.step-line {
  width: 60px;
  height: 2px;
  background: #e2e8f0;
  transition: background 0.3s;
}

.step-line.active {
  background: #4f46e5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
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
  margin-top: 0.25rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.25s ease;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
}

.submit-btn:active {
  transform: scale(0.98);
}

.code-sent-tip {
  text-align: center;
  color: #475569;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.code-sent-tip strong {
  color: #4f46e5;
}

.code-inputs {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.code-box {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.code-box:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
}

.resend-btn {
  background: none;
  border: none;
  color: #4f46e5;
  cursor: pointer;
  font-size: 0.85rem;
  text-align: center;
}

.resend-btn:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.card-version {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: #cbd5e1;
}
</style>
