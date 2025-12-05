<script setup lang="ts">
import UI1 from './component/ui1.vue'
import TITLEUI from '../home/component/titleUI.vue'
import { ref , onMounted, onUnmounted ,reactive} from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  type LoginDto, 
  type CaptchaResponse, 
  type WechatQrCodeResponse,
  type WechatLoginStatusResponse,
  loginPost, 
  getCaptcha,
  getWechatLoginQrCode,
  checkWechatLoginStatus,
  bindWechatToAccount
} from'@/api/components/apiLogin'

// ✅ 导入企业微信相关接口
import {
  type WechatWorkQrCodeResponse,
  type WechatWorkLoginStatusResponse,
  type WechatWorkBindRequest,
  getWechatWorkQrCode,
  checkWechatWorkLoginStatus,
  bindWechatWorkToAccount
} from '@/api/components/apiWechatWork'
import { useUserStore } from '@/stores/profile'

const userStore = useUserStore()
const router = useRouter()

//验证码相关================================
const captchaUrl = ref('')
const captchaData = ref<CaptchaResponse | null>(null)

//刷新验证码
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

//登录===================================
const loginBody=ref<LoginDto>({
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

//点击登录提交表单
const submitLogin = async () => {
  if (!validate()) return;
  try {
    const response = await loginPost(loginBody.value);
    console.log('登录响应', response);

    if (response.code === 200) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      ElMessage.success('登录成功');
      const success = await userStore.fetchUserBasicInfo()
      router.push('/home')
      if (!success) {
        ElMessage.error('请绑定学生信息')
      }
    } else {
      refreshCaptcha(); // 验证码错误时刷新
      ElMessage.error(response.msg || '登录失败');
    }
  } catch (error) {
    refreshCaptcha();
    console.error('登录失败', error);
    ElMessage.error('网络错误,请稍后重试');
  }
}

// ========== 企业微信绑定相关 ==========
const workBindDialogVisible = ref(false)
const pendingWorkUserInfo = ref<WechatWorkLoginStatusResponse | null>(null)

const workBindForm = reactive({
  username: '',
  password: ''
})

// 绑定企业微信到现有账号
const bindWorkToExistingAccount = async () => {
  if (!workBindForm.username || !workBindForm.password) {
    ElMessage.error('请输入用户名和密码')
    return
  }
  
  try {
    const response = await bindWechatWorkToAccount({
      state: wechatWorkQrState.value,
      username: workBindForm.username,
      password: workBindForm.password
    })
    
    if (response.code === 200) {
      ElMessage.success('绑定成功')
      workBindDialogVisible.value = false
      
      // 重新检查登录状态
      const result = await checkWechatWorkLoginStatus(wechatWorkQrState.value)
      if (result && result.status === 'success') {
        localStorage.setItem('accessToken', result.accessToken!)
        localStorage.setItem('refreshToken', result.refreshToken!)
        router.push('/home')
      }
    } else {
      ElMessage.error(response.msg || '绑定失败')
    }
  } catch (error) {
    ElMessage.error('绑定失败')
    console.error('绑定错误:', error)
  }
}

// ========== 企业微信登录相关 ==========
const wechatWorkQrCode = ref('')
const wechatWorkQrState = ref('')
const isWechatWorkLoading = ref(false)
let workPollInterval: number | null = null

// 获取企业微信登录二维码
const getWechatWorkQrCodeData = async () => {
  try {
    isWechatWorkLoading.value = true
    const qrCodeData = await getWechatWorkQrCode()
    wechatWorkQrCode.value = qrCodeData.qrCode
    wechatWorkQrState.value = qrCodeData.state
    
    // 开始轮询检查登录状态
    startWechatWorkLoginPolling()
  } catch (error) {
    ElMessage.error('获取企业微信二维码失败')
    console.error('获取企业微信二维码失败:', error)
  } finally {
    isWechatWorkLoading.value = false
  }
}

// 开始轮询检查企业微信登录状态
const startWechatWorkLoginPolling = () => {
  if (workPollInterval) {
    clearInterval(workPollInterval)
  }
  
  workPollInterval = setInterval(async () => {
    try {
      const result = await checkWechatWorkLoginStatus(wechatWorkQrState.value)
      if (result) {
        if (result.status === 'pending_bind') {
          // 需要绑定账号
          clearInterval(workPollInterval!)
          workPollInterval = null
          pendingWorkUserInfo.value = result
          workBindDialogVisible.value = true
        } else if (result.status === 'success') {
          // 登录成功
          clearInterval(workPollInterval!)
          workPollInterval = null
          ElMessage.success('企业微信登录成功')
          
          localStorage.setItem('accessToken', result.accessToken!)
          localStorage.setItem('refreshToken', result.refreshToken!)
          router.push('/home')
        } else if (result.status === 'expired') {
          // 二维码过期
          clearInterval(workPollInterval!)
          workPollInterval = null
          ElMessage.warning('二维码已过期，请刷新')
        }
      }
    } catch (error) {
      console.error('检查企业微信登录状态失败:', error)
    }
  }, 2000)
}

// 停止轮询
const stopWechatWorkLoginPolling = () => {
  if (workPollInterval) {
    clearInterval(workPollInterval)
    workPollInterval = null
  }
}

// 刷新企业微信二维码
const refreshWechatWorkQrCode = () => {
  stopWechatWorkLoginPolling()
  getWechatWorkQrCodeData()
}

// ========== 微信登录相关（保持原有） ==========
const wechatQrCode = ref('')
const wechatQrState = ref('')
const isWechatLoading = ref(false)
let pollInterval: number | null = null

const bindDialogVisible = ref(false)
const pendingUserInfo = ref<any>(null)

const bindForm = reactive({
  username: '',
  password: ''
})

// 开始轮询检查微信登录状态
const startWechatLoginPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
  
  pollInterval = setInterval(async () => {
    try {
      const result = await checkWechatLoginStatus(wechatQrState.value)
      if (result) {
        clearInterval(pollInterval!)
        pollInterval = null
        
        if (result.status === 'pending_bind') {
          // 需要绑定账号
          pendingUserInfo.value = result
          bindDialogVisible.value = true
        } else if (result.status === 'success') {
          // 登录成功
          ElMessage.success('微信登录成功')
          
          // 存储token
          localStorage.setItem('accessToken', result.accessToken)
          localStorage.setItem('refreshToken', result.refreshToken)
          
          // 跳转到主页面
          router.push('/home')
        }
      }
    } catch (error) {
      console.error('检查微信登录状态失败:', error)
    }
  }, 2000)
}

// 绑定到现有账号
const bindToExistingAccount = async () => {
  if (!bindForm.username || !bindForm.password) {
    ElMessage.error('请输入用户名和密码')
    return
  }
  
  try {
    const response = await bindWechatToAccount({
      state: wechatQrState.value,
      username: bindForm.username,
      password: bindForm.password
    })
    
    if (response.code === 200) {
      ElMessage.success('绑定成功')
      bindDialogVisible.value = false
      
      // 重新检查登录状态
      const result = await checkWechatLoginStatus(wechatQrState.value)
      if (result && result.status === 'success') {
        localStorage.setItem('accessToken', result.accessToken)
        localStorage.setItem('refreshToken', result.refreshToken)
        router.push('/home')
      }
    } else {
      ElMessage.error(response.msg || '绑定失败')
    }
  } catch (error) {
    ElMessage.error('绑定失败')
    console.error('绑定错误:', error)
  }
}

// 获取微信登录二维码
const getWechatQrCode = async () => {
  try {
    isWechatLoading.value = true
    const qrCodeData = await getWechatLoginQrCode()
    wechatQrCode.value = qrCodeData.qrCode
    wechatQrState.value = qrCodeData.state
    
    // 开始轮询检查登录状态
    startWechatLoginPolling()
  } catch (error) {
    ElMessage.error('获取微信二维码失败')
    console.error('获取微信二维码失败:', error)
  } finally {
    isWechatLoading.value = false
  }
}

// 停止轮询
const stopWechatLoginPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// 刷新微信二维码
const refreshWechatQrCode = () => {
  stopWechatLoginPolling()
  getWechatQrCode()
}

//切换视图，验证码/登录
function switchTab(tab: 'account' | 'qrcode') {
  activeTab.value = tab
  
  if (tab === 'qrcode') {
    // ✅ 修改：企业微信扫码登录
    getWechatWorkQrCodeData()
  } else {
    // 切换到账号登录时停止轮询
    stopWechatWorkLoginPolling()
  }
}

const activeTab = ref<'account' | 'qrcode'>('account')

//点击注册
const handleRegister =()=>{
  router.push('/register')
}

//忘记密码
const forgotPassword=()=> {
  router.push('/forgot')
}

onMounted(()=>{
  refreshCaptcha();
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopWechatLoginPolling()
  stopWechatWorkLoginPolling()
})
</script>

<template>
  <div class="fixed inset-0 bg-white w-full h-full overflow-hidden select-none">
    <!-- 背景图 -->
    <img src="@/assets/images/bg.png" class="fixed top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 w-[30vw]  object-contain z-0" alt="背景" />
    <!-- 标题 -->
    <TITLEUI/>
    <UI1 />
    
    <!-- ✅ 企业微信绑定弹窗 -->
    <el-dialog v-model="workBindDialogVisible" title="企业微信登录" width="400px" :close-on-click-modal="false">
      <div class="text-center mb-4">
        <img :src="pendingWorkUserInfo?.avatar || '/default-avatar.png'" alt="头像" class="w-16 h-16 rounded-full mx-auto mb-2" />
        <p class="text-gray-600 font-medium">{{ pendingWorkUserInfo?.name }}</p>
        <p class="text-sm text-gray-500 mt-1">{{ pendingWorkUserInfo?.mobile }}</p>
        <p class="text-sm text-gray-500 mt-3">该企业微信未绑定系统账号，请输入现有账号信息进行绑定：</p>
      </div>
      
      <el-form label-width="70px">
        <el-form-item label="用户名">
          <el-input v-model="workBindForm.username" placeholder="输入现有账号用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="workBindForm.password" type="password" placeholder="输入密码" />
        </el-form-item>
        <el-form-item>
          <div class="flex gap-2 w-full">
            <el-button type="primary" @click="bindWorkToExistingAccount" class="flex-1">
              确认绑定
            </el-button>
            <el-button @click="workBindDialogVisible = false" class="flex-1">
              取消
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <div class="text-center text-sm text-gray-500 mt-2">
        没有账号？请先通过传统方式注册账号后再进行绑定
      </div>
    </el-dialog>
    
    <!-- 微信绑定弹窗 - 简化版（保持原有） -->
    <el-dialog v-model="bindDialogVisible" title="微信登录" width="400px" :close-on-click-modal="false">
      <div class="text-center mb-4">
        <img :src="pendingUserInfo?.headImgUrl" alt="微信头像" class="w-16 h-16 rounded-full mx-auto mb-2" />
        <p class="text-gray-600">{{ pendingUserInfo?.nickname }}</p>
        <p class="text-sm text-gray-500">该微信未绑定系统账号，请输入现有账号信息进行绑定：</p>
      </div>
      
      <!-- 绑定现有账号表单 -->
      <el-form>
        <el-form-item label="用户名">
          <el-input v-model="bindForm.username" placeholder="输入现有账号用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="bindForm.password" type="password" placeholder="输入密码" />
        </el-form-item>
        <el-form-item>
          <div class="flex gap-2 w-full">
            <el-button type="primary" @click="bindToExistingAccount" class="flex-1">
              确认绑定
            </el-button>
            <el-button @click="bindDialogVisible = false" class="flex-1">
              取消
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <div class="text-center text-sm text-gray-500 mt-4">
        没有账号？请先通过传统方式注册账号后再进行绑定
      </div>
    </el-dialog>
    
    <div class="fixed top-0 bottom-0 right-[12vw] flex flex-col mt-5 z-50 ">
      <div class="font-['Microsoft_YaHei','微软雅黑',Arial,sans-serif] pl-2 mb-4 text-center tracking-[0.2em] text-[2.4rem] font-bold text-gray-800 w-[450px] max-w-[90vw] leading-snug mx-auto">
        推免材料处理平台
      </div>
      <div class="relative bg-[rgba(80,70,70,0.7)] rounded-xl p-[2em] shadow-lg text-white w-[450px] max-w-[90vw] mx-auto">
        <div class="flex items-center justify-center mb-4">
          <h4 class="font-bold text-[24px] text-white m-0 ">统一身份认证</h4>
        </div>
        <div class="flex justify-center gap-4 mb-5">
          <button
          :class="[
            'px-5 py-3 font-bold text-lg bg-transparent outline-none transition duration-200 rounded-none cursor-pointer',
            activeTab === 'qrcode'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-300 border-b-2 border-transparent'
          ]"
          @click="switchTab('qrcode')"
        >扫码登录</button>
        <button
          :class="[
            'px-5 py-3 font-bold text-lg bg-transparent outline-none transition duration-200 rounded-none cursor-pointer',
            activeTab === 'account'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-300 border-b-2 border-transparent'
          ]"
          @click="switchTab('account')"
        >账号登录</button>
        </div>
        <div class=" transition-all">
          <!-- ✅ 企业微信扫码登录 -->
          <div v-if="activeTab === 'qrcode'" class="flex flex-col items-center justify-center">
            <div class="p-3 rounded mb-3 bg-white">
              <div class="w-52 h-52 flex items-center justify-center">
                <!-- 企业微信二维码 -->
                <div v-if="isWechatWorkLoading" class="flex flex-col items-center justify-center h-full">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p class="mt-2 text-gray-500 text-sm">正在生成二维码...</p>
                </div>
                <div v-else-if="wechatWorkQrCode" class="relative">
                  <img :src="wechatWorkQrCode" alt="企业微信登录二维码" class="w-full h-full object-contain" />
                  <!-- 刷新按钮 -->
                  <button 
                    @click="refreshWechatWorkQrCode"
                    class="absolute top-1 right-1 bg-gray-100 hover:bg-gray-200 rounded-full p-1 text-gray-600 text-xs"
                    title="刷新二维码"
                  >
                    ↻
                  </button>
                </div>
                <div v-else class="flex flex-col items-center justify-center h-full text-gray-500">
                  <p>无法加载二维码</p>
                  <button @click="getWechatWorkQrCodeData" class="mt-2 text-blue-500 underline text-sm">
                    重新获取
                  </button>
                </div>
              </div>
            </div>
            <p class="text-white mb-2 font-bold">企业微信扫码登录</p>
            <p class="text-gray-300 text-sm text-center">
              请使用企业微信扫描上方二维码<br>
              扫码后请在手机上确认登录
            </p>
          </div>
          
          <!-- 账号登录 -->
          <div v-if="activeTab === 'account'">
            <el-form class="mt-3 space-y-4" @submit.prevent="submitLogin" :model=loginBody>
            <el-form-item >
              <input v-model="loginBody.username" type="text" placeholder="请输入用户名" autofocus class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"/>
            </el-form-item>
            <el-form-item>
              <input v-model="loginBody.password" type="password" placeholder="请输入密码" class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none" autocomplete="current-password"/>
            </el-form-item>
            <el-form-item>
              <div class="flex items-center gap-3 w-full">
                <input v-model="loginBody.verifyCode" type="text" placeholder="请输入验证码" class="w-full h-12 px-4 rounded-lg bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition outline-none"/>
                <img :src="captchaUrl" alt="验证码" class="w-full h-12 object-cover rounded cursor-pointer" @click="refreshCaptcha" title="点击刷新验证码" />
              </div>
            </el-form-item>
            <el-form-item>
              <button type="submit" class="h-12 w-full flex flex-row items-center justify-center bg-blue-700 font-[700] text-[20px] py-3text-xl tracking-[0.1em] text-white rounded-lg transition cursor-pointer  hover:bg-[#4672F4] active:scale-95" native-type="submit">登 录</button>
            </el-form-item>
            <div class="flex justify-between mt-7 text-gray-300 text-base font-bold">
              <span class="cursor-pointer" @click="handleRegister()">注册账号</span>
              <span class="cursor-pointer" @click="forgotPassword">忘记密码</span>
            </div>
          </el-form>
          </div>
        </div>
        <div class="text-center mt-4 text-sm text-white/60 font-normal">
          版本号：<span>1.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>