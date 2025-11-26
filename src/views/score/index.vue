<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <!-- ==================== 顶部分数统计区域 ==================== -->
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-[20px] font-bold text-gray-800">加分项申请</h4>
        <div>
          <el-tag type="primary" size="large">学术专长: {{ userStore.userInfo?.specialtyScore }}/12分</el-tag>
          <el-tag type="success" size="large" class="ml-2">综合表现: {{ userStore.userInfo?.comprehensiveScore }}/8分</el-tag>
          <el-tag type="warning" size="large" class="ml-2">学业成绩: {{ userStore.userInfo?.academicScore  }}/80分</el-tag>
          <el-tag type="danger" size="large" class="ml-2">
            总分: {{ userStore.userInfo?.academicScore+userStore.userInfo?.comprehensiveScore+userStore.userInfo?.specialtyScore }}/100分 
          </el-tag>
        </div>
      </div>

      <!-- ==================== 模板选择区域 ==================== -->
      <el-tabs v-model="activeTab">
        <!-- 学术专长 -->
        <el-tab-pane label="学术专长(12分)" name="academic">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <el-card 
              v-for="template in academicTemplates" 
              :key="template.id"
              shadow="hover"
              class="cursor-pointer hover:border-blue-500"
              @click="openApplyDialog(template)"
            >
              <div class="text-center">
                <h5 class="text-lg font-bold mb-2">{{ template.templateName }}</h5>
                <el-tag type="primary">最高{{ template.maxScore }}分</el-tag>
                <p class="text-sm text-gray-500 mt-2">{{ template.description }}</p>
                <el-button type="primary" size="small" class="mt-3">申请加分</el-button>
              </div>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 综合表现 -->
        <el-tab-pane label="综合表现(8分)" name="comprehensive">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <el-card 
              v-for="template in comprehensiveTemplates" 
              :key="template.id"
              shadow="hover"
              class="cursor-pointer hover:border-blue-500"
              @click="openApplyDialog(template)"
            >
              <div class="text-center">
                <h5 class="text-lg font-bold mb-2">{{ template.templateName }}</h5>
                <el-tag type="success">最高{{ template.maxScore }}分</el-tag>
                <p class="text-sm text-gray-500 mt-2">{{ template.description }}</p>
                <el-button type="success" size="small" class="mt-3">申请加分</el-button>
              </div>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 学业成绩换算 -->
        <el-tab-pane label="学业成绩换算(80分)" name="academicGrade">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <el-card 
              v-for="template in academicGradeTemplates" 
              :key="template.id"
              shadow="hover"
              class="cursor-pointer hover:border-orange-500"
              @click="openApplyDialog(template)"
            >
              <div class="text-center">
                <h5 class="text-lg font-bold mb-2">{{ template.templateName }}</h5>
                <el-tag type="warning">最高{{ template.maxScore }}分</el-tag>
                <p class="text-sm text-gray-500 mt-2">{{ template.description }}</p>
                <el-button type="warning" size="small" class="mt-3">输入GPA换算</el-button>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ==================== 申请弹窗 ==================== -->
    <el-dialog 
      v-model="applyDialogVisible" 
      :title="`申请 - ${selectedTemplate?.templateName}`"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="applyForm" label-width="120px">
        <!-- 分数换算规则表单 -->
        <template v-if="hasConversionRule">
          <el-form-item label="输入分数:" required>
            <el-input-number 
              v-model="conversionInput" 
              :min="0" 
              :max="10" 
              :step="0.01" 
              :precision="2"
              @change="handleConversionInput"
              placeholder="请输入分数 (如 GPA)"
              style="width: 100%"
            />
            <div class="text-xs text-gray-500 mt-1">
              {{ getConversionRangeText() }}
            </div>
          </el-form-item>
          
          <!-- 换算结果显示 -->
          <el-alert
            v-if="matchedConversionRule"
            type="success"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <div class="text-sm">
                <p class="font-bold">✅ 匹配规则: {{ matchedConversionRule.ruleName }}</p>
                <p>换算公式: {{ matchedConversionRule.formula }}</p>
                <p>得分比例: {{ matchedConversionRule.scorePercentage }}%</p>
                <p class="text-lg font-bold text-green-600 mt-1">
                  预计得分: {{ finalCalculatedScore.toFixed(2) }}分
                </p>
              </div>
            </template>
          </el-alert>
        </template>
        
        <!-- 普通规则表单 -->
        <template v-else>
          <el-form-item 
            v-for="attr in templateAttributes" 
            :key="attr"
            :label="attr + ':'"
            required
          >
            <!-- 时长类规则输入 -->
            <template v-if="attr === '项目时长' && hasTimeRule">
              <div class="flex flex-col gap-2 w-full">
                <div class="flex items-center gap-2">
                  <el-input-number 
                    v-model="applyForm.attributeValues[attr]" 
                    :min="0"
                    placeholder="请输入时长"
                    @change="calculateTimeScore"
                    style="width: 150px"
                  />
                  <span class="text-sm text-gray-500">{{ getTimeUnitLabel(timeUnit) }}</span>
                </div>
              </div>
            </template>
            
            <!-- 其他属性选择 -->
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

          <!-- 普通规则得分显示 -->
          <el-alert
            v-if="matchedNormalRule || (hasTimeRule && calculatedTimeScore > 0)"
            type="success"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <div class="text-sm">
                <p class="font-bold">✅ 匹配规则: {{ matchedNormalRule?.ruleName || '时长计算' }}</p>
                <p v-if="hasTimeRule">
                  计算标准: 每{{ timeStandard }}{{ getTimeUnitLabel(timeUnit) }}得{{ scorePerUnit?.toFixed(2) }}分
                </p>
                <p v-else>得分比例: {{ matchedNormalRule?.scorePercentage }}%</p>
                <p class="text-lg font-bold text-green-600 mt-1">
                  预计得分: {{ finalCalculatedScore.toFixed(2) }}分
                </p>
              </div>
            </template>
          </el-alert>
        </template>

        <!-- ✅ 使用文件上传组件 -->
        <el-form-item label="证明材料:">
          <FileUtil
            v-model="fileList"
            :limit="5"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.html,.txt"
            :icon-size="20"
            upload-text="上传"
            tip-text="支持格式: 图片、PDF、Word、Excel、HTML、文本,最多5个"
            :use-word-preview-page="true"
            word-preview-path="/word"
            :get-preview-url="handleGetPreviewUrl"
            :show-file-list="true"
            :show-preview-button="false"
            :show-delete-button="true"
            :show-download-in-dialog="true"
          />
        </el-form-item>

        <!-- 备注说明 -->
        <el-form-item label="备注说明:">
          <el-input 
            v-model="applyForm.remark"
            type="textarea"
            :rows="3"
            placeholder="选填,可补充说明项目详情"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="applyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitApply" :loading="submitting">
          提交申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadUserFile } from 'element-plus'
import {
  getAvailableTemplates,
  getTemplateDetail,
  submitBonusApplication,
  getFilePreviewUrl
} from '@/api/components/apiScore'
import { useUserStore } from '@/stores/profile'
import FileUtil from '@/components/fileUtil.vue'

// ==================== 用户信息 ====================
const userStore = useUserStore()

// ==================== 页面状态 ====================
const activeTab = ref('academic')
const submitting = ref(false)
const applyDialogVisible = ref(false)

// ==================== 模板数据 ====================
const allTemplates = ref<any[]>([])

// 计算属性: 按类型分类模板
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
const fileList = ref<UploadUserFile[]>([])

const applyForm = reactive({
  templateId: '',
  attributeValues: {} as Record<string, any>,
  proofFiles: [] as string[],
  remark: ''
})

// ==================== 换算规则相关 ====================
const hasConversionRule = ref(false)
const conversionInput = ref(0)
const convertedScore = ref(0)
const matchedConversionRule = ref<any>(null)
const conversionRules = ref<any[]>([])

// ==================== 时长规则相关 ====================
const hasTimeRule = ref(false)
const timeUnit = ref<string>('')
const timeStandard = ref<number>(0)
const scorePerUnit = ref<number>(0)
const calculatedTimeScore = ref<number>(0)

// ==================== 普通规则相关 ====================
const matchedNormalRule = ref<any>(null)
const currentTemplateRules = ref<any[]>([])

// ==================== 计算属性: 最终得分 ====================
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

// ==================== 数据加载函数 ====================
/**
 * 加载所有模板列表
 */
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
  }
}

// ==================== 申请弹窗相关函数 ====================
/**
 * 打开申请弹窗
 */
const openApplyDialog = async (template: any) => {
  try {
    // 重置表单
    selectedTemplate.value = template
    applyForm.templateId = template.id
    applyForm.attributeValues = {}
    applyForm.remark = ''
    fileList.value = []
    matchedNormalRule.value = null

    // 获取模板详情
    const response = await getTemplateDetail(template.id)
    if (response.code !== 200) {
      ElMessage.error('获取模板详情失败')
      return
    }

    const templateDetail = response.data
    const rules = templateDetail.rules || []
    
    currentTemplateRules.value = rules
    selectedTemplate.value.maxScore = templateDetail.maxScore
    
    // 判断是否为换算规则
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

/**
 * 初始化换算规则
 */
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
        id: rule.id,
        ruleName: rule.ruleName,
        minRange: cond.分数换算.minRange,
        maxRange: cond.分数换算.maxRange,
        formula: cond.分数换算.formula || 'INPUT',
        scorePercentage: rule.scorePercentage,
        priority: rule.priority
      }
    })
    .sort((a: any, b: any) => b.priority - a.priority)
  
  conversionInput.value = 0
  convertedScore.value = 0
  matchedConversionRule.value = null
}

/**
 * 初始化普通规则
 */
const initNormalRules = (rules: any[]) => {
  const attributeSet = new Set<string>()
  const options: Record<string, Set<string>> = {}
  
  // 检查时长规则
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
  
  // 解析其他属性
  rules.forEach((rule: any) => {
    try {
      const conditions = JSON.parse(rule.conditions)
      
      Object.entries(conditions).forEach(([key, value]) => {
        if (key === '项目时长') return
        
        attributeSet.add(key)
        
        if (!options[key]) {
          options[key] = new Set()
        }
        options[key].add(value as string)
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

// ==================== 分数计算相关函数 ====================
/**
 * 处理换算输入
 */
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

/**
 * 公式计算器
 */
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

/**
 * 获取换算区间说明
 */
const getConversionRangeText = (): string => {
  if (!conversionInput.value) return '请输入分数'
  
  if (matchedConversionRule.value) {
    return `匹配区间: ${matchedConversionRule.value.minRange}-${matchedConversionRule.value.maxRange}`
  }
  
  return '未找到匹配的换算规则'
}

/**
 * 计算普通规则匹配得分
 */
const calculateMatchedScore = () => {
  const rules = currentTemplateRules.value
  
  for (const rule of rules) {
    try {
      const conditions = JSON.parse(rule.conditions)
      let allMatch = true
      
      for (const [key, value] of Object.entries(conditions)) {
        if (key === '项目时长') continue
        
        if (applyForm.attributeValues[key] !== value) {
          allMatch = false
          break
        }
      }
      
      if (allMatch) {
        matchedNormalRule.value = rule
        console.log('✅ 匹配到规则:', rule.ruleName, '得分比例:', rule.scorePercentage)
        return
      }
    } catch (error) {
      console.error('解析规则失败:', error)
    }
  }
  
  matchedNormalRule.value = null
}

/**
 * 计算时长得分
 */
const calculateTimeScore = () => {
  const inputTime = applyForm.attributeValues['项目时长']
  if (inputTime && timeStandard.value && scorePerUnit.value) {
    calculatedTimeScore.value = (inputTime / timeStandard.value) * scorePerUnit.value
  } else {
    calculatedTimeScore.value = 0
  }
}

/**
 * 获取时长单位标签
 */
const getTimeUnitLabel = (unit: string) => {
  const map: Record<string, string> = {
    hour: '小时',
    day: '天',
    month: '月',
    year: '年'
  }
  return map[unit] || unit
}

// ==================== 文件预览相关 ====================
/**
 * 获取文件预览URL
 */
const handleGetPreviewUrl = async (fileUrl: string) => {
  const response = await getFilePreviewUrl(fileUrl)
  if (response.code === 200) {
    return response.data.url
  }
  throw new Error('获取预览链接失败')
}

// ==================== 提交申请 ====================
/**
 * 提交申请
 */
const handleSubmitApply = async () => {
  try {
    if (!userStore.hasStudentInfo) {
      ElMessage.warning('请先完善学生信息')
      return
    }

    let submitData: any

    // 换算规则提交
    if (hasConversionRule.value) {
      if (!matchedConversionRule.value) {
        ElMessage.warning('请输入有效的分数以匹配换算规则')
        return
      }

      submitData = {
        studentId: userStore.userInfo!.studentId,
        studentName: userStore.userInfo!.fullName,
        major: userStore.userInfo!.major,
        enrollmentYear: userStore.userInfo!.enrollmentYear,
        templateName: selectedTemplate.value.templateName,
        scoreType: selectedTemplate.value.scoreType,
        calculatedScore: convertedScore.value,
        ruleValues: {
          '分数换算输入': conversionInput.value,
          '换算后得分': convertedScore.value,
          '匹配规则': matchedConversionRule.value.ruleName
        },
        reviewCount: selectedTemplate.value.reviewCount || 1,
        remark: applyForm.remark
      }
    } 
    // 普通规则提交
    else {
      const missingAttrs = templateAttributes.value.filter(attr => {
        const value = applyForm.attributeValues[attr]
        return value === undefined || value === null || value === ''
      })

      if (missingAttrs.length > 0) {
        ElMessage.warning(`请填写: ${missingAttrs.join(', ')}`)
        return
      }

      if (!matchedNormalRule.value && !hasTimeRule.value) {
        calculateMatchedScore()
        if (!matchedNormalRule.value) {
          ElMessage.warning('未找到匹配的规则')
          return
        }
      }

      submitData = {
        studentId: userStore.userInfo!.studentId,
        studentName: userStore.userInfo!.fullName,
        major: userStore.userInfo!.major,
        enrollmentYear: userStore.userInfo!.enrollmentYear,
        templateName: selectedTemplate.value.templateName,
        scoreType: selectedTemplate.value.scoreType,
        calculatedScore: finalCalculatedScore.value,
        ruleValues: applyForm.attributeValues,
        reviewCount: selectedTemplate.value.reviewCount || 1,
        remark: applyForm.remark
      }
    }

    // 提取文件
    const files = fileList.value
      .filter(item => item.raw)
      .map(item => item.raw as File)
    submitting.value = true
    const response = await submitBonusApplication(submitData, files)
    
    if (response.code === 200) {
      ElMessage.success('提交成功!')
      applyDialogVisible.value = false
      
      // 重置表单
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

/**
 * 重置申请表单
 */
const resetApplyForm = () => {
  conversionInput.value = 0
  convertedScore.value = 0
  matchedConversionRule.value = null
  matchedNormalRule.value = null
  applyForm.attributeValues = {}
  applyForm.remark = ''
  fileList.value = []
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>