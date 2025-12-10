<template>
    <div>
      <!-- 悬浮按钮（可拖拽） -->
      <div
        ref="floatButton"
        class="fixed z-[9999] cursor-pointer group"
        :class="{ 'cursor-grabbing': isDragging }"
        :style="{ right: position.right + 'px', bottom: position.bottom + 'px' }"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <!-- 悬浮提示文字 -->
        <div
          v-if="!isDragging"
          class="absolute bottom-16 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        >
          我是AI助手抽成龟，可以帮助您了解如何使用这个系统
          <div class="absolute -bottom-1 right-6 w-2 h-2 bg-gray-800 rotate-45"></div>
        </div>
  
        <div
          class="w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 overflow-hidden border-2 border-white"
          :class="{ 'scale-110 shadow-2xl': isDragging }"
          @click="handleClick"
        >
          <!-- 使用头像图片 -->
          <img
            v-if="!isOpen"
            src="@/assets/images/avatar.png"
            alt="抽成龟"
            class="w-full h-full object-cover"
            @error="handleAvatarError"
          />
          <!-- 如果图片加载失败，显示备用图标 -->
          <div
            v-if="avatarError && !isOpen"
            class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
          >
            <span class="text-white text-lg font-bold">龟</span>
          </div>
          <!-- 关闭图标 -->
          <div
            v-if="isOpen"
            class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
          >
            <svg
              class="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>
        <!-- 未读提示 -->
        <div
          v-if="hasNewMessage && !isOpen"
          class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"
        />
        
        <!-- 拖拽提示（首次显示） -->
        <div
          v-if="showDragTip && !isDragging"
          class="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-bounce"
        >
          可拖拽移动
        </div>
      </div>
  
      <!-- 对话框 -->
      <Transition name="slide-up">
        <div
          v-if="isOpen"
          class="fixed z-[9998] w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          :style="dialogPosition"
        >
          <!-- 头部 -->
          <div
            class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <!-- 头部头像 -->
              <div class="w-8 h-8 rounded-full overflow-hidden border border-white/30">
                <img
                  src="@/assets/images/avatar.png"
                  alt="抽成龟"
                  class="w-full h-full object-cover"
                  @error="handleHeaderAvatarError"
                />
                <div
                  v-if="headerAvatarError"
                  class="w-full h-full bg-white/20 flex items-center justify-center"
                >
                  <span class="text-xs font-bold">龟</span>
                </div>
              </div>
              <span class="font-semibold">抽成龟</span>
            </div>
            <button
              @click="handleClearHistory"
              class="text-white/80 hover:text-white text-sm flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              新对话
            </button>
          </div>
  
          <!-- 消息列表 -->
          <div ref="messageContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- 欢迎消息 -->
            <div v-if="messages.length === 0" class="text-center text-gray-400 mt-8">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border-2 border-gray-200">
                <img
                  src="@/assets/images/avatar.png"
                  alt="抽成龟"
                  class="w-full h-full object-cover"
                />
              </div>
              <p class="text-sm font-medium text-gray-600">你好！我是抽成龟</p>
              <p class="text-xs mt-1">可以帮助您了解如何使用这个系统</p>
            </div>
  
            <!-- 消息气泡 -->
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']"
            >
              <!-- AI消息带头像 -->
              <div v-if="msg.role === 'assistant'" class="flex items-start gap-2">
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-1">
                  <img
                    src="@/assets/images/avatar.png"
                    alt="抽成龟"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="max-w-[75%] px-4 py-2 rounded-2xl text-sm bg-gray-100 text-gray-800 rounded-bl-md">
                  <div class="whitespace-pre-wrap">{{ msg.content }}</div>
                </div>
              </div>
              <!-- 用户消息 -->
              <div
                v-else
                class="max-w-[80%] px-4 py-2 rounded-2xl text-sm bg-blue-500 text-white rounded-br-md"
              >
                <div class="whitespace-pre-wrap">{{ msg.content }}</div>
              </div>
            </div>
  
            <!-- 加载动画 -->
            <div v-if="isLoading" class="flex justify-start">
              <div class="flex items-start gap-2">
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-1">
                  <img
                    src="@/assets/images/avatar.png"
                    alt="抽成龟"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s" />
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s" />
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s" />
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- 输入区域 -->
          <div class="border-t p-3">
            <div class="flex items-center gap-2">
              <input
                v-model="inputMessage"
                @keyup.enter="handleSend"
                type="text"
                placeholder="输入消息..."
                class="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="isLoading"
              />
              <button
                @click="handleSend"
                :disabled="isLoading || !inputMessage.trim()"
                class="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
              >
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, reactive, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
  import { sendMessage, clearConversation } from '@/api/components/apiAIagent'
  import { ElMessage } from 'element-plus'
  
  // 定义消息类型
  interface Message {
    role: 'user' | 'assistant'
    content: string
  }
  
  // ==================== 拖拽相关状态 ====================
  const floatButton = ref<HTMLElement | null>(null)
  const isDragging = ref(false)
  const showDragTip = ref(true)
  const hasDragged = ref(false)
  
  // 位置状态（使用 right 和 bottom 定位）
  const position = reactive({
    right: 32,  // 默认距离右边 32px
    bottom: 32  // 默认距离底部 32px
  })
  
  // 拖拽起始位置
  const dragStart = reactive({
    x: 0,
    y: 0,
    right: 0,
    bottom: 0
  })
  
  // 计算对话框位置（跟随悬浮按钮）
  const dialogPosition = computed(() => {
    const dialogWidth = 384  // w-96 = 24rem = 384px
    const dialogHeight = 500
    const buttonSize = 56
    const gap = 16
    
    // 计算对话框应该出现的位置
    let right = position.right
    let bottom = position.bottom + buttonSize + gap
    
    // 边界检测：确保对话框不超出屏幕
    if (typeof window !== 'undefined') {
      // 右边界
      if (right < 0) right = 8
      // 左边界
      if (right + dialogWidth > window.innerWidth) {
        right = window.innerWidth - dialogWidth - 8
      }
      // 上边界
      if (bottom + dialogHeight > window.innerHeight) {
        // 如果上方放不下，就放在按钮下方
        bottom = position.bottom - dialogHeight - gap
        if (bottom < 0) bottom = 8
      }
    }
    
    return {
      right: right + 'px',
      bottom: bottom + 'px'
    }
  })
  
  // 开始拖拽
  const startDrag = (e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    
    isDragging.value = true
    showDragTip.value = false
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    dragStart.x = clientX
    dragStart.y = clientY
    dragStart.right = position.right
    dragStart.bottom = position.bottom
    
    // 添加事件监听
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchmove', onDrag)
    document.addEventListener('touchend', stopDrag)
  }
  
  // 拖拽中
  const onDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const deltaX = dragStart.x - clientX  // 注意：right 定位时方向相反
    const deltaY = dragStart.y - clientY  // 注意：bottom 定位时方向相反
    
    // 计算新位置
    let newRight = dragStart.right + deltaX
    let newBottom = dragStart.bottom + deltaY
    
    // 边界限制
    const buttonSize = 56
    const minMargin = 8
    
    // 限制在屏幕范围内
    newRight = Math.max(minMargin, Math.min(window.innerWidth - buttonSize - minMargin, newRight))
    newBottom = Math.max(minMargin, Math.min(window.innerHeight - buttonSize - minMargin, newBottom))
    
    position.right = newRight
    position.bottom = newBottom
    
    // 标记已拖拽
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDragged.value = true
    }
  }
  
  // 停止拖拽
  const stopDrag = () => {
    isDragging.value = false
    
    // 移除事件监听
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('touchmove', onDrag)
    document.removeEventListener('touchend', stopDrag)
    
    // 保存位置到 localStorage
    savePosition()
    
    // 重置拖拽状态（延迟，避免触发点击）
    setTimeout(() => {
      hasDragged.value = false
    }, 100)
  }
  
  // 处理点击（区分拖拽和点击）
  const handleClick = () => {
    if (!hasDragged.value) {
      toggleDialog()
    }
  }
  
  // 保存位置到 localStorage
  const savePosition = () => {
    localStorage.setItem('ai-assistant-position', JSON.stringify(position))
  }
  
  // 从 localStorage 加载位置
  const loadPosition = () => {
    const saved = localStorage.getItem('ai-assistant-position')
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        position.right = pos.right
        position.bottom = pos.bottom
        showDragTip.value = false  // 已经拖拽过，不显示提示
      } catch (e) {
        console.error('加载位置失败', e)
      }
    }
  }
  
  // ==================== 原有状态 ====================
  const isOpen = ref(false)
  const isLoading = ref(false)
  const hasNewMessage = ref(false)
  const inputMessage = ref('')
  const messages = ref<Message[]>([])
  const messageContainer = ref<HTMLElement | null>(null)
  
  // 头像加载错误状态
  const avatarError = ref(false)
  const headerAvatarError = ref(false)
  
  // 处理头像加载错误
  const handleAvatarError = () => {
    avatarError.value = true
  }
  
  const handleHeaderAvatarError = () => {
    headerAvatarError.value = true
  }
  
  // 切换对话框
  const toggleDialog = () => {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      hasNewMessage.value = false
    }
  }
  
  // 滚动到底部
  const scrollToBottom = () => {
    nextTick(() => {
      if (messageContainer.value) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight
      }
    })
  }
  
  // 发送消息
  const handleSend = async () => {
    const message = inputMessage.value.trim()
    if (!message || isLoading.value) return
  
    // 添加用户消息
    messages.value.push({
      role: 'user',
      content: message,
    })
    inputMessage.value = ''
    scrollToBottom()
  
    // 发送请求
    isLoading.value = true
    try {
      const res = await sendMessage(message)
      if (res.code === 200) {
        messages.value.push({
          role: 'assistant',
          content: res.data,
        })
      } else {
        messages.value.push({
          role: 'assistant',
          content: '抱歉，我遇到了一些问题，请稍后再试。',
        })
        ElMessage.error(res.msg || '发送失败')
      }
    } catch (error) {
      messages.value.push({
        role: 'assistant',
        content: '网络异常，请检查网络连接。',
      })
      ElMessage.error('网络异常')
    } finally {
      isLoading.value = false
      scrollToBottom()
    }
  }
  
  // 清除对话历史
  const handleClearHistory = async () => {
    try {
      await clearConversation()
      messages.value = []
      ElMessage.success('已开始新对话')
    } catch (error) {
      ElMessage.error('清除失败')
    }
  }
  
  // 监听消息变化
  watch(
    () => messages.value.length,
    () => {
      if (!isOpen.value && messages.value.length > 0) {
        hasNewMessage.value = true
      }
    },
  )
  
  // 生命周期
  onMounted(() => {
    loadPosition()
    
    // 3秒后隐藏拖拽提示
    setTimeout(() => {
      showDragTip.value = false
    }, 3000)
  })
  </script>
  
  <style scoped>
  /* 弹出动画 */
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }
  
  .slide-up-enter-from,
  .slide-up-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }
  
  /* 滚动条样式 */
  ::-webkit-scrollbar {
    width: 4px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
  
  /* 拖拽时禁用文本选择 */
  .cursor-grabbing {
    cursor: grabbing !important;
    user-select: none;
  }
  </style>