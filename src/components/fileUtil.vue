<template>
  <div class="file-util">
    <!-- ✅ 上传区域 -->
    <el-upload
      v-if="showUploadButton"
      ref="uploadRef"
      :file-list="displayFileList"
      :before-upload="handleBeforeUpload"
      :http-request="handleCustomUpload"
      :on-remove="handleRemove"
      :limit="limit"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled || uploading"
      list-type="text"
      class="upload-container"
    >
      <el-button type="primary" :loading="uploading" :disabled="disabled">
        <el-icon v-if="!uploading"><Upload /></el-icon>
        {{ uploading ? '上传中...' : uploadText }}
      </el-button>
      <template #tip>
        <div class="text-xs text-gray-400 mt-1">{{ tipText }}</div>
      </template>
    </el-upload>

    <!-- ✅ 文件列表（只读模式或已上传文件） -->
    <div v-if="fileItems.length > 0" class="file-list mt-2">
      <div 
        v-for="(file, index) in fileItems" 
        :key="file.fileId"
        class="file-item flex items-center justify-between p-2 bg-gray-50 rounded mb-2"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <el-icon class="text-gray-500"><Document /></el-icon>
          <span class="text-sm truncate" :title="file.fileName">{{ file.fileName }}</span>
          <!-- ✅ 显示文件类型标签 -->
          <el-tag 
            :type="getFileTypeTagColor(file.fileName)" 
            size="small"
          >
            {{ getFileTypeLabel(file.fileName) }}
          </el-tag>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <!-- ✅ 只有 PDF 和图片才显示预览按钮 -->
          <el-button 
            v-if="showPreviewButton && canPreview(file.fileName)" 
            type="primary" 
            size="small" 
            @click="handlePreview(file)"
            :loading="previewingFileId === file.fileId"
          >
            预览
          </el-button>
          <el-button 
            v-if="showDownloadButton" 
            type="success" 
            size="small" 
            @click="handleDownload(file)"
            :loading="downloadingFileId === file.fileId"
          >
            下载
          </el-button>
          <el-button 
            v-if="showDeleteButton && !disabled" 
            type="danger" 
            size="small" 
            @click="handleDeleteFile(index)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- ✅ 空状态 -->
    <el-empty 
      v-if="!showUploadButton && fileItems.length === 0" 
      description="暂无文件" 
      :image-size="60"
    />

    <!-- ✅ 预览弹窗（只支持 PDF 和图片） -->
    <el-dialog 
      v-model="previewDialogVisible" 
      :title="'文件预览 - ' + currentPreviewFileName"
      width="85%" 
      top="3vh"
      destroy-on-close
      @close="handlePreviewClose"
    >
      <div v-loading="previewLoading" class="preview-container">
        <!-- ✅ PDF 预览 -->
        <iframe 
          v-if="currentPreviewType === 'pdf' && previewUrl && !previewLoading"
          :src="previewUrl" 
          class="preview-frame"
        />
        
        <!-- ✅ 图片预览 -->
        <div 
          v-else-if="currentPreviewType === 'image' && previewUrl && !previewLoading"
          class="image-preview-container"
        >
          <img 
            :src="previewUrl" 
            alt="预览图片"
            class="preview-image"
          />
        </div>
        
        <!-- ✅ 加载中或无法预览 -->
        <div v-else-if="!previewLoading" class="preview-fallback">
          <el-icon :size="48" class="text-gray-300 mb-4"><Document /></el-icon>
          <p class="text-gray-400">无法预览此文件类型</p>
          <el-button type="primary" class="mt-4" @click="handleDownloadCurrent">
            下载文件查看
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document } from '@element-plus/icons-vue'
import type { UploadRequestOptions, UploadUserFile } from 'element-plus'
import { 
  uploadProofFile, 
  getFilePreviewById, 
  downloadFileById,
  type ProofFileItem
} from '@/api/components/apiScore'

// ✅ 文件项接口
export interface FileItem {
  fileId: number
  fileName: string
}

// ==================== Props ====================
const props = withDefaults(defineProps<{
  modelValue?: FileItem[]
  limit?: number
  accept?: string
  multiple?: boolean
  disabled?: boolean
  showUploadButton?: boolean
  showPreviewButton?: boolean
  showDownloadButton?: boolean
  showDeleteButton?: boolean
  uploadText?: string
  tipText?: string
  fileCategory?: string
  filePurpose?: string
}>(), {
  modelValue: () => [],
  limit: 5,
  accept: '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx',
  multiple: true,
  disabled: false,
  showUploadButton: true,
  showPreviewButton: true,
  showDownloadButton: true,
  showDeleteButton: true,
  uploadText: '上传文件',
  tipText: '支持常见文档和图片格式，单个文件不超过10MB',
  fileCategory: 'SCORE_PROOF',
  filePurpose: '证明材料'
})

// ==================== Emits ====================
const emit = defineEmits<{
  (e: 'update:modelValue', value: FileItem[]): void
  (e: 'upload-success', file: FileItem): void
  (e: 'upload-error', error: Error): void
  (e: 'delete', file: FileItem, index: number): void
}>()

// ==================== 状态 ====================
const uploading = ref(false)
const previewDialogVisible = ref(false)
const previewUrl = ref('')
const previewLoading = ref(false)
const previewingFileId = ref<number | null>(null)
const downloadingFileId = ref<number | null>(null)

// ✅ 预览相关状态（移除 docx）
const currentPreviewType = ref<'pdf' | 'image' | 'unknown'>('unknown')
const currentPreviewFileName = ref('')
const currentPreviewFile = ref<FileItem | null>(null)

// ✅ 内部文件列表
const fileItems = ref<FileItem[]>([...props.modelValue])

// ✅ 用于 el-upload 显示的文件列表
const displayFileList = computed<UploadUserFile[]>(() => {
  return fileItems.value.map((item) => ({
    name: item.fileName,
    uid: item.fileId,
    status: 'success' as const,
    url: ''
  }))
})

// ✅ 监听 props 变化
watch(() => props.modelValue, (newVal) => {
  fileItems.value = [...newVal]
}, { deep: true })

// ==================== 文件类型判断 ====================

// ✅ 获取文件扩展名（小写）
const getFileExtension = (fileName: string): string => {
  if (!fileName) return ''
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1) return ''
  return fileName.substring(lastDot).toLowerCase()
}

// ✅ 判断是否可以预览（只支持 PDF 和图片）
const canPreview = (fileName: string): boolean => {
  const ext = getFileExtension(fileName)
  const previewableExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  return previewableExtensions.includes(ext)
}

// ✅ 获取预览类型（移除 docx）
const getPreviewType = (fileName: string): 'pdf' | 'image' | 'unknown' => {
  const ext = getFileExtension(fileName)
  
  if (ext === '.pdf') return 'pdf'
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) return 'image'
  
  return 'unknown'
}

// ✅ 获取文件类型标签
const getFileTypeLabel = (fileName: string): string => {
  const ext = getFileExtension(fileName)
  const typeMap: Record<string, string> = {
    '.pdf': 'PDF',
    '.doc': 'Word',
    '.docx': 'Word',
    '.xls': 'Excel',
    '.xlsx': 'Excel',
    '.jpg': '图片',
    '.jpeg': '图片',
    '.png': '图片',
    '.gif': '图片',
    '.bmp': '图片',
    '.webp': '图片',
    '.txt': '文本'
  }
  return typeMap[ext] || ext.toUpperCase().replace('.', '')
}

// ✅ 获取文件类型标签颜色
const getFileTypeTagColor = (fileName: string): string => {
  const ext = getFileExtension(fileName)
  const colorMap: Record<string, string> = {
    '.pdf': 'danger',
    '.doc': 'primary',
    '.docx': 'primary',
    '.xls': 'success',
    '.xlsx': 'success',
    '.jpg': 'warning',
    '.jpeg': 'warning',
    '.png': 'warning',
    '.gif': 'warning',
    '.bmp': 'warning',
    '.webp': 'warning'
  }
  return colorMap[ext] || 'info'
}

// ==================== 上传相关 ====================

const handleBeforeUpload = (file: File) => {
  const isValidSize = file.size / 1024 / 1024 < 10
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过 10MB')
    return false
  }
  return true
}

const handleCustomUpload = async (options: UploadRequestOptions) => {
  uploading.value = true
  try {
    const result = await uploadProofFile(options.file as File)
    
    const newFile: FileItem = {
      fileId: result.fileId,
      fileName: result.fileName
    }
    
    fileItems.value.push(newFile)
    emit('update:modelValue', [...fileItems.value])
    emit('upload-success', newFile)
    
    ElMessage.success('上传成功')
  } catch (error: any) {
    ElMessage.error(error.message || '上传失败')
    emit('upload-error', error)
  } finally {
    uploading.value = false
  }
}

const handleRemove = (file: UploadUserFile) => {
  const index = fileItems.value.findIndex(f => f.fileId === file.uid)
  if (index > -1) {
    const removed = fileItems.value.splice(index, 1)[0]
    emit('update:modelValue', [...fileItems.value])
    emit('delete', removed, index)
  }
}

const handleDeleteFile = (index: number) => {
  const removed = fileItems.value.splice(index, 1)[0]
  emit('update:modelValue', [...fileItems.value])
  emit('delete', removed, index)
}

// ==================== 预览相关（简化版，只支持 PDF 和图片） ====================

const handlePreview = async (file: FileItem) => {
  // ✅ 检查是否可预览
  if (!canPreview(file.fileName)) {
    ElMessage.warning('此文件类型不支持预览，请下载后查看')
    return
  }
  
  previewingFileId.value = file.fileId
  previewLoading.value = true
  currentPreviewFileName.value = file.fileName
  currentPreviewFile.value = file
  currentPreviewType.value = getPreviewType(file.fileName)
  previewUrl.value = ''
  previewDialogVisible.value = true
  
  try {
    // ✅ PDF 和图片使用预签名 URL
    const response = await getFilePreviewById(file.fileId, 60)
    if (response.code === 200) {
      previewUrl.value = response.data
    } else {
      ElMessage.error('获取预览链接失败')
      currentPreviewType.value = 'unknown'
    }
  } catch (error) {
    console.error('预览失败:', error)
    ElMessage.error('预览失败')
    currentPreviewType.value = 'unknown'
  } finally {
    previewLoading.value = false
    previewingFileId.value = null
  }
}

// ✅ 预览弹窗关闭
const handlePreviewClose = () => {
  previewUrl.value = ''
  currentPreviewType.value = 'unknown'
  currentPreviewFileName.value = ''
  currentPreviewFile.value = null
}

// ✅ 下载当前预览的文件
const handleDownloadCurrent = () => {
  if (currentPreviewFile.value) {
    handleDownload(currentPreviewFile.value)
  }
}

// ==================== 下载相关 ====================

const handleDownload = async (file: FileItem) => {
  downloadingFileId.value = file.fileId
  try {
    await downloadFileById(file.fileId, file.fileName)
    ElMessage.success('下载成功')
  } catch (error) {
    ElMessage.error('下载失败')
  } finally {
    downloadingFileId.value = null
  }
}

// ==================== 暴露方法 ====================
defineExpose({
  getFiles: () => fileItems.value,
  clearFiles: () => {
    fileItems.value = []
    emit('update:modelValue', [])
  }
})
</script>

<style scoped>
.file-util {
  width: 100%;
}

.upload-container :deep(.el-upload-list__item) {
  transition: all 0.3s;
}

.file-item {
  transition: all 0.2s;
}

.file-item:hover {
  background-color: #f0f9ff;
}

/* ✅ 预览容器样式 */
.preview-container {
  height: 75vh;
  overflow: hidden;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.image-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  background-color: #f5f5f5;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>