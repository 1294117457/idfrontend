<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
.page-container {
  min-height: calc(100vh - 5rem);
  padding: 1.25rem clamp(1rem, 2.5vw, 2rem);
}

.page-container-card {
  min-height: calc(100vh - 7rem);
  padding: 1.25rem clamp(1rem, 2.5vw, 2rem);
}

.page-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-title::before {
  content: '';
  width: 4px;
  height: 1.1em;
  background: linear-gradient(180deg, #4f46e5, #818cf8);
  border-radius: 2px;
}
</style>
