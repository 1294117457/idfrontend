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

      <!-- 学生信息 (移除不需要的字段) -->
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
          <el-descriptions-item label="GPA">{{ userInfo.gpa || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="确认状态">
            <el-tag :type="userInfo.isConfirmed ? 'success' : 'warning'">
              {{ userInfo.isConfirmed ? '已确认' : '未确认' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- ✅ 保研条件框 -->
      <el-card>
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-[20px] font-bold text-gray-800">保研条件认证</h4>
          <el-button 
            type="primary" 
            @click="openDemandDialog"
            :loading="loadingTemplates"
          >
            {{ hasDemandData ? '修改认证信息' : '填写认证信息' }}
          </el-button>
        </div>

        <!-- 已有认证信息展示 -->
        <div v-if="hasDemandData && demandApplications.length > 0">
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
          
          <!-- 已上传的文件展示 -->
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

        <!-- 暂无认证信息 -->
        <el-empty v-else description="暂未填写保研条件认证信息" />
      </el-card>
    </template>

    <!-- 修改学生信息弹窗 (简化) -->
    <el-dialog v-model="editDialogVisible" title="修改学生信息" width="600px">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.fullName" placeholder="请输入姓名"></el-input>
        </el-form-item>
        <el-form-item label="专业">
          <el-input v-model="editForm.major" placeholder="请输入专业"></el-input>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateStudent" :loading="submitting">确定修改</el-button>
      </template>
    </el-dialog>

    <!-- ✅ 保研条件认证弹窗 -->
    <el-dialog 
      v-model="demandDialogVisible" 
      :title="hasDemandData ? '修改认证信息' : '填写认证信息'"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="templates.length > 0">
        <!-- 模板列表 -->
        <div 
          v-for="(template, index) in templates" 
          :key="template.id"
          class="demand-row mb-4 p-4 border rounded hover:bg-gray-50"
        >
          <div class="flex items-center gap-4">
            <!-- 模板名称 -->
            <div class="flex-none w-40">
              <span class="font-semibold">{{ index + 1 }}. {{ template.templateName }}</span>
              <el-tooltip v-if="template.description" :content="template.description" placement="top">
                <el-icon class="ml-2 text-gray-400 cursor-pointer"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>

            <!-- ✅ 条件选择 - 修复赋值问题 -->
            <div class="flex-none w-32">
              <el-select 
                v-if="template.conditions && template.conditions.length > 0"
                :model-value="getDemandFormValue(template.id, 'selectedCondition')"
                @update:model-value="updateDemandForm(template.id, 'selectedCondition', $event)"
                placeholder="请选择"
                clearable
                size="default"
              >
                <el-option 
                  v-for="condition in template.conditions" 
                  :key="condition" 
                  :label="condition" 
                  :value="condition" 
                />
              </el-select>
              <span v-else class="text-gray-400">无需选择</span>
            </div>

            <!-- ✅ 输入框 - 修复赋值问题 -->
            <div class="flex-1">
              <el-input
                :model-value="getDemandFormValue(template.id, 'inputValue')"
                @update:model-value="updateDemandForm(template.id, 'inputValue', $event)"
                :placeholder="template.description || '请输入内容'"
                maxlength="200"
                show-word-limit
                clearable
              />
            </div>
          </div>
        </div>

        <!-- 文件上传 -->
        <el-divider content-position="left">认证材料</el-divider>
        <FileUtil
          v-model="fileList"
          :limit="5"
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
          :icon-size="20"
          upload-text="上传附件"
          tip-text="支持格式: 图片、PDF、Word、Excel,最多5个文件"
          :show-file-list="true"
          :show-preview-button="true"
          :show-delete-button="true"
          :show-upload-button="true"
        />
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="demandDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveDemand" :loading="savingDemand">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, QuestionFilled } from '@element-plus/icons-vue'
import type { UploadUserFile } from 'element-plus'
import {
  type UserInfoItem,
  type StudentItem,
  type UpdateStudentItem,
  sendEmailCode,
  bindStudentInfo,
  getUserInfo,
  updateStudentInfo
} from '@/api/components/apiProfile'
import { getActiveTemplates, saveDemandApplication, type DemandTemplate, type DemandApplicationItem } from '@/api/components/apiDemand'
import { getFileUrl } from '@/api/components/apiScore'
import FileUtil from '@/components/fileUtil.vue'

// ==================== 基础数据 ====================
const loading = ref(true)
const submitting = ref(false)
const userInfo = ref<UserInfoItem | null>(null)
const editDialogVisible = ref(false)
const countdown = ref(0)
const editCountdown = ref(0)

// ==================== 需求认证相关 ====================
const demandDialogVisible = ref(false)
const loadingTemplates = ref(false)
const savingDemand = ref(false)
const templates = ref<DemandTemplate[]>([])
const demandForm = ref<Record<number, DemandApplicationItem>>({})
const fileList = ref<UploadUserFile[]>([])
const previewFileList = ref<UploadUserFile[]>([])

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

// ==================== 计算属性 ====================
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
      
      // 加载已有的认证材料到预览列表
      if (userInfo.value.demandFiles) {
        const files = JSON.parse(userInfo.value.demandFiles)
        previewFileList.value = files.map((url: string, index: number) => ({
          name: `认证材料${index + 1}.${getFileExtFromUrl(url)}`,
          url: url,
          uid: Date.now() + index,
          status: 'success' as const
        }))
      }
    } else {
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

// ==================== 需求认证功能 ====================
const openDemandDialog = async () => {
  loadingTemplates.value = true
  try {
    // 加载模板
    const response = await getActiveTemplates()
    if (response.code === 200) {
      templates.value = response.data || []
      
      // 初始化表单
      initDemandForm()
      
      demandDialogVisible.value = true
    } else {
      ElMessage.error('加载模板失败')
    }
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败')
  } finally {
    loadingTemplates.value = false
  }
}

const initDemandForm = () => {
  demandForm.value = {}
  fileList.value = []
  
  // 初始化每个模板的表单数据
  templates.value.forEach(template => {
    demandForm.value[template.id] = {
      templateId: template.id,
      templateName: template.templateName,
      selectedCondition: '',
      inputValue: ''
    }
  })
  
  // 如果有已保存的数据,回显
  if (hasDemandData.value) {
    demandApplications.value.forEach((app: DemandApplicationItem) => {
      const template = templates.value.find(t => t.id === app.templateId)
      if (template && demandForm.value[template.id]) {
        demandForm.value[template.id] = { ...app }
      }
    })
  }
}
// ✅ 新增辅助函数 - 安全获取表单值
const getDemandFormValue = (templateId: number, field: 'selectedCondition' | 'inputValue'): string => {
  if (!demandForm.value[templateId]) {
    return ''
  }
  return demandForm.value[templateId][field] || ''
}
// ✅ 修改 updateDemandForm 函数 - 确保对象存在
const updateDemandForm = (templateId: number, field: 'selectedCondition' | 'inputValue', value: string) => {
  // ✅ 确保对象存在
  if (!demandForm.value[templateId]) {
    const template = templates.value.find(t => t.id === templateId)
    if (template) {
      demandForm.value[templateId] = {
        templateId: templateId,
        templateName: template.templateName,
        selectedCondition: '',
        inputValue: ''
      }
    }
  }
  
  // ✅ 安全赋值
  if (demandForm.value[templateId]) {
    demandForm.value[templateId][field] = value || ''
  }
}

const handleSaveDemand = async () => {
  try {
    // 验证必填项
    const applications: DemandApplicationItem[] = []
    let hasError = false
    
    Object.values(demandForm.value).forEach(item => {
      if (item.inputValue.trim()) {
        applications.push(item)
      }
    })
    
    if (applications.length === 0) {
      ElMessage.warning('请至少填写一个条件的内容')
      return
    }
    
    // 提取文件
    const files = fileList.value
      .filter(item => item.raw)
      .map(item => item.raw as File)
    
    savingDemand.value = true
    const response = await saveDemandApplication(applications, files)
    
    if (response.code === 200) {
      ElMessage.success('保存成功!')
      demandDialogVisible.value = false
      
      // 重新加载用户信息
      await fetchUserInfo()
    } else {
      ElMessage.error('保存失败: ' + (response.msg || '未知错误'))
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    savingDemand.value = false
  }
}

// ==================== 学生信息管理 ====================
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
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '更新失败')
  } finally {
    submitting.value = false
  }
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

.demand-row {
  transition: all 0.2s ease;
}

.demand-row:hover {
  border-color: #3377FF;
}
</style>