<script setup lang="ts">
    // filepath: d:\XMU\3UP\交互设计\codeGithub\idfrontend\src\components\FileTable.vue
    
    import { ref, computed, watch } from 'vue'
    import { ElMessage } from 'element-plus'
    import { Upload, Document, View, Download, Delete } from '@element-plus/icons-vue'
    import type { UploadRequestOptions, UploadUserFile } from 'element-plus'
    import { 
      uploadProofFile, 
      getFilePreviewById, 
      downloadFileById
    } from '@/api/components/apiScore'
    
    // ==================== 类型定义 ====================
    export interface FileTableItem {
      fileId: number
      fileName: string
      fileValue?: number | string  // ✅ 自定义属性（如分数）
      [key: string]: any           // ✅ 支持其他自定义字段
    }
    
    // ==================== Props ====================
    const props = withDefaults(defineProps<{
      modelValue?: FileTableItem[]
      limit?: number
      accept?: string
      multiple?: boolean
      disabled?: boolean
      showUploadButton?: boolean
      showPreviewButton?: boolean
      showDownloadButton?: boolean
      showDeleteButton?: boolean
      showFileValue?: boolean       // ✅ 是否显示自定义属性输入框
      fileValueLabel?: string       // ✅ 自定义属性标签（如"分数"）
      fileValueType?: 'number' | 'text'  // ✅ 输入框类型
      fileValueMin?: number         // ✅ number 类型最小值
      fileValueMax?: number         // ✅ number 类型最大值
      fileValuePrecision?: number   // ✅ number 类型精度
      fileValuePlaceholder?: string // ✅ 输入框占位符
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
      showFileValue: false,
      fileValueLabel: '值',
      fileValueType: 'text',
      fileValueMin: 0,
      fileValueMax: 999.99,
      fileValuePrecision: 2,
      fileValuePlaceholder: '请输入',
      uploadText: '上传文件',
      tipText: '支持常见文档和图片格式，单个文件不超过10MB',
      fileCategory: 'SCORE_PROOF',
      filePurpose: '证明材料'
    })
    
    // ==================== Emits ====================
    const emit = defineEmits<{
      (e: 'update:modelValue', value: FileTableItem[]): void
      (e: 'upload-success', file: FileTableItem): void
      (e: 'upload-error', error: Error): void
      (e: 'delete', file: FileTableItem, index: number): void
      (e: 'preview', file: FileTableItem): void
      (e: 'value-change', file: FileTableItem, index: number): void  // ✅ 值变化事件
    }>()
    
    // ==================== 状态 ====================
    const uploading = ref(false)
    const previewDialogVisible = ref(false)
    const previewUrl = ref('')
    const previewLoading = ref(false)
    const previewingFileId = ref<number | null>(null)
    const downloadingFileId = ref<number | null>(null)
    
    const currentPreviewType = ref<'pdf' | 'image' | 'unknown'>('unknown')
    const currentPreviewFileName = ref('')
    const currentPreviewFile = ref<FileTableItem | null>(null)
    
    // ✅ 内部文件列表
    const fileItems = ref<FileTableItem[]>([...props.modelValue])
    
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
    const getFileExtension = (fileName: string): string => {
      if (!fileName) return ''
      const lastDot = fileName.lastIndexOf('.')
      if (lastDot === -1) return ''
      return fileName.substring(lastDot).toLowerCase()
    }
    
    const canPreview = (fileName: string): boolean => {
      const ext = getFileExtension(fileName)
      const previewableExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
      return previewableExtensions.includes(ext)
    }
    
    const getPreviewType = (fileName: string): 'pdf' | 'image' | 'unknown' => {
      const ext = getFileExtension(fileName)
      
      if (ext === '.pdf') return 'pdf'
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) return 'image'
      
      return 'unknown'
    }
    
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
        
        const newFile: FileTableItem = {
          fileId: result.fileId,
          fileName: result.fileName,
          fileValue: props.showFileValue ? (props.fileValueType === 'number' ? 0 : '') : undefined
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
    
    // ==================== ✅ 自定义属性值变化 ====================
    const handleValueChange = (index: number) => {
      const file = fileItems.value[index]
      
      // ✅ number 类型校验
      if (props.fileValueType === 'number' && typeof file.fileValue === 'number') {
        if (file.fileValue < props.fileValueMin) {
          file.fileValue = props.fileValueMin
        }
        if (file.fileValue > props.fileValueMax) {
          file.fileValue = props.fileValueMax
        }
        // 保留精度
        file.fileValue = Math.round(file.fileValue * Math.pow(10, props.fileValuePrecision)) / Math.pow(10, props.fileValuePrecision)
      }
      
      emit('update:modelValue', [...fileItems.value])
      emit('value-change', file, index)
    }
    
    // ==================== 预览相关 ====================
    const handlePreview = async (file: FileTableItem) => {
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
        const response = await getFilePreviewById(file.fileId, 60)
        if (response.code === 200) {
          previewUrl.value = response.data
          emit('preview', file)
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
    
    const handlePreviewClose = () => {
      previewUrl.value = ''
      currentPreviewType.value = 'unknown'
      currentPreviewFileName.value = ''
      currentPreviewFile.value = null
    }
    
    const handleDownloadCurrent = () => {
      if (currentPreviewFile.value) {
        handleDownload(currentPreviewFile.value)
      }
    }
    
    // ==================== 下载相关 ====================
    const handleDownload = async (file: FileTableItem) => {
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
    
    <template>
      <div class="file-table">
        <!-- ✅ 上传按钮 -->
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
          :show-file-list="false"
          list-type="text"
          class="mb-3"
        >
          <el-button type="primary" :loading="uploading" :disabled="disabled">
            <el-icon v-if="!uploading"><Upload /></el-icon>
            {{ uploading ? '上传中...' : uploadText }}
          </el-button>
          <template #tip>
            <div class="text-xs text-gray-400 mt-1">{{ tipText }}</div>
          </template>
        </el-upload>
    
        <!-- ✅ 文件表格 -->
        <div v-if="fileItems.length > 0" class="file-table-container">
          <el-table 
            :data="fileItems" 
            border 
            stripe
            :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
          >
            <!-- 序号 -->
            <el-table-column label="序号" width="60" align="center">
              <template #default="{ $index }">
                {{ $index + 1 }}
              </template>
            </el-table-column>
    
            <!-- 文件类型 -->
            <el-table-column label="类型" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="getFileTypeTagColor(row.fileName)" size="small">
                  {{ getFileTypeLabel(row.fileName) }}
                </el-tag>
              </template>
            </el-table-column>
    
            <!-- 文件名 -->
            <el-table-column prop="fileName" label="文件名" min-width="200">
              <template #default="{ row }">
                <div class="flex items-center gap-2">
                  <el-icon class="text-blue-500"><Document /></el-icon>
                  <span class="truncate">{{ row.fileName }}</span>
                </div>
              </template>
            </el-table-column>
    
            <!-- ✅ 自定义属性输入框（优先级最高） -->
            <el-table-column 
              v-if="showFileValue" 
              :label="fileValueLabel" 
              width="180" 
              align="center"
            >
              <template #default="{ row, $index }">
                <!-- number 类型 -->
                <el-input-number
                  v-if="fileValueType === 'number'"
                  v-model="row.fileValue"
                  :min="fileValueMin"
                  :max="fileValueMax"
                  :precision="fileValuePrecision"
                  :step="0.1"
                  :controls="false"
                  :disabled="disabled"
                  size="small"
                  @input="handleValueChange($index)"
                  :placeholder="fileValuePlaceholder"
                  style="width: 100%;"
                />
                <!-- text 类型 -->
                <el-input
                  v-else
                  v-model="row.fileValue"
                  :disabled="disabled"
                  size="small"
                  @input="handleValueChange($index)"
                  :placeholder="fileValuePlaceholder"
                  clearable
                />
              </template>
            </el-table-column>
    
            <!-- 操作列 -->
            <el-table-column 
              label="操作" 
              :width="showPreviewButton && showDownloadButton && showDeleteButton ? 120 : 
                     showPreviewButton && showDownloadButton ? 100 :
                     showPreviewButton && showDeleteButton ? 100 :
                     showDownloadButton && showDeleteButton ? 100 :
                     100" 
              align="center" 
              fixed="right"
            >
              <template #default="{ row, $index }">
                <div class="flex justify-center gap-1">
                  <!-- 预览按钮 -->
                  <el-button
                    v-if="showPreviewButton"
                    type="primary"
                    size="small"
                    :icon="View"
                    :loading="previewingFileId === row.fileId"
                    @click="handlePreview(row)"
                    :disabled="!canPreview(row.fileName)"
                    circle
                    title="预览"
                  />
                  
                  <!-- 下载按钮 -->
                  <el-button
                    v-if="showDownloadButton"
                    type="success"
                    size="small"
                    :icon="Download"
                    :loading="downloadingFileId === row.fileId"
                    @click="handleDownload(row)"
                    circle
                    title="下载"
                  />
                  
                  <!-- 删除按钮 -->
                  <el-button
                    v-if="showDeleteButton"
                    type="danger"
                    size="small"
                    :icon="Delete"
                    @click="handleDeleteFile($index)"
                    :disabled="disabled"
                    circle
                    title="删除"
                  />
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
    
        <!-- ✅ 空状态 -->
        <el-empty 
          v-if="!showUploadButton && fileItems.length === 0" 
          description="暂无文件" 
          :image-size="60"
        />
    
        <!-- ✅ 预览弹窗 -->
        <el-dialog 
          v-model="previewDialogVisible" 
          :title="'文件预览 - ' + currentPreviewFileName"
          width="85%" 
          top="3vh"
          destroy-on-close
          @close="handlePreviewClose"
        >
          <div v-loading="previewLoading" class="preview-container">
            <!-- PDF 预览 -->
            <iframe 
              v-if="currentPreviewType === 'pdf' && previewUrl && !previewLoading"
              :src="previewUrl" 
              class="preview-frame"
            />
            
            <!-- 图片预览 -->
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
            
            <!-- 无法预览 -->
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
    
    <style scoped>
    .file-table {
      width: 100%;
    }
    
    .file-table-container {
      max-height: 400px;
      overflow-y: auto;
    }
    
    /* ✅ 滚动条样式 */
    .file-table-container::-webkit-scrollbar {
      width: 6px;
    }
    
    .file-table-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    .file-table-container::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }
    
    .file-table-container::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
    
    /* 预览容器样式 */
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
    
    /* ✅ 输入框样式 */
    :deep(.el-input-number .el-input__inner) {
      text-align: center;
    }
    </style>