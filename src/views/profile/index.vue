<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, User } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import {
  type UserInfoItem,
  type StudentItem,
  type UpdateStudentItem,
  type UserBasicInfoUpdate,
  bindStudentInfo,
  getUserInfo,
  updateStudentInfo,
  updateUserBasicInfo,
  uploadAvatar,
} from '@/api/components/apiProfile'
import { useUserStore } from '@/stores/profile'

const userStore = useUserStore()

// ==================== 基础数据 ====================
const loading = ref(true)
const submitting = ref(false)
const userInfo = ref<UserInfoItem | null>(null)
const editDialogVisible = ref(false)

// ✅ 用户信息编辑相关
const userEditDialogVisible = ref(false)
const updatingUser = ref(false)
const uploadingAvatar = ref(false)
const avatarPreviewUrl = ref('')

const userEditForm = ref<UserBasicInfoUpdate>({
  avatar: '',
  phone: ''
})
// ✅ 绑定学生信息弹窗
const bindDialogVisible = ref(false)

// ✅ 绑定表单
const bindForm = ref<StudentItem>({
  fullName: '',
  major: '',
  grade: 1,
  graduationYear: new Date().getFullYear() + 4,
})

// ✅ 编辑表单
const editForm = ref<UpdateStudentItem>({
  fullName: '',
  major: '',
  grade: 1,
  graduationYear: undefined
})
const getGradeText = (grade?: number) => {
  if (!grade) return '-'
  const gradeMap: Record<number, string> = {
    1: '大一', 2: '大二', 3: '大三', 4: '大四', 5: '大五'
  }
  return gradeMap[grade] || `年级${grade}`
}

const gradeOptions = [
  { label: '大一', value: 1 },
  { label: '大二', value: 2 },
  { label: '大三', value: 3 },
  { label: '大四', value: 4 },
  { label: '大五（五年制）', value: 5 },
]
// ==================== 计算属性 ====================
const canSubmitBindForm = computed(() => {
  return bindForm.value.fullName.trim() !== '' &&
         bindForm.value.major.trim() !== ''
})

const canSubmitEditForm = computed(() => {
  return editForm.value.fullName.trim() !== '' &&
         editForm.value.major.trim() !== ''
})

const hasStudentInfo = computed(() => {
  return !!userInfo.value?.fullName
})

const currentStudentInfo = computed(() => {
  return hasStudentInfo.value ? userInfo.value : null
})
const fetchUserInfo = async () => {
  loading.value = true
  try {
    const response = await getUserInfo()
    if (response.code === 200) {
      userInfo.value = response.data
    }
  } catch (error: any) {
    console.log('获取用户信息:', error.response?.data?.msg)
  } finally {
    loading.value = false
  }
}

// ==================== ✅ 用户信息编辑功能 ====================
const showUserEditDialog = () => {
  userEditForm.value = {
    avatar: userStore.userInfo?.avatar || '',
    phone: userStore.userInfo?.phone || ''
  }
  avatarPreviewUrl.value = userStore.avatarUrl || ''
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
      const url = response.data
      userEditForm.value.avatar = url
      avatarPreviewUrl.value = url
      userStore.updateUserInfo({ avatar: url })
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
      avatar: userEditForm.value.avatar || undefined,
      phone: userEditForm.value.phone || undefined
    })
    
    if (response.code === 200) {
      ElMessage.success('用户信息更新成功')
      userEditDialogVisible.value = false
      
      userStore.updateUserInfo({
        avatar: userEditForm.value.avatar,
        phone: userEditForm.value.phone
      })
      
      await userStore.fetchUserBasicInfo()
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

const handleCancelEdit = () => {
  userEditDialogVisible.value = false
}

// ==================== 学生信息管理 ====================
const showBindDialog = () => {
  bindForm.value = {
    fullName: '',
    major: '',
    grade: 1,
    graduationYear: new Date().getFullYear() + 4,
  }
  bindDialogVisible.value = true
}

const bindStudent = async () => {
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
      await fetchUserInfo()
      await userStore.fetchStudentInfo()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '绑定失败')
  } finally {
    submitting.value = false
  }
}

const showEditDialog = () => {
  if (userInfo.value) {
    editForm.value = {
      fullName: userInfo.value.fullName || '',
      major: userInfo.value.major || '',
      grade: userInfo.value.grade || 1,
      graduationYear: userInfo.value.graduationYear || new Date().getFullYear() + 1,
    }
  }
  editDialogVisible.value = true
}

const updateStudent = async () => {
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
      await fetchUserInfo()
      await userStore.fetchStudentInfo()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '更新失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await userStore.fetchUserBasicInfo()
  await fetchUserInfo()
})
</script>

<template>
  <div class="page-container flex flex-col gap-5">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center h-96">
      <el-icon class="is-loading" :size="50"><Loading /></el-icon>
    </div>

    <!-- ✅ 始终显示内容 -->
    <template v-else>
      <!-- ✅ 用户基本信息 -->
      <el-card>
        <div class="flex items-center justify-between mb-4">
          <h4 class="page-title">用户基本信息</h4>
          <el-button type="primary" @click="showUserEditDialog">修改用户信息</el-button>
        </div>
        
        <div class="flex items-start gap-6 mb-4">
          <div class="flex-shrink-0">
            <el-avatar 
              :size="80" 
              :src="userStore.avatarUrl"
              class="border-2 border-gray-200"
            >
              <el-icon :size="40"><User /></el-icon>
            </el-avatar>
          </div>
          <div class="flex-1">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="用户ID">{{ userStore.userInfo?.userId }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ userStore.userInfo?.username }}</el-descriptions-item>
              <el-descriptions-item label="手机号">
                <span v-if="userStore.userInfo?.phone">{{ userStore.userInfo.phone }}</span>
                <span v-else class="text-gray-400">未设置</span>
              </el-descriptions-item>
              <el-descriptions-item label="邮箱（账号）" :span="2">
                <span>{{ userStore.userInfo?.username }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-card>

      <!-- ✅ 学生信息 -->
      <el-card class="student-info-card">
        <div class="flex items-center justify-between mb-4">
          <h4 class="page-title">学生信息</h4>
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
        <template v-if="currentStudentInfo">
          <el-descriptions :column="2" border class="mb-4">
            <el-descriptions-item label="学生邮箱（账号）">{{ currentStudentInfo.username }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ currentStudentInfo.fullName }}</el-descriptions-item>
            <el-descriptions-item label="专业">{{ currentStudentInfo.major }}</el-descriptions-item>
            <el-descriptions-item label="年级">
              <el-tag>{{ getGradeText(currentStudentInfo.grade) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="毕业年份">{{ currentStudentInfo.graduationYear }}</el-descriptions-item>
            <el-descriptions-item label="学业成绩">{{ currentStudentInfo.academicScore }}</el-descriptions-item>
            <el-descriptions-item label="专业成绩">{{ currentStudentInfo.specialtyScore }}</el-descriptions-item>
            <el-descriptions-item label="综合成绩">{{ currentStudentInfo.comprehensiveScore }}</el-descriptions-item>
            <el-descriptions-item label="GPA">{{ currentStudentInfo.gpa || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="确认状态">
              <el-tag :type="currentStudentInfo.isConfirmed ? 'success' : 'warning'">
                {{ currentStudentInfo.isConfirmed ? '已确认' : '未确认' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
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
        
        <el-form-item label="手机号">
          <el-input v-model="userEditForm.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleCancelEdit">取消</el-button>
        <el-button type="primary" @click="handleUpdateUserInfo" :loading="updatingUser">确定修改</el-button>
      </template>
    </el-dialog>

    <!-- ✅ 绑定学生信息弹窗（无需验证码，注册时已验证学校邮箱） -->
    <el-dialog v-model="bindDialogVisible" title="绑定学生信息" width="600px" :close-on-click-modal="false">
      <el-form :model="bindForm" label-width="120px">
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
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="bindStudent"
          :loading="submitting"
          :disabled="!canSubmitBindForm"
        >
          确定绑定
        </el-button>
      </template>
    </el-dialog>

    <!-- ✅ 修改学生信息弹窗（无需验证码） -->
    <el-dialog v-model="editDialogVisible" title="修改学生信息" width="600px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="姓名" required>
          <el-input v-model="editForm.fullName" placeholder="请输入姓名" maxlength="20" show-word-limit />
        </el-form-item>

        <el-form-item label="专业" required>
          <el-input v-model="editForm.major" placeholder="请输入专业" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="年级" required>
          <el-select v-model="editForm.grade" placeholder="请选择年级" style="width: 100%">
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
            v-model="editForm.graduationYear"
            :min="2000"
            :max="2035"
            controls-position="right"
            class="w-full"
          />
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
    background: linear-gradient(to bottom, #eef2ff 0%, #ffffff 100%);
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