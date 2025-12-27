<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card class="min-h-[100vh]">
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
        
        <el-table-column label="分数" width="150" align="center">
          <template #default="{ row }">
            <div class="flex flex-col gap-1">
              <span class="text-sm text-gray-500">预期: {{ row.applyScore }} 分</span>
              <span class="text-sm font-bold text-green-600">已获: {{ row.gainScore || 0 }} 分</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="审核进度" width="140" align="center">
          <template #default="{ row }">
            <el-progress 
              :percentage="getProgressPercentage(row)"
              :status="getProgressStatus(row)"
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

    <!-- ✅ 详情弹窗（展示证明材料列表） -->
    <el-dialog 
      v-model="showDetailDialog" 
      title="申请详情" 
      width="900px" 
      :close-on-click-modal="false"
    >
      <div v-if="selectedRecord">
        <!-- ✅ 基本信息 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="加分项名称" :span="2">
            {{ selectedRecord.templateName }}
          </el-descriptions-item>
          
          <el-descriptions-item label="类型">
            <el-tag :type="getScoreTypeColor(selectedRecord.scoreType)">
              {{ getScoreTypeText(selectedRecord.scoreType) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="预期分数">
            <span class="text-lg font-bold text-blue-600">{{ selectedRecord.applyScore }} 分</span>
          </el-descriptions-item>
          
          <el-descriptions-item label="已获得分数">
            <span class="text-lg font-bold text-green-600">{{ selectedRecord.gainScore || 0 }} 分</span>
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

        <!-- ✅ 证明材料列表（可滚动） -->
        <div v-loading="proofsLoading" class="mt-4">
          <el-divider content-position="left">证明材料列表</el-divider>
          
          <div v-if="proofsList.length === 0" class="text-center text-gray-400 py-8">
            暂无证明材料
          </div>
          
          <!-- ✅ 可滚动的证明材料表格 -->
          <div v-else class="max-h-96 overflow-y-auto">
            <el-table :data="proofsList" border stripe>
              <el-table-column label="序号" width="60" align="center">
                <template #default="{ $index }">
                  {{ $index + 1 }}
                </template>
              </el-table-column>
              
              <el-table-column prop="proofScore" label="分数" width="100" align="center">
                <template #default="{ row }">
                  <span class="font-bold text-blue-600">{{ row.proofScore }} 分</span>
                </template>
              </el-table-column>
              
              <el-table-column label="审核状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getProofStatusType(row.status)">
                    {{ getProofStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column label="审核进度" width="120" align="center">
                <template #default="{ row }">
                  {{ row.approvedCount }} / {{ selectedRecord.reviewCount }}
                </template>
              </el-table-column>
              
              <el-table-column prop="remark" label="说明" min-width="150" />
              
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button 
                    type="primary" 
                    size="small"
                    @click="handlePreviewProof(row.proofFileId)"
                  >
                    预览
                  </el-button>
                  <el-button 
                    type="success" 
                    size="small"
                    @click="handleDownloadProof(row.proofFileId, row.remark)"
                  >
                    下载
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- ✅ 审核记录展示 -->
        <div v-if="selectedRecord.reviewRecords && parseReviewRecords(selectedRecord.reviewRecords).length > 0" class="mt-4">
          <el-divider content-position="left">审核记录</el-divider>
          <el-timeline>
            <el-timeline-item 
              v-for="(record, index) in parseReviewRecords(selectedRecord.reviewRecords)" 
              :key="index"
              :type="getReviewTimelineType(record.action)"
              placement="top"
            >
              <div class="flex items-center gap-2 mb-1">
                <el-tag :type="getReviewTagType(record.action)">
                  {{ getActionText(record.action) }}
                </el-tag>
                <span class="font-medium">{{ record.reviewerName }}</span>
              </div>
              <p class="text-sm text-gray-600">{{ record.comment || '无备注' }}</p>
              <p class="text-xs text-gray-400">{{ record.reviewTime }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- ✅ 审核进度提示 -->
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
    getApplicationProofs,
    getFilePreviewById,
    downloadFileById
  } from '@/api/components/apiScore'
  import { useUserStore } from '@/stores/profile'
  
  const userStore = useUserStore()
  
  const myRecords = ref<any[]>([])
  const showDetailDialog = ref(false)
  const selectedRecord = ref<any>(null)
  
  // ✅ 证明材料列表
  const proofsList = ref<any[]>([])
  const proofsLoading = ref(false)
  
  // ==================== 加载记录 ====================
  const loadMyRecords = async () => {
    try {
      // ✅ 直接调用，不传 studentId
      const response = await getMyRecords()
      if (response.code === 200) {
        myRecords.value = response.data || []
      } else {
        ElMessage.error(response.message || '加载失败')
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      ElMessage.error('加载记录失败')
    }
  }
  
  // ==================== ✅ 查看详情（加载证明材料） ====================
  const handleViewDetail = async (row: any) => {
    selectedRecord.value = { ...row }
    showDetailDialog.value = true
    
    // ✅ 加载该申请的所有证明材料
    await loadProofs(row.id)
  }
  
  // ✅ 加载证明材料
  const loadProofs = async (applicationId: number) => {
    try {
      proofsLoading.value = true
      const response = await getApplicationProofs(applicationId)
      
      if (response.code === 200) {
        proofsList.value = response.data.proofs || []
      } else {
        ElMessage.error(response.message || '加载证明材料失败')
      }
    } catch (error) {
      console.error('加载证明材料失败:', error)
      ElMessage.error('加载证明材料失败')
    } finally {
      proofsLoading.value = false
    }
  }
  
  // ✅ 预览证明材料
  const handlePreviewProof = async (fileId: number) => {
    try {
      const urlData = await getFilePreviewById(fileId, 60)
      if (urlData) {
        window.open(urlData, '_blank')
      }
    } catch (error) {
      console.error('预览失败:', error)
      ElMessage.error('预览失败')
    }
  }
  
  // ✅ 下载证明材料
  const handleDownloadProof = async (fileId: number, fileName: string) => {
    try {
      await downloadFileById(fileId, fileName)
      ElMessage.success('下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      ElMessage.error('下载失败')
    }
  }
  
  // ==================== 撤销申请 ====================
  const handleCancelRecord = async (recordId: number, status: number) => {
    if (status === 1) {
      ElMessage.warning('已通过的申请无法撤销，请联系管理员')
      return
    }
    
    try {
      await ElMessageBox.confirm('确定要撤销此申请吗？', '提示', {
        type: 'warning'
      })
  
      const response = await cancelBonusRecord(recordId)
      if (response.code === 200) {
        ElMessage.success('撤销成功')
        await loadMyRecords()
      } else {
        ElMessage.error(response.message || '撤销失败')
      }
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('撤销失败:', error)
        ElMessage.error('撤销失败')
      }
    }
  }
  
  const handleCancelFromDetail = async () => {
    if (selectedRecord.value) {
      await handleCancelRecord(selectedRecord.value.id, selectedRecord.value.status)
      showDetailDialog.value = false
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
      return '-'
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
        minute: '2-digit'
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
  
  const getProofStatusType = (status: number) => {
    const map: Record<number, any> = { 0: 'warning', 1: 'success', 2: 'danger' }
    return map[status] || 'info'
  }
  
  const getProofStatusText = (status: number) => {
    const map: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回' }
    return map[status] || '未知'
  }
  
  const getReviewTimelineType = (action: string) => {
    const map: Record<string, string> = {
      'approved': 'success',
      'rejected': 'danger',
      'revoked': 'warning'
    }
    return map[action] || 'primary'
  }
  
  const getReviewTagType = (action: string) => {
    const map: Record<string, any> = {
      'approved': 'success',
      'rejected': 'danger',
      'revoked': 'warning'
    }
    return map[action] || 'info'
  }
  
  const getActionText = (action: string) => {
    const map: Record<string, string> = {
      'approved': '通过',
      'rejected': '驳回',
      'revoked': '撤销'
    }
    return map[action] || action
  }
  
  // ==================== 生命周期 ====================
  onMounted(async () => {
    await loadMyRecords()
  })
  </script>
  
  <style scoped>
  /* ✅ 滚动条样式优化 */
  .max-h-96::-webkit-scrollbar {
    width: 6px;
  }
  
  .max-h-96::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  .max-h-96::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }
  
  .max-h-96::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  
  :deep(.el-progress__text) {
    font-size: 12px !important;
  }
  </style>