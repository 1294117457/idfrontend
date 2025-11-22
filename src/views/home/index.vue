<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// 定义组件名称
defineOptions({
  name: 'Welcome',
})

// 获取路由实例和当前路由
const router = useRouter()
const route = useRoute()

// 定义激活路径
const activePath = ref(route.path)

// 获取所有模块的路由配置
const homeRoute = computed(() => {
  return router.options.routes.find((route) => route.path === '/home')
})

// 获取所有模块（排除重定向路由、不显示的路由和首页相关路由）
const modules = computed(() => {
  if (!homeRoute.value || !homeRoute.value.children) return []

  // 过滤掉重定向路由、隐藏路由和首页相关路由，并按sort排序
  return [...homeRoute.value.children]
    .filter(
      (route) =>
        !route.redirect &&
        !route.meta?.hidden &&
        route.path !== 'home' &&
        route.meta?.title !== '首页',
    )
    .sort((a, b) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))
})

// 导航到指定路径
const navigateTo = (module: any) => {
  let targetPath = '/home/' + module.path

  // 如果有子路由，导航到第一个子路由
  if (module.children && module.children.length > 0) {
    // 按sort排序子路由
    const sortedChildren = [...module.children]
      .filter((route) => !route.redirect && !route.meta?.hidden)
      .sort((a, b) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))

    if (sortedChildren.length > 0) {
      targetPath = `/home/${module.path}/${sortedChildren[0].path}`
    }
  }

  router.push(targetPath)
  activePath.value = targetPath.replace('/home/', '')
}

// 获取图标颜色
const getIconColor = (index: number) => {
  const colors = [
    'text-blue-500',
    'text-green-500',
    'text-purple-500',
    'text-orange-500',
    'text-red-500',
    'text-cyan-500',
    'text-amber-500',
    'text-indigo-500',
  ]
  return colors[index % colors.length]
}

// 当前时间
const currentTime = ref('')
const currentDate = ref('')

// 更新时间的函数
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

watch(
  () => route.path,
  (newPath) => {
    activePath.value = newPath.replace('/home/', '')
  },
  { immediate: true },
)

// 组件挂载时开始更新时间
onMounted(() => {
  updateTime()
  // 每秒更新时间
  setInterval(updateTime, 1000)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-8">
    <!-- 顶部标题区域 -->
    <div class="text-center mb-8">
      <h1 class="text-5xl font-bold text-white mb-2 drop-shadow-lg">
        欢迎来到平台管理
      </h1>
      <p class="text-xl text-white/80">探索六合一平台管理系统</p>
    </div>

    <!-- 行星旋转区域 -->
    <div class="relative w-[600px] h-[600px] mx-auto mb-8">
      <!-- 中心时间显示 - "太阳" -->
      <div class="absolute inset-0 flex items-center justify-center z-10">
        <div class="bg-white/10 backdrop-blur-md rounded-full w-48 h-48 flex items-center justify-center shadow-2xl border border-white/20">
          <div class="text-center">
            <div class="text-5xl font-mono font-bold text-white mb-2">{{ currentTime }}</div>
            <div class="text-sm text-white/80">{{ currentDate }}</div>
          </div>
        </div>
      </div>

      <!-- 轨道 -->
      <div class="absolute inset-0 border-2 border-white/10 rounded-full"></div>

      <!-- 行星 -->
      <div
        v-for="(module, index) in modules"
        :key="module.path"
        @click="navigateTo(module)"
        class="absolute w-28 h-28 bg-white/10 backdrop-blur-md rounded-full shadow-2xl border border-white/20 cursor-pointer hover:bg-white/20 hover:scale-110 transition-all duration-300 flex items-center justify-center planet-orbit"
        :style="{
          '--orbit-delay': `${-index * 2}s`,
          '--orbit-duration': '20s',
          top: 'calc(50% - 56px)',
          left: 'calc(50% - 56px)',
        }"
      >
        <div class="flex flex-col items-center justify-center text-center">
          <component v-if="module.meta?.icon" :is="module.meta.icon" class="w-8 h-8 text-white" />
          <IconifyIconOffline
            v-else
            :icon="'mdi/view-dashboard'"
            class="text-2xl text-white"
          />
          <h3 class="text-sm font-semibold text-white mt-2">
            {{ module.meta?.title || module.path }}
          </h3>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.planet-orbit {
  animation: orbit var(--orbit-duration) linear infinite;
  animation-delay: var(--orbit-delay);
  transform-origin: center;
}

@keyframes orbit {
  0% {
    transform: rotate(0deg) translateX(250px) rotate(0deg);
  }
  100% {
    transform: rotate(360deg) translateX(250px) rotate(-360deg);
  }
}
</style>