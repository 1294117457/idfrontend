<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/profile'
const userStore = useUserStore()
// 定义组件名称
defineOptions({
  name: 'Welcome',
})
onMounted(async () => {
  await userStore.fetchStudentInfo()
})
</script>

<template>

</template>

<style scoped>

</style>