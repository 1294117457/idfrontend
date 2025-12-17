<template>
  <div class="relative h-screen w-screen overflow-hidden">
    <!-- 背景图片层 - 最底层 -->
    <div class="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10">
      <img src="@/assets/images/bg2.jpg" alt="" class="w-full h-full object-cover">
    </div>

    <!-- TopBar - 固定在顶部 -->
    <TOPBAR :is-scrolled="isScrolled" />

    <!-- 主内容区域 - 隐藏滚动条 -->
    <div 
      ref="scrollContainer"
      class="pt-[6rem] h-full overflow-auto scrollbar-hide"
      @scroll="handleScroll"
    >
      <router-view />
      <!-- AI 助手悬浮组件 -->
      <AiAssistant />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import TOPBAR from './component/TopBar.vue'
import AiAssistant from '@/views/ai-agent/index.vue'

const scrollContainer = ref<HTMLElement | null>(null)
const isScrolled = ref(false)

// 滚动监听
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  isScrolled.value = target.scrollTop > 50
}
</script>

<style scoped>
/* ✅ 隐藏滚动条 - 支持所有浏览器 */
.scrollbar-hide {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
  width: 0;
  height: 0;
}
</style>