<template>
  <el-menu
    :default-active="activePath"
    :collapse="isCollapse"
    class="top-[3rem]"
    @open="handleOpen"
    @close="handleClose"
  >
    <!-- 统一渲染所有一级菜单，按 sort 排序 -->
    <template v-for="item in sortedMenuRoutes" :key="item.path">
      <!-- 有子路由，渲染为 el-sub-menu -->
      <el-sub-menu
        v-if="item.children && item.children.length"
        :index="item.path"
        class="bg-gradient-to-r from-blue-50 to-blue-10"
      >
        <template #title>
          <component v-if="item.meta?.icon" :is="item.meta.icon" class="w-6 h-6" />
          <span>{{ item.meta?.title || item.path }}</span>
        </template>
        <el-menu-item
          v-for="sub in item.children"
          :key="sub.path"
          :index="item.path + '/' + sub.path"
          @click="navigateTo('/home/' + item.path + '/' + sub.path)"
        >
          {{ sub.meta?.title || sub.path }}
        </el-menu-item>
      </el-sub-menu>

      <!-- 无子路由，渲染为普通菜单项 -->
      <el-menu-item
        v-else
        :index="item.path"
        @click="navigateTo('/home/' + item.path)"
        class="bg-gradient-to-r from-blue-50 to-blue-10"
      >
        <component v-if="item.meta?.icon" :is="item.meta.icon" class="w-6 h-6" />
        <span>{{ item.meta?.title || item.path }}</span>
      </el-menu-item>
    </template>

    <!-- 折叠/展开按钮 -->
    <div
      class="absolute top-1/2 -right-1 transform -translate-y-1/2 cursor-pointer p-2 bg-white shadow rounded-l-lg"
      @click="isCollapse = !isCollapse"
    >
      {{ isCollapse ? '→' : '←' }}
    </div>
  </el-menu>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const isCollapse = ref(false)
const activePath = ref(route.path)

// 获取 /home 路由的子路由
const homeRoute = router.options.routes.find((r) => r.path === '/home')
// ✅ 过滤掉 redirect 和 hidden 的路由
const menuRoutes = homeRoute?.children?.filter((r) => !r.redirect && !r.meta?.hidden) || []

// 排序 menuRoutes
const sortedMenuRoutes = computed(() =>
  [...menuRoutes].sort((a, b) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity)),
)

watch(
  () => route.path,
  (newPath) => {
    activePath.value = newPath.replace('/home/', '')
  },
  { immediate: true },
)

const navigateTo = (path: string) => {
  router.push(path)
  activePath.value = path.replace('/home/', '')
}
const handleOpen = (key: string, keyPath: string[]) => {}
const handleClose = (key: string, keyPath: string[]) => {}
</script>
