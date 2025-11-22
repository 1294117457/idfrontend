<script setup lang="ts">
import UI1 from './component/ui1.vue'
import TITLEUI from '../home/component/titleUI.vue'
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { sentEmailCode,type RegisterItem,regesterRequest } from '@/api/components/apiLogin'
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
  email: '',
  verifyCode: '',
  captchaId: '',
  code: ''
})
//验证码===================================
const apiBaseUrl = import.meta.env.VITE_BASE_API;
const captchaUrl = ref('')
//刷新验证码
const refreshCaptcha = async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/authserver/captcha/generate`)
    formData.value.captchaId = response.data.captchaId; // 直接设置到 loginBody
    captchaUrl.value =  response.data.base64  // 绑定 Base64
  } catch (error) {
    console.error('获取验证码失败', error)
  }
}
//下一步、表单校验、验证码校验===================================

// 校验输入表单是否正确，再发送邮箱验证码
const nextStep = async () => {
  // 校验用户名：只能字母数字，不能少于6位
  const usernameRegex = /^[a-zA-Z0-9]{6,}$/;
  if (!formData.value.username || !usernameRegex.test(formData.value.username)) {
    ElMessage.error('用户名只能包含字母和数字，且不少于6位');
    return;
  }

  // 校验密码：必须是用户名+数字，不能少于8位（假设密码以用户名开头，后跟数字）
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  if (!formData.value.password || !passwordRegex.test(formData.value.password)) {
    ElMessage.error('密码必须是数字和字母的组合，且不少于8位');
    return;
  }

  // 校验两次输入密码是否相同
  if (formData.value.password !== formData.value.passwordSecond) {
    ElMessage.error('两次输入的密码不一致');
    return;
  }

  // 校验邮箱：符合邮箱规范
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.value.email || !emailRegex.test(formData.value.email)) {
    ElMessage.error('请输入有效的邮箱地址');
    return;
  }

  // 校验验证码：不能为空
  if (!formData.value.verifyCode) {
    ElMessage.error('请输入验证码');
    return;
  }

  // 发送请求给后端，向邮箱发送验证码
  try {
    const response = await sentEmailCode(formData.value.email);
    if (response.code !== 200) {
      ElMessage.error(response.msg || '发送验证码失败，请重试');
      refreshCaptcha(); // 刷新验证码
      return;
    }
    ElMessage.success('验证码已发送至邮箱，请检查');
    step.value = 2; // 进入下一步（输入邮箱验证码）
    startCountdown(); // 开始倒计时（可调整为邮箱验证码倒计时）
  } catch (e) {
    console.error('发送验证码失败', e);
    ElMessage.error('发送失败，请检查网络重试');
  }
};
// 验证码确认与注册===================================
// 处理验证码输入框的键盘事件
const handleKeydown=(e: KeyboardEvent, i: number)=> {
  // 按退格键自动跳到前一个输入框
  if (e.key === 'Backspace' && !codeInputs.value[i] && i > 0) {
    nextTick(() => {
      const prevInput = document.querySelector(`[data-code-input="${i - 1}"]`) as HTMLInputElement
      prevInput?.focus()
    })
  }
}
// 输入自动跳下一格子
const handleInput =(i: number) =>{
  // 只允许输入数字
  codeInputs.value[i] = codeInputs.value[i].replace(/[^0-9]/g, '')
  // 自动跳到下一个输入框
  if (codeInputs.value[i].length === 1 && i < 5) {
    nextTick(() => {
      const nextInput = document.querySelector(`[data-code-input="${i + 1}"]`) as HTMLInputElement
      nextInput?.focus()
    })
  }
  // 自动校验
  if (codeInputs.value.join('').length === 6) {
    verifyCodeStep()
  }
}
// 开始计时
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

// 重新发送验证码
const resendCode =async()=> {
  // 这里应调用后端API重新发送验证码
  startCountdown()
    // 发送请求给后端，向邮箱发送验证码
    try {
    const response = await sentEmailCode(formData.value.email);
    if (response.code !== 200) {
      ElMessage.error(response.msg || '发送验证码失败，请重试');
      refreshCaptcha(); // 刷新验证码
      return;
    }
    ElMessage.success('验证码已发送至邮箱，请检查');
    step.value = 2; // 进入下一步（输入邮箱验证码）
    startCountdown(); // 开始倒计时（可调整为邮箱验证码倒计时）
  } catch (e) {
    console.error('发送验证码失败', e);
    ElMessage.error('发送失败，请检查网络重试');
  }
}

// 验证码确认与注册
const verifyCodeStep = async () => {
  const code = codeInputs.value.join('')
  if (code.length !== 6) {
    ElMessage.error('请输入完整的验证码')
    return
  }

  // 构建注册数据
  const registerData: RegisterItem = {
    username: formData.value.username,
    password: formData.value.password,  // 使用第一步的密码
    email: formData.value.email,
    code: code  // 邮箱验证码
  }

  try {
    const response = await regesterRequest(registerData);  // 调用注册API
    if (response.code === 200) {
      ElMessage.success('注册成功，请登录')
      setTimeout(() => {
        router.push('/login')  // 跳转到登录页
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
  <div class="fixed inset-0 bg-white w-full h-full overflow-hidden select-none">
       <!-- 背景图 -->
    <img src="@/assets/images/bg.png" class="fixed top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 w-[30vw]  object-contain z-0" alt="背景" />
    <!-- 标题 -->
    <TITLEUI/>
    <UI1 />
    <div class="fixed h-full top-0 bottom-0 right-[12vw] flex flex-col  ">
      <div class="relative bg-[rgba(80,70,70,0.7)] rounded-xl p-[2em] shadow-lg text-white w-[450px] max-w-[90vw] my-auto">
        <div class="absolute top-4 left-4 z-10">
          <a href="/login" class="flex items-center gap-2 text-gray-200 hover:text-white text-base back-link">
            <img src="@/assets/svgs/return.svg" alt="返回图标" />
            返回登录
          </a>
        </div>
        <div class="text-center ">
          <div class="font-bold text-[24px] text-white m-0">注册账号</div>
          <p class="text-gray-300 text-[12px]">请按照步骤完成</p>
        </div>
        <div class="w-full mx-auto flex justify-center items-center gap-4 mb-5 text-center ">
          <div
            :class="[
              'flex-1 px-5 py-3 font-bold text-lg bg-transparent outline-none transition duration-200 rounded-none cursor-default border-b-2',
              step === 1 ? 'text-white border-white' : 'text-gray-300 border-transparent',
              step > 1 ? 'completed' : ''
            ]"
          >1</div>
          <div
            :class="[
              'flex-1 px-5 py-3 font-bold text-lg bg-transparent outline-none transition duration-200 rounded-none cursor-default border-b-2',
              step === 2 ? 'text-white border-white' : 'text-gray-300 border-transparent',
              step > 2 ? 'completed' : ''
            ]"
          >2</div>
        </div>
        <div class=" transition-all">
          <!-- 步骤1：输入用户名和手机号 -->
          <el-form v-if="step === 1" class="space-y-4" @submit.prevent="nextStep">
            <el-form-item>
              <input v-model="formData.username" type="text" placeholder="请输入用户名" autofocus
                class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"/>
            </el-form-item>
            <el-form-item>
              <input v-model="formData.password" type="password" placeholder="请输入系统初始密码"
                class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"/>
            </el-form-item>
            <el-form-item>
              <input  v-model="formData.passwordSecond" type="password" placeholder="再次输入初始密码"
                class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"/>
            </el-form-item>
            <el-form-item>
              <input v-model="formData.email" type="email" placeholder="邮箱"
                class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"/>
            </el-form-item>
            <el-form-item>
              <div class="flex items-center gap-3 w-full">
                <input v-model="formData.verifyCode" type="text" placeholder="请输入验证码" class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"/>
                <img :src="captchaUrl" alt="验证码" class="w-full h-12 object-cover rounded cursor-pointer" @click="refreshCaptcha" title="点击刷新验证码" />
              </div>
            </el-form-item>
            <el-form-item>
              <button type="submit"
                class="h-12 w-full flex flex-row items-center justify-center bg-blue-700 font-bold text-xl tracking-[0.1em] text-white rounded-lg transition cursor-pointer hover:bg-[#4672F4] active:scale-95">
                下一步
              </button>
            </el-form-item>
          </el-form>
          <!-- 步骤2：验证码确认 -->
          <el-form v-if="step === 2" class="space-y-4" @submit.prevent="verifyCodeStep">
            <div class=" text-center text-white mb-2">验证码已发送至邮箱 <span class="font-bold">{{ formData.email }}</span></div>
            <el-form-item class="flex justify-center">
            <div class="flex w-full justify-center gap-2">
              <input
                v-for="(v, i) in codeInputs"
                :key="i"
                v-model="codeInputs[i]"
                maxlength="1"
                type="text"
                :data-code-input="i"
                class="w-10 h-12 text-center text-xl font-bold rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition outline-none"
                @input="handleInput(i)"
                @keydown="handleKeydown($event, i)"
              />
            </div>
          </el-form-item>
            <button type="button" class="flex w-full justify-center cursor-pointer text-red-500 bg-transparent border-none text-base"
              :disabled="sending" @click="resendCode">
              重新发送验证码<span v-if="sending" class="text-gray-300 ml-2">({{ countdown }}s)</span>
            </button>
            <el-form-item>
              <button type="submit"
                class="h-12 w-full flex flex-row items-center justify-center bg-blue-700 font-bold text-xl tracking-[0.1em] text-white rounded-lg transition cursor-pointer hover:bg-[#4672F4] active:scale-95">
                验证
              </button>
            </el-form-item>
          </el-form>
        </div>
        <div class="text-center mt-4 text-sm text-white/60 font-normal">
          版本号：<span>1.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>
