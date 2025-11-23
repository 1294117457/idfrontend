<template>
  <div class="file-upload-preview">
    <el-upload
      v-model:file-list="localFileList"
      :list-type="listType"
      :auto-upload="false"
      :on-preview="handlePreview"
      :on-remove="handleRemove"
      :limit="limit"
      :accept="accept"
      :disabled="disabled"
      :class="uploadClass"
      :show-file-list="showFileList"
    >
      <template #default>
        <div class="upload-placeholder">
          <el-icon :size="iconSize"><Plus /></el-icon>
          <div class="text-xs mt-1">{{ uploadText }}</div>
        </div>
      </template>
      <template #file="{ file }">
        <div class="relative w-full h-full">
          <img 
            v-if="file.raw && isImageFile(file.raw)" 
            :src="file.url" 
            class="w-full h-full object-cover" 
            alt=""
          />
          <div v-else class="flex flex-col items-center justify-center h-full p-1">
            <el-icon :size="iconSize" :color="getFileIconColor(file.name)">
              <component :is="getFileIcon(file.name)" />
            </el-icon>
            <span class="text-[10px] text-center break-all line-clamp-2 mt-1">
              {{ truncateFileName(file.name, 10) }}
            </span>
            <span class="text-[8px] text-gray-400">
              {{ getFileExtension(file.name) }}
            </span>
          </div>
          <span class="el-upload-list__item-actions">
            <span 
              v-if="showPreviewButton" 
              class="el-upload-list__item-preview" 
              @click="handlePreview(file)"
            >
              <el-icon><ZoomIn /></el-icon>
            </span>
            <span 
              v-if="showDeleteButton && !disabled" 
              class="el-upload-list__item-delete" 
              @click="handleRemove(file)"
            >
              <el-icon><Delete /></el-icon>
            </span>
          </span>
        </div>
      </template>
    </el-upload>
    <div v-if="showTip" class="text-xs text-gray-500 mt-1">
      {{ tipText }}
    </div>

    <!-- ✅ 文件预览弹窗 (模仿知识库) -->
    <el-dialog 
      v-model="previewDialogVisible" 
      :title="`文件预览 - ${currentPreviewFile.name}`" 
      :width="dialogWidth"
      destroy-on-close
      @close="handlePreviewClose"
    >
      <div v-if="previewLoading" class="flex justify-center items-center h-96">
        <el-icon class="is-loading" :size="50"><Loading /></el-icon>
        <span class="ml-2">加载中...</span>
      </div>
      <div v-else-if="previewError" class="flex justify-center items-center h-96">
        <el-empty description="预览加载失败" />
        <el-button @click="previewDialogVisible = false">关闭</el-button>
      </div>
      <div v-else class="h-[70vh]">
        <!-- ✅ 修改 iframe 配置 -->
        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          class="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          allowfullscreen
          @load="handleIframeLoad"
          @error="handleIframeError"
        />
      </div>
      
      <template #footer>
        <div class="flex justify-between items-center">
          <!-- ✅ 添加新窗口打开按钮 -->
          <div>
            <el-button @click="openInNewTab" type="success">
              <el-icon class="mr-1"><View /></el-icon>
              新窗口打开
            </el-button>
            <el-button 
              v-if="showDownloadInDialog" 
              @click="handleDownload"
              type="primary"
            >
              <el-icon class="mr-1"><Download /></el-icon>
              下载
            </el-button>
          </div>
          <el-button @click="previewDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  ZoomIn, 
  Delete, 
  Document, 
  Folder,
  Tickets,
  Download,
  Loading,
  View  // ✅ 新增图标
} from '@element-plus/icons-vue'
import type { UploadFile, UploadUserFile } from 'element-plus'
import { useRouter } from 'vue-router'

interface Props {
  modelValue: UploadUserFile[]
  limit?: number
  accept?: string
  listType?: 'text' | 'picture' | 'picture-card'
  disabled?: boolean
  uploadText?: string
  showTip?: boolean
  tipText?: string
  iconSize?: number
  uploadClass?: string
  dialogWidth?: string
  showFileList?: boolean
  showPreviewButton?: boolean
  showDeleteButton?: boolean
  showDownloadInDialog?: boolean
  useWordPreviewPage?: boolean
  wordPreviewPath?: string
  // ✅ 获取文件URL的函数 (type: 0=预览, 1=下载)
  getFileUrl?: (fileUrl: string, type: number) => Promise<any>
}

interface Emits {
  (e: 'update:modelValue', value: UploadUserFile[]): void
  (e: 'preview', file: UploadFile): void
  (e: 'remove', file: UploadFile): void
  (e: 'download', file: { url: string; name: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  limit: 5,
  accept: '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.html',
  listType: 'picture-card',
  disabled: false,
  uploadText: '上传文件',
  showTip: true,
  tipText: '支持格式: 图片、PDF、Word、Excel、文本文件,最多5个文件',
  iconSize: 24,
  uploadClass: '',
  dialogWidth: '80%',
  showFileList: true,
  showPreviewButton: true,
  showDeleteButton: true,
  showDownloadInDialog: true,
  useWordPreviewPage: false,
  wordPreviewPath: '/word'
})

const emit = defineEmits<Emits>()
const router = useRouter()

const localFileList = ref<UploadUserFile[]>([])
const previewDialogVisible = ref(false)
const currentPreviewFile = ref<{ url: string; name: string; downloadUrl: string }>({ 
  url: '', 
  name: '',
  downloadUrl: ''
})
const previewUrl = ref('')
const previewLoading = ref(false)
const previewError = ref(false)

watch(() => props.modelValue, (val) => {
  localFileList.value = val
}, { immediate: true })

watch(localFileList, (val) => {
  emit('update:modelValue', val)
}, { deep: true })

const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/')
}

const getFileExtension = (fileName: string): string => {
  return fileName.toLowerCase().split('.').pop()?.toUpperCase() || ''
}

const truncateFileName = (fileName: string, maxLength: number = 10): string => {
  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return fileName.length <= maxLength ? fileName : fileName.substring(0, maxLength) + '...'
  }
  const nameWithoutExt = fileName.substring(0, lastDotIndex)
  return nameWithoutExt.length <= maxLength ? nameWithoutExt : nameWithoutExt.substring(0, maxLength) + '...'
}

const getFileIcon = (fileName: string) => {
  const ext = getFileExtension(fileName).toLowerCase()
  const iconMap: Record<string, any> = {
    pdf: Document,
    doc: Tickets,
    docx: Tickets,
    xls: Folder,
    xlsx: Folder,
    ppt: Tickets,
    pptx: Tickets,
    txt: Document,
    html: Document,
    htm: Document,
    zip: Folder,
    rar: Folder
  }
  return iconMap[ext] || Document
}

const getFileIconColor = (fileName: string): string => {
  const ext = getFileExtension(fileName).toLowerCase()
  const colorMap: Record<string, string> = {
    pdf: '#FF0000',
    doc: '#2B579A',
    docx: '#2B579A',
    xls: '#217346',
    xlsx: '#217346',
    txt: '#666666',
    html: '#E44D26',
    htm: '#E44D26'
  }
  return colorMap[ext] || '#409EFF'
}



// ✅ 下载文件 (模仿知识库)
const handleDownload = async () => {
  try {
    emit('download', { url: currentPreviewFile.value.downloadUrl, name: currentPreviewFile.value.name })
    
    let downloadUrl = currentPreviewFile.value.downloadUrl
    
    // ✅ 如果是远程文件,获取下载链接
    if (!downloadUrl.startsWith('blob:') && props.getFileUrl) {
      const response = await props.getFileUrl(currentPreviewFile.value.downloadUrl, 1) // type=1 下载
      if (response.code === 200) {
        downloadUrl = response.data.url
      }
    }
    
    // ✅ 执行下载
    const x = new XMLHttpRequest()
    x.open('GET', downloadUrl, true)
    x.responseType = 'blob'
    x.onload = function () {
      const blobUrl = window.URL.createObjectURL(x.response)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = currentPreviewFile.value.name
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      ElMessage.success('下载成功')
    }
    x.onerror = function () {
      ElMessage.error('下载失败')
    }
    x.send()
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败')
  }
}

const handleRemove = (file: UploadFile) => {
  emit('remove', file)
  const index = localFileList.value.indexOf(file as UploadUserFile)
  if (index > -1) {
    localFileList.value.splice(index, 1)
  }
}

const handlePreviewClose = () => {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  previewError.value = false
}


const iframeLoadError = ref(false)

// ✅ iframe 加载成功
const handleIframeLoad = () => {
  console.log('✅ iframe 加载成功')
  previewLoading.value = false
  previewError.value = false
  iframeLoadError.value = false
}

// ✅ iframe 加载失败
const handleIframeError = () => {
  console.error('❌ iframe 加载失败,可能是跨域问题')
  previewError.value = true
  iframeLoadError.value = true
  
  // ✅ 自动提示用户在新窗口打开
  ElMessageBox.confirm(
    '预览加载失败,可能是跨域限制。是否在新窗口中打开?',
    '提示',
    {
      confirmButtonText: '新窗口打开',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    openInNewTab()
  })
}

// ✅ 在新窗口打开文件
const openInNewTab = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

// ✅ 修改预览处理逻辑
const handlePreview = async (file: UploadFile) => {
  emit('preview', file)
  
  try {
    previewLoading.value = true
    previewError.value = false
    iframeLoadError.value = false
    previewDialogVisible.value = true
    
    const fileExt = getFileExtension(file.name).toLowerCase()
    const fileName = file.name
    
    currentPreviewFile.value = { url: '', name: fileName, downloadUrl: '' }
    
    // ✅ 本地文件预览
    if (file.raw) {
      const blobUrl = URL.createObjectURL(file.raw)
      
      if (fileExt === 'pdf') {
        previewUrl.value = blobUrl
        currentPreviewFile.value = { url: blobUrl, name: fileName, downloadUrl: blobUrl }
      } else if (fileExt === 'docx' && props.useWordPreviewPage) {
        router.push({ path: props.wordPreviewPath, query: { url: blobUrl } })
        previewDialogVisible.value = false
        return
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
        previewUrl.value = blobUrl
        currentPreviewFile.value = { url: blobUrl, name: fileName, downloadUrl: blobUrl }
      } else {
        ElMessage.warning('此文件类型不支持预览,请下载后查看')
        previewDialogVisible.value = false
        return
      }
    } 
    // ✅ 远程文件预览
    else if (file.url && props.getFileUrl) {
      const response = await props.getFileUrl(file.url, 0) // type=0 预览
      
      if (response.code !== 200) {
        throw new Error('获取预览链接失败')
      }
      
      const tempUrl = response.data.url
      console.log('✅ 预览URL:', tempUrl)
      
      currentPreviewFile.value = { 
        url: tempUrl, 
        name: fileName,
        downloadUrl: file.url
      }
      
      // ✅ PDF和图片直接预览,其他类型提示新窗口打开
      if (fileExt === 'pdf') {
        previewUrl.value = tempUrl
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
        previewUrl.value = tempUrl
      } else if (fileExt === 'docx' && props.useWordPreviewPage) {
        router.push({ path: props.wordPreviewPath, query: { url: tempUrl } })
        previewDialogVisible.value = false
        return
      } else {
        // ✅ 不支持的类型直接在新窗口打开
        ElMessageBox.confirm(
          `此文件类型建议在新窗口打开`,
          '提示',
          {
            confirmButtonText: '新窗口打开',
            cancelButtonText: '取消',
            type: 'info'
          }
        ).then(() => {
          window.open(tempUrl, '_blank')
        })
        previewDialogVisible.value = false
        return
      }
    }
  } catch (error: any) {
    console.error('❌ 预览失败:', error)
    previewError.value = true
    ElMessage.error('获取预览链接失败，请重试')
  } finally {
    previewLoading.value = false
  }
}
</script>

<style scoped>
.file-upload-preview :deep(.el-upload--picture-card) {
  width: 80px;
  height: 80px;
}

.file-upload-preview :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 80px;
  height: 80px;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>