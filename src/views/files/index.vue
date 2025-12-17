<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card class="min-h-[100vh]">
      <div class="flex items-center mb-4 ">
        <h4 class="text-[20px] font-bold text-gray-800">公共文件管理</h4>
      </div>

      <!-- ✅ 查询表单 -->
      <el-row>
        <el-col>
          <el-form :inline="true" :model="queryForm">
            <el-form-item label="文件名">
              <el-input 
                v-model="queryForm.fileName" 
                placeholder="输入文件名" 
                clearable 
                style="width: 150px;" 
              />
            </el-form-item>
            
            <el-form-item label="文件类型">
              <el-select 
                v-model="queryForm.fileExtension" 
                placeholder="选择类型" 
                clearable 
                style="width: 120px;"
              >
                <el-option label="全部" value="" />
                <el-option label="PDF" value=".pdf" />
                <el-option label="Word" value=".docx" />
                <el-option label="Excel" value=".xlsx" />
                <el-option label="图片" value=".jpg" />
                <el-option label="文本" value=".txt" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="上传开始时间">
              <el-date-picker
                v-model="queryForm.startTime"
                type="datetime"
                placeholder="选择开始时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 180px;"
              />
            </el-form-item>
            
            <el-form-item label="上传结束时间">
              <el-date-picker
                v-model="queryForm.endTime"
                type="datetime"
                placeholder="选择结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 180px;"
              />
            </el-form-item>
            
            <el-space class="text-right">
              <el-button type="primary" @click="handleSearch">查询</el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-space>
          </el-form>
        </el-col>
      </el-row>

      <!-- ✅ 文件列表表格 -->
      <el-table
        :data="fileList"
        table-layout="auto"
        border
        stripe
        :header-cell-style="{ background: '#eef1f6', color: '#606266' }"
        v-loading="loading"
      >
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">
            {{ $index + 1 + (currentPage - 1) * pageSize }}
          </template>
        </el-table-column>
        
        <el-table-column prop="originalName" label="文件名" min-width="200" align="center" />
        
        <el-table-column label="文件类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getFileTypeColor(row.fileExtension)">
              {{ getFileTypeText(row.fileExtension) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="文件大小" width="120" align="center">
          <template #default="{ row }">
            {{ row.fileSizeFormatted }}
          </template>
        </el-table-column>
        
        <el-table-column prop="uploadTime" label="上传时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.uploadTime) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="300" align="center" fixed="right">
          <template #default="{ row }">
            <el-space size="small">
              <!-- ✅ 只有 PDF 和图片才显示预览按钮 -->
              <el-button 
                v-if="isPreviewable(row.fileExtension)" 
                type="primary" 
                size="small" 
                @click="handlePreview(row)"
              >
                预览
              </el-button>
              <el-button type="success" size="small" @click="handleDownload(row)">下载</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <!-- ✅ 分页器 -->
      <el-row justify="end" align="middle" class="mt-5">
        <el-pagination
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[5, 10, 15, 20]"
          :total="totalItems"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </el-row>
    </el-card>

    <!-- ✅ 重命名弹窗 -->
    <el-dialog v-model="renameDialogVisible" title="修改文件名" width="400px">
      <el-form :model="renameForm" label-width="80px">
        <el-form-item label="新文件名">
          <el-input v-model="renameForm.newName" placeholder="输入新文件名(不含扩展名)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="renameDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRename">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ✅ 预览弹窗 -->
    <el-dialog 
      v-model="previewDialogVisible" 
      title="文件预览" 
      width="80%" 
      top="5vh" 
      @close="handlePreviewClose"
    >
      <div v-loading="previewLoading" style="height: 70vh;">
        <div v-if="!previewUrl && !previewLoading" class="flex items-center justify-center h-full text-gray-400">
          暂无预览内容
        </div>
        <iframe 
          v-else-if="previewUrl && !previewLoading"
          :key="previewUrl"
          :src="previewUrl" 
          style="width: 100%; height: 100%; border: none;"
        ></iframe>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { 
  type FileMetadataVO, 
  type FileQueryDto,
  uploadFile, 
  searchFiles, 
  deleteFile, 
  updateFile,
  getPreviewUrl,
  downloadFile
} from '@/api/components/apiFile'

// ==================== 查询表单 ====================
const queryForm = reactive<FileQueryDto & { fileExtension?: string }>({
  fileName: '',
  fileCategory: 'PUBLIC',  // ✅ 固定为 PUBLIC
  fileExtension: '',       // ✅ 文件类型筛选
  startTime: '',
  endTime: '',
  pageNum: 1,
  pageSize: 10
})

// ==================== 文件列表 ====================
const fileList = ref<FileMetadataVO[]>([])
const loading = ref(false)

// ==================== 分页相关 ====================
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// ==================== 重命名相关 ====================
const renameDialogVisible = ref(false)
const renameForm = reactive({
  newName: ''
})
let currentRenameFile: FileMetadataVO | null = null

// ==================== 预览相关 ====================
const previewDialogVisible = ref(false)
const previewUrl = ref('')
const previewLoading = ref(false)





// ==================== 查询文件 ====================
const handleSearch = async () => {
  currentPage.value = 1
  await loadFiles()
}

// ==================== 重置查询 ====================
const handleReset = () => {
  Object.assign(queryForm, {
    fileName: '',
    fileExtension: '',
    startTime: '',
    endTime: ''
  })
  currentPage.value = 1
  loadFiles()
}

// ==================== 加载文件列表 ====================
const loadFiles = async () => {
  try {
    loading.value = true
    
    // ✅ 构建查询参数
    const params: FileQueryDto = {
      fileCategory: 'PUBLIC',  // ✅ 固定查询 PUBLIC 文件
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }
    
    if (queryForm.fileName) {
      params.fileName = queryForm.fileName
    }
    
    if (queryForm.startTime) {
      params.startTime = queryForm.startTime
    }
    
    if (queryForm.endTime) {
      params.endTime = queryForm.endTime
    }
    
    const response = await searchFiles(params)
    
    if (response.code === 200) {
      // ✅ 前端过滤文件类型（如果后端不支持扩展名筛选）
      let list = response.data.list || []
      
      if (queryForm.fileExtension) {
        list = list.filter(file => file.fileExtension === queryForm.fileExtension)
      }
      
      fileList.value = list
      totalItems.value = response.data.total || 0
    } else {
      ElMessage.error(response.msg || '查询失败')
    }
  } catch (error) {
    ElMessage.error('查询失败')
    console.error('查询错误:', error)
  } finally {
    loading.value = false
  }
}

// ==================== 预览文件 ====================
const handlePreview = async (row: FileMetadataVO) => {
  try {
    previewUrl.value = ''
    previewLoading.value = true
    
    const response = await getPreviewUrl(row.id, 60)
    
    if (response.code === 200) {
      previewUrl.value = response.data
      setTimeout(() => {
        previewDialogVisible.value = true
        previewLoading.value = false
      }, 100)
    } else {
      ElMessage.error(response.msg || '获取预览链接失败')
      previewLoading.value = false
    }
  } catch (error) {
    ElMessage.error('预览失败')
    console.error('预览错误:', error)
    previewLoading.value = false
  }
}

// ==================== 预览弹窗关闭 ====================
const handlePreviewClose = () => {
  previewUrl.value = ''
}

// ==================== 下载文件 ====================
const handleDownload = async (row: FileMetadataVO) => {
  try {
    await downloadFile(row.id)
    ElMessage.success('下载成功')
  } catch (error) {
    ElMessage.error('下载失败')
    console.error('下载错误:', error)
  }
}



// ==================== 确认重命名 ====================
const confirmRename = async () => {
  if (!currentRenameFile || !renameForm.newName.trim()) {
    ElMessage.error('请输入新文件名')
    return
  }
  
  try {
    const newFullName = renameForm.newName.trim() + currentRenameFile.fileExtension
    
    const response = await updateFile(currentRenameFile.id, {
      originalName: newFullName
    })
    
    if (response.code === 200) {
      ElMessage.success('重命名成功')
      renameDialogVisible.value = false
      await loadFiles()
    } else {
      ElMessage.error(response.msg || '重命名失败')
    }
  } catch (error) {
    ElMessage.error('重命名失败')
    console.error('重命名错误:', error)
  }
}


// ==================== 分页变化 ====================
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadFiles()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadFiles()
}

// ==================== 辅助函数 ====================

// ✅ 获取文件类型文本
const getFileTypeText = (extension: string): string => {
  const map: Record<string, string> = {
    '.pdf': 'PDF',
    '.doc': 'Word',
    '.docx': 'Word',
    '.xls': 'Excel',
    '.xlsx': 'Excel',
    '.txt': '文本',
    '.jpg': '图片',
    '.jpeg': '图片',
    '.png': '图片',
    '.gif': '图片'
  }
  return map[extension] || extension.toUpperCase()
}
// ✅ 判断文件是否可预览（仅 PDF 和图片）
const isPreviewable = (extension: string): boolean => {
  if (!extension) return false
  const ext = extension.toLowerCase()
  const previewableExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  return previewableExtensions.includes(ext)
}
// ✅ 获取文件类型颜色
const getFileTypeColor = (extension: string): string => {
  const map: Record<string, string> = {
    '.pdf': 'danger',
    '.doc': 'primary',
    '.docx': 'primary',
    '.xls': 'success',
    '.xlsx': 'success',
    '.txt': 'info',
    '.jpg': 'warning',
    '.jpeg': 'warning',
    '.png': 'warning',
    '.gif': 'warning'
  }
  return map[extension] || 'info'
}

// ✅ 格式化时间
const formatDateTime = (datetime: string): string => {
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

// ==================== 组件挂载 ====================
onMounted(() => {
  loadFiles()
})
</script>

<style scoped>
:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>