<script setup lang="ts">
  import { ref, reactive, onMounted, computed, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Delete } from '@element-plus/icons-vue'
  import {
    getAvailableTemplates,
    getTemplateDetail,
    submitBonusApplication,
    type SubmitBonusApplicationDto
  } from '@/api/components/apiScore'
  import { getScoreFieldConfigs, type FieldConfig } from '@/api/components/apiFieldConfig'
  import { useUserStore } from '@/stores/profile'
  import FileUtil from '@/components/fileUtil.vue'
  import FileTable from '@/components/FileTable.vue'
  import type { FileTableItem } from '@/components/FileTable.vue'
  import {
    getActiveTemplates,
    saveDemandApplicationWithFileIds,
    type DemandTemplate,
    type DemandApplicationItem
  } from '@/api/components/apiDemand'
  import { getUserInfo } from '@/api/components/apiProfile'
  import type { ProofFileItem } from '@/api/components/apiScore'
  import { agentStreamChat, agentResumeStream, type AgentStreamCallbacks } from '@/api/components/apiAIagent'
  import { marked } from 'marked'
  import DOMPurify from 'dompurify'
  
  // ==================== 用户信息 ====================
  const userStore = useUserStore()
  
  // ==================== 页面状态 ====================
  const activeTab = ref('')
  const loading = ref(true)
  const submitting = ref(false)
  const applyDialogVisible = ref(false)

  // ==================== 动态字段配置 ====================
  const scoreFieldConfigs = ref<FieldConfig[]>([])

  // ==================== 模板数据 ====================
  const allTemplates = ref<any[]>([])

  // 按 field_id 分组，兼容旧 scoreType（field_id 为 null 时按 scoreType 映射）
  const getTemplatesByFieldId = (fieldId: number) =>
    allTemplates.value.filter(t => {
      if (t.fieldId != null) return t.fieldId === fieldId
      // 旧数据兼容：scoreType 0/1/2 → field_config 中第 1/2/3 个 SCORE 字段
      const idx = scoreFieldConfigs.value.findIndex(f => f.id === fieldId)
      return t.scoreType === idx
    })

  // 保留原始计算属性以防其他地方引用
  const academicTemplates = computed(() => allTemplates.value.filter(t => t.scoreType === 0))
  const comprehensiveTemplates = computed(() => allTemplates.value.filter(t => t.scoreType === 1))
  const academicGradeTemplates = computed(() => allTemplates.value.filter(t => t.scoreType === 2))
  
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
      const [configRes, templateRes] = await Promise.all([
        getScoreFieldConfigs(),
        getAvailableTemplates()
      ])
      if (configRes.code === 200 && configRes.data.length > 0) {
        scoreFieldConfigs.value = configRes.data
        activeTab.value = String(configRes.data[0].id)
      } else {
        // 降级：使用硬编码三分类
        scoreFieldConfigs.value = [
          { id: -1, fieldKey: 'specialty',     displayName: '学术专长(12分)',  fieldType: 'SCORE', maxScore: 12, sortOrder: 0 },
          { id: -2, fieldKey: 'comprehensive', displayName: '综合表现(8分)',   fieldType: 'SCORE', maxScore: 8,  sortOrder: 1 },
          { id: -3, fieldKey: 'academic',      displayName: '学业成绩换算',    fieldType: 'SCORE', maxScore: 80, sortOrder: 2 },
        ]
        activeTab.value = '-1'
      }
      if (templateRes.code === 200) {
        allTemplates.value = templateRes.data
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

    const selectedEntries = Object.entries(selectedAttributeValues.value)

    for (const rule of currentTemplateRules.value) {
      if (!rule.attributes || rule.attributes.length === 0) continue

      const ruleAttrMap = new Map()
      rule.attributes.forEach((attr: any) => {
        ruleAttrMap.set(attr.attributeCode?.trim(), attr.attributeValue?.trim())
      })

      // 规则属性数量必须与已选数量一致
      if (ruleAttrMap.size !== selectedEntries.length) continue

      let isMatch = true
      for (const [code, value] of selectedEntries) {
        if (ruleAttrMap.get(code?.trim()) !== (value as string)?.trim()) {
          isMatch = false
          break
        }
      }

      if (isMatch) {
        matchedRule.value = rule
        return
      }
    }

    matchedRule.value = null
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

// ==================== ✅ TRANSFORM 规则初始化（支持多 rule 多区间）====================
const initConversionRules = (rules: any[]) => {
  if (rules.length === 0) {
    conversionRules.value = []
    inputMin.value = 0
    inputMax.value = 999
    return
  }

  // 遍历所有 rule，每个 rule 的每个 attribute 是一个换算区间
  const allIntervals: any[] = []
  for (const rule of rules) {
    if (!rule.attributes) continue
    for (const attr of rule.attributes) {
      allIntervals.push({
        ruleId: rule.id,
        id: attr.id,
        attributeCode: attr.attributeCode,
        attributeValue: attr.attributeValue,
        inputMin: Number(attr.inputMin),
        inputMax: Number(attr.inputMax),
        inputInterval: attr.inputInterval,
        description: attr.description
      })
    }
  }

  conversionRules.value = allIntervals

  if (conversionRules.value.length > 0) {
    const allMins = conversionRules.value.map(r => r.inputMin)
    const allMaxs = conversionRules.value.map(r => r.inputMax)
    inputMin.value = Math.min(...allMins)
    inputMax.value = Math.max(...allMaxs)
  }

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

  // ==================== 条件信息 Tab ====================
  const demandTemplates = ref<DemandTemplate[]>([])
  const demandForm = ref<Record<number, DemandApplicationItem>>({})
  const uploadProofFiles = ref<ProofFileItem[]>([])
  const existingProofFiles = ref<ProofFileItem[]>([])
  const loadingDemand = ref(false)
  const savingDemand = ref(false)
  const demandDialogVisible = ref(false)
  const hasDemandData = ref(false)

  const demandApplications = computed(() => Object.values(demandForm.value).filter(v => v.inputValue))

  const parseProofFiles = (json: string): ProofFileItem[] => {
    if (!json) return []
    try {
      const files = JSON.parse(json)
      if (!Array.isArray(files)) return []
      if (files.length > 0 && typeof files[0] === 'object' && files[0].fileId !== undefined) {
        return files as ProofFileItem[]
      }
      return files.map((_: any, i: number) => ({ fileId: 0, fileName: `认证材料${i + 1}` }))
    } catch { return [] }
  }

  const loadDemandData = async () => {
    loadingDemand.value = true
    try {
      const res = await getUserInfo()
      if (res.code === 200) {
        const info = res.data
        hasDemandData.value = !!(info.demandValue && info.demandValue !== '[]')
        if (info.demandFiles) {
          existingProofFiles.value = parseProofFiles(info.demandFiles)
        }
        if (hasDemandData.value) {
          try {
            const saved: DemandApplicationItem[] = JSON.parse(info.demandValue ?? '[]')
            saved.forEach(app => {
              demandForm.value[app.templateId] = app
            })
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ } finally {
      loadingDemand.value = false
    }
  }

  const openDemandDialog = async () => {
    loadingDemand.value = true
    try {
      const res = await getActiveTemplates()
      if (res.code === 200) {
        demandTemplates.value = res.data || []
        // init missing form entries
        demandTemplates.value.forEach(t => {
          if (!demandForm.value[t.id]) {
            demandForm.value[t.id] = { templateId: t.id, templateName: t.templateName, selectedCondition: '', inputValue: '' }
          }
        })
        uploadProofFiles.value = [...existingProofFiles.value]
        demandDialogVisible.value = true
      } else {
        ElMessage.error('加载需求模板失败')
      }
    } catch {
      ElMessage.error('加载需求模板失败')
    } finally {
      loadingDemand.value = false
    }
  }

  const getDemandFormValue = (templateId: number, field: 'selectedCondition' | 'inputValue') =>
    demandForm.value[templateId]?.[field] || ''

  const updateDemandForm = (templateId: number, field: 'selectedCondition' | 'inputValue', value: string) => {
    if (!demandForm.value[templateId]) {
      const t = demandTemplates.value.find(x => x.id === templateId)
      if (t) demandForm.value[templateId] = { templateId: t.id, templateName: t.templateName, selectedCondition: '', inputValue: '' }
    }
    if (demandForm.value[templateId]) demandForm.value[templateId][field] = value || ''
  }

  const handleSaveDemand = async () => {
    const applications = Object.values(demandForm.value).filter(v => v.inputValue?.trim())
    if (applications.length === 0) {
      ElMessage.warning('请至少填写一个条件的内容')
      return
    }
    savingDemand.value = true
    try {
      const res = await saveDemandApplicationWithFileIds(applications, uploadProofFiles.value)
      if (res.code === 200) {
        ElMessage.success('保存成功!')
        demandDialogVisible.value = false
        await loadDemandData()
      } else {
        ElMessage.error('保存失败: ' + (res.msg || '未知错误'))
      }
    } catch {
      ElMessage.error('保存失败')
    } finally {
      savingDemand.value = false
    }
  }
  
  // ==================== AI 智能申请（对话式） ====================
  interface AiMessage { role: 'user' | 'assistant'; content: string }

  const aiChatVisible = ref(false)
  const aiMessages = ref<AiMessage[]>([])
  const aiLoading = ref(false)
  const aiStreaming = ref(false)
  const aiInterrupted = ref(false)
  const aiInterruptSuggestions = ref<any[]>([])
  const aiSelectedIdx = ref(0)
  const aiSessionId = ref('ai_score_' + Date.now())
  const aiInput = ref('')
  const aiSupplement = ref('')
  const aiPendingFile = ref<File | null>(null)
  const aiProofItems = ref<FileTableItem[]>([])
  const aiMessageContainer = ref<HTMLElement | null>(null)

  let aiController: AbortController | null = null

  const renderAiMarkdown = (text: string) =>
    DOMPurify.sanitize(marked.parse(text, { async: false }) as string)

  const scrollAiToBottom = () => {
    nextTick(() => {
      if (aiMessageContainer.value)
        aiMessageContainer.value.scrollTop = aiMessageContainer.value.scrollHeight
    })
  }

  const onAiFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files?.[0]) { aiPendingFile.value = input.files[0]; input.value = '' }
  }

  const buildAiCallbacks = (aiMsgIdx: number): AgentStreamCallbacks => ({
    onToken(content) {
      aiStreaming.value = true
      aiMessages.value[aiMsgIdx].content += content
      scrollAiToBottom()
    },
    onInterrupt(question, extra) {
      aiLoading.value = false
      aiStreaming.value = false
      aiInterrupted.value = true
      aiInterruptSuggestions.value = extra?.suggestions ?? []
      aiMessages.value[aiMsgIdx].content = question
      scrollAiToBottom()
    },
    onResult(result) {
      if (result.reply && !aiMessages.value[aiMsgIdx].content) {
        aiMessages.value[aiMsgIdx].content = result.reply
        scrollAiToBottom()
      }
    },
    onError(msg) {
      if (!aiMessages.value[aiMsgIdx].content)
        aiMessages.value[aiMsgIdx].content = '抱歉，AI 出现异常，请稍后重试。'
      ElMessage.error(msg || '发送失败')
    },
    onDone() {
      aiLoading.value = false
      aiStreaming.value = false
      aiController = null
    },
  })

  const handleAiSend = () => {
    const msg = aiInput.value.trim()
    const file = aiPendingFile.value
    if ((!msg && !file) || aiLoading.value) return

    aiMessages.value.push({ role: 'user', content: file ? `${msg}\n📎 ${file.name}` : msg })
    aiInput.value = ''
    aiPendingFile.value = null
    aiInterrupted.value = false
    aiInterruptSuggestions.value = []
    scrollAiToBottom()

    aiMessages.value.push({ role: 'assistant', content: '' })
    const idx = aiMessages.value.length - 1
    aiLoading.value = true
    aiStreaming.value = false

    aiController = agentStreamChat(msg, aiSessionId.value, file ?? undefined, buildAiCallbacks(idx))
  }

  const handleAiResume = () => {
    const text = aiSupplement.value.trim()
    if (!text) return

    aiMessages.value.push({ role: 'user', content: text })
    aiSupplement.value = ''
    aiInterrupted.value = false
    aiInterruptSuggestions.value = []
    scrollAiToBottom()

    aiMessages.value.push({ role: 'assistant', content: '' })
    const idx = aiMessages.value.length - 1
    aiLoading.value = true
    aiStreaming.value = false

    aiController = agentResumeStream(aiSessionId.value, text, buildAiCallbacks(idx))
  }

  const handleAiConfirm = () => {
    const selected = aiInterruptSuggestions.value[aiSelectedIdx.value]
    if (!selected || aiProofItems.value.length === 0) {
      ElMessage.warning('请选择加分项并上传至少一个证明材料')
      return
    }
    const proofFileIds = aiProofItems.value.map(p => p.fileId)
    const proofValues  = aiProofItems.value.map(p => Number(p.fileValue) || 0)

    const confirmJson = JSON.stringify({ confirm: true, proofFileIds, proofValues })

    aiMessages.value.push({ role: 'user', content: `确认提交 ${selected.templateName}` })
    aiInterrupted.value = false
    aiInterruptSuggestions.value = []
    aiProofItems.value = []
    scrollAiToBottom()

    aiMessages.value.push({ role: 'assistant', content: '' })
    const idx = aiMessages.value.length - 1
    aiLoading.value = true
    aiStreaming.value = false

    aiController = agentResumeStream(aiSessionId.value, confirmJson, buildAiCallbacks(idx))
  }

  const handleAiCancel = () => {
    aiMessages.value.push({ role: 'user', content: 'cancel' })
    aiInterrupted.value = false
    aiInterruptSuggestions.value = []
    aiProofItems.value = []
    scrollAiToBottom()

    aiMessages.value.push({ role: 'assistant', content: '' })
    const idx = aiMessages.value.length - 1
    aiLoading.value = true
    aiStreaming.value = false

    aiController = agentResumeStream(aiSessionId.value, 'cancel', buildAiCallbacks(idx))
  }

  // ==================== 生命周期 ====================

  onMounted(async () => {
    loadTemplates()
    loadDemandData()
  })
  </script>
  
  <template>
    <div class="min-h-screen flex flex-col gap-5 p-4">
      <!-- AI 智能申请入口 -->
      <el-card>
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold text-gray-700">AI 智能申请助手</span>
            <span class="text-sm text-gray-400 ml-2">上传证书或直接描述，AI 自动匹配加分项并协助提交</span>
          </div>
          <el-button type="primary" @click="aiChatVisible = true">AI 智能申请</el-button>
        </div>
      </el-card>

      <!-- AI 对话框 -->
      <el-dialog v-model="aiChatVisible" title="AI 智能申请助手" width="640px" :close-on-click-modal="false" destroy-on-close>
        <!-- 消息列表 -->
        <div ref="aiMessageContainer" class="h-80 overflow-y-auto space-y-3 px-1">
          <div v-if="aiMessages.length === 0" class="text-center text-gray-400 py-8">
            <div class="text-3xl mb-2">🤖</div>
            <p class="text-sm">请上传证书文件或描述您的加分情况，我来帮您匹配</p>
          </div>
          <div v-for="(msg, i) in aiMessages" :key="i" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
            <div
              v-if="msg.role === 'assistant' && msg.content"
              class="max-w-[85%] px-4 py-2 rounded-2xl text-sm bg-gray-100 text-gray-800 rounded-bl-md"
            >
              <div class="markdown-body" v-html="renderAiMarkdown(msg.content)" />
            </div>
            <div v-else-if="msg.role === 'user'" class="max-w-[80%] px-4 py-2 rounded-2xl text-sm bg-blue-500 text-white rounded-br-md whitespace-pre-wrap">
              {{ msg.content }}
            </div>
          </div>
          <div v-if="aiLoading && !aiStreaming" class="flex justify-start">
            <div class="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
              <div class="flex space-x-1">
                <div v-for="n in 3" :key="n" class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" :style="{ animationDelay: (n - 1) * 0.1 + 's' }" />
              </div>
            </div>
          </div>
        </div>

        <!-- HITL：有匹配结果时展示上传区 + 确认 -->
        <div v-if="aiInterrupted && aiInterruptSuggestions.length > 0" class="mt-4 border-t pt-4 space-y-3">
          <div class="text-sm font-semibold text-gray-700">匹配结果：</div>
          <div
            v-for="(s, idx) in aiInterruptSuggestions"
            :key="idx"
            class="border rounded-lg p-3 cursor-pointer hover:border-blue-400 transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': aiSelectedIdx === idx }"
            @click="aiSelectedIdx = idx"
          >
            <div class="flex justify-between">
              <span class="font-medium">{{ s.templateName }} / {{ s.ruleName }}</span>
              <span class="text-green-600 font-bold">{{ s.estimatedScore }} 分</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">{{ s.reason }}</div>
          </div>

          <div class="text-sm font-semibold text-gray-700 mt-2">上传证明材料：</div>
          <FileTable
            v-model="aiProofItems"
            :show-file-value="true"
            file-value-label="证明分数"
            file-value-type="number"
            :file-value-min="0"
            :file-value-max="999.99"
            :file-value-precision="2"
            file-value-placeholder="对应分数"
            file-category="SCORE_PROOF"
            file-purpose="加分申请证明材料"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />

          <div class="flex gap-2 justify-end">
            <el-button @click="handleAiCancel">取消申请</el-button>
            <el-button
              type="primary"
              :disabled="aiProofItems.length === 0 || aiLoading"
              @click="handleAiConfirm"
            >确认提交</el-button>
          </div>
        </div>

        <!-- HITL：信息不完整时的文字补充 -->
        <div v-else-if="aiInterrupted" class="mt-3">
          <div class="flex gap-2">
            <el-input v-model="aiSupplement" placeholder="请补充信息..." @keyup.enter="handleAiResume" />
            <el-button type="primary" @click="handleAiResume" :disabled="!aiSupplement.trim()">发送</el-button>
          </div>
        </div>

        <!-- 普通输入区 -->
        <div v-else class="mt-3 flex gap-2">
          <label class="flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors flex-shrink-0" title="上传证书">
            <input type="file" class="hidden" accept=".pdf,.docx,.doc" @change="onAiFileChange" />
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </label>
          <el-input
            v-model="aiInput"
            placeholder="输入消息或上传证书文件..."
            @keyup.enter="handleAiSend"
            :disabled="aiLoading"
          />
          <el-button type="primary" @click="handleAiSend" :loading="aiLoading" :disabled="!aiInput.trim() && !aiPendingFile">发送</el-button>
        </div>

        <div v-if="aiPendingFile" class="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span>📎 {{ aiPendingFile.name }}</span>
          <button @click="aiPendingFile = null" class="text-red-400 hover:text-red-600">✕</button>
        </div>
      </el-dialog>
      <el-card class="min-h-[100vh]">
        <el-tabs v-model="activeTab">
          <el-tab-pane
            v-for="field in scoreFieldConfigs"
            :key="field.id"
            :label="field.maxScore != null ? `${field.displayName}(${field.maxScore}分)` : field.displayName"
            :name="String(field.id)"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="template in getTemplatesByFieldId(field.id)"
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

          <!-- 条件信息 Tab -->
          <el-tab-pane label="条件信息" name="demand">
            <div class="flex items-center justify-between mb-4">
              <span class="text-gray-600 text-sm">填写保研认证条件，如英语水平、违纪次数等</span>
              <el-button type="primary" size="small" @click="openDemandDialog" :loading="loadingDemand">
                {{ hasDemandData ? '修改条件信息' : '填写条件信息' }}
              </el-button>
            </div>

            <div v-if="hasDemandData && Object.values(demandForm).some(v => v.inputValue)">
              <el-table :data="Object.values(demandForm).filter(v => v.inputValue)" border stripe>
                <el-table-column prop="templateName" label="条件名称" width="200" />
                <el-table-column prop="selectedCondition" label="选择条件" width="150">
                  <template #default="{ row }">
                    <el-tag v-if="row.selectedCondition" size="small">{{ row.selectedCondition }}</el-tag>
                    <span v-else class="text-gray-400">-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="inputValue" label="填写内容" min-width="200" />
              </el-table>
            </div>
            <el-empty v-else description="暂未填写条件信息" />
          </el-tab-pane>
        </el-tabs>
      </el-card>

      <!-- ========== 申请弹窗 ========== -->
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
      <!-- ========== 条件信息填写弹窗 ========== -->
      <el-dialog
        v-model="demandDialogVisible"
        :title="hasDemandData ? '修改条件信息' : '填写条件信息'"
        width="800px"
        :close-on-click-modal="false"
      >
        <div v-if="demandTemplates.length > 0">
          <div
            v-for="(template, index) in demandTemplates"
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
                  <el-option v-for="cond in template.conditions" :key="cond" :label="cond" :value="cond" />
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
            <el-button type="primary" @click="handleSaveDemand" :loading="savingDemand">保存</el-button>
          </div>
        </template>
      </el-dialog>

  </div>
</template>
  
  <style scoped>
  .el-card {
    border-radius: 8px;
  }
  .demand-row {
    transition: all 0.2s ease;
  }
  .demand-row:hover {
    border-color: #3377FF;
  }
  .markdown-body :deep(p) { margin: 0.25em 0; }
  .markdown-body :deep(strong) { font-weight: 600; }
  .markdown-body :deep(code) { background: #f0f0f0; padding: 0 4px; border-radius: 3px; font-size: 0.85em; }
  .markdown-body :deep(pre) { background: #f5f5f5; padding: 8px; border-radius: 4px; overflow-x: auto; }
  </style>