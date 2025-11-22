import apiClient from '@/utils/http' // 导入拦截器实例
import { AxiosError } from 'axios' // 假设 apiBaseUrl 从环境变量获取
const apiBaseUrl = import.meta.env.VITE_BASE_API
import axios from 'axios'

// 文件接口
export interface PolicyFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  uploadTime: string
  uploadedBy: string
}

// 查询参数接口
export interface FileQueryParams {
  fileName?: string
  fileType?: string
  startDate?: string
  endDate?: string
}

// 上传文件
export const uploadFile = async (file: File, metadata?: { fileName?: string; tags?: string; description?: string; uploadedBy?: string }) => {
  const formData = new FormData()
  formData.append('file', file)
  if (metadata) {
    if (metadata.fileName) formData.append('fileName', metadata.fileName)
    if (metadata.tags) formData.append('tags', metadata.tags)
    if (metadata.description) formData.append('description', metadata.description)
    if (metadata.uploadedBy) formData.append('uploadedBy', metadata.uploadedBy)
  }
  const response = await apiClient.post(`${apiBaseUrl}/api/file/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  })
  return response.data
}

// 查询文件列表
export const searchFiles = async (params: FileQueryParams & { pageNum?: number; pageSize?: number }) => {
    try {
        const response = await apiClient.get(`${apiBaseUrl}/api/file/search`, { params })
        return response.data
    } catch (error) {
        console.log('获取文件错误', error)
    }
}

// 删除文件
export const deleteFile = async (fileId: string) => {
  const response = await apiClient.delete(`${apiBaseUrl}/api/file/${fileId}`)
  return response.data
}

// 重命名文件
export const renameFile = async (fileId: string, newName: string) => {
  const response = await apiClient.put(`${apiBaseUrl}/api/file/${fileId}/rename`, null, {
    params: { newName }
  })
  return response.data
}

// 获取预览URL
export const getPreviewUrl = async (fileId: string) => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/${fileId}/preview`)
  return response.data
}