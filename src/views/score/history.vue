<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-[20px] font-bold text-gray-800">我的申请记录</h4>
      </div>

      <el-table :data="myRecords" border stripe class="mt-4">
        <el-table-column prop="templateName" label="加分项名称" width="150" />
        
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getScoreTypeColor(row.scoreType)">
              {{ getScoreTypeText(row.scoreType) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="填写内容" min-width="200">
          <template #default="{ row }">
            {{ formatRuleValues(row.ruleValues) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="applyScore" label="得分" width="80" align="center" />
        
        <el-table-column label="审核进度" width="140" align="center">
          <template #default="{ row }">
            <el-progress 
              :percentage="(row.currentReviewCount / row.reviewCount) * 100"
              :format="() => `${row.currentReviewCount}/${row.reviewCount}`"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="submitTime" label="提交时间" width="160" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.submitTime) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewDetail(row)">
              详情
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleCancelRecord(row.id, row.status)"
              :disabled="row.status === 1"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ✅ 详情弹窗 -->
    <el-dialog 
      v-model="showDetailDialog" 
      title="申请详情" 
      width="800px" 
      :close-on-click-modal="false"
    >
      <div v-if="selectedRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="加分项名称" :span="2">
            {{ selectedRecord.templateName }}
          </el-descriptions-item>
          
          <el-descriptions-item label="类型">
            <el-tag :type="getScoreTypeColor(selectedRecord.scoreType)">
              {{ getScoreTypeText(selectedRecord.scoreType) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="申请得分">
            <span class="text-lg font-bold text-green-600">{{ selectedRecord.applyScore }} 分</span>
          </el-descriptions-item>
          
          <el-descriptions-item label="审核状态">
            <el-tag :type="getStatusType(selectedRecord.status)">
              {{ getStatusText(selectedRecord.status) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="审核进度">
            {{ selectedRecord.currentReviewCount || 0 }} / {{ selectedRecord.reviewCount || 1 }}
          </el-descriptions-item>

          <el-descriptions-item label="填写内容" :span="2">
            {{ formatRuleValues(selectedRecord.ruleValues) }}
          </el-descriptions-item>

          <el-descriptions-item label="提交时间" :span="2">
            {{ formatDateTime(selectedRecord.submitTime) }}
          </el-descriptions-item>

          <el-descriptions-item label="备注" :span="2" v-if="selectedRecord.remark">
            {{ selectedRecord.remark }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- ✅ 使用新的 FileUtil 组件预览证明文件 -->
        <div v-if="detailProofFiles.length > 0" class="mt-4">
          <el-divider content-position="left">证明文件</el-divider>
          <FileUtil
            v-model="detailProofFiles"
            :show-upload-button="false"
            :show-preview-button="true"
            :show-download-button="true"
            :show-delete-button="false"
            :disabled="true"
          />
        </div>

        <!-- ✅ 审核记录展示 -->
        <div v-if="selectedRecord.reviewRecords && parseReviewRecords(selectedRecord.reviewRecords).length > 0" class="mt-4">
          <el-divider content-position="left">审核记录</el-divider>
          <el-timeline>
            <el-timeline-item 
              v-for="(record, index) in parseReviewRecords(selectedRecord.reviewRecords)" 
              :key="index"
              :type="getReviewTimelineType(record.action)"
              :timestamp="formatDateTime(record.timestamp)"
              placement="top"
            >
              <div class="flex items-center gap-2">
                <el-tag :type="getReviewTagType(record.action)" size="small">
                  {{ getActionText(record.action) }}
                </el-tag>
                <span class="text-gray-600">{{ record.reviewerName }}</span>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ record.comment }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- ✅ 如果还在审核中,显示提示 -->
        <div v-if="selectedRecord.status === 0 && selectedRecord.currentReviewCount < selectedRecord.reviewCount" class="mt-4">
          <el-alert
            type="info"
            title="审核进行中"
            :description="`已有 ${selectedRecord.currentReviewCount} 人审核，还需 ${selectedRecord.reviewCount - selectedRecord.currentReviewCount} 人审核`"
            :closable="false"
          />
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button 
            type="danger"
            @click="handleCancelFromDetail"
            :disabled="selectedRecord?.status === 1"
          >
            撤销申请
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getMyRecords, 
  cancelBonusRecord,
  type ProofFileItem  // ✅ 导入新的文件类型
} from '@/api/components/apiScore'
import { useUserStore } from '@/stores/profile'
import FileUtil from '@/components/fileUtil.vue'

const userStore = useUserStore()

const myRecords = ref<any[]>([])
const showDetailDialog = ref(false)
const selectedRecord = ref<any>(null)

// ✅ 详情弹窗中的证明文件列表（新格式）
const detailProofFiles = ref<ProofFileItem[]>([])

// ==================== 加载记录 ====================
const loadMyRecords = async () => {
  try {
    if (!userStore.studentInfo?.studentId) {
      console.log('等待学生信息加载...')
      return
    }
    
    const response = await getMyRecords(userStore.studentInfo.studentId)
    
    if (response.code === 200) {
      myRecords.value = response.data || []
      console.log('✅ 加载到的记录数:', myRecords.value.length)
    } else {
      ElMessage.error('加载记录失败: ' + (response.msg || '未知错误'))
    }
  } catch (error) {
    console.error('❌ 加载记录失败:', error)
    ElMessage.error('加载记录失败')
  }
}

// ==================== ✅ 解析证明文件（支持新旧格式） ====================
const parseProofFiles = (json: string): ProofFileItem[] => {
  if (!json) return []
  try {
    const files = JSON.parse(json)
    if (!Array.isArray(files)) return []
    
    // ✅ 检查是否为新格式 [{fileId, fileName}]
    if (files.length > 0 && typeof files[0] === 'object' && files[0].fileId !== undefined) {
      return files as ProofFileItem[]
    }
    
    // ✅ 兼容旧格式（字符串数组，如 MinIO objectName）
    return files.map((item: string, index: number) => ({
      fileId: 0,  // 旧数据没有 fileId，设为 0
      fileName: `证明文件${index + 1}`
    }))
  } catch {
    return []
  }
}

// ==================== 查看详情 ====================
const handleViewDetail = (row: any) => {
  selectedRecord.value = { ...row }
  
  // ✅ 解析证明文件为新格式
  detailProofFiles.value = parseProofFiles(row.proofFiles)
  
  showDetailDialog.value = true
}

// ==================== 撤销申请 ====================
const handleCancelRecord = async (recordId: string, status: number) => {
  if (status === 1) {
    ElMessage.warning('已通过审核的记录不能取消')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要取消该申请吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    const response = await cancelBonusRecord(recordId.toString())
    
    if (response.code === 200) {
      ElMessage.success('取消成功')
      showDetailDialog.value = false
      await loadMyRecords()
    } else {
      ElMessage.error('取消失败: ' + (response.msg || '未知错误'))
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('❌ 取消申请失败:', error)
      ElMessage.error('取消申请失败')
    }
  }
}

const handleCancelFromDetail = async () => {
  if (selectedRecord.value) {
    await handleCancelRecord(selectedRecord.value.id, selectedRecord.value.status)
  }
}

// ==================== 辅助函数 ====================
const getProgressPercentage = (row: any): number => {
  const current = row.currentReviewCount || 0
  const total = row.reviewCount || 1
  return Math.round((current / total) * 100)
}

const getProgressStatus = (row: any): string => {
  if (row.status === 1) return 'success'
  if (row.status === 2) return 'exception'
  return ''
}

const formatRuleValues = (json: string) => {
  if (!json) return '-'
  try {
    const obj = JSON.parse(json)
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ')
  } catch {
    return json
  }
}

const parseReviewRecords = (json: string) => {
  if (!json) return []
  try {
    const records = JSON.parse(json)
    return Array.isArray(records) ? records : []
  } catch {
    return []
  }
}

const formatDateTime = (datetime: string) => {
  if (!datetime) return '-'
  try {
    return new Date(datetime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return datetime
  }
}

const getScoreTypeText = (scoreType: number) => {
  const map: Record<number, string> = { 0: '学术专长', 1: '综合表现', 2: '学业成绩' }
  return map[scoreType] || '未知'
}

const getScoreTypeColor = (scoreType: number) => {
  const map: Record<number, string> = { 0: 'primary', 1: 'success', 2: 'warning' }
  return map[scoreType] || 'info'
}

const getStatusText = (status: number) => {
  const map: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回', 4: '已撤销' }
  return map[status] || '未知'
}

const getStatusType = (status: number) => {
  const map: Record<number, any> = { 0: 'warning', 1: 'success', 2: 'danger', 4: 'info' }
  return map[status] || 'info'
}

const getReviewTimelineType = (action: string) => {
  const map: Record<string, string> = { approved: 'success', rejected: 'danger', revoked: 'info' }
  return map[action] || 'info'
}

const getReviewTagType = (action: string) => {
  const map: Record<string, any> = { approved: 'success', rejected: 'danger', revoked: 'info' }
  return map[action] || 'info'
}

const getActionText = (action: string) => {
  const map: Record<string, string> = { approved: '审核通过', rejected: '审核驳回', revoked: '已撤销' }
  return map[action] || '未知操作'
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await userStore.fetchStudentInfo()
  await loadMyRecords()
})
</script>

<style scoped>
:deep(.el-progress__text) {
  font-size: 12px !important;
}
</style>