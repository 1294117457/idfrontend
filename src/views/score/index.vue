<!-- filepath: d:\XMU\3UP\交互设计\code\ID-frontend\src\views\score\index.vue -->
<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-[20px] font-bold text-gray-800">加分项申请</h4>
        <div>
          <el-tag type="primary" size="large">学术专长: {{ scoreInfo.academicScore }}/12分</el-tag>
          <el-tag type="success" size="large" class="ml-2">综合表现: {{ scoreInfo.comprehensiveScore }}/8分</el-tag>
          <el-tag type="warning" size="large" class="ml-2">学业成绩: {{ scoreInfo.academicGradeScore }}/80分</el-tag>
          <el-tag :type="scoreInfo.isQualified ? 'success' : 'danger'" size="large" class="ml-2">
            总分: {{ scoreInfo.totalScore }}/100分 {{ scoreInfo.isQualified ? '✓' : '✗' }}
          </el-tag>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <!-- ✅ 学术专长 -->
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

        <!-- ✅ 综合表现 -->
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

        <!-- ✅ 学业成绩换算 -->
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

    <!-- ✅ 申请弹窗 -->
    <el-dialog 
      v-model="applyDialogVisible" 
      :title="`申请 - ${selectedTemplate?.templateName}`"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="applyForm" label-width="120px">
        <!-- ✅ 如果有分数换算规则,显示分数输入 -->
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
          
          <el-form-item label="换算后得分:">
            <el-input-number 
              v-model="convertedScore" 
              :precision="2"
              disabled
              style="width: 100%"
            />
            <div class="text-sm text-blue-600 mt-1">
              {{ matchedConversionRule ? `匹配规则: ${matchedConversionRule.ruleName}` : '未匹配到规则' }}
            </div>
          </el-form-item>

          <!-- ✅ 显示换算公式说明 -->
          <el-alert
            v-if="matchedConversionRule"
            :title="`换算公式: ${matchedConversionRule.formula}`"
            type="info"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <div class="text-sm">
                <p>得分比例: {{ matchedConversionRule.scorePercentage }}%</p>
                <p>计算过程: ({{ convertedScore }}) × {{ matchedConversionRule.scorePercentage }}% × {{ selectedTemplate.maxScore }} = {{ (convertedScore * matchedConversionRule.scorePercentage / 100).toFixed(2) }}分</p>
              </div>
            </template>
          </el-alert>
        </template>
        
        <!-- ✅ 普通规则:动态渲染属性表单 -->
        <template v-else>
          <el-form-item 
            v-for="attr in templateAttributes" 
            :key="attr"
            :label="attr + ':'"
            required
          >
            <!-- 时长类规则 -->
            <template v-if="attr === '项目时长' && hasTimeRule">
              <div class="flex flex-col gap-2 w-full">
                <div class="flex items-center gap-2">
                  <el-input-number 
                    v-model="applyForm.attributeValues[attr]" 
                    placeholder="请输入时长"
                    @change="calculateTimeScore"
                  />
                  <span class="text-sm text-gray-500">{{ getTimeUnitLabel(timeUnit) }}</span>
                </div>
                <div class="text-xs text-gray-400">
                  标准: 每{{ timeStandard }}{{ getTimeUnitLabel(timeUnit) }}得{{ scorePerUnit?.toFixed(4) }}分
                </div>
                <div class="text-sm font-bold text-blue-500">
                  预计得分: {{ calculatedTimeScore?.toFixed(2) || '0.00' }} 分
                </div>
              </div>
            </template>
            
            <!-- 其他属性 -->
            <el-select 
              v-else
              v-model="applyForm.attributeValues[attr]" 
              placeholder="请选择"
              style="width: 100%"
            >
              <el-option 
                v-for="option in attributeOptions[attr]" 
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
          </el-form-item>
        </template>

        <el-form-item label="证明材料:">
          <el-upload
            v-model:file-list="fileList"
            action="/api/upload"
            list-type="picture-card"
            :limit="5"
            :auto-upload="false"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

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
        <el-button type="primary" @click="handleSubmitApply">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getAvailableTemplates,
  getTemplateDetail,
  submitBonusApplication,
  calculateScore
} from '@/api/components/apiScore'
import { useUserStore } from '@/stores/profile' 
const userStore = useUserStore()
const activeTab = ref('academic')

// ✅ 所有模板数据
const allTemplates = ref<any[]>([])

// ✅ 计算属性:前端自动过滤分类
const academicTemplates = computed(() => 
  allTemplates.value.filter(t => t.scoreType === 0)
)

const comprehensiveTemplates = computed(() => 
  allTemplates.value.filter(t => t.scoreType === 1)
)

const academicGradeTemplates = computed(() => 
  allTemplates.value.filter(t => t.scoreType === 2)
)

const scoreInfo = reactive({
  academicScore: 0,
  comprehensiveScore: 0,
  academicGradeScore: 0,
  totalScore: 0,
  isQualified: false
})

// 申请弹窗相关
const applyDialogVisible = ref(false)
const selectedTemplate = ref<any>(null)
const templateAttributes = ref<string[]>([])
const attributeOptions = ref<Record<string, any[]>>({})
const fileList = ref([])

const applyForm = reactive({
  templateId: '',
  attributeValues: {} as Record<string, any>,
  proofFiles: [] as string[],
  remark: ''
})

// ✅ 换算规则相关
const hasConversionRule = ref(false)
const conversionInput = ref(0)
const convertedScore = ref(0)
const matchedConversionRule = ref<any>(null)
const conversionRules = ref<any[]>([])

// 时长规则相关
const hasTimeRule = ref(false)
const timeUnit = ref<string>('')
const timeStandard = ref<number>(0)
const scorePerUnit = ref<number>(0)
const calculatedTimeScore = ref<number>(0)

// 缓存模板规则
const currentTemplateRules = ref<any[]>([])

// ✅ 加载模板列表
const loadTemplates = async () => {
  try {
    const response = await getAvailableTemplates()
    if (response.code === 200) {
      allTemplates.value = response.data || []
    } else {
      ElMessage.error('加载模板失败: ' + (response.message || '未知错误'))
    }
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败')
  }
}

// 加载成绩统计
const loadScore = async () => {
  try {
    const response = await calculateScore()
    if (response.code === 200) {
      Object.assign(scoreInfo, response.data)
    }
  } catch (error) {
    console.error('加载成绩统计失败:', error)
  }
}

// 打开申请弹窗
const openApplyDialog = async (template: any) => {
  try {
    selectedTemplate.value = template
    applyForm.templateId = template.id
    applyForm.attributeValues = {}
    applyForm.remark = ''
    fileList.value = []

    const response = await getTemplateDetail(template.id)
    if (response.code === 200) {
      const templateDetail = response.data
      const rules = templateDetail.rules || []
      
      console.log('✅ 模板最高分:', templateDetail.maxScore)  // 调试
      console.log('✅ 规则列表:', rules)
      
      currentTemplateRules.value = rules
      
      // ✅ 保存模板最高分 (用于前端计算)
      selectedTemplate.value.maxScore = templateDetail.maxScore
      
      // 检查是否是分数换算类型
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
        // 学业成绩换算规则
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
              score: rule.score,  // ✅ 后端已计算好的实际分数
              priority: rule.priority
            }
          })
          .sort((a: any, b: any) => b.priority - a.priority)
        
        conversionInput.value = 0
        convertedScore.value = 0
        matchedConversionRule.value = null
      } else {
        // 普通加分项 (学术专长/综合表现)
        const attributeSet = new Set<string>()
        const options: Record<string, Set<string>> = {}
        
        rules.forEach((rule: any) => {
          try {
            const conditions = JSON.parse(rule.conditions)
            
            Object.entries(conditions).forEach(([key, value]) => {
              if (key === '项目时长') return  // 时长单独处理
              
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
      
      applyDialogVisible.value = true
    } else {
      ElMessage.error('获取模板详情失败: ' + (response.msg || '未知错误'))
    }
  } catch (error) {
    console.error('打开申请弹窗失败:', error)
    ElMessage.error('打开申请弹窗失败')
  }
}

// 处理换算输入
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
    convertedScore.value = Number((formulaResult * percentage).toFixed(2))
  } else {
    matchedConversionRule.value = null
    convertedScore.value = 0
  }
}

// 公式计算器
const evaluateFormula = (formula: string, inputValue: number): number => {
  try {
    const expression = formula.replace(/INPUT/g, inputValue.toString())
    const result = new Function(`return ${expression}`)()
    return Number(result.toFixed(2))
  } catch (error) {
    console.error('公式计算错误:', error)
    ElMessage.error('公式计算错误,请检查公式格式')
    return 0
  }
}

// 获取换算区间说明
const getConversionRangeText = (): string => {
  if (!conversionInput.value) return '请输入分数'
  
  if (matchedConversionRule.value) {
    return `匹配区间: ${matchedConversionRule.value.minRange}-${matchedConversionRule.value.maxRange}, 公式: ${matchedConversionRule.value.formula}`
  }
  
  return '未找到匹配的换算规则'
}

// 计算时长得分
const calculateTimeScore = () => {
  const inputTime = applyForm.attributeValues['项目时长']
  if (inputTime && timeStandard.value && scorePerUnit.value) {
    calculatedTimeScore.value = (inputTime / timeStandard.value) * scorePerUnit.value
  } else {
    calculatedTimeScore.value = 0
  }
}

// 提交申请
const handleSubmitApply = async () => {
  try {
    // ✅ 1. 验证学生信息是否完整
    if (!userStore.hasStudentInfo) {
      ElMessage.warning('请先完善学生信息')
      return
    }

    let submitData: any

    if (hasConversionRule.value) {
      // 学业成绩换算
      if (!matchedConversionRule.value) {
        ElMessage.warning('请输入有效的分数以匹配换算规则')
        return
      }

      submitData = {
        // ✅ 学生信息 (从 Pinia 提取)
        studentId: userStore.userInfo!.studentId,
        studentName: userStore.userInfo!.fullName,
        major: userStore.userInfo!.major,
        enrollmentYear: userStore.userInfo!.enrollmentYear,
        
        // ✅ 模板信息
        templateName: selectedTemplate.value.templateName,
        scoreType: selectedTemplate.value.scoreType,
        
        // ✅ 分数信息
        calculatedScore: convertedScore.value,
        
        // ✅ 规则值
        ruleValues: {
          '分数换算输入': conversionInput.value,
          '换算后得分': convertedScore.value,
          '匹配规则': matchedConversionRule.value.ruleName
        },
        
        // ✅ 审核人数
        reviewCount: selectedTemplate.value.reviewCount || 1,
        
        // 备注
        remark: applyForm.remark
      }
    } else {
      // 学术专长/综合表现
      const missingAttrs = templateAttributes.value.filter(attr => {
        const value = applyForm.attributeValues[attr]
        return value === undefined || value === null || value === ''
      })

      if (missingAttrs.length > 0) {
        ElMessage.warning(`请填写: ${missingAttrs.join(', ')}`)
        return
      }

      // ✅ 规则匹配
      const rules = currentTemplateRules.value
      let matchedRule: any = null
      let calculatedScore = 0

      for (const rule of rules) {
        try {
          const conditions = JSON.parse(rule.conditions)
          let allMatch = true

          // 普通属性匹配
          for (const [key, value] of Object.entries(conditions)) {
            if (key === '项目时长') continue // 时长单独处理
            
            if (applyForm.attributeValues[key] !== value) {
              allMatch = false
              break
            }
          }

          // 时长匹配
          if (conditions['项目时长'] && applyForm.attributeValues['项目时长']) {
            const inputTime = applyForm.attributeValues['项目时长']
            const timeCondition = conditions['项目时长']
            
            if (timeCondition.unit && timeCondition.standard) {
              const standardTime = timeCondition.standard
              if (inputTime < standardTime) {
                allMatch = false
              }
            }
          }

          if (allMatch) {
            matchedRule = rule
            
            // 计算得分
            if (conditions['项目时长'] && applyForm.attributeValues['项目时长']) {
              const inputTime = applyForm.attributeValues['项目时长']
              const timeCondition = conditions['项目时长']
              const standardTime = timeCondition.standard || 1
              calculatedScore = (inputTime / standardTime) * rule.score
            } else {
              calculatedScore = rule.score
            }
            
            break
          }
        } catch (error) {
          console.error('解析规则失败:', error)
        }
      }

      if (!matchedRule) {
        ElMessage.warning('未找到匹配的规则,请检查填写内容')
        return
      }

      submitData = {
        // ✅ 学生信息 (从 Pinia 提取)
        studentId: userStore.userInfo!.studentId,
        studentName: userStore.userInfo!.fullName,
        major: userStore.userInfo!.major,
        enrollmentYear: userStore.userInfo!.enrollmentYear,
        
        // ✅ 模板信息
        templateName: selectedTemplate.value.templateName,
        scoreType: selectedTemplate.value.scoreType,
        
        // ✅ 分数信息
        calculatedScore: Number(calculatedScore.toFixed(2)),
        
        // ✅ 规则值
        ruleValues: applyForm.attributeValues,
        
        // ✅ 审核人数
        reviewCount: selectedTemplate.value.reviewCount || 1,
        
        // 备注
        remark: applyForm.remark
      }
    }

    // ✅ 收集文件
    const files = fileList.value
      .filter(item => item.raw)
      .map(item => item.raw as File)

    console.log('📤 提交数据:', submitData)

    // ✅ 提交申请
    const response = await submitBonusApplication(submitData, files)
    
    if (response.code === 200) {
      ElMessage.success('提交成功!')
      applyDialogVisible.value = false
      
      // 重置表单
      conversionInput.value = 0
      convertedScore.value = 0
      matchedConversionRule.value = null
      applyForm.attributeValues = {}
      applyForm.remark = ''
      fileList.value = []
      currentTemplateRules.value = []
      
      // 刷新数据
      await loadScore()
    } else {
      ElMessage.error('提交失败: ' + (response.msg || '未知错误'))
    }
  } catch (error: any) {
    console.error('提交申请失败:', error)
    ElMessage.error('提交申请失败: ' + (error.message || '未知错误'))
  }
}

// 获取时长单位标签
const getTimeUnitLabel = (unit: string) => {
  const map: Record<string, string> = {
    hour: '小时',
    day: '天',
    month: '月',
    year: '年'
  }
  return map[unit] || unit
}

onMounted(() => {
  loadTemplates()
  loadScore()
})
</script>