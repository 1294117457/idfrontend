<script setup lang="ts">
  import { ref, reactive, onMounted, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Delete } from '@element-plus/icons-vue'
  import {
    getAvailableTemplates,
    getTemplateDetail,
    submitBonusApplication,
    type SubmitBonusApplicationDto
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
  
  // ==================== 模板数据 ====================
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
  const templateAttributes = ref<string[]>([])
  const attributeOptions = ref<Record<string, string[]>>({})
  const selectedAttributeValues = ref<Record<string, string>>({})
  const currentTemplateRules = ref<any[]>([])
  const matchedRule = ref<any>(null)
  
  // ==================== 申请表单数据 ====================
  const selectedTemplate = ref<any>(null)
  const proofItems = ref<FileTableItem[]>([])
  
  const applyForm = reactive({
    templateId: '',
    attributeValues: {} as Record<string, any>,
    remark: ''
  })
  
  // ==================== TRANSFORM 模板换算相关 ====================
  const conversionInput = ref(0)
  const convertedScore = ref(0)
  const matchedConversionRule = ref<any>(null)
  const conversionRules = ref<any[]>([])
  
  // ==================== ✅ 计算预期总分 ====================
  const totalProofScore = computed(() => {
    return proofItems.value.reduce((sum, item) => sum + (Number(item.fileValue) || 0), 0)
  })
  
  // ✅ 当前模板类型
  const currentTemplateType = ref<'CONDITION' | 'TRANSFORM'>('CONDITION')
  
  // ==================== ✅ FileUtil 文件变化处理 ====================
  const handleFileChange = (files: Array<{ fileId: number; fileName: string }>) => {
    const existingMap = new Map(proofItems.value.map(item => [item.fileId, item]))
    
    proofItems.value = files.map(file => {
      const existing = existingMap.get(file.fileId)
      return {
        fileId: file.fileId,
        fileName: file.fileName,
        fileValue: existing?.fileValue || 0,
        remark: existing?.remark || ''
      }
    })
  }
  
  // ==================== ✅ 分数输入变化回调 ====================
  const handleProofValueChange = (file: FileTableItem, index: number) => {
    console.log(`文件 ${file.fileName} 的值变更为: ${file.fileValue}`)
  }
  
  // ==================== 数据加载函数 ====================
  const loadTemplates = async () => {
    loading.value = true
    try {
      const response = await getAvailableTemplates()
      if (response.code === 200) {
        allTemplates.value = response.data
      } else {
        ElMessage.error('加载模板失败')
      }
    } catch (error) {
      ElMessage.error('加载模板失败')
    } finally {
      loading.value = false
    }
  }
  
  // ==================== ✅ 打开申请弹窗 ====================
  const openApplyDialog = async (template: any) => {
    selectedTemplate.value = template
    currentTemplateType.value = template.templateType
    resetApplyForm()
  
    try {
      const response = await getTemplateDetail(template.id)
      if (response.code !== 200) {
        ElMessage.error('获取模板详情失败')
        return
      }
  
      const detail = response.data
      currentTemplateRules.value = detail.rules || []
  
      if (template.templateType === 'CONDITION') {
        initNormalRules(currentTemplateRules.value)
      } else if (template.templateType === 'TRANSFORM') {
        // ✅ 修复: 从 rules[0].attributes 提取换算规则
        initConversionRules(currentTemplateRules.value)
      }
  
      applyDialogVisible.value = true
    } catch (error) {
      console.error('获取模板详情失败:', error)
      ElMessage.error('获取模板详情失败')
    }
  }
  
  // ==================== ✅ CONDITION 模板:属性选择变化时匹配规则 ====================
  const handleAttributeChange = () => {
    const allSelected = templateAttributes.value.every(attr => selectedAttributeValues.value[attr])
    
    if (!allSelected) {
      matchedRule.value = null
      return
    }
  
    for (const rule of currentTemplateRules.value) {
      if (!rule.attributes || rule.attributes.length === 0) continue
  
      const ruleAttrMap = new Map()
      rule.attributes.forEach((attr: any) => {
        ruleAttrMap.set(attr.attributeCode, attr.attributeValue)
      })
  
      let isMatch = true
      for (const [code, value] of Object.entries(selectedAttributeValues.value)) {
        if (ruleAttrMap.get(code) !== value) {
          isMatch = false
          break
        }
      }
  
      if (isMatch) {
        matchedRule.value = rule
        console.log('✅ 匹配到规则:', rule)
        return
      }
    }
  
    matchedRule.value = null
    console.log('⚠️ 未找到匹配的规则')
  }
  
  // ==================== CONDITION 规则初始化 ====================
  const initNormalRules = (rules: any[]) => {
    const attributeSet = new Set<string>()
    const options: Record<string, Set<string>> = {}
    
    rules.forEach((rule: any) => {
      if (!rule.attributes || rule.attributes.length === 0) return
  
      rule.attributes.forEach((attr: any) => {
        attributeSet.add(attr.attributeCode)
        
        if (!options[attr.attributeCode]) {
          options[attr.attributeCode] = new Set()
        }
        options[attr.attributeCode].add(attr.attributeValue)
      })
    })
    
    templateAttributes.value = Array.from(attributeSet)
    attributeOptions.value = {}
    Object.keys(options).forEach(key => {
      attributeOptions.value[key] = Array.from(options[key])
    })
  
    selectedAttributeValues.value = {}
  }
  
  // ✅ 新增: 动态输入范围
const inputMin = ref(0)
const inputMax = ref(999)

// ==================== ✅ TRANSFORM 规则初始化 (修复) ====================
const initConversionRules = (rules: any[]) => {
  // ✅ 修复: 从第一个规则的 attributes 数组提取所有换算区间
  if (rules.length === 0 || !rules[0].attributes) {
    conversionRules.value = []
    inputMin.value = 0
    inputMax.value = 999
    return
  }

  // ✅ 提取所有属性作为换算规则
  conversionRules.value = rules[0].attributes.map((attr: any) => {
    return {
      id: attr.id,
      attributeCode: attr.attributeCode,
      attributeValue: attr.attributeValue,  // 公式
      inputMin: Number(attr.inputMin),
      inputMax: Number(attr.inputMax),
      inputInterval: attr.inputInterval,
      description: attr.description
    }
  })

  // ✅ 动态设置输入范围 (取所有规则的最小和最大值)
  if (conversionRules.value.length > 0) {
    const allMins = conversionRules.value.map(r => r.inputMin)
    const allMaxs = conversionRules.value.map(r => r.inputMax)
    inputMin.value = Math.min(...allMins)
    inputMax.value = Math.max(...allMaxs)
  }

  console.log('✅ 解析到的换算规则:', conversionRules.value)
  console.log('✅ 输入范围:', inputMin.value, '-', inputMax.value)

  conversionInput.value = 0
  convertedScore.value = 0
  matchedConversionRule.value = null
}
  
  // ==================== ✅ TRANSFORM 模板换算逻辑 ====================
  const handleConversionInput = (value: number | undefined) => {
  if (!value || conversionRules.value.length === 0) {
    convertedScore.value = 0
    matchedConversionRule.value = null
    return
  }

  console.log('🔍 输入值:', value)
  console.log('🔍 可用规则数量:', conversionRules.value.length)

  for (const rule of conversionRules.value) {
    if (!rule.inputMin && rule.inputMin !== 0) continue
    if (!rule.inputMax && rule.inputMax !== 0) continue

    const inRange = isInRange(value, rule)
    console.log(`🔍 检查规则 [${rule.inputMin}, ${rule.inputMax}] ${rule.inputInterval}:`, inRange)

    if (inRange) {
      matchedConversionRule.value = rule
      convertedScore.value = evaluateFormula(rule.attributeValue, value)
      console.log('✅ 匹配到规则:', rule)
      console.log('✅ 换算分数:', convertedScore.value)
      return  // ✅ 修复: 找到匹配后立即返回
    }
  }

  // ✅ 只有遍历完所有规则都没匹配时才执行这里
  convertedScore.value = 0
  matchedConversionRule.value = null
  ElMessage.warning('输入值超出所有有效范围')
}
  
const isInRange = (value: number, rule: any): boolean => {
  const min = Number(rule.inputMin)
  const max = Number(rule.inputMax)
  
  // ✅ 添加调试日志
  console.log(`  比较: ${min} <= ${value} <= ${max}, 区间类型: ${rule.inputInterval}`)
  
  switch (rule.inputInterval) {
    case 'CLOSED':
      return value >= min && value <= max
    case 'OPEN':
      return value > min && value < max
    case 'LEFT_OPEN':
      return value > min && value <= max
    case 'RIGHT_OPEN':
      return value >= min && value < max
    default:
      return value >= min && value <= max
  }
}
  
const evaluateFormula = (formula: string, inputValue: number): number => {
  try {
    // ✅ 将 INPUT 替换为实际值
    const formulaWithValue = formula.replace(/INPUT/g, inputValue.toString())
    console.log('📐 计算公式:', formulaWithValue)
    
    // ✅ 使用 Function 构造函数代替 eval (更安全)
    const result = new Function(`return ${formulaWithValue}`)()
    const finalScore = Math.round(Number(result) * 100) / 100
    
    console.log('📐 计算结果:', finalScore)
    return finalScore
  } catch (error) {
    console.error('❌ 公式计算错误:', error)
    ElMessage.error('公式计算失败，请检查公式是否正确')
    return 0
  }
}
  
const getConversionRangeText = (): string => {
  if (!conversionInput.value) return '请输入分数'
  
  if (matchedConversionRule.value) {
    const { inputMin, inputMax, inputInterval } = matchedConversionRule.value
    const left = inputInterval === 'OPEN' || inputInterval === 'LEFT_OPEN' ? '(' : '['
    const right = inputInterval === 'OPEN' || inputInterval === 'RIGHT_OPEN' ? ')' : ']'
    return `${left}${inputMin}, ${inputMax}${right}`
  }
  
  return '未找到匹配的换算规则'
}
  
  // ==================== ✅ 提交申请 ====================
  const handleSubmitApply = async () => {
   // 验证
   if (!selectedTemplate.value) {
    ElMessage.error('请选择模板')
    return
  }

  if (proofItems.value.length === 0) {
    ElMessage.error('请至少上传一个证明材料')
    return
  }

  // ✅ 根据模板类型验证
  if (currentTemplateType.value === 'CONDITION') {
    if (!matchedRule.value) {
      ElMessage.error('未匹配到规则，请检查属性选择')
      return
    }

    // 验证分数输入
    const totalScore = proofItems.value.reduce((sum, item) => sum + (Number(item.fileValue) || 0), 0)
    if (totalScore !== matchedRule.value.ruleScore) {
      ElMessage.error(`证明材料总分(${totalScore})与规则分数(${matchedRule.value.ruleScore})不匹配`)
      return
    }
  } else if (currentTemplateType.value === 'TRANSFORM') {
    if (conversionInput.value === 0) {
      ElMessage.error('请输入换算值')
      return
    }

    if (!matchedConversionRule.value) {
      ElMessage.error('未匹配到换算规则')
      return
    }
  }

  try {
    submitting.value = true

    // ✅ 从 username（学校邮箱）提取学号
    const username = userStore.userInfo?.username || ''
    const studentId = username.includes('@stu.xmu.edu.cn') ? username.split('@')[0] : ''

    const submitData: SubmitBonusApplicationDto = {
      studentId: studentId,
      studentName: userStore.studentInfo?.fullName || '',
      major: userStore.studentInfo?.major || '',
      enrollmentYear: userStore.studentInfo?.grade || new Date().getFullYear(),
      templateName: selectedTemplate.value.templateName,
      templateType: currentTemplateType.value,
      scoreType: selectedTemplate.value.scoreType,
      applyScore: currentTemplateType.value === 'CONDITION' 
        ? matchedRule.value.ruleScore 
        : convertedScore.value,
      reviewCount: selectedTemplate.value.reviewCount || 1,
      remark: applyForm.remark,
      proofItems: proofItems.value.map(item => ({
        proofFileId: item.fileId,
        proofValue: Number(item.fileValue) || 0,
        reviewCount: selectedTemplate.value.reviewCount || 1,
        remark: item.remark || ''
      }))
    }

    // ✅ CONDITION 模板不需要这些字段
    if (currentTemplateType.value === 'TRANSFORM') {
      submitData.applyInput = conversionInput.value
      submitData.ruleId = matchedConversionRule.value?.ruleId
    } else {
      submitData.ruleId = matchedRule.value?.id
    }

    console.log('✅ 提交数据:', submitData)

    const response = await submitBonusApplication(submitData)

    if (response.code === 200) {
      ElMessage.success('提交成功')
      applyDialogVisible.value = false
      
      // 重置表单
      proofItems.value = []
      applyForm.remark = ''
      selectedAttributeValues.value = {}
      conversionInput.value = 0
      convertedScore.value = 0
    } else {
      ElMessage.error(response.message || '提交失败')
    }
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error(error.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

  
  // ✅ 重置表单
  const resetApplyForm = () => {
    proofItems.value = []
    selectedAttributeValues.value = {}
    matchedRule.value = null
    conversionInput.value = 0
    convertedScore.value = 0
    matchedConversionRule.value = null
    applyForm.remark = ''
  }
  
  // ==================== 生命周期 ====================
  onMounted(async () => {
    loadTemplates()
  })
  </script>
  
  <template>
    <div class="min-h-screen flex flex-col gap-5 p-4">
      <!-- 模板卡片列表 -->
      <el-card class="min-h-[100vh]">
        <el-tabs v-model="activeTab">
          <!-- 学术专长 -->
          <el-tab-pane label="学术专长(12分)" name="academic">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div 
                v-for="template in academicTemplates" 
                :key="template.id"
                class="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                @click="openApplyDialog(template)"
              >
                <h3 class="text-lg font-bold mb-2">{{ template.templateName }}</h3>
                <p class="text-sm text-gray-600 mb-2">{{ template.description }}</p>
                <div class="flex justify-between items-center text-xs">
                  <el-tag :type="template.templateType === 'CONDITION' ? 'success' : 'warning'">
                    {{ template.templateType === 'CONDITION' ? '条件匹配' : '分数换算' }}
                  </el-tag>
                  <span class="text-blue-600">最高{{ template.templateMaxScore }}分</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
  
          <!-- 综合表现 -->
          <el-tab-pane label="综合表现(8分)" name="comprehensive">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div 
                v-for="template in comprehensiveTemplates" 
                :key="template.id"
                class="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                @click="openApplyDialog(template)"
              >
                <h3 class="text-lg font-bold mb-2">{{ template.templateName }}</h3>
                <p class="text-sm text-gray-600 mb-2">{{ template.description }}</p>
                <div class="flex justify-between items-center text-xs">
                  <el-tag :type="template.templateType === 'CONDITION' ? 'success' : 'warning'">
                    {{ template.templateType === 'CONDITION' ? '条件匹配' : '分数换算' }}
                  </el-tag>
                  <span class="text-blue-600">最高{{ template.templateMaxScore }}分</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
  
          <!-- 学业成绩 -->
          <el-tab-pane label="学业成绩换算" name="academic-grade">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div 
                v-for="template in academicGradeTemplates" 
                :key="template.id"
                class="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                @click="openApplyDialog(template)"
              >
                <h3 class="text-lg font-bold mb-2">{{ template.templateName }}</h3>
                <p class="text-sm text-gray-600 mb-2">{{ template.description }}</p>
                <div class="flex justify-between items-center text-xs">
                  <el-tag :type="template.templateType === 'CONDITION' ? 'success' : 'warning'">
                    {{ template.templateType === 'CONDITION' ? '条件匹配' : '分数换算' }}
                  </el-tag>
                  <span class="text-blue-600">最高{{ template.templateMaxScore }}分</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
  
      <!-- ========== ✅ 申请弹窗 ========== -->
      <el-dialog 
        v-model="applyDialogVisible" 
        :title="`申请 - ${selectedTemplate?.templateName}`"
        width="900px"
        :close-on-click-modal="false"
      >
        <el-form label-width="120px">
          <!-- ========== CONDITION 模板:属性选择 ========== -->
          <template v-if="currentTemplateType === 'CONDITION'">
            <el-alert
              title="请选择以下属性以匹配对应的规则和分数"
              type="info"
              :closable="false"
              class="mb-4"
            />
  
            <el-form-item 
              v-for="attr in templateAttributes" 
              :key="attr"
              :label="attr"
              required
            >
              <el-select
                v-model="selectedAttributeValues[attr]"
                placeholder="请选择"
                class="w-full"
                @change="handleAttributeChange"
              >
                <el-option
                  v-for="option in attributeOptions[attr]"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </el-select>
            </el-form-item>
  
            <!-- ✅ 显示匹配的规则 -->
            <el-form-item label="匹配规则">
              <div v-if="matchedRule" class="w-full">
                <el-tag type="success">{{ matchedRule.ruleName }}</el-tag>
                <div class="text-sm text-gray-500 mt-1">
                  {{ matchedRule.description }}
                </div>
              </div>
              <div v-else class="text-gray-400">
                请完成属性选择
              </div>
            </el-form-item>
  
            <el-form-item label="规则分数">
              <div class="text-2xl font-bold text-green-600">
                {{ matchedRule ? matchedRule.ruleScore.toFixed(2) : '0.00' }} 分
              </div>
            </el-form-item>
          </template>
  
          <!-- ========== TRANSFORM 模板:分数换算 ========== -->
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
              <!-- ✅ 修复: 动态设置输入范围 -->
              <el-input-number
                v-model="conversionInput"
                :min="inputMin"
                :max="inputMax"
                :precision="2"
                :placeholder="`范围: ${inputMin} - ${inputMax}`"
                @change="handleConversionInput"
                class="w-full"
              />
              <div class="text-xs text-gray-500 mt-1">
                有效范围: {{ inputMin }} - {{ inputMax }}
              </div>
            </el-form-item>

            <el-form-item label="匹配区间">
              <div v-if="matchedConversionRule" class="w-full">
                <el-tag type="success">
                  {{ getConversionRangeText() }}
                </el-tag>
                <div class="text-sm text-gray-500 mt-1">
                  公式: {{ matchedConversionRule.attributeValue }}
                </div>
              </div>
              <div v-else class="text-gray-400">
                {{ getConversionRangeText() }}
              </div>
            </el-form-item>

            <el-form-item label="换算分数">
              <div class="text-2xl font-bold text-green-600">
                {{ convertedScore.toFixed(2) }} 分
              </div>
              <p class="text-xs text-gray-500 mt-1">
                基于公式: {{ matchedConversionRule?.attributeValue || '-' }}
              </p>
            </el-form-item>
          </template>
  
          <!-- ========== ✅ 证明材料上传 (两种模板通用) ========== -->
          <el-form-item label="证明材料" required>
          <div class="w-full">
            <!-- ✅ 修复: 使用 show-file-value 替代 show-value-input -->
            <FileTable
              v-model="proofItems"
              :show-file-value="true"
              :file-value-label="currentTemplateType === 'CONDITION' ? '证明分数' : '证明输入值'"
              :file-value-type="'number'"
              :file-value-min="0"
              :file-value-max="999.99"
              :file-value-precision="2"
              :file-value-placeholder="currentTemplateType === 'CONDITION' ? '请输入该证明对应的分数' : '请输入该证明对应的输入值'"
              :file-category="'SCORE_PROOF'"
              :file-purpose="'加分申请证明材料'"
              :accept="'.pdf,.jpg,.jpeg,.png,.doc,.docx'"
              :limit="40"
              :show-upload-button="true"
              :show-preview-button="true"
              :show-download-button="true"
              :show-delete-button="true"
              @value-change="handleProofValueChange"
            />

            <!-- ✅ 统计信息 -->
            <div class="flex justify-between items-center mt-3 text-sm">
              <span class="text-gray-500">
                已上传 {{ proofItems.length }} 个文件
              </span>
              <span class="text-blue-600 font-semibold">
                {{ currentTemplateType === 'CONDITION' ? '证明材料总分' : '证明材料总值' }}: 
                {{ totalProofScore.toFixed(2) }}
              </span>
            </div>

            <!-- ✅ TRANSFORM 模板提示 -->
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

        <!-- ✅ 预期得分显示 -->
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
  
  <style scoped>
  .el-card {
    border-radius: 8px;
  }
  </style>