<script setup lang="ts">
import { onMounted } from 'vue';
onMounted(() => {
  console.log('环境变量', import.meta.env);
});
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style scoped>
  /* ✅ 页面容器统一样式 */
.page-container {
  min-height: calc(100vh - 6rem);
  padding: 1rem;
}

.page-container-card {
  min-height: calc(100vh - 8rem);
  padding: 1rem;
}
</style>
