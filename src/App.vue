<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
.page-container {
  min-height: calc(100vh - 5rem);
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: clamp(0.9rem, 2.5vw, 1.75rem);
}

.page-container-card {
  min-height: calc(100vh - 7rem);
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: clamp(0.9rem, 2.5vw, 1.75rem);
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
  background: linear-gradient(180deg, #2563eb, #60a5fa);
  border-radius: 2px;
}

@media (max-width: 640px) {
  .page-container,
  .page-container-card {
    min-height: auto;
    padding: 0.85rem;
  }

  .page-title {
    font-size: 1rem;
  }
}
</style>
