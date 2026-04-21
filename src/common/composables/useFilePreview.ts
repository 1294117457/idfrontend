export function useFilePreview() {
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
      '.txt': '文本',
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
      '.webp': 'warning',
    }
    return colorMap[ext] || 'info'
  }

  return {
    getFileExtension,
    canPreview,
    getPreviewType,
    getFileTypeLabel,
    getFileTypeTagColor,
  }
}
