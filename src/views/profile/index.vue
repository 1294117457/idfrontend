<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center h-96">
      <el-icon class="is-loading" :size="50"><Loading /></el-icon>
    </div>

    <!-- 未绑定学生信息 -->
    <el-card v-else-if="!userInfo">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-[20px] font-bold text-gray-800">绑定学生信息</h4>
      </div>
      <el-form :model="bindForm" label-width="120px">
        <el-form-item label="学生邮箱">
          <div class="flex gap-2 w-full">
            <el-input v-model="bindForm.email" placeholder="请输入学生邮箱(以@stu.xmu.edu.cn结尾)"></el-input>
            <el-button @click="sendCode" :disabled="countdown > 0">
              {{ countdown > 0 ? `${countdown}秒后重试` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="验证码">
          <el-input v-model="bindForm.code" placeholder="请输入验证码"></el-input>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="bindForm.fullName" placeholder="请输入姓名"></el-input>
        </el-form-item>
        <el-form-item label="专业">
          <el-input v-model="bindForm.major" placeholder="请输入专业"></el-input>
        </el-form-item>
        <el-form-item label="入学年份">
          <el-input-number v-model="bindForm.enrollmentYear" :min="2000" :max="2030" placeholder="请输入入学年份"></el-input-number>
        </el-form-item>
        <el-form-item label="毕业年份">
          <el-input-number v-model="bindForm.graduationYear" :min="2000" :max="2035" placeholder="请输入毕业年份"></el-input-number>
        </el-form-item>
        <el-button type="primary" @click="bindStudent" :loading="submitting">绑定学生信息</el-button>
      </el-form>
    </el-card>

    <!-- 已绑定学生信息 -->
    <template v-else>
      <!-- 用户基本信息 -->
      <el-card>
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-[20px] font-bold text-gray-800">用户基本信息</h4>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ userInfo.userId }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ userInfo.username }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ userInfo.phone || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ userInfo.email || '未设置' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 学生信息 -->
      <el-card class="student-info-card">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-[20px] font-bold text-gray-800">学生信息</h4>
          <el-button type="primary" @click="showEditDialog">修改学生信息</el-button>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="学号">{{ userInfo.studentId }}</el-descriptions-item>
          <el-descriptions-item label="学生邮箱">{{ userInfo.studentEmail }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ userInfo.fullName }}</el-descriptions-item>
          <el-descriptions-item label="专业">{{ userInfo.major }}</el-descriptions-item>
          <el-descriptions-item label="入学年份">{{ userInfo.enrollmentYear }}</el-descriptions-item>
          <el-descriptions-item label="毕业年份">{{ userInfo.graduationYear }}</el-descriptions-item>
          <el-descriptions-item label="学业成绩">{{ userInfo.academicScore }}</el-descriptions-item>
          <el-descriptions-item label="专业成绩">{{ userInfo.specialtyScore }}</el-descriptions-item>
          <el-descriptions-item label="综合成绩">{{ userInfo.comprehensiveScore }}</el-descriptions-item>
          <el-descriptions-item label="外语水平">{{ userInfo.foreignLanguageLevel || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="违纪次数">{{ userInfo.disciplinaryViolations }}</el-descriptions-item>
          <el-descriptions-item label="挂科次数">{{ userInfo.failedCourses }}</el-descriptions-item>
          <el-descriptions-item label="推荐状态">
            <el-tag :type="getStatusType(userInfo.recommendationStatus)">
              {{ getStatusText(userInfo.recommendationStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="特长备注" :span="2">
            {{ userInfo.specialSkillsRemark || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </template>

    <!-- 修改学生信息弹窗 -->
    <el-dialog v-model="editDialogVisible" title="修改学生信息" width="600px">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="学号">
          <el-input v-model="editForm.email.split('@')[0]" placeholder="学号将从邮箱自动提取" :disabled="true"></el-input>
        </el-form-item>
        <el-form-item label="学生邮箱" >
          <div class="flex gap-2 w-full">
            <el-input 
              v-model="editForm.email " 
              placeholder="请输入学生邮箱(以@stu.xmu.edu.cn结尾)"
              :disabled="true"
            ></el-input>
            <el-button @click="sendEditCode" :disabled="editCountdown > 0">
              {{ editCountdown > 0 ? `${editCountdown}秒后重试` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="验证码">
          <el-input v-model="editForm.code" placeholder="请输入验证码"></el-input>
        </el-form-item>
        
        <el-form-item label="姓名">
          <el-input v-model="editForm.fullName" placeholder="请输入姓名"></el-input>
        </el-form-item>
        
        <el-form-item label="专业">
          <el-input v-model="editForm.major" placeholder="请输入专业"></el-input>
        </el-form-item>
        
        <el-divider>以下信息仅供查看</el-divider>
        
        <el-form-item label="入学年份">
          <el-input :value="userInfo?.enrollmentYear" disabled></el-input>
        </el-form-item>
        
        <el-form-item label="毕业年份">
          <el-input :value="userInfo?.graduationYear" disabled></el-input>
        </el-form-item>
        
        <el-form-item label="学业成绩">
          <el-input :value="userInfo?.academicScore" disabled></el-input>
        </el-form-item>
        
        <el-form-item label="专业成绩">
          <el-input :value="userInfo?.specialtyScore" disabled></el-input>
        </el-form-item>
        
        <el-form-item label="综合成绩">
          <el-input :value="userInfo?.comprehensiveScore" disabled></el-input>
        </el-form-item>
        
        <el-form-item label="外语水平">
          <el-input :value="userInfo?.foreignLanguageLevel || '未设置'" disabled></el-input>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateStudent" :loading="submitting">确定修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import {
  type UserInfoItem,
  type StudentItem,
  type UpdateStudentItem,
  sendEmailCode,
  bindStudentInfo,
  getUserInfo,
  updateStudentInfo
} from '@/api/components/apiProfile'

const loading = ref(true)
const submitting = ref(false)
const userInfo = ref<UserInfoItem | null>(null)
const editDialogVisible = ref(false)
const countdown = ref(0)
const editCountdown = ref(0)

// 绑定表单
const bindForm = ref<StudentItem>({
  email: '',
  code: '',
  fullName: '',
  major: '',
  enrollmentYear: new Date().getFullYear(),
  graduationYear: new Date().getFullYear() + 4,
})

// 编辑表单
const editForm = ref<UpdateStudentItem>({
  email: '',
  code: '',
  fullName: '',
  major: '',
})

// 获取用户信息
const fetchUserInfo = async () => {
  loading.value = true
  try {
    const response = await getUserInfo()
    if (response.code === 200) {
      userInfo.value = response.data
    } else {
      // 用户未绑定学生信息
      userInfo.value = null
    }
  } catch (error: any) {
    if (error.response?.status === 400 || error.response?.data?.msg?.includes('未绑定')) {
      userInfo.value = null
    } else {
      ElMessage.error('获取用户信息失败')
    }
  } finally {
    loading.value = false
  }
}

// 发送验证码(绑定时)
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
      ElMessage.success('验证码已发送')
      // 开始倒计时
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

// 发送验证码(修改时)
const sendEditCode = async () => {
  if (!editForm.value.email) {
    ElMessage.warning('请输入新的学生邮箱')
    return
  }
  if (!editForm.value.email.endsWith('@stu.xmu.edu.cn')) {
    ElMessage.warning('邮箱必须以@stu.xmu.edu.cn结尾')
    return
  }
  
  try {
    const response = await sendEmailCode(editForm.value.email)
    if (response.code === 200) {
      ElMessage.success('验证码已发送')
      // 开始倒计时
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

// 绑定学生信息
const bindStudent = async () => {
  if (!bindForm.value.email || !bindForm.value.code || !bindForm.value.fullName || !bindForm.value.major) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  submitting.value = true
  try {
    const response = await bindStudentInfo(bindForm.value)
    if (response.code === 200) {
      ElMessage.success('学生信息绑定成功')
      await fetchUserInfo()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '绑定失败')
  } finally {
    submitting.value = false
  }
}

// 显示编辑弹窗
const showEditDialog = () => {
  if (userInfo.value) {
    editForm.value = {
      email: userInfo.value.studentEmail,
      code: '',
      fullName: userInfo.value.fullName,
      major: userInfo.value.major,
    }
  }
  editDialogVisible.value = true
}

// 更新学生信息
const updateStudent = async () => {
  if (!editForm.value.email || !editForm.value.code || !editForm.value.fullName || !editForm.value.major) {
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
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '更新失败')
  } finally {
    submitting.value = false
  }
}

// 获取推荐状态类型
const getStatusType = (status: string) => {
  const statusMap: Record<string, any> = {
    'eligible': 'success',
    'ineligible': 'danger',
    'pending': 'warning'
  }
  return statusMap[status] || 'info'
}

// 获取推荐状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'eligible': '符合条件',
    'ineligible': '不符合条件',
    'pending': '待审核'
  }
  return textMap[status] || status
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.student-info-card {
  background: linear-gradient(to bottom, #e3f2fd 0%, #ffffff 100%);
}

.student-info-card :deep(.el-card__body) {
  background: transparent;
}
</style>