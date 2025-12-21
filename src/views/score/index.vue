<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import {
  getAvailableTemplates,
  getTemplateDetail,
  submitBonusApplication,
  type SubmitBonusApplicationDto,
  type ProofItemInput
} from '@/api/components/apiScore'
import { useUserStore } from '@/stores/profile'
import FileUtil from '@/components/fileUtil.vue'
import FileTable from '@/components/FileTable.vue' 
import type { FileTableItem } from '@/components/FileTable.vue'

// ==================== 用户信息 ====================
const userStore = useUserStore()

// ==================== 页面状态 ====================
const activeTab = ref('academic')
const loading = ref(true)
const submitting = ref(false)
const applyDialogVisible = ref(false)

// ==================== 模板数据（保持不变） ====================
const allTemplates = ref<any[]>([])

const academicTemplates = computed(() => 
  allTemplates.value.filter(t => t.scoreType === 0)
)

const comprehensiveTemplates = computed(() => 
  allTemplates.value.filter(t => t.scoreType === 1)
)

const academicGradeTemplates = computed(() => 
  allTemplates.value.filter(t => t.scoreType === 2)
)

// ==================== 申请表单数据 ====================
const selectedTemplate = ref<any>(null)
const templateAttributes = ref<string[]>([])
const attributeOptions = ref<Record<string, any[]>>({})

// ✅ 修改：使用新的文件格式
const proofItems = ref<FileTableItem[]>([])

const applyForm = reactive({
  templateId: '',
  attributeValues: {} as Record<string, any>,
  remark: ''
})

// ==================== 换算规则相关（保持不变） ====================
const hasConversionRule = ref(false)
const conversionInput = ref(0)
const convertedScore = ref(0)
const matchedConversionRule = ref<any>(null)
const conversionRules = ref<any[]>([])

// ==================== 时长规则相关（保持不变） ====================
const hasTimeRule = ref(false)
const timeUnit = ref<string>('')
const timeStandard = ref<number>(0)
const scorePerUnit = ref<number>(0)
const calculatedTimeScore = ref<number>(0)

// ==================== 普通规则相关（保持不变） ====================
const matchedNormalRule = ref<any>(null)
const currentTemplateRules = ref<any[]>([])
// ==================== ✅ 计算预期总分 ====================
const totalProofScore = computed(() => {
  return proofItems.value.reduce((sum, item) => sum + (Number(item.fileValue) || 0), 0)
})

// ✅ 分数变化回调（可选）
const handleProofValueChange = (file: FileTableItem, index: number) => {
  console.log(`文件 ${file.fileName} 的分数变更为: ${file.fileValue}`)
}


const finalCalculatedScore = computed(() => {
  if (hasConversionRule.value) {
    return convertedScore.value
  } else if (hasTimeRule.value && calculatedTimeScore.value) {
    return calculatedTimeScore.value
  } else if (matchedNormalRule.value) {
    return (selectedTemplate.value.maxScore || 0) * (matchedNormalRule.value.scorePercentage / 100)
  }
  return 0
})
// ==================== ✅ FileUtil 文件变化处理 ====================
const handleFileChange = (files: Array<{ fileId: number; fileName: string }>) => {
  // 保留已有的分数，新增文件分数为 0
  const existingMap = new Map(proofItems.value.map(item => [item.fileId, item]))
  
  proofItems.value = files.map(file => {
    const existing = existingMap.get(file.fileId)
    return {
      fileId: file.fileId,
      fileName: file.fileName,
      proofScore: existing?.proofScore || 0,
      remark: existing?.remark || file.fileName
    }
  })
}

// ==================== ✅ 删除证明材料 ====================
const handleDeleteProof = (index: number) => {
  proofItems.value.splice(index, 1)
}

// ==================== ✅ 分数输入校验 ====================
const handleScoreInput = (index: number) => {
  const item = proofItems.value[index]
  if (item.proofScore < 0) {
    item.proofScore = 0
  }
  // 保留两位小数
  item.proofScore = Math.round(item.proofScore * 100) / 100
}

// ==================== 数据加载函数（保持不变） ====================
const loadTemplates = async () => {
  try {
    const response = await getAvailableTemplates()
    if (response.code === 200) {
      allTemplates.value = response.data || []
    } else {
      ElMessage.error('加载模板失败')
    }
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败')
  } finally {
    loading.value = false
  }
}


// ==================== 申请弹窗相关函数 ====================
const openApplyDialog = async (template: any) => {
  try {
    selectedTemplate.value = template
    applyForm.templateId = template.id
    applyForm.attributeValues = {}
    applyForm.remark = ''
    
    // ✅ 清空证明材料列表
    proofItems.value = []
    
    matchedNormalRule.value = null
    conversionInput.value = 0
    convertedScore.value = 0
    matchedConversionRule.value = null

    const response = await getTemplateDetail(template.id)
    if (response.code !== 200) {
      ElMessage.error('获取模板详情失败')
      return
    }

    const templateDetail = response.data
    const rules = templateDetail.rules || []
    
    currentTemplateRules.value = rules
    selectedTemplate.value.maxScore = templateDetail.maxScore
    selectedTemplate.value.reviewCount = templateDetail.reviewCount
    
    const hasConversion = rules.some((rule: any) => {
      try {
        const conditions = JSON.parse(rule.conditions)
        return conditions.分数换算
      } catch {
        return false
      }
    })
    
    hasConversionRule.value = hasConversion
    
    if (hasConversion) {
      initConversionRules(rules)
    } else {
      initNormalRules(rules)
    }
    
    applyDialogVisible.value = true
  } catch (error) {
    console.error('打开申请弹窗失败:', error)
    ElMessage.error('打开申请弹窗失败')
  }
}

// ==================== 规则初始化（保持原有逻辑） ====================
const initConversionRules = (rules: any[]) => {
  conversionRules.value = rules
    .filter((rule: any) => {
      try {
        const cond = JSON.parse(rule.conditions)
        return cond.分数换算
      } catch {
        return false
      }
    })
    .map((rule: any) => {
      const cond = JSON.parse(rule.conditions)
      return {
        ruleName: rule.ruleName,
        formula: cond.分数换算.formula,
        minRange: cond.分数换算.minRange,
        maxRange: cond.分数换算.maxRange,
        scorePercentage: rule.scorePercentage,
        priority: rule.priority || 0
      }
    })
    .sort((a: any, b: any) => b.priority - a.priority)
  
  conversionInput.value = 0
  convertedScore.value = 0
  matchedConversionRule.value = null
}

const initNormalRules = (rules: any[]) => {
  const attributeSet = new Set<string>()
  const options: Record<string, Set<string>> = {}
  
  const timeRule = rules.find((rule: any) => rule.timeStandard && rule.timeUnit)
  if (timeRule) {
    hasTimeRule.value = true
    timeUnit.value = timeRule.timeUnit
    timeStandard.value = timeRule.timeStandard
    scorePerUnit.value = timeRule.scorePerUnit
    attributeSet.add('项目时长')
  } else {
    hasTimeRule.value = false
  }
  
  rules.forEach((rule: any) => {
    try {
      const conditions = JSON.parse(rule.conditions)
      Object.entries(conditions).forEach(([key, value]) => {
        if (key !== '分数换算') {
          attributeSet.add(key)
          if (!options[key]) options[key] = new Set()
          options[key].add(value as string)
        }
      })
    } catch (error) {
      console.error('解析规则失败:', error)
    }
  })
  
  templateAttributes.value = Array.from(attributeSet)
  attributeOptions.value = {}
  Object.keys(options).forEach(key => {
    attributeOptions.value[key] = Array.from(options[key])
  })
}

// ==================== 分数计算相关函数（保持原有逻辑） ====================
const handleConversionInput = (value: number | undefined) => {
  if (value === undefined || value < 0) {
    convertedScore.value = 0
    matchedConversionRule.value = null
    return
  }
  
  const matchedRule = conversionRules.value.find(rule => 
    value >= rule.minRange && value <= rule.maxRange
  )
  
  if (matchedRule) {
    matchedConversionRule.value = matchedRule
    const formulaResult = evaluateFormula(matchedRule.formula, value)
    const percentage = matchedRule.scorePercentage / 100
    convertedScore.value = Number((formulaResult * percentage * (selectedTemplate.value.maxScore || 100) / 100).toFixed(2))
  } else {
    matchedConversionRule.value = null
    convertedScore.value = 0
  }
}

const evaluateFormula = (formula: string, inputValue: number): number => {
  try {
    const expression = formula.replace(/INPUT/g, inputValue.toString())
    const result = new Function(`return ${expression}`)()
    return Number(result.toFixed(2))
  } catch (error) {
    console.error('公式计算错误:', error)
    ElMessage.error('公式计算错误')
    return 0
  }
}

const getConversionRangeText = (): string => {
  if (!conversionInput.value) return '请输入分数'
  if (matchedConversionRule.value) {
    return `匹配区间: ${matchedConversionRule.value.minRange}-${matchedConversionRule.value.maxRange}`
  }
  return '未找到匹配的换算规则'
}

const calculateMatchedScore = () => {
  const rules = currentTemplateRules.value
  
  for (const rule of rules) {
    try {
      const conditions = JSON.parse(rule.conditions)
      let allMatch = true
      
      for (const [key, value] of Object.entries(conditions)) {
        if (key === '分数换算') continue
        if (applyForm.attributeValues[key] !== String(value)) {
          allMatch = false
          break
        }
      }
      
      if (allMatch) {
        matchedNormalRule.value = rule
        return
      }
    } catch (error) {
      console.error('解析规则失败:', error)
    }
  }
  
  matchedNormalRule.value = null
}

const calculateTimeScore = () => {
  const inputTime = applyForm.attributeValues['项目时长']
  if (inputTime && timeStandard.value && scorePerUnit.value) {
    calculatedTimeScore.value = (inputTime / timeStandard.value) * scorePerUnit.value
  } else {
    calculatedTimeScore.value = 0
  }
}

const getTimeUnitLabel = (unit: string) => {
  const map: Record<string, string> = {
    hour: '小时',
    day: '天',
    month: '月',
    year: '年'
  }
  return map[unit] || unit
}

// ==================== ✅ 提交申请（修改文件部分） ====================
const handleSubmitApply = async () => {
  try {
    if (!userStore.hasStudentInfo) {
      ElMessage.warning('请先完善学生信息')
      return
    }

    // ✅ 验证证明材料
    if (proofItems.value.length === 0) {
      ElMessage.warning('请至少上传一个证明材料')
      return
    }

    // ✅ 修正：使用 fileValue 而不是 proofScore
    const invalidItems = proofItems.value.filter(item => {
      const score = Number(item.fileValue)
      return !item.fileValue || isNaN(score) || score <= 0
    })
    
    if (invalidItems.length > 0) {
      ElMessage.warning('请为所有证明材料填写有效分数')
      return
    }

    // ✅ 构建提交数据
    const submitData: SubmitBonusApplicationDto = {
      studentId: userStore.studentInfo!.studentId,
      studentName: userStore.studentInfo!.fullName,
      major: userStore.studentInfo!.major,
      enrollmentYear: userStore.studentInfo!.enrollmentYear,
      templateName: selectedTemplate.value.templateName,
      scoreType: selectedTemplate.value.scoreType,
      applyScore: totalProofScore.value,  // ✅ 已经在 computed 中处理
      reviewCount: selectedTemplate.value.reviewCount,
      proofItems: proofItems.value.map(item => ({
        proofFileId: item.fileId,
        proofScore: Number(item.fileValue) || 0,  // ✅ 使用 fileValue
        remark: item.fileName
      })),
      ruleValues: {},
      remark: applyForm.remark
    }

    // 换算规则提交
    if (hasConversionRule.value) {
      if (!matchedConversionRule.value) {
        ElMessage.error('请输入有效的分数进行换算')
        return
      }
      
      submitData.ruleValues = {
        '分数换算': {
          输入分数: conversionInput.value,
          匹配规则: matchedConversionRule.value.ruleName,
          换算后分数: convertedScore.value
        }
      }
    } 
    // 普通规则提交
    else {
      const missingAttrs = templateAttributes.value.filter(attr => {
        const value = applyForm.attributeValues[attr]
        return value === undefined || value === null || value === ''
      })

      if (missingAttrs.length > 0) {
        ElMessage.error(`请填写: ${missingAttrs.join(', ')}`)
        return
      }

      if (!matchedNormalRule.value && !hasTimeRule.value) {
        calculateMatchedScore()
        if (!matchedNormalRule.value) {
          ElMessage.error('未匹配到评分规则，请检查填写内容')
          return
        }
      }

      submitData.ruleValues = { ...applyForm.attributeValues }
    }

    submitting.value = true
    const response = await submitBonusApplication(submitData)
    
    if (response.code === 200) {
      ElMessage.success('提交成功!')
      applyDialogVisible.value = false
      resetApplyForm()
    } else {
      ElMessage.error('提交失败: ' + (response.msg || '未知错误'))
    }
  } catch (error: any) {
    console.error('提交申请失败:', error)
    ElMessage.error('提交申请失败')
  } finally {
    submitting.value = false
  }
}

// ✅ 重置表单
const resetApplyForm = () => {
  conversionInput.value = 0
  convertedScore.value = 0
  matchedConversionRule.value = null
  matchedNormalRule.value = null
  applyForm.attributeValues = {}
  applyForm.remark = ''
  proofItems.value = []
}
// ==================== 生命周期 ====================
onMounted(async () => {
  await userStore.fetchStudentInfo()
  loadTemplates()
})
</script>
<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center h-96">
      <el-icon class="is-loading" :size="50"><Loading /></el-icon>
    </div>

    <el-card class="min-h-[100vh]" v-else>
      <!-- 顶部分数统计 -->
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-[20px] font-bold text-gray-800">加分项申请</h4>
        <div>
          <el-tag type="primary" size="large">学术专长: {{ userStore.studentInfo?.specialtyScore || 0 }}/12分</el-tag>
          <el-tag type="success" size="large" class="ml-2">综合表现: {{ userStore.studentInfo?.comprehensiveScore || 0 }}/8分</el-tag>
          <el-tag type="warning" size="large" class="ml-2">学业成绩: {{ userStore.studentInfo?.academicScore || 0 }}/80分</el-tag>
        </div>
      </div>

      <!-- 模板选择 Tabs -->
      <el-tabs v-model="activeTab">
        <!-- 学术专长 -->
        <el-tab-pane label="学术专长(12分)" name="academic">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <el-card 
              v-for="template in academicTemplates" 
              :key="template.id"
              shadow="hover"
              class="cursor-pointer hover:border-blue-500 transition-all"
              @click="openApplyDialog(template)"
            >
              <div class="text-center">
                <h5 class="text-lg font-bold mb-2">{{ template.templateName }}</h5>
                <el-tag type="primary">最高{{ template.maxScore }}分</el-tag>
                <p class="text-sm text-gray-500 mt-2 line-clamp-2">{{ template.description }}</p>
                <el-button type="primary" size="small" class="mt-3">申请加分</el-button>
              </div>
            </el-card>
            <el-empty v-if="academicTemplates.length === 0" description="暂无可用模板" />
          </div>
        </el-tab-pane>

        <!-- 综合表现 -->
        <el-tab-pane label="综合表现(8分)" name="comprehensive">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <el-card 
              v-for="template in comprehensiveTemplates" 
              :key="template.id"
              shadow="hover"
              class="cursor-pointer hover:border-green-500 transition-all"
              @click="openApplyDialog(template)"
            >
              <div class="text-center">
                <h5 class="text-lg font-bold mb-2">{{ template.templateName }}</h5>
                <el-tag type="success">最高{{ template.maxScore }}分</el-tag>
                <p class="text-sm text-gray-500 mt-2 line-clamp-2">{{ template.description }}</p>
                <el-button type="success" size="small" class="mt-3">申请加分</el-button>
              </div>
            </el-card>
            <el-empty v-if="comprehensiveTemplates.length === 0" description="暂无可用模板" />
          </div>
        </el-tab-pane>

        <!-- 学业成绩换算 -->
        <el-tab-pane label="学业成绩换算(80分)" name="academicGrade">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <el-card 
              v-for="template in academicGradeTemplates" 
              :key="template.id"
              shadow="hover"
              class="cursor-pointer hover:border-orange-500 transition-all"
              @click="openApplyDialog(template)"
            >
              <div class="text-center">
                <h5 class="text-lg font-bold mb-2">{{ template.templateName }}</h5>
                <el-tag type="warning">最高{{ template.maxScore }}分</el-tag>
                <p class="text-sm text-gray-500 mt-2 line-clamp-2">{{ template.description }}</p>
                <el-button type="warning" size="small" class="mt-3">输入GPA换算</el-button>
              </div>
            </el-card>
            <el-empty v-if="academicGradeTemplates.length === 0" description="暂无可用模板" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ✅ 申请弹窗 -->
    <el-dialog 
      v-model="applyDialogVisible" 
      :title="`申请 - ${selectedTemplate?.templateName}`"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="applyForm" label-width="120px">
        <!-- ========== 换算规则表单 ========== -->
        <template v-if="hasConversionRule">
          <el-form-item label="输入分数:" required>
            <el-input-number 
              v-model="conversionInput" 
              :min="0" 
              :max="10" 
              :step="0.01" 
              :precision="2"
              @change="handleConversionInput"
              placeholder="请输入分数"
              style="width: 100%"
            />
            <div class="text-xs text-gray-500 mt-1">{{ getConversionRangeText() }}</div>
          </el-form-item>
          
          <el-alert
            v-if="matchedConversionRule"
            type="success"
            :closable="false"
            class="mb-4"
          >
            <div class="text-sm">
              <p class="font-bold">✅ 匹配规则: {{ matchedConversionRule.ruleName }}</p>
              <p>得分比例: {{ matchedConversionRule.scorePercentage }}%</p>
              <p class="text-lg font-bold text-green-600 mt-1">预计得分: {{ finalCalculatedScore.toFixed(2) }}分</p>
            </div>
          </el-alert>
        </template>
        
        <!-- ========== 普通规则表单 ========== -->
        <template v-else>
          <el-form-item 
            v-for="attr in templateAttributes" 
            :key="attr"
            :label="attr + ':'"
            required
          >
            <!-- 时长输入 -->
            <template v-if="attr === '项目时长' && hasTimeRule">
              <el-input-number 
                v-model="applyForm.attributeValues[attr]" 
                :min="0"
                @change="calculateTimeScore"
                style="width: 200px"
              />
              <span class="ml-2">{{ getTimeUnitLabel(timeUnit) }}</span>
            </template>
            
            <!-- 下拉选择 -->
            <el-select 
              v-else
              v-model="applyForm.attributeValues[attr]" 
              placeholder="请选择"
              style="width: 100%"
              @change="calculateMatchedScore"
            >
              <el-option 
                v-for="option in attributeOptions[attr]" 
                :key="option"
                :label="option" 
                :value="option"
              />
            </el-select>
          </el-form-item>

          <el-alert
            v-if="matchedNormalRule || (hasTimeRule && calculatedTimeScore > 0)"
            type="success"
            :closable="false"
            class="mb-4"
          >
            <div class="text-sm">
              <p v-if="matchedNormalRule" class="font-bold">✅ 匹配规则: {{ matchedNormalRule.ruleName }}</p>
              <p class="text-lg font-bold text-green-600">预计得分: {{ finalCalculatedScore.toFixed(2) }}分</p>
            </div>
          </el-alert>
        </template>

        <!-- ✅ 证明材料上传 -->
        <el-form-item label="证明材料" required>
          <div class="w-full">
            <p class="text-sm text-gray-500 mb-3">
              请上传证明材料并填写对应分数（支持图片、PDF等格式）
            </p>
            
            <FileTable
              v-model="proofItems"
              :limit="20" 
              :show-upload-button="true"
              :show-preview-button="true"
              :show-download-button="false"
              :show-delete-button="true"
              :show-file-value="true"          
              file-value-label="分数"           
              file-value-type="number"          
              :file-value-min="0"              
              :file-value-max="999.99"         
              :file-value-precision="2"        
              file-value-placeholder="输入分数"
              :disabled="false"
              file-category="SCORE_PROOF"
              file-purpose="加分申请证明材料"
              @value-change="handleProofValueChange"
            />

            <!-- ✅ 统计信息 -->
            <div class="flex justify-between items-center mt-3 text-sm">
              <span class="text-gray-600">已添加 {{ proofItems.length }} 个证明材料</span>
              <span class="font-bold text-blue-600 text-lg">
                预期总分: {{ totalProofScore.toFixed(2) }} 分
              </span>
            </div>
          </div>
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注">
          <el-input
            v-model="applyForm.remark"
            type="textarea"
            :rows="3"
            placeholder="选填：补充说明"
          />
        </el-form-item>

        <!-- ✅ 最终得分展示 -->
        <el-form-item label="最终得分">
          <div class="text-2xl font-bold text-green-600">
            {{ totalProofScore.toFixed(2) }} 分
          </div>
          <p class="text-xs text-gray-500 mt-1">
            （基于您填写的证明材料分数之和）
          </p>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="applyDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSubmitApply"
            :loading="submitting"
            :disabled="proofItems.length === 0 || proofItems.some(item => !item.fileValue || Number(item.fileValue) <= 0)"
          >
            提交申请
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>