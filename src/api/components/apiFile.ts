import apiClient from '@/utils/http'
const apiBaseUrl = import.meta.env.VITE_BASE_API

// ========== 请求参数接口 ==========

/** 文件上传参数 */
export interface FileUploadDto {
  filePurpose?: string      // 文件用途
  businessId?: string       // 业务ID
  fileCategory?: string     // 文件分类
  tags?: string            // 文件标签
  description?: string     // 文件描述
}

/** 文件查询参数 */
export interface FileQueryDto {
  fileName?: string         // 文件名模糊查询
  fileCategory?: string     // 文件分类
  businessId?: string       // 业务ID
  uploadUserId?: number     // 上传用户ID
  startTime?: string        // 开始时间(ISO格式)
  endTime?: string          // 结束时间(ISO格式)
  pageNum?: number          // 页码
  pageSize?: number         // 每页大小
}

/** 文件更新参数 */
export interface FileUpdateDto {
  originalName?: string     // 新文件名
  filePurpose?: string      // 新文件用途
}

// ========== 返回数据接口 ==========

/** 文件元数据 */
export interface FileMetadataVO {
  id: number
  originalName: string
  fileSize: number
  fileSizeFormatted: string
  contentType: string
  fileExtension: string
  fileCategory: string
  businessId?: string
  filePurpose?: string
  uploadUserId: number
  uploadTime: string
  previewUrl?: string
}

/** 分页响应 */
export interface PageResponse<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  pages: number
}

/** 通用响应 */
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

// ========== API 方法 ==========

/** 上传文件 */
export const uploadFile = async (file: File, metadata?: FileUploadDto): Promise<ApiResponse<FileMetadataVO>> => {
  const formData = new FormData()
  formData.append('file', file)
  
  if (metadata) {
    if (metadata.filePurpose) formData.append('filePurpose', metadata.filePurpose)
    if (metadata.businessId) formData.append('businessId', metadata.businessId)
    if (metadata.fileCategory) formData.append('fileCategory', metadata.fileCategory)
    if (metadata.tags) formData.append('tags', metadata.tags)
    if (metadata.description) formData.append('description', metadata.description)
  }

  const response = await apiClient.post(`${apiBaseUrl}/api/file/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

/** 查询文件列表(分页) */
export const searchFiles = async (params: FileQueryDto): Promise<ApiResponse<PageResponse<FileMetadataVO>>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/search`, { params })
  return response.data
}

/** 删除文件 */
export const deleteFile = async (fileId: number): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete(`${apiBaseUrl}/api/file/${fileId}`)
  return response.data
}

/** 更新文件信息(重命名) */
export const updateFile = async (fileId: number, updateDto: FileUpdateDto): Promise<ApiResponse<FileMetadataVO>> => {
  const response = await apiClient.put(`${apiBaseUrl}/api/file/${fileId}`, updateDto)
  return response.data
}

/** 获取预览URL */
export const getPreviewUrl = async (fileId: number, expiryMinutes: number = 60): Promise<ApiResponse<string>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  return response.data
}

/** 下载文件 */
export const downloadFile = async (fileId: number): Promise<void> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/${fileId}/download`, {
    responseType: 'blob'
  })
  
  // 创建下载链接
  const blob = new Blob([response.data])
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  
  // 从响应头获取文件名
  const contentDisposition = response.headers['content-disposition']
  const fileName = contentDisposition 
    ? decodeURIComponent(contentDisposition.split('filename=')[1].replace(/"/g, ''))
    : 'download'
  
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
