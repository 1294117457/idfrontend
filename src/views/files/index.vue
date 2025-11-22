<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center mb-4">
        <h4 class="text-[20px] font-bold text-gray-800">文件查询</h4>
      </div>

      <!-- 查询表单和按钮行 -->
      <el-row >
        <el-col >
          <el-form :inline="true" :model="queryForm">
            <el-form-item label="文件名">
              <el-input v-model="queryForm.fileName" placeholder="输入文件名" clearable style="width: 150px;" />
            </el-form-item>
            <el-form-item label="文件类型">
              <el-select v-model="queryForm.fileType" placeholder="选择类型" clearable style="width: 100px;">
                <el-option label="全部" value="" /> 
                <el-option label="PDF" value=".pdf" />
                <el-option label="DOC" value=".doc" />
                <el-option label="DOCX" value=".docx" />
                <el-option label="Excel" value=".xlsx" />
                <el-option label="TXT" value=".txt" />
                <el-option label="RTF" value=".rtf" />
              </el-select>
            </el-form-item>
            <el-form-item label="上传开始日期">
              <el-date-picker
                v-model="queryForm.startDate"
                type="datetime"
                placeholder="选择开始日期"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 130px;"
              />
            </el-form-item>
            <el-form-item label="上传结束日期">
              <el-date-picker
                v-model="queryForm.endDate"
                type="datetime"
                placeholder="选择结束日期"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 130px;"
              />
            </el-form-item>
            <el-space class="text-right">
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
           
          </el-space>
          </el-form>

        </el-col>
      </el-row>

      <!-- 隐藏的上传组件 -->


      <!-- 文件列表表格 -->
      <el-table
        :data="fileList"
        table-layout="auto"
        border
        stripe
        :header-cell-style="{ background: '#eef1f6', color: '#606266' }"
      >
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">
            {{ $index + 1 + (currentPage - 1) * pageSize }}
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="200" align="center" />
        <el-table-column prop="fileType" label="文件类型" width="100" align="center" />
        <el-table-column prop="fileSize" label="文件大小(KB)" width="120" align="center">
          <template #default="{ row }">
            {{ (row.fileSize / 1024).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="uploadTime" label="上传时间" width="180" align="center" />
        <el-table-column prop="uploadedBy" label="上传者" width="100" align="center" />
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-space size="small">
              <el-button type="primary" size="small" @click="handlePreview(row)">下载</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 -->
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

    <!-- 重命名弹窗 -->
    <el-dialog v-model="renameDialogVisible" title="修改文件名" width="400px">
      <el-form :model="renameForm" label-width="80px">
        <el-form-item label="新文件名">
          <el-input v-model="renameForm.newName" placeholder="输入新文件名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="renameDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRename">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { type PolicyFile, type FileQueryParams, uploadFile, searchFiles, deleteFile, renameFile, getPreviewUrl } from '@/api/components/apiFile'
// 查询表单
const queryForm = reactive<FileQueryParams>({
  fileName: '',
  fileType: '',
  startDate: '',
  endDate: ''
})
const uploadRef = ref()
const handleFileChange = async (file: any, fileList: any[]) => {
  try {
    // 调用uploadFile函数上传
    const response = await uploadFile(file.raw, {
      fileName: file.name,
      uploadedBy: 'currentUser'  // 可从store或localStorage获取
    })
    if (response.code === 200) {
      ElMessage.success('上传成功')
      await loadFiles()  // 重新加载列表
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}
// 文件列表
const fileList = ref<PolicyFile[]>([])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)


// 重命名相关
const renameDialogVisible = ref(false)
const renameForm = reactive({
  newName: ''
})
let currentRenameFile: PolicyFile | null = null



// 上传前校验
const beforeUpload = (file: File) => {
  const isValidType = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/rtf'
  ].includes(file.type)
  const isValidSize = file.size / 1024 / 1024 < 10 // 10MB
  if (!isValidType) {
    ElMessage.error('只支持PDF、Word、Excel、文本、RTF文件！')
    return false
  }
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过10MB！')
    return false
  }
  return true
}

// 上传成功
const handleUploadSuccess = async (response: any, file: any) => {
  if (response.code === 200) {
    ElMessage.success('上传成功')
    await loadFiles() // 重新加载列表
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

// 上传失败
const handleUploadError = (error: any) => {
  ElMessage.error('上传失败：' + error.message)
}

// 查询文件
const handleSearch = async () => {
  await loadFiles()
}

// 重置查询
const handleReset = () => {
  Object.assign(queryForm, {
    fileName: '',
    fileType: '',
    startDate: '',
    endDate: ''
  })
  loadFiles()
}

// 加载文件列表
const loadFiles = async () => {
  try {
    const response = await searchFiles({ 
      ...queryForm, 
      pageNum: currentPage.value, 
      pageSize: pageSize.value 
    })
    if (response.code === 200) {
      // 直接使用后端返回的分页数据
      fileList.value = response.data.list || []       // 当前页数据
      totalItems.value = response.data.total || 0     // 总记录数
      console.log('返回数据', {
        currentPage: response.data.pageNum,
        pageSize: response.data.pageSize,
        total: response.data.total,
        pages: response.data.pages,
        dataCount: response.data.list?.length
      })
    } else {
      ElMessage.error(response.message || '查询失败')
    }
  } catch (error) {
    ElMessage.error('查询失败')
  }
}

// 预览文件
const handlePreview = async (row: PolicyFile) => {
  try {
    const response = await getPreviewUrl(row.id)
    if (response.code === 200) {
      window.open(response.data, '_blank') // 打开预览链接
    } else {
      ElMessage.error(response.message || '预览失败')
    }
  } catch (error) {
    ElMessage.error('预览失败')
  }
}

// 修改名称
const handleRename = (row: PolicyFile) => {
  currentRenameFile = row
  renameForm.newName = row.fileName
  renameDialogVisible.value = true
}

// 确认重命名
const confirmRename = async () => {
  if (!currentRenameFile || !renameForm.newName.trim()) {
    ElMessage.error('请输入新文件名')
    return
  }
  try {
    const response = await renameFile(currentRenameFile.id, renameForm.newName)
    if (response.code === 200) {
      ElMessage.success('重命名成功')
      renameDialogVisible.value = false
      await loadFiles() // 重新加载列表
    } else {
      ElMessage.error(response.message || '重命名失败')
    }
  } catch (error) {
    ElMessage.error('重命名失败')
  }
}

// 删除文件
const handleDelete = async (row: PolicyFile) => {
  try {
    await ElMessageBox.confirm('确定删除此文件吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await deleteFile(row.id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
      await loadFiles() // 重新加载列表
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 分页变化 - 调用后端分页
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadFiles() // 重新加载数据，传递新的页码
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadFiles() // 重新加载数据，传递新的页大小
}

// 组件挂载时加载数据
onMounted(() => {
  loadFiles()
})
</script>
