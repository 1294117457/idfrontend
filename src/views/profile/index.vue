<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, User, CircleCheck, WarningFilled } from '@element-plus/icons-vue'
import type { UploadUserFile, UploadRequestOptions } from 'element-plus'
import {
  type UserInfoItem,
  type StudentItem,
  type UpdateStudentItem,
  type UserBasicInfoUpdate,
  sendEmailCode,
  bindStudentInfo,
  getUserInfo,
  updateStudentInfo,
  updateUserBasicInfo,
  uploadAvatar,
  getAvatarPreviewUrl
} from '@/api/components/apiProfile'
import { getFileUrl } from '@/api/components/apiScore'
import FileUtil from '@/components/fileUtil.vue'
import { useUserStore } from '@/stores/profile'
import router from '@/router'

const userStore = useUserStore()

// ==================== 基础数据 ====================
const loading = ref(true)
const submitting = ref(false)
const userInfo = ref<UserInfoItem | null>(null)
const editDialogVisible = ref(false)
const countdown = ref(0)
const editCountdown = ref(0)

// ✅ 用户信息编辑相关
const userEditDialogVisible = ref(false)
const updatingUser = ref(false)
const uploadingAvatar = ref(false)
const avatarPreviewUrl = ref('')
const userAvatarUrl = ref('')
const newAvatarFileId = ref<number | null>(null)

const userEditForm = ref<UserBasicInfoUpdate>({
  nickname: '',
  avatar: '',
  phone: ''
})
// ✅ 新增：验证码发送状态
const codeSent = ref(false)  // 是否已发送验证码
const editCodeSent = ref(false)  // 编辑时是否已发送验证码

// ✅ 绑定学生信息弹窗
const bindDialogVisible = ref(false)

// ✅ 认证信息预览列表
const previewFileList = ref<UploadUserFile[]>([])

// ✅ 修改绑定表单默认值
const bindForm = ref<StudentItem>({
  email: '',
  code: '',
  fullName: '',
  major: '',
  grade: 1,  // ✅ 默认大一
  graduationYear: new Date().getFullYear() + 4,
})

// ✅ 修改编辑表单
const editForm = ref<UpdateStudentItem>({
  email: '',
  code: '',
  fullName: '',
  major: '',
  grade: 1,  // ✅ 默认大一
  graduationYear: undefined
})
// ✅ 年级文本转换（只支持1-4）
const getGradeText = (grade?: number) => {
  if (!grade) return '-'
  const gradeMap: Record<number, string> = {
    1: '大一',
    2: '大二',
    3: '大三',
    4: '大四'
  }
  return gradeMap[grade] || `年级${grade}`
}
// ==================== 计算属性 ====================
// ✅ 新增：绑定表单是否可提交
const canSubmitBindForm = computed(() => {
  return codeSent.value && 
         bindForm.value.code.trim() !== '' &&
         bindForm.value.fullName.trim() !== '' &&
         bindForm.value.major.trim() !== ''
})

// ✅ 新增:编辑表单是否可提交
const canSubmitEditForm = computed(() => {
  return editCodeSent.value && 
         editForm.value.code.trim() !== '' &&
         editForm.value.fullName.trim() !== '' &&
         editForm.value.major.trim() !== ''
})
// ==================== 计算属性 ====================
// ✅ 判断是否有学生信息
const hasStudentInfo = computed(() => {
  return userInfo.value?.studentId != null
})

const hasDemandData = computed(() => {
  return userInfo.value?.demandValue && userInfo.value.demandValue !== '[]'
})

const demandApplications = computed(() => {
  if (!userInfo.value?.demandValue) return []
  try {
    return JSON.parse(userInfo.value.demandValue)
  } catch {
    return []
  }
})

const existingFiles = computed(() => {
  if (!userInfo.value?.demandFiles) return []
  try {
    return JSON.parse(userInfo.value.demandFiles)
  } catch {
    return []
  }
})

// ==================== 基础功能函数 ====================
const fetchUserInfo = async () => {
  loading.value = true
  try {
    const response = await getUserInfo()
    if (response.code === 200) {
      userInfo.value = response.data
      
      if (userInfo.value.demandFiles) {
        try {
          const files = JSON.parse(userInfo.value.demandFiles)
          previewFileList.value = files.map((url: string, index: number) => ({
            name: `认证材料${index + 1}.${getFileExtFromUrl(url)}`,
            url: url,
            uid: Date.now() + index,
            status: 'success' as const
          }))
        } catch (e) {
          console.error('解析认证材料失败:', e)
        }
      }
    }
  } catch (error: any) {
    // ✅ 不再判断 400 错误，允许没有学生信息
    console.log('获取用户信息:', error.response?.data?.msg)
  } finally {
    loading.value = false
  }
}

const getFileExtFromUrl = (url: string): string => {
  try {
    const parts = url.split('.')
    return parts[parts.length - 1] || 'file'
  } catch {
    return 'file'
  }
}

const handleGetFileUrl = async (fileUrl: string, type: number) => {
  try {
    const response = await getFileUrl(fileUrl, type)
    return response
  } catch (error) {
    console.error('❌ 获取文件链接失败:', error)
    throw error
  }
}

// ==================== ✅ 用户信息编辑功能 ====================
const showUserEditDialog = async () => {
  userEditForm.value = {
    nickname: userStore.userInfo?.nickname || '',
    avatar: userStore.userInfo?.avatar || '',
    phone: userStore.userInfo?.phone || ''
  }
  
  newAvatarFileId.value = null
  
  if (userStore.userInfo?.avatar) {
    const avatarId = parseInt(userStore.userInfo.avatar)
    if (!isNaN(avatarId) && avatarId > 0) {
      try {
        const response = await getAvatarPreviewUrl(avatarId, 60)
        if (response.code === 200) {
          avatarPreviewUrl.value = response.data
        }
      } catch (e) {
        console.error('获取头像预览失败:', e)
      }
    }
  }
  
  userEditDialogVisible.value = true
}

const beforeAvatarUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleAvatarUpload = async (options: UploadRequestOptions) => {
  uploadingAvatar.value = true
  try {
    const response = await uploadAvatar(options.file as File)
    
    if (response.code === 200) {
      const fileId = response.data.fileId
      newAvatarFileId.value = fileId
      userEditForm.value.avatar = String(fileId)
      
      const previewResponse = await getAvatarPreviewUrl(fileId, 60)
      if (previewResponse.code === 200) {
        avatarPreviewUrl.value = previewResponse.data
      }
      
      ElMessage.success('头像上传成功')
    } else {
      ElMessage.error(response.msg || '头像上传失败')
    }
  } catch (error) {
    console.error('头像上传失败:', error)
    ElMessage.error('头像上传失败')
  } finally {
    uploadingAvatar.value = false
  }
}

const handleUpdateUserInfo = async () => {
  if (userEditForm.value.phone && !/^1[3-9]\d{9}$/.test(userEditForm.value.phone)) {
    ElMessage.warning('请输入正确的手机号格式')
    return
  }
  
  updatingUser.value = true
  try {
    const response = await updateUserBasicInfo({
      nickname: userEditForm.value.nickname || undefined,
      avatar: userEditForm.value.avatar || undefined,
      phone: userEditForm.value.phone || undefined
    })
    
    if (response.code === 200) {
      ElMessage.success('用户信息更新成功')
      userEditDialogVisible.value = false
      
      userStore.updateUserInfo({
        nickname: userEditForm.value.nickname,
        avatar: userEditForm.value.avatar,
        phone: userEditForm.value.phone
      })
      
      await userStore.fetchUserBasicInfo()
      await loadUserAvatar()
      
      newAvatarFileId.value = null
    } else {
      ElMessage.error(response.msg || '更新失败')
    }
  } catch (error: any) {
    console.error('更新用户信息失败:', error)
    ElMessage.error(error.response?.data?.msg || '更新失败')
  } finally {
    updatingUser.value = false
  }
}

const handleCancelEdit = async () => {
  userEditDialogVisible.value = false
  newAvatarFileId.value = null
}

const loadUserAvatar = async () => {
  const avatar = userStore.userInfo?.avatar
  if (!avatar) {
    userAvatarUrl.value = ''
    return
  }
  
  const avatarId = parseInt(avatar)
  if (!isNaN(avatarId) && avatarId > 0) {
    try {
      const response = await getAvatarPreviewUrl(avatarId, 60)
      if (response.code === 200) {
        userAvatarUrl.value = response.data
      }
    } catch (e) {
      console.error('获取头像预览失败:', e)
    }
  }
}

// ==================== 学生信息管理 ====================
// ✅ 打开绑定学生信息弹窗
// ✅ 打开绑定学生信息弹窗
const showBindDialog = () => {
  bindForm.value = {
    email: '',
    code: '',
    fullName: '',
    major: '',
    enrollmentYear: new Date().getFullYear(),
    graduationYear: new Date().getFullYear() + 4,
  }
  codeSent.value = false  // ✅ 重置验证码状态
  countdown.value = 0
  bindDialogVisible.value = true
}

const sendCode = async () => {
  if (!bindForm.value.email) {
    ElMessage.warning('请输入学生邮箱')
    return
  }
  if (!bindForm.value.email.endsWith('@stu.xmu.edu.cn')) {
    ElMessage.warning('邮箱必须以@stu.xmu.edu.cn结尾')
    return
  }
  
  try {
    const response = await sendEmailCode(bindForm.value.email)
    if (response.code === 200) {
      codeSent.value = true  // ✅ 标记已发送
      ElMessage.success('验证码已发送，有效期10分钟')
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '发送验证码失败')
  }
}

const bindStudent = async () => {
  // ✅ 前置校验
  if (!codeSent.value) {
    ElMessage.warning('请先发送验证码')
    return
  }
  
  if (!bindForm.value.code || bindForm.value.code.trim() === '') {
    ElMessage.warning('请输入验证码')
    return
  }
  
  if (!bindForm.value.fullName || !bindForm.value.major) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  submitting.value = true
  try {
    const response = await bindStudentInfo(bindForm.value)
    if (response.code === 200) {
      ElMessage.success('学生信息绑定成功')
      bindDialogVisible.value = false
      codeSent.value = false  // ✅ 重置状态
      await fetchUserInfo()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '绑定失败')
  } finally {
    submitting.value = false
  }
}

// ✅ 优化修改学生信息弹窗
const showEditDialog = () => {
  if (userInfo.value) {
    editForm.value = {
      email: userInfo.value.studentEmail,
      code: '',
      fullName: userInfo.value.fullName,
      major: userInfo.value.major,
    }
  }
  editCodeSent.value = false  // ✅ 重置验证码状态
  editCountdown.value = 0
  editDialogVisible.value = true
}

// ✅ 优化编辑发送验证码
const sendEditCode = async () => {
  if (!editForm.value.email) {
    ElMessage.warning('请输入学生邮箱')
    return
  }
  if (!editForm.value.email.endsWith('@stu.xmu.edu.cn')) {
    ElMessage.warning('邮箱必须以@stu.xmu.edu.cn结尾')
    return
  }
  
  try {
    const response = await sendEmailCode(editForm.value.email)
    if (response.code === 200) {
      editCodeSent.value = true  // ✅ 标记已发送
      ElMessage.success('验证码已发送，有效期10分钟')
      editCountdown.value = 60
      const timer = setInterval(() => {
        editCountdown.value--
        if (editCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '发送验证码失败')
  }
}

// ✅ 优化更新学生信息
const updateStudent = async () => {
  // ✅ 前置校验
  if (!editCodeSent.value) {
    ElMessage.warning('请先发送验证码')
    return
  }
  
  if (!editForm.value.code || editForm.value.code.trim() === '') {
    ElMessage.warning('请输入验证码')
    return
  }
  
  if (!editForm.value.fullName || !editForm.value.major) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  submitting.value = true
  try {
    const response = await updateStudentInfo(editForm.value)
    if (response.code === 200) {
      ElMessage.success('学生信息更新成功')
      editDialogVisible.value = false
      editCodeSent.value = false  // ✅ 重置状态
      await fetchUserInfo()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '更新失败')
  } finally {
    submitting.value = false
  }
}

// ✅ 跳转到需求认证页面
const goToDemandPage = () => {
  router.push('/home/demand')
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await userStore.fetchUserBasicInfo()
  await loadUserAvatar()
  await fetchUserInfo()
})
</script>

<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center h-96">
      <el-icon class="is-loading" :size="50"><Loading /></el-icon>
    </div>

    <!-- ✅ 始终显示内容 -->
    <template v-else>
      <!-- ✅ 用户基本信息 -->
      <el-card>
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-[20px] font-bold text-gray-800">用户基本信息</h4>
          <el-button type="primary" @click="showUserEditDialog">修改用户信息</el-button>
        </div>
        
        <div class="flex items-start gap-6 mb-4">
          <div class="flex-shrink-0">
            <el-avatar 
              :size="80" 
              :src="userAvatarUrl"
              class="border-2 border-gray-200"
            >
              <el-icon :size="40"><User /></el-icon>
            </el-avatar>
          </div>
          <div class="flex-1">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="用户ID">{{ userStore.userInfo?.userId }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ userStore.userInfo?.username }}</el-descriptions-item>
              <el-descriptions-item label="昵称">
                <span v-if="userStore.userInfo?.nickname">{{ userStore.userInfo.nickname }}</span>
                <span v-else class="text-gray-400">未设置</span>
              </el-descriptions-item>
              <el-descriptions-item label="手机号">
                <span v-if="userStore.userInfo?.phone">{{ userStore.userInfo.phone }}</span>
                <span v-else class="text-gray-400">未设置</span>
              </el-descriptions-item>
              <el-descriptions-item label="邮箱" :span="2">
                <span v-if="userStore.userInfo?.email">{{ userStore.userInfo.email }}</span>
                <span v-else class="text-gray-400">未设置</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-card>

      <!-- ✅ 学生信息 -->
      <el-card class="student-info-card">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-[20px] font-bold text-gray-800">学生信息</h4>
          <div>
            <!-- ✅ 如果没有学生信息，显示绑定按钮 -->
            <el-button v-if="!hasStudentInfo" type="primary" @click="showBindDialog">
              绑定学生信息
            </el-button>
            <!-- ✅ 如果有学生信息，显示修改按钮 -->
            <el-button v-else type="primary" @click="showEditDialog">
              修改学生信息
            </el-button>
          </div>
        </div>
        
        <!-- ✅ 有学生信息时显示 -->
        <template v-if="hasStudentInfo">
          <el-descriptions :column="2" border class="mb-4">
            <el-descriptions-item label="学号">{{ userInfo.studentId }}</el-descriptions-item>
            <el-descriptions-item label="学生邮箱">{{ userInfo.studentEmail }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ userInfo.fullName }}</el-descriptions-item>
            <el-descriptions-item label="专业">{{ userInfo.major }}</el-descriptions-item>
            <el-descriptions-item label="年级">
              <el-tag>{{ getGradeText(userInfo?.grade) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="毕业年份">{{ userInfo.graduationYear }}</el-descriptions-item>
            <el-descriptions-item label="学业成绩">{{ userInfo.academicScore }}</el-descriptions-item>
            <el-descriptions-item label="专业成绩">{{ userInfo.specialtyScore }}</el-descriptions-item>
            <el-descriptions-item label="综合成绩">{{ userInfo.comprehensiveScore }}</el-descriptions-item>
            <el-descriptions-item label="GPA">{{ userInfo.gpa || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="确认状态">
              <el-tag :type="userInfo.isConfirmed ? 'success' : 'warning'">
                {{ userInfo.isConfirmed ? '已确认' : '未确认' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <!-- ✅ 认证信息展示 -->
          <el-divider content-position="left">
            <span class="text-lg font-semibold">保研条件认证信息</span>
          </el-divider>
          
          <div v-if="hasDemandData && demandApplications.length > 0" class="bg-blue-50 p-4 rounded">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-gray-600">
                <el-icon class="text-blue-500"><InfoFilled /></el-icon>
                如需修改认证信息，请前往"需求认证"页面
              </span>
              <el-button type="primary" size="small" @click="goToDemandPage">
                前往修改
              </el-button>
            </div>
            
            <el-table :data="demandApplications" border stripe>
              <el-table-column prop="templateName" label="条件名称" width="200" />
              <el-table-column prop="selectedCondition" label="选择条件" width="150">
                <template #default="{ row }">
                  <el-tag v-if="row.selectedCondition" size="small">{{ row.selectedCondition }}</el-tag>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="inputValue" label="填写内容" min-width="200" />
            </el-table>
            
            <div v-if="existingFiles.length > 0" class="mt-4">
              <el-divider content-position="left">认证材料</el-divider>
              <FileUtil
                v-model="previewFileList"
                :show-upload-button="false"
                :show-file-list="true"
                :show-preview-button="true"
                :show-delete-button="false"
                :disabled="true"
                :get-file-url="handleGetFileUrl"
              />
            </div>
          </div>

          <el-empty v-else description="暂未填写保研条件认证信息" class="my-4">
            <el-button type="primary" @click="goToDemandPage">立即填写</el-button>
          </el-empty>
        </template>

        <!-- ✅ 无学生信息时显示 -->
        <el-empty v-else description="暂未绑定学生信息" class="my-4">
          <el-button type="primary" @click="showBindDialog">立即绑定</el-button>
        </el-empty>
      </el-card>
    </template>

    <!-- ✅ 修改用户信息弹窗 -->
    <el-dialog 
      v-model="userEditDialogVisible" 
      title="修改用户信息" 
      width="500px"
      :before-close="handleCancelEdit"
    >
      <el-form :model="userEditForm" label-width="100px">
        <el-form-item label="头像">
          <div class="flex items-center gap-4">
            <el-avatar :size="60" :src="avatarPreviewUrl">
              <el-icon :size="30"><User /></el-icon>
            </el-avatar>
            <el-upload
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
              :http-request="handleAvatarUpload"
              accept="image/*"
            >
              <el-button size="small" type="primary" :loading="uploadingAvatar">
                {{ uploadingAvatar ? '上传中...' : '更换头像' }}
              </el-button>
            </el-upload>
          </div>
          <div class="text-xs text-gray-400 mt-2">支持 JPG、PNG 格式，大小不超过 2MB</div>
        </el-form-item>
        
        <el-form-item label="昵称">
          <el-input v-model="userEditForm.nickname" placeholder="请输入昵称" maxlength="20" show-word-limit />
        </el-form-item>
        
        <el-form-item label="手机号">
          <el-input v-model="userEditForm.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleCancelEdit">取消</el-button>
        <el-button type="primary" @click="handleUpdateUserInfo" :loading="updatingUser">确定修改</el-button>
      </template>
    </el-dialog>

    <!-- ✅ 绑定学生信息弹窗 -->
    <el-dialog v-model="bindDialogVisible" title="绑定学生信息" width="600px" :close-on-click-modal="false">
      <el-form :model="bindForm" label-width="120px">
        <!-- ✅ 优化邮箱验证码布局 -->
        <el-form-item label="学生邮箱" required>
          <div class="w-full space-y-2">
            <div class="flex gap-2">
              <el-input 
                v-model="bindForm.email" 
                placeholder="请输入学生邮箱(以@stu.xmu.edu.cn结尾)"
                :disabled="codeSent"
                clearable
              >
                <template #suffix>
                  <el-icon v-if="codeSent" class="text-green-500">
                    <CircleCheck />
                  </el-icon>
                </template>
              </el-input>
              <el-button 
                @click="sendCode" 
                :disabled="countdown > 0 || codeSent"
                :type="codeSent ? 'success' : 'primary'"
                class="send-code-btn"
              >
                <el-icon v-if="codeSent" class="mr-1"><CircleCheck /></el-icon>
                {{ codeSent ? '已发送' : (countdown > 0 ? `${countdown}秒后重试` : '发送验证码') }}
              </el-button>
            </div>
            <div class="text-xs text-gray-500 flex items-center gap-1">
              <el-icon><InfoFilled /></el-icon>
              <span>验证码有效期10分钟，发送后不可更改邮箱</span>
            </div>
          </div>
        </el-form-item>

        <!-- ✅ 优化验证码输入 -->
        <el-form-item label="验证码" required>
          <el-input 
            v-model="bindForm.code" 
            placeholder="请输入验证码"
            maxlength="6"
            show-word-limit
            :disabled="!codeSent"
          >
            <template #prefix>
              <el-icon v-if="!codeSent" class="text-gray-400">
                <Lock />
              </el-icon>
            </template>
          </el-input>
          <div v-if="!codeSent" class="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <el-icon><WarningFilled /></el-icon>
            <span>请先发送验证码</span>
          </div>
        </el-form-item>

        <el-form-item label="姓名" required>
          <el-input v-model="bindForm.fullName" placeholder="请输入姓名" maxlength="20" show-word-limit />
        </el-form-item>

        <el-form-item label="专业" required>
          <el-input v-model="bindForm.major" placeholder="请输入专业" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="年级" required>
          <el-select v-model="bindForm.grade" placeholder="请选择年级" style="width: 100%">
            <el-option
              v-for="opt in gradeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="毕业年份" required>
          <el-input-number 
            v-model="bindForm.graduationYear" 
            :min="2000" 
            :max="2035"
            controls-position="right"
            class="w-full"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="flex justify-between items-center">
          <div v-if="!canSubmitBindForm" class="text-sm text-amber-600 flex items-center gap-1">
            <el-icon><WarningFilled /></el-icon>
            <span>请先发送验证码并填写完整信息</span>
          </div>
          <div v-else class="text-sm text-green-600 flex items-center gap-1">
            <el-icon><CircleCheck /></el-icon>
            <span>信息已完善，可以提交</span>
          </div>
          <div class="flex gap-2">
            <el-button @click="bindDialogVisible = false">取消</el-button>
            <el-button 
              type="primary" 
              @click="bindStudent" 
              :loading="submitting"
              :disabled="!canSubmitBindForm"
            >
              确定绑定
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- ✅ 优化后的修改学生信息弹窗 -->
    <el-dialog v-model="editDialogVisible" title="修改学生信息" width="600px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="120px">
        <!-- ✅ 优化邮箱验证码布局 -->
        <el-form-item label="学生邮箱" required>
          <div class="w-full space-y-2">
            <div class="flex gap-2">
              <el-input 
                v-model="editForm.email" 
                placeholder="请输入学生邮箱"
                :disabled="true"
                clearable
              >
                <template #suffix>
                  <el-icon v-if="editCodeSent" class="text-green-500">
                    <CircleCheck />
                  </el-icon>
                </template>
              </el-input>
              <el-button 
                @click="sendEditCode" 
                :disabled="editCountdown > 0 || editCodeSent"
                :type="editCodeSent ? 'success' : 'primary'"
                class="send-code-btn"
              >
                <el-icon v-if="editCodeSent" class="mr-1"><CircleCheck /></el-icon>
                {{ editCodeSent ? '已发送' : (editCountdown > 0 ? `${editCountdown}秒后重试` : '发送验证码') }}
              </el-button>
            </div>
            <div class="text-xs text-gray-500 flex items-center gap-1">
              <el-icon><InfoFilled /></el-icon>
              <span>验证码有效期10分钟</span>
            </div>
          </div>
        </el-form-item>

        <!-- ✅ 优化验证码输入 -->
        <el-form-item label="验证码" required>
          <el-input 
            v-model="editForm.code" 
            placeholder="请输入验证码"
            maxlength="6"
            show-word-limit
            :disabled="!editCodeSent"
          >
            <template #prefix>
              <el-icon v-if="!editCodeSent" class="text-gray-400">
                <Lock />
              </el-icon>
            </template>
          </el-input>
          <div v-if="!editCodeSent" class="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <el-icon><WarningFilled /></el-icon>
            <span>请先发送验证码</span>
          </div>
        </el-form-item>

        <el-form-item label="姓名" required>
          <el-input v-model="editForm.fullName" placeholder="请输入姓名" maxlength="20" show-word-limit />
        </el-form-item>

        <el-form-item label="专业" required>
          <el-input v-model="editForm.major" placeholder="请输入专业" maxlength="50" show-word-limit />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="flex justify-end items-center">
          <div class="flex gap-2">
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button 
              type="primary" 
              @click="updateStudent" 
              :loading="submitting"
              :disabled="!canSubmitEditForm"
            >
              确定修改
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
  .student-info-card {
    background: linear-gradient(to bottom, #e3f2fd 0%, #ffffff 100%);
  }
  
  .student-info-card :deep(.el-card__body) {
    background: transparent;
  }
  
  /* ✅ 优化发送验证码按钮样式 */
  .send-code-btn {
    min-width: 120px;
    white-space: nowrap;
  }
  
  /* ✅ 验证码输入框禁用状态优化 */
  :deep(.el-input.is-disabled .el-input__wrapper) {
    background-color: #f5f7fa;
    cursor: not-allowed;
  }
  </style>