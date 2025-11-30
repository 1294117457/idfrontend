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
        
        <!-- ✅ 审核进度列 -->
        <el-table-column label="审核进度" width="140" align="center">
          <template #default="{ row }">
            <el-progress 
              :percentage="getProgressPercentage(row)"
              :format="() => `${row.currentReviewCount || 0}/${row.reviewCount || 1}`"
              :status="getProgressStatus(row)"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ row.statusText }}
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
            <el-button 
              type="primary" 
              size="small" 
              @click="handleViewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button 
              v-if="row.status === 0 || row.status === 2" 
              type="danger" 
              size="small" 
              @click="handleCancelRecord(row.id, row.status)"
            >
              取消
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
            <span class="text-lg font-bold text-red-500">{{ selectedRecord.applyScore }}分</span>
          </el-descriptions-item>
          
          <!-- ✅ 审核状态 -->
          <el-descriptions-item label="审核状态">
            <el-tag :type="getStatusType(selectedRecord.status)">
              {{ selectedRecord.statusText }}
            </el-tag>
          </el-descriptions-item>

          <!-- ✅ 审核进度 -->
          <el-descriptions-item label="审核进度">
            <el-progress 
              :percentage="getProgressPercentage(selectedRecord)"
              :format="() => `${selectedRecord.currentReviewCount || 0}/${selectedRecord.reviewCount || 1} 人已审核`"
              :status="getProgressStatus(selectedRecord)"
            />
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

        <!-- ✅ 使用 FileUtil 组件预览证明文件 -->
        <div v-if="selectedRecord.proofFiles && parseProofFiles(selectedRecord.proofFiles).length > 0" class="mt-4">
          <el-divider content-position="left">证明文件</el-divider>
          <FileUtil
            v-model="previewFileList"
            :show-file-list="true"
            :show-preview-button="true"
            :show-delete-button="false"
            :show-download-in-dialog="true"
            :disabled="true"
            :icon-size="20"
            upload-text=""
            :show-tip="false"
            :get-file-url="handleGetFileUrl"
          />
        </div>

        <!-- ✅ 审核记录展示 -->
        <div v-if="selectedRecord.reviewRecords && parseReviewRecords(selectedRecord.reviewRecords).length > 0" class="mt-4">
          <el-divider content-position="left">审核记录</el-divider>
          <el-timeline>
            <el-timeline-item 
              v-for="(review, index) in parseReviewRecords(selectedRecord.reviewRecords)" 
              :key="index"
              :timestamp="review.timestamp"
              :type="review.action === 'approved' ? 'success' : 'danger'"
            >
              <el-card>
                <template #header>
                  <div class="flex justify-between items-center">
                    <span class="font-bold">{{ review.reviewerName }}</span>
                    <el-tag :type="review.action === 'approved' ? 'success' : 'danger'" size="small">
                      {{ review.action === 'approved' ? '通过' : '驳回' }}
                    </el-tag>
                  </div>
                </template>
                <p class="text-gray-700">{{ review.comment }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- ✅ 如果还在审核中,显示提示 -->
        <div v-if="selectedRecord.status === 0 && selectedRecord.currentReviewCount < selectedRecord.reviewCount" class="mt-4">
          <el-alert
            title="审核进行中"
            :description="`当前已有 ${selectedRecord.currentReviewCount} 人完成审核,还需 ${selectedRecord.reviewCount - selectedRecord.currentReviewCount} 人审核`"
            type="info"
            :closable="false"
          />
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button 
            v-if="selectedRecord && (selectedRecord.status === 0 || selectedRecord.status === 2)" 
            type="danger" 
            @click="handleCancelFromDetail"
          >
            取消申请
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadUserFile } from 'element-plus'
import { getMyRecords, cancelBonusRecord, getFileUrl } from '@/api/components/apiScore'
import { useUserStore } from '@/stores/profile'
// ✅ 导入 FileUtil 组件
import FileUtil from '@/components/fileUtil.vue'

const userStore = useUserStore()

const myRecords = ref<any[]>([])
const showDetailDialog = ref(false)
const selectedRecord = ref<any>(null)
// ✅ 文件预览列表
const previewFileList = ref<UploadUserFile[]>([])
// ✅ 获取文件URL (简化版)
const handleGetFileUrl = async (fileUrl: string, type: number) => {
  try {
    const response = await getFileUrl(fileUrl, type)
    console.log('✅ 获取文件URL响应:', response)
    return response
  } catch (error) {
    console.error('❌ 获取文件链接失败:', error)
    throw error
  }
}
// 加载我的记录
const loadMyRecords = async () => {
  try {
    console.log(userStore)
    // ✅ 确保 userInfo 和 studentId 存在
    if (!userStore.userInfo?.studentId) {
      ElMessage.error('请先完善学生信息')
      return
    }
    
    const response = await getMyRecords(userStore.userInfo.studentId)
    
    console.log('✅ API 响应:', response)  // ✅ 添加调试日志
    
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

// ✅ 查看详情
const handleViewDetail = (row: any) => {
  selectedRecord.value = { ...row }
  
  // ✅ 将证明文件转换为 UploadUserFile 格式
  const files = parseProofFiles(row.proofFiles)
  previewFileList.value = files.map((url: string, index: number) => ({
    name: `证明文件${index + 1}.${getFileExtFromUrl(url)}`,
    url: url,
    uid: Date.now() + index,
    status: 'success' as const
  }))
  
  showDetailDialog.value = true
}

// ✅ 从 URL 中提取文件扩展名
const getFileExtFromUrl = (url: string): string => {
  try {
    const parts = url.split('.')
    return parts[parts.length - 1] || 'file'
  } catch {
    return 'file'
  }
}

// ✅ 获取文件预览URL
const handleGetPreviewUrl = async (fileUrl: string) => {
  try {
    const response = await getFilePreviewUrl(fileUrl)
    if (response.code === 200) {
      return response.data.url
    }
    throw new Error('获取预览链接失败')
  } catch (error) {
    console.error('❌ 获取预览链接失败:', error)
    throw error
  }
}

// 取消申请
const handleCancelRecord = async (recordId: string, status: number) => {
  if (status === 1) {
    ElMessage.warning('已通过审核的记录不能取消')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要取消该申请吗?',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    // ✅ 确保传递正确的 recordId 类型
    const response = await cancelBonusRecord(recordId.toString())
    
    console.log('✅ 撤销响应:', response)  // ✅ 添加调试日志
    
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

// ✅ 从详情弹窗取消
const handleCancelFromDetail = async () => {
  if (selectedRecord.value) {
    await handleCancelRecord(selectedRecord.value.id, selectedRecord.value.status)
  }
}

// ✅ 计算审核进度百分比
const getProgressPercentage = (row: any): number => {
  const current = row.currentReviewCount || 0
  const total = row.reviewCount || 1
  return Math.round((current / total) * 100)
}

// ✅ 获取进度条状态
const getProgressStatus = (row: any): string => {
  if (row.status === 1) return 'success'
  if (row.status === 2) return 'exception'
  return ''
}

// 格式化规则值
const formatRuleValues = (json: string) => {
  if (!json) return '-'
  try {
    const obj = JSON.parse(json)
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  } catch {
    return json
  }
}

// ✅ 解析证明文件
const parseProofFiles = (json: string): string[] => {
  if (!json) return []
  try {
    const files = JSON.parse(json)
    return Array.isArray(files) ? files : []
  } catch {
    return []
  }
}

// ✅ 解析审核记录
const parseReviewRecords = (json: string) => {
  if (!json) return []
  try {
    const records = JSON.parse(json)
    return Array.isArray(records) ? records : []
  } catch {
    return []
  }
}

// ✅ 格式化时间
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

// 获取类型文本
const getScoreTypeText = (scoreType: number) => {
  const map: Record<number, string> = {
    0: '学术专长',
    1: '综合表现',
    2: '学业成绩'
  }
  return map[scoreType] || '未知'
}

// 获取类型颜色
const getScoreTypeColor = (scoreType: number) => {
  const map: Record<number, string> = {
    0: 'primary',
    1: 'success',
    2: 'warning'
  }
  return map[scoreType] || 'info'
}

// 状态类型
const getStatusType = (status: number) => {
  const map: Record<number, any> = {
    0: 'warning',
    1: 'success',
    2: 'danger'
  }
  return map[status] || 'info'
}

onMounted(() => {
  loadMyRecords()
})
</script>

<style scoped>
:deep(.el-progress__text) {
  font-size: 12px !important;
}

/* ✅ 隐藏上传按钮 */
:deep(.el-upload--picture-card) {
  display: none !important;
}
</style>