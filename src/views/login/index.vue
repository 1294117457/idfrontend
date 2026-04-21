<script setup lang="ts">
import UI1 from './component/ui1.vue'
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

const submitLogin = async () => {
  if (isLoggingIn.value) return
  if (!validate()) return;
  isLoggingIn.value = true
  try {
    const response = await loginPost(loginBody.value);

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
      ElMessage.error(response.msg || '登录失败');
    }
  } catch (error) {
    console.error('登录失败', error);
    ElMessage.error('网络错误,请稍后重试');
  } finally {
    isLoggingIn.value = false
    refreshCaptcha();
  }
}

// ========== 企业微信绑定相关 ==========
const workBindDialogVisible = ref(false)
const pendingWorkUserInfo = ref<WechatWorkLoginStatusResponse | null>(null)

const workBindForm = reactive({
  username: '',
  password: ''
})

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

const getWechatWorkQrCodeData = async () => {
  try {
    isWechatWorkLoading.value = true
    const qrCodeData = await getWechatWorkQrCode()
    wechatWorkQrCode.value = qrCodeData.qrCode
    wechatWorkQrState.value = qrCodeData.state
    startWechatWorkLoginPolling()
  } catch (error) {
    ElMessage.error('获取企业微信二维码失败')
    console.error('获取企业微信二维码失败:', error)
  } finally {
    isWechatWorkLoading.value = false
  }
}

const startWechatWorkLoginPolling = () => {
  if (workPollInterval) {
    clearInterval(workPollInterval)
  }
  
  workPollInterval = setInterval(async () => {
    try {
      const result = await checkWechatWorkLoginStatus(wechatWorkQrState.value)
      if (result) {
        if (result.status === 'pending_bind') {
          clearInterval(workPollInterval!)
          workPollInterval = null
          pendingWorkUserInfo.value = result
          workBindDialogVisible.value = true
        } else if (result.status === 'success') {
          clearInterval(workPollInterval!)
          workPollInterval = null
          ElMessage.success('企业微信登录成功')
          localStorage.setItem('accessToken', result.accessToken!)
          localStorage.setItem('refreshToken', result.refreshToken!)
          router.push('/home')
        } else if (result.status === 'expired') {
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

const stopWechatWorkLoginPolling = () => {
  if (workPollInterval) {
    clearInterval(workPollInterval)
    workPollInterval = null
  }
}

const refreshWechatWorkQrCode = () => {
  stopWechatWorkLoginPolling()
  getWechatWorkQrCodeData()
}

// ========== 微信登录相关 ==========
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
          pendingUserInfo.value = result
          bindDialogVisible.value = true
        } else if (result.status === 'success') {
          ElMessage.success('微信登录成功')
          localStorage.setItem('accessToken', result.accessToken)
          localStorage.setItem('refreshToken', result.refreshToken)
          router.push('/home')
        }
      }
    } catch (error) {
      console.error('检查微信登录状态失败:', error)
    }
  }, 2000)
}

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

const getWechatQrCode = async () => {
  try {
    isWechatLoading.value = true
    const qrCodeData = await getWechatLoginQrCode()
    wechatQrCode.value = qrCodeData.qrCode
    wechatQrState.value = qrCodeData.state
    startWechatLoginPolling()
  } catch (error) {
    ElMessage.error('获取微信二维码失败')
    console.error('获取微信二维码失败:', error)
  } finally {
    isWechatLoading.value = false
  }
}

const stopWechatLoginPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

const refreshWechatQrCode = () => {
  stopWechatLoginPolling()
  getWechatQrCode()
}

function switchTab(tab: 'account' | 'qrcode') {
  activeTab.value = tab
  if (tab === 'qrcode') {
    getWechatWorkQrCodeData()
  } else {
    stopWechatWorkLoginPolling()
  }
}

const activeTab = ref<'account' | 'qrcode'>('account')

const handleRegister =()=>{
  router.push('/register')
}

const forgotPassword=()=> {
  router.push('/forgot')
}

onMounted(()=>{
  refreshCaptcha();
})

onUnmounted(() => {
  stopWechatLoginPolling()
  stopWechatWorkLoginPolling()
})
</script>

<template>
  <div class="login-page">
    <UI1 />

    <!-- 左侧品牌区 -->
    <div class="login-brand">
      <img src="@/assets/images/bg.png" class="brand-illustration" alt="" />
      <h1 class="brand-title">推免材料处理平台</h1>
      <p class="brand-subtitle">高效管理保研材料，助力推免之路</p>
    </div>

    <!-- 右侧登录卡片 -->
    <div class="login-card-wrap">
      <div class="login-card">
        <h2 class="card-title">欢迎登录</h2>
        <p class="card-desc">统一身份认证</p>

        <!-- Tab 切换 -->
        <div class="tab-bar">
          <button
            :class="['tab-item', activeTab === 'account' && 'active']"
            @click="switchTab('account')"
          >账号登录</button>
          <button
            :class="['tab-item', activeTab === 'qrcode' && 'active']"
            @click="switchTab('qrcode')"
          >扫码登录</button>
        </div>

        <!-- 账号登录 -->
        <div v-if="activeTab === 'account'" class="tab-content">
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

        <!-- 扫码登录 -->
        <div v-if="activeTab === 'qrcode'" class="tab-content qr-content">
          <div class="qr-box">
            <div v-if="isWechatWorkLoading" class="qr-loading">
              <div class="qr-spinner"></div>
              <p>正在生成二维码...</p>
            </div>
            <div v-else-if="wechatWorkQrCode" class="qr-code-wrap">
              <img :src="wechatWorkQrCode" alt="企业微信登录二维码" />
              <button @click="refreshWechatWorkQrCode" class="qr-refresh" title="刷新二维码">&#x21bb;</button>
            </div>
            <div v-else class="qr-empty">
              <p>无法加载二维码</p>
              <button @click="getWechatWorkQrCodeData" class="qr-retry">重新获取</button>
            </div>
          </div>
          <p class="qr-tip">请使用企业微信扫描上方二维码</p>
        </div>

        <div class="card-version">v1.0.0</div>
      </div>
    </div>

    <!-- 企业微信绑定弹窗 -->
    <el-dialog v-model="workBindDialogVisible" title="企业微信登录" width="420px" :close-on-click-modal="false">
      <div class="text-center mb-4">
        <img :src="pendingWorkUserInfo?.avatar || '/default-avatar.png'" alt="头像" class="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-indigo-100" />
        <p class="text-slate-700 font-semibold">{{ pendingWorkUserInfo?.name }}</p>
        <p class="text-sm text-slate-500 mt-1">{{ pendingWorkUserInfo?.mobile }}</p>
        <p class="text-sm text-slate-400 mt-3">该企业微信未绑定系统账号，请输入账号信息进行绑定</p>
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
            <el-button type="primary" @click="bindWorkToExistingAccount" class="flex-1">确认绑定</el-button>
            <el-button @click="workBindDialogVisible = false" class="flex-1">取消</el-button>
          </div>
        </el-form-item>
      </el-form>
      <div class="text-center text-sm text-slate-400 mt-2">没有账号？请先注册后再进行绑定</div>
    </el-dialog>
    
    <!-- 微信绑定弹窗 -->
    <el-dialog v-model="bindDialogVisible" title="微信登录" width="420px" :close-on-click-modal="false">
      <div class="text-center mb-4">
        <img :src="pendingUserInfo?.headImgUrl" alt="微信头像" class="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-indigo-100" />
        <p class="text-slate-600">{{ pendingUserInfo?.nickname }}</p>
        <p class="text-sm text-slate-400">该微信未绑定系统账号，请输入账号信息进行绑定</p>
      </div>
      <el-form>
        <el-form-item label="用户名">
          <el-input v-model="bindForm.username" placeholder="输入现有账号用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="bindForm.password" type="password" placeholder="输入密码" />
        </el-form-item>
        <el-form-item>
          <div class="flex gap-2 w-full">
            <el-button type="primary" @click="bindToExistingAccount" class="flex-1">确认绑定</el-button>
            <el-button @click="bindDialogVisible = false" class="flex-1">取消</el-button>
          </div>
        </el-form-item>
      </el-form>
      <div class="text-center text-sm text-slate-400 mt-4">没有账号？请先注册后再进行绑定</div>
    </el-dialog>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f1f5f9 100%);
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

.brand-illustration {
  max-width: 360px;
  width: 80%;
  object-fit: contain;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.brand-title {
  font-family: 'ZNtitle', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.brand-subtitle {
  color: #64748b;
  font-size: 1rem;
  letter-spacing: 0.04em;
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
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 24px;
  padding: 2.5rem 2rem;
  box-shadow:
    0 4px 6px -1px rgba(15, 23, 42, 0.04),
    0 20px 40px -4px rgba(79, 70, 229, 0.08);
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

.tab-bar {
  display: flex;
  gap: 0.25rem;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 1.5rem;
}

.tab-item {
  flex: 1;
  padding: 0.5rem 0;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  background: transparent;
  color: #64748b;
}

.tab-item.active {
  background: #fff;
  color: #4f46e5;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0.5rem;
}

.qr-box {
  width: 220px;
  height: 220px;
  background: #fff;
  border-radius: 16px;
  border: 1.5px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.qr-code-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}

.qr-code-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 12px;
}

.qr-refresh {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(241, 245, 249, 0.9);
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.qr-refresh:hover {
  background: #e2e8f0;
}

.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: #94a3b8;
  font-size: 0.8rem;
}

.qr-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #818cf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.qr-empty {
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.qr-retry {
  margin-top: 0.5rem;
  border: none;
  background: none;
  color: #4f46e5;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
}

.qr-tip {
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.8rem;
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
  .brand-illustration {
    max-width: 200px;
    margin-bottom: 1rem;
  }
  .login-card-wrap {
    flex: none;
    padding: 0 1.5rem 2rem;
  }
}
</style>
