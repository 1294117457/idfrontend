<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center h-96">
      <el-icon class="is-loading" :size="50"><Loading /></el-icon>
    </div>

    <!-- 未绑定学生信息提示 -->
    <el-card class="min-h-[100vh]" v-else-if="!userInfo">
      <el-empty description="请先完成学生信息绑定">
        <el-button type="primary" @click="$router.push('/home/profile')">前往绑定</el-button>
      </el-empty>
    </el-card>

    <!-- 保研条件认证管理 -->
    <el-card class="min-h-[100vh]" v-else>
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
        
        <!-- ✅ 使用新的 FileUtil 组件显示已有认证材料 -->
        <div v-if="existingProofFiles.length > 0" class="mt-4">
          <el-divider content-position="left">认证材料</el-divider>
          <FileUtil
            v-model="existingProofFiles"
            :show-upload-button="false"
            :show-preview-button="true"
            :show-download-button="true"
            :show-delete-button="false"
            :disabled="true"
          />
        </div>
      </div>

      <el-empty v-else description="暂未填写保研条件认证信息" />
    </el-card>

    <!-- 保研条件认证弹窗 -->
    <el-dialog 
      v-model="demandDialogVisible" 
      :title="hasDemandData ? '修改认证信息' : '填写认证信息'"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="templates.length > 0">
        <div 
          v-for="(template, index) in templates" 
          :key="template.id"
          class="demand-row mb-4 p-4 border rounded hover:bg-gray-50"
        >
          <div class="flex items-center gap-4">
            <div class="flex-none w-40">
              <span class="font-semibold">{{ index + 1 }}. {{ template.templateName }}</span>
            </div>

            <div class="flex-none w-32" v-if="template.conditions && template.conditions.length > 0">
              <el-select 
                :model-value="getDemandFormValue(template.id, 'selectedCondition')"
                @update:model-value="(val: string) => updateDemandForm(template.id, 'selectedCondition', val)"
                placeholder="选择条件"
                size="small"
                clearable
              >
                <el-option 
                  v-for="cond in template.conditions" 
                  :key="cond" 
                  :label="cond" 
                  :value="cond" 
                />
              </el-select>
            </div>

            <div class="flex-1">
              <el-input 
                :model-value="getDemandFormValue(template.id, 'inputValue')"
                @update:model-value="(val: string) => updateDemandForm(template.id, 'inputValue', val)"
                :placeholder="template.placeholder || '请输入'"
                size="small"
              />
            </div>
          </div>
        </div>

        <!-- ✅ 使用新的 FileUtil 组件上传认证材料 -->
        <el-divider content-position="left">认证材料</el-divider>
        <FileUtil
          v-model="uploadProofFiles"
          :limit="5"
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
          upload-text="上传认证材料"
          tip-text="支持格式: 图片、PDF、Word、Excel，最多5个文件"
          :show-upload-button="true"
          :show-preview-button="true"
          :show-download-button="false"
          :show-delete-button="true"
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
import { Loading } from '@element-plus/icons-vue'
import {
  type UserInfoItem,
  getUserInfo
} from '@/api/components/apiProfile'
import { 
  getActiveTemplates, 
  saveDemandApplicationWithFileIds,  // ✅ 使用新的保存接口
  type DemandTemplate, 
  type DemandApplicationItem 
} from '@/api/components/apiDemand'
import { type ProofFileItem } from '@/api/components/apiScore'
import FileUtil from '@/components/fileUtil.vue'
import { useUserStore } from '@/stores/profile'

const userStore = useUserStore()

// ==================== 基础数据 ====================
const loading = ref(true)
const userInfo = ref<UserInfoItem | null>(null)

// ==================== 需求认证相关 ====================
const demandDialogVisible = ref(false)
const loadingTemplates = ref(false)
const savingDemand = ref(false)
const templates = ref<DemandTemplate[]>([])
const demandForm = ref<Record<number, DemandApplicationItem>>({})

// ✅ 使用新的文件格式
const uploadProofFiles = ref<ProofFileItem[]>([])      // 上传弹窗中的文件
const existingProofFiles = ref<ProofFileItem[]>([])    // 已保存的文件（显示用）

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

// ==================== 基础功能函数 ====================
const fetchUserInfo = async () => {
  loading.value = true
  try {
    const response = await getUserInfo()
    if (response.code === 200) {
      userInfo.value = response.data
      
      // ✅ 解析已有的认证材料（新格式）
      if (userInfo.value.demandFiles) {
        existingProofFiles.value = parseProofFiles(userInfo.value.demandFiles)
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

// ✅ 解析证明文件（支持新旧格式）
const parseProofFiles = (json: string): ProofFileItem[] => {
  if (!json) return []
  try {
    const files = JSON.parse(json)
    if (!Array.isArray(files)) return []
    
    // ✅ 检查是否为新格式 [{fileId, fileName}]
    if (files.length > 0 && typeof files[0] === 'object' && files[0].fileId !== undefined) {
      return files as ProofFileItem[]
    }
    
    // ✅ 兼容旧格式（字符串数组）
    return files.map((item: string, index: number) => ({
      fileId: 0,
      fileName: `认证材料${index + 1}`
    }))
  } catch {
    return []
  }
}

// ==================== 需求认证功能 ====================
const openDemandDialog = async () => {
  loadingTemplates.value = true
  try {
    const response = await getActiveTemplates()
    if (response.code === 200) {
      templates.value = response.data || []
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
  uploadProofFiles.value = []  // ✅ 清空上传文件列表
  
  templates.value.forEach(template => {
    demandForm.value[template.id] = {
      templateId: template.id,
      templateName: template.templateName,
      selectedCondition: '',
      inputValue: ''
    }
  })
  
  // ✅ 如果有已保存的数据，填充表单
  if (hasDemandData.value) {
    demandApplications.value.forEach((app: DemandApplicationItem) => {
      const template = templates.value.find(t => t.id === app.templateId)
      if (template && demandForm.value[template.id]) {
        demandForm.value[template.id].selectedCondition = app.selectedCondition
        demandForm.value[template.id].inputValue = app.inputValue
      }
    })
    
    // ✅ 加载已有文件到上传列表
    uploadProofFiles.value = [...existingProofFiles.value]
  }
}

const getDemandFormValue = (templateId: number, field: 'selectedCondition' | 'inputValue'): string => {
  if (!demandForm.value[templateId]) {
    return ''
  }
  return demandForm.value[templateId][field] || ''
}

const updateDemandForm = (templateId: number, field: 'selectedCondition' | 'inputValue', value: string) => {
  if (!demandForm.value[templateId]) {
    const template = templates.value.find(t => t.id === templateId)
    if (template) {
      demandForm.value[templateId] = {
        templateId: template.id,
        templateName: template.templateName,
        selectedCondition: '',
        inputValue: ''
      }
    }
  }
  
  if (demandForm.value[templateId]) {
    demandForm.value[templateId][field] = value || ''
  }
}

// ✅ 保存需求认证（使用新的文件格式）
const handleSaveDemand = async () => {
  try {
    const applications: DemandApplicationItem[] = []
    
    Object.values(demandForm.value).forEach(item => {
      if (item.inputValue.trim()) {
        applications.push({
          templateId: item.templateId,
          templateName: item.templateName,
          selectedCondition: item.selectedCondition,
          inputValue: item.inputValue.trim()
        })
      }
    })
    
    if (applications.length === 0) {
      ElMessage.warning('请至少填写一个条件的内容')
      return
    }
    
    savingDemand.value = true
    
    // ✅ 使用新的保存接口（传递 fileId 列表）
    const response = await saveDemandApplicationWithFileIds(applications, uploadProofFiles.value)
    
    if (response.code === 200) {
      ElMessage.success('保存成功!')
      demandDialogVisible.value = false
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

// ==================== 生命周期 ====================
onMounted(async () => {
  await userStore.fetchUserBasicInfo()
  await fetchUserInfo()
})
</script>

<style scoped>
.demand-row {
  transition: all 0.2s ease;
}

.demand-row:hover {
  border-color: #3377FF;
}
</style>