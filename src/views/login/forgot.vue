<template>
  <div class="auth-page">
    <div class="auth-center">
      <div class="auth-card">
        <a href="/login" class="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          返回登录
        </a>

        <h2 class="card-title">找回密码</h2>
        <p class="card-desc">通过学校邮箱重置密码</p>

        <form class="auth-form" @submit.prevent="handleResetPassword">
          <div class="form-group">
            <label class="form-label">学校邮箱</label>
            <div class="email-row">
              <input
                v-model="form.username"
                type="email"
                placeholder="请输入学校邮箱"
                :disabled="codeSent"
                class="form-input"
              />
              <button
                type="button"
                @click="sendCode"
                :disabled="countdown > 0"
                class="send-btn"
              >
                {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">验证码</label>
            <input v-model="form.code" type="text" placeholder="请输入验证码" maxlength="6" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">新密码</label>
            <input v-model="form.newPassword" type="password" placeholder="字母+数字，不少于8位" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">确认密码</label>
            <input v-model="form.confirmPassword" type="password" placeholder="再次输入新密码" class="form-input" />
          </div>

          <button type="submit" :disabled="submitting" class="submit-btn">
            {{ submitting ? '重置中...' : '重置密码' }}
          </button>
        </form>

        <div class="card-version">v1.0.0</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { sendResetCode, resetPassword, type ForgotPasswordRequest } from '@/api/components/apiLogin'

const router = useRouter()
const submitting = ref(false)
const codeSent = ref(false)
const countdown = ref(0)

const form = ref<ForgotPasswordRequest>({
  username: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})

const sendCode = async () => {
  if (!form.value.username) {
    ElMessage.error('请输入学校邮箱')
    return
  }
  if (!form.value.username.endsWith('xmu.edu.cn')) {
    ElMessage.error('邮箱必须以 xmu.edu.cn 结尾')
    return
  }

  try {
    const response = await sendResetCode(form.value.username)
    if (response.code === 200) {
      ElMessage.success('验证码已发送，请检查邮箱')
      codeSent.value = true
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) clearInterval(timer)
      }, 1000)
    } else {
      ElMessage.error(response.msg || '发送失败')
    }
  } catch (e) {
    ElMessage.error('发送验证码失败，请稍后重试')
  }
}

const handleResetPassword = async () => {
  if (!form.value.username || !form.value.code || !form.value.newPassword || !form.value.confirmPassword) {
    ElMessage.error('请填写所有字段')
    return
  }
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
  if (!passwordRegex.test(form.value.newPassword)) {
    ElMessage.error('密码必须是数字和字母的组合，且不少于8位')
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    ElMessage.error('两次密码不一致')
    return
  }

  submitting.value = true
  try {
    const response = await resetPassword(form.value)
    if (response.code === 200) {
      ElMessage.success('密码重置成功，请重新登录')
      setTimeout(() => router.push('/login'), 1500)
    } else {
      ElMessage.error(response.msg || '重置失败')
    }
  } catch (e) {
    ElMessage.error('重置失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

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
  margin: 0 0 1.5rem;
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

.form-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
}

.email-row {
  display: flex;
  gap: 0.75rem;
}

.email-row .form-input {
  flex: 1;
}

.send-btn {
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: #4f46e5;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #4338ca;
}

.send-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
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

.card-version {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: #cbd5e1;
}
</style>
