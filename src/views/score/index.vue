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
// ==================== ✅ CONDITION 模板:属性选择 ====================
const templateAttributes = ref<string[]>([])           // 所有属性代码列表 ["获奖层级", "获奖等级"]
const attributeOptions = ref<Record<string, string[]>>({})  // 每个属性的可选值
const selectedAttributeValues = ref<Record<string, string>>({})  // 用户选择的属性值
const currentTemplateRules = ref<any[]>([])            // 所有规则
const matchedRule = ref<any>(null)                     // 匹配的规则

// ==================== 申请表单数据 ====================
const selectedTemplate = ref<any>(null)

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

// ==================== 数据加载函数 ====================
const loadTemplates = async () => {
  loading.value = true
  try {
    const response = await getAvailableTemplates()
    if (response.code === 200) {
      allTemplates.value = response.data || []
    } else {
      ElMessage.error(response.msg || '加载模板失败')
    }
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败')
  } finally {
    loading.value = false
  }
}



// ==================== 申请弹窗相关函数 ====================
const currentTemplateType = ref<'CONDITION' | 'TRANSFORM'>('CONDITION')

// ==================== ✅ 打开申请弹窗 ====================
const openApplyDialog = async (template: any) => {
  selectedTemplate.value = template
  currentTemplateType.value = template.templateType
  resetApplyForm()

  try {
    const response = await getTemplateDetail(template.id)
    if (response.code === 200) {
      const detail = response.data

      if (template.templateType === 'CONDITION') {
        // ✅ CONDITION 模板:处理属性分组
        currentTemplateRules.value = detail.rules || []
        
        // 1️⃣ 提取所有唯一的 attributeCode
        const attributeCodeSet = new Set<string>()
        const attributeValueMap = new Map<string, Set<string>>()

        detail.rules.forEach((rule: any) => {
          if (rule.attributes && rule.attributes.length > 0) {
            rule.attributes.forEach((attr: any) => {
              // 记录所有 attributeCode
              attributeCodeSet.add(attr.attributeCode)
              
              // 为每个 attributeCode 收集所有可能的 attributeValue
              if (!attributeValueMap.has(attr.attributeCode)) {
                attributeValueMap.set(attr.attributeCode, new Set<string>())
              }
              attributeValueMap.get(attr.attributeCode)!.add(attr.attributeValue)
            })
          }
        })

        // 2️⃣ 构建属性列表和选项
        templateAttributes.value = Array.from(attributeCodeSet)
        attributeOptions.value = {}
        
        attributeValueMap.forEach((values, code) => {
          attributeOptions.value[code] = Array.from(values).sort()
        })

        // 3️⃣ 初始化选择
        selectedAttributeValues.value = {}
        templateAttributes.value.forEach(attr => {
          selectedAttributeValues.value[attr] = ''
        })

        console.log('✅ 提取的属性:', templateAttributes.value)
        console.log('✅ 属性选项:', attributeOptions.value)

      } else if (template.templateType === 'TRANSFORM') {
        // ...TRANSFORM 逻辑保持不变...
        const rules = detail.rules || []
        if (rules.length > 0) {
          const firstRule = rules[0]
          matchedConversionRule.value = firstRule
          
          if (firstRule.attributes && firstRule.attributes.length > 0) {
            const transformAttr = firstRule.attributes.find((a: any) => a.attributeType === 'TRANSFORM')
            if (transformAttr) {
              conversionRules.value = [{
                formula: transformAttr.attributeValue,
                minValue: transformAttr.inputMin,
                maxValue: transformAttr.inputMax,
                intervalType: transformAttr.inputInterval
              }]
            }
          }
        }
        
        hasConversionRule.value = conversionRules.value.length > 0
      }

      applyDialogVisible.value = true
    }
  } catch (error) {
    console.error('加载模板详情失败:', error)
    ElMessage.error('加载模板详情失败')
  }
}
// ==================== ✅ CONDITION 模板:属性选择变化时匹配规则 ====================
const handleAttributeChange = () => {
  // 检查是否所有属性都已选择
  const allSelected = templateAttributes.value.every(attr => selectedAttributeValues.value[attr])
  
  if (!allSelected) {
    matchedRule.value = null
    return
  }

  // 查找匹配的规则
  for (const rule of currentTemplateRules.value) {
    if (!rule.attributes || rule.attributes.length === 0) continue

    let matched = true

    // 检查规则的所有属性是否都匹配
    for (const attr of rule.attributes) {
      const selectedValue = selectedAttributeValues.value[attr.attributeCode]
      
      if (selectedValue !== attr.attributeValue) {
        matched = false
        break
      }
    }

    if (matched) {
      matchedRule.value = rule
      console.log('✅ 匹配到规则:', rule.ruleName || `规则${rule.id}`, rule.ruleScore)
      return
    }
  }

  matchedRule.value = null
  console.log('⚠️ 未找到匹配的规则')
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

// ==================== ✅ TRANSFORM 模板换算逻辑 ====================
const handleConversionInput = (value: number | undefined) => {
  if (!value || conversionRules.value.length === 0) {
    convertedScore.value = 0
    return
  }

  // 查找匹配的换算规则
  for (const rule of conversionRules.value) {
    const { minValue, maxValue, intervalType, formula } = rule

    // 检查输入值是否在范围内
    let inRange = false
    switch (intervalType) {
      case 'OPEN':  // (min, max)
        inRange = value > minValue && value < maxValue
        break
      case 'CLOSED':  // [min, max]
        inRange = value >= minValue && value <= maxValue
        break
      case 'LEFT_OPEN':  // (min, max]
        inRange = value > minValue && value <= maxValue
        break
      case 'RIGHT_OPEN':  // [min, max)
        inRange = value >= minValue && value < maxValue
        break
    }

    if (inRange) {
      // 计算换算分数
      convertedScore.value = evaluateFormula(formula, value)
      return
    }
  }

  convertedScore.value = 0
  ElMessage.warning('输入值超出有效范围')
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

// ==================== ✅ CONDITION 模板匹配逻辑 ====================
const calculateMatchedScore = () => {
  if (currentTemplateType.value !== 'CONDITION') return

  // 获取当前选择的属性值
  const selectedValues: Record<string, any> = {}
  Object.keys(applyForm).forEach(key => {
    if (key !== 'remark' && (applyForm as any)[key]) {
      selectedValues[key] = (applyForm as any)[key]
    }
  })

  // ✅ 找到所有匹配的规则
  const matchedRules: any[] = []

  for (const rule of currentTemplateRules.value) {
    if (!rule.attributes || rule.attributes.length === 0) continue

    let matched = true

    // 检查规则的所有属性是否都匹配
    for (const attr of rule.attributes) {
      const selectedValue = selectedValues[attr.attributeCode]
      
      if (attr.attributeType === 'CONDITION') {
        // CONDITION:必须完全匹配
        if (selectedValue !== attr.attributeValue) {
          matched = false
          break
        }
      } else if (attr.attributeType === 'TRANSFORM') {
        // TRANSFORM:检查是否在范围内
        if (!selectedValue || !isInRange(selectedValue, attr)) {
          matched = false
          break
        }
      }
    }

    if (matched) {
      matchedRules.push(rule)
    }
  }
// ✅ 辅助函数:检查数值是否在范围内
const isInRange = (value: number, attr: any): boolean => {
  const { inputMin, inputMax, inputInterval } = attr
  if (!inputMin || !inputMax) return true

  switch (inputInterval) {
    case 'OPEN':
      return value > inputMin && value < inputMax
    case 'CLOSED':
      return value >= inputMin && value <= inputMax
    case 'LEFT_OPEN':
      return value > inputMin && value <= inputMax
    case 'RIGHT_OPEN':
      return value >= inputMin && value < inputMax
    default:
      return true
  }
}
  // ✅ 优先级最高的规则
  if (matchedRules.length > 0) {
    matchedRules.sort((a, b) => b.priority - a.priority)
    matchedNormalRule.value = matchedRules[0]
  } else {
    matchedNormalRule.value = null
  }
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

// ==================== ✅ 提交申请 ====================
const handleSubmitApply = async () => {
  if (!selectedTemplate.value) return

  if (proofItems.value.length === 0) {
    ElMessage.warning('请至少上传一个证明材料')
    return
  }

  const hasInvalidProof = proofItems.value.some(item => !item.fileValue || Number(item.fileValue) <= 0)
  if (hasInvalidProof) {
    ElMessage.warning('请为每个证明材料填写有效的分数/值')
    return
  }

  let submitData: SubmitBonusApplicationDto

  if (currentTemplateType.value === 'CONDITION') {
    // ✅ CONDITION 模板
    if (!matchedRule.value) {
      ElMessage.warning('请选择完整的条件以匹配规则')
      return
    }

    submitData = {
      studentId: userStore.profile.student_id,
      studentName: userStore.profile.full_name,
      major: userStore.profile.major,
      enrollmentYear: userStore.profile.grade,
      templateName: selectedTemplate.value.templateName,
      templateType: 'CONDITION',
      scoreType: selectedTemplate.value.scoreType,
      applyScore: matchedRule.value.ruleScore,
      ruleId: matchedRule.value.id,
      ruleValues: selectedAttributeValues.value,  // ✅ 使用新的选择数据
      reviewCount: selectedTemplate.value.reviewCount,
      proofItems: proofItems.value.map(item => ({
        proofFileId: item.fileId,
        proofValue: Number(item.fileValue),
        remark: item.remark
      })),
      remark: applyForm.remark
    }

  } else {
    // TRANSFORM 模板逻辑保持不变...
    if (!conversionInput.value || convertedScore.value <= 0) {
      ElMessage.warning('请输入有效的换算值')
      return
    }

    submitData = {
      studentId: userStore.profile.student_id,
      studentName: userStore.profile.full_name,
      major: userStore.profile.major,
      enrollmentYear: userStore.profile.grade,
      templateName: selectedTemplate.value.templateName,
      templateType: 'TRANSFORM',
      scoreType: selectedTemplate.value.scoreType,
      applyScore: convertedScore.value,
      applyInput: conversionInput.value,
      ruleId: matchedConversionRule.value?.id,
      ruleValues: {},
      reviewCount: selectedTemplate.value.reviewCount,
      proofItems: proofItems.value.map(item => ({
        proofFileId: item.fileId,
        proofValue: Number(item.fileValue),
        remark: item.remark
      })),
      remark: applyForm.remark
    }
  }

  submitting.value = true
  try {
    const response = await submitBonusApplication(submitData)
    if (response.code === 200) {
      ElMessage.success('提交成功')
      applyDialogVisible.value = false
      resetApplyForm()
    } else {
      ElMessage.error(response.msg || '提交失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}
// ✅ 重置表单
const resetApplyForm = () => {
  proofItems.value = []
  applyForm.remark = ''
  
  // 清空 CONDITION 模板数据
  templateAttributes.value = []
  attributeOptions.value = {}
  selectedAttributeValues.value = {}
  matchedRule.value = null
  currentTemplateRules.value = []
  
  // 清空 TRANSFORM 模板数据
  conversionInput.value = 0
  convertedScore.value = 0
  matchedConversionRule.value = null
  conversionRules.value = []
  hasConversionRule.value = false
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
      :title="`申请 - ${selectedTemplate?.templateName} (${currentTemplateType === 'CONDITION' ? '条件模板' : '换算模板'})`"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="applyForm" label-width="120px">
        
        <!-- ========== ✅ CONDITION 条件模板表单 ========== -->
        <template v-if="currentTemplateType === 'CONDITION'">
        <el-alert
          title="选择条件以匹配规则"
          type="info"
          :closable="false"
          class="mb-4"
        />

        <!-- 动态属性选择 -->
        <el-form-item 
          v-for="attr in templateAttributes" 
          :key="attr"
          :label="attr"
          required
        >
          <el-select 
            v-model="selectedAttributeValues[attr]" 
            placeholder="请选择"
            @change="handleAttributeChange"
            class="w-full"
          >
            <el-option
              v-for="option in attributeOptions[attr]"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>

        <!-- 匹配的规则和分数 -->
        <el-form-item label="匹配规则">
          <div v-if="matchedRule" class="w-full">
            <el-tag type="success">{{ matchedRule.ruleName || `规则 ${matchedRule.id}` }}</el-tag>
            <div class="text-2xl font-bold text-green-600 mt-2">
              可获得分数: {{ matchedRule.ruleScore }} 分
            </div>
          </div>
          <div v-else class="text-gray-400">
            未匹配到规则
          </div>
        </el-form-item>
      </template>

      <!-- TRANSFORM 模板保持不变... -->
      <template v-else-if="currentTemplateType === 'TRANSFORM'">
        <el-alert
          title="输入数值进行分数换算"
          type="info"
          :closable="false"
          class="mb-4"
        />

        <el-form-item 
          :label="`输入${selectedTemplate?.inputUnit || '值'}`"
          required
        >
          <el-input-number
            v-model="conversionInput"
            :min="0"
            :precision="2"
            @change="handleConversionInput"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="换算分数">
          <div class="text-2xl font-bold text-green-600">
            {{ convertedScore.toFixed(2) }} 分
          </div>
        </el-form-item>
      </template>

        <!-- ========== ✅ 证明材料上传 (两种模板通用) ========== -->
        <el-form-item label="证明材料" required>
        <div class="w-full">
          <FileTable
            v-model="proofItems"
            :show-value-input="true"
            :value-label="currentTemplateType === 'CONDITION' ? '证明分数' : '证明值'"
            :value-placeholder="currentTemplateType === 'CONDITION' ? '请输入该证明对应的分数' : '请输入该证明对应的值'"
            @value-change="handleProofValueChange"
          />

          <div class="flex justify-between items-center mt-3 text-sm">
            <span class="text-gray-500">
              已上传 {{ proofItems.length }} 个文件
            </span>
            <span class="text-blue-600 font-semibold">
              {{ currentTemplateType === 'CONDITION' ? '证明材料总分' : '证明材料总值' }}: 
              {{ totalProofScore.toFixed(2) }}
            </span>
          </div>

          <el-alert
            v-if="currentTemplateType === 'TRANSFORM'"
            title="提示:证明值将在审核通过后累加,并重新计算最终得分"
            type="warning"
            :closable="false"
            class="mt-2"
          />
        </div>
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="applyForm.remark"
          type="textarea"
          :rows="3"
          placeholder="选填:补充说明"
        />
      </el-form-item>

      <el-form-item label="预期得分">
        <div class="text-2xl font-bold text-green-600">
          {{ 
            currentTemplateType === 'CONDITION' 
              ? (matchedRule?.ruleScore || 0).toFixed(2) 
              : convertedScore.toFixed(2) 
          }} 分
        </div>
        <p class="text-xs text-gray-500 mt-1">
          {{ 
            currentTemplateType === 'CONDITION' 
              ? '(审核通过后将获得此分数)' 
              : '(基于当前输入值换算,最终分数根据审核通过的证明值重新计算)' 
          }}
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
          :disabled="
            proofItems.length === 0 || 
            proofItems.some(item => !item.fileValue || Number(item.fileValue) <= 0) ||
            (currentTemplateType === 'CONDITION' && !matchedRule) ||
            (currentTemplateType === 'TRANSFORM' && (!conversionInput || convertedScore <= 0))
          "
        >
          提交申请
        </el-button>
      </div>
    </template>
    </el-dialog>
  </div>
</template>