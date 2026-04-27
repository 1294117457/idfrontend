<template>
  <div class="app-shell">
    <!-- Background -->
    <div class="app-bg">
      <img src="@/assets/images/bg2.jpg" alt="" class="app-bg-img" />
      <!-- <div class="app-bg-overlay"></div> -->
    </div>

    <!-- TopBar -->
    <TOPBAR :is-scrolled="isScrolled" />

    <!-- Main Content -->
    <div
      ref="scrollContainer"
      class="app-main"
      @scroll="handleScroll"
    >
      <router-view />
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

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  isScrolled.value = target.scrollTop > 50
}
</script>

<style scoped>
.app-shell {
  position: relative;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
}

.app-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
}

.app-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-bg-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.78) 0%, rgba(241, 245, 249, 0.92) 100%),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 32rem);
}

.app-main {
  padding-top: 4.5rem;
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
}

.app-main::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.app-main::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}

@media (max-width: 768px) {
  .app-main {
    padding-top: 4rem;
  }
}
</style>
