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

<style scoped></style>