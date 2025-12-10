<template>
  <div class="flex h-screen select-none">
    <TITLEUI />
    <!-- 侧边菜单 -->
    <SIDEMENT />
    <!-- 顶部导航栏 -->
    <TOPNAVE />

    <!-- 主内容区域 -->
    <div class="pt-[5rem]   dark:text-white w-full h-full"> <!-- 修改：暗黑模式下使用深灰色背景 -->
      <router-view />
          <!-- ✅ AI 助手悬浮组件 -->
    <AiAssistant />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import TITLEUI from './titleUI.vue'
import SIDEMENT from './SideMenu.vue'
import TOPNAVE from './TopNave.vue'
import AiAssistant from '@/views/ai-agent/index.vue'
// 初始化主题（从 localStorage 加载）
onMounted(async () => {
})
</script>
