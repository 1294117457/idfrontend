<template>
  <div class="app-shell">
    <!-- Background -->
    <div class="app-bg">
      <img src="@/assets/images/bg2.jpg" alt="" class="app-bg-img" />
      <div class="app-bg-overlay"></div>
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
  width: 100vw;
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
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.2) 0%,
    rgba(15, 23, 42, 0.35) 100%
  );
}

.app-main {
  padding-top: 4.5rem;
  height: 100%;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.app-main::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
</style>
