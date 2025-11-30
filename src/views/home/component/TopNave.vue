<template>
      <div class="fixed top-0 left-0 right-0 h-[3rem] bg-white shadow-md flex items-center px-6">
        <h1 class="text-2xl font-bold pl-[7rem] dark:text-white">保研加分材料系统</h1>
        <div class="ml-auto flex items-center gap-4">
          <el-dropdown @command="handleCommand" class="cursor-pointer">
            <!-- 头像 -->
            <div class="flex items-center  text-gray-700 dark:text-white hover:text-blue-500 dark:hover:text-blue-300 transition outline-none gap-1">
              <img src="@/assets/images/avatar.png" alt="头像" class="w-[2rem] rounded-full " />
              <span class="text-[1.5rem]">{{userStore.userInfo?.fullName||'游客'}}</span> <!-- 替换为实际用户名 -->
            </div>
            <!-- 账户名称 -->
            <template #dropdown>
              <el-dropdown-menu class="select-none">
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  修改账户信息
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><Logout /></el-icon>
                  注销
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
  </template>
  
  <script lang="ts" setup>
import router from '@/router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/profile'  // ✅ 添加导入
const userStore = useUserStore()

  

const handleCommand = (command: string) => {
  if (command === 'profile') {
    router.push('/home/profile') // ✅ 跳转到用户信息页面
  } else if (command === 'logout') {
    logout()
  }
}


const logout = () => {
  userStore.clearAll()  // 这个方法会清除 userInfo 和 tokens
  // ✅ 清除所有 token
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('theme')
  ElMessage.success('已注销')
  router.push('/login')
}

  </script>