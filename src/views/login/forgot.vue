<template>
  <div class="fixed inset-0 bg-white w-full h-full overflow-hidden select-none">
    <img src="@/assets/images/bg.png" class="fixed top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 w-[30vw] object-contain z-0" alt="背景" />
    <div class="fixed h-full top-0 bottom-0 right-[12vw] flex flex-col">
      <div class="relative bg-[rgba(80,70,70,0.7)] rounded-xl p-[2em] shadow-lg text-white w-[450px] max-w-[90vw] my-auto">
        <div class="absolute top-4 left-4 z-10">
          <a href="/login" class="flex items-center gap-2 text-gray-200 hover:text-white text-base">
            <img src="@/assets/svgs/return.svg" alt="返回图标" />
            返回登录
          </a>
        </div>
        <div class="text-center mb-6">
          <div class="font-bold text-[24px] text-white m-0">找回密码</div>
          <p class="text-gray-300 text-[12px]">通过学校邮箱重置密码</p>
        </div>

        <el-form class="space-y-4">
          <!-- 邮箱输入 + 发送验证码 -->
          <el-form-item>
            <div class="flex gap-2 w-full">
              <input
                v-model="form.username"
                type="email"
                placeholder="请输入学校邮箱"
                :disabled="codeSent"
                class="flex-1 h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none disabled:opacity-60"
              />
              <button
                type="button"
                @click="sendCode"
                :disabled="countdown > 0"
                class="h-12 px-4 rounded-lg bg-blue-700 text-white font-bold whitespace-nowrap cursor-pointer hover:bg-[#4672F4] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
              </button>
            </div>
          </el-form-item>

          <!-- 验证码 -->
          <el-form-item>
            <input
              v-model="form.code"
              type="text"
              placeholder="请输入验证码"
              maxlength="6"
              class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"
            />
          </el-form-item>

          <!-- 新密码 -->
          <el-form-item>
            <input
              v-model="form.newPassword"
              type="password"
              placeholder="请输入新密码（字母+数字，不少于8位）"
              class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"
            />
          </el-form-item>

          <!-- 确认密码 -->
          <el-form-item>
            <input
              v-model="form.confirmPassword"
              type="password"
              placeholder="再次输入新密码"
              class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"
            />
          </el-form-item>

          <el-form-item>
            <button
              type="button"
              @click="handleResetPassword"
              :disabled="submitting"
              class="h-12 w-full flex flex-row items-center justify-center bg-blue-700 font-bold text-xl tracking-[0.1em] text-white rounded-lg transition cursor-pointer hover:bg-[#4672F4] active:scale-95 disabled:opacity-60"
            >
              {{ submitting ? '重置中...' : '重置密码' }}
            </button>
          </el-form-item>
        </el-form>

        <div class="text-center mt-4 text-sm text-white/60 font-normal">
          版本号：<span>1.0.0</span>
        </div>
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
