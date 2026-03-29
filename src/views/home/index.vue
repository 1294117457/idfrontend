<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/profile'
import { getScoreFieldConfigs, type FieldConfig } from '@/api/components/apiFieldConfig'

defineOptions({
  name: 'Welcome',
})

const router = useRouter()
const userStore = useUserStore()
const scoreFieldConfigs = ref<FieldConfig[]>([])

const getScoreByFieldKey = (key: string) => {
  const map: Record<string, string> = {
    specialty:     'specialtyScore',
    comprehensive: 'comprehensiveScore',
    academic:      'academicScore',
  }
  const prop = map[key]
  const val = prop ? (userStore.studentInfo as any)?.[prop] : undefined
  return val != null ? Number(val).toFixed(2) : '--'
}

onMounted(async () => {
  if (!userStore.studentInfo) {
    await userStore.fetchStudentInfo()
  }
  try {
    const res = await getScoreFieldConfigs()
    if (res.code === 200 && res.data.length > 0) {
      scoreFieldConfigs.value = res.data
    }
  } catch {
    // 降级：使用默认综合得分
  }
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，别忘了休息'
  if (hour < 12) return '早上好，今天也稳步推进'
  if (hour < 18) return '下午好，继续冲刺保研目标'
  return '晚上好，复盘一下今天的进度'
})

const welcomeName = computed(() => {
  return userStore.userInfo?.nickname || userStore.studentInfo?.fullName || userStore.userInfo?.username || '同学'
})

const scoreText = computed(() => {
  const score = userStore.studentInfo?.comprehensiveScore
  return typeof score === 'number' ? score.toFixed(2) : '--'
})

const homeRoute = computed(() =>
  router.options.routes.find((routeItem) => routeItem.path === '/home')
)

const featureCards = computed(() => {
  const children = homeRoute.value?.children || []

  return children
    .filter((routeItem: any) => !routeItem.redirect && !routeItem.meta?.hidden && routeItem.path !== 'index')
    .sort((a: any, b: any) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))
    .map((routeItem: any) => {
      const child = routeItem.children?.find((sub: any) => !sub.redirect && !sub.meta?.hidden)
      const path = child ? `/home/${routeItem.path}/${child.path}` : `/home/${routeItem.path}`
      const title = routeItem.meta?.title || routeItem.path
      const descriptionMap: Record<string, string> = {
        files: '快速检索已上传材料与状态，避免重复提交。',
        score: '查看加分申请、历史记录与综合得分变化。',
        demand: '完善条件填写，系统会自动关联材料信息。',
        contact: '反馈问题并查看学院联系方式，及时获取支持。',
      }

      return {
        path,
        title,
        description: descriptionMap[routeItem.path] || '进入模块继续完善你的保研材料。',
      }
    })
})

const jumpTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <main class="landing-wrap">
    <section class="hero glass-card">
      <div class="hero-content reveal-up delay-1">
        <p class="hero-tag">{{ greeting }}</p>
        <h1 class="hero-title">{{ welcomeName }}，欢迎回来</h1>
        <p class="hero-subtitle">保研材料系统已为你准备好今天的任务入口，先完善关键信息，再提交申请会更高效。</p>

        <div class="hero-actions">
          <button class="action-btn primary" @click="jumpTo('/home/score/index')">开始加分申请</button>
          <button class="action-btn secondary" @click="jumpTo('/home/score/index')">完善条件信息</button>
        </div>
      </div>

      <div class="hero-panel reveal-up delay-2">
        <h3>当前概览</h3>
        <div class="panel-grid">
          <!-- 动态 SCORE 字段分数 -->
          <template v-if="scoreFieldConfigs.length > 0">
            <article v-for="f in scoreFieldConfigs" :key="f.id">
              <p>{{ f.displayName }}</p>
              <strong>{{ getScoreByFieldKey(f.fieldKey) }}</strong>
            </article>
          </template>
          <!-- 降级：仅显示综合得分 -->
          <template v-else>
            <article>
              <p>综合得分</p>
              <strong>{{ scoreText }}</strong>
            </article>
          </template>
          <article>
            <p>专业</p>
            <strong>{{ userStore.studentInfo?.major || '--' }}</strong>
          </article>
          <article>
            <p>年级</p>
            <strong>{{ userStore.studentInfo?.grade ? `大${userStore.studentInfo.grade}` : '--' }}</strong>
          </article>
          <article>
            <p>状态</p>
            <strong>{{ userStore.studentInfo?.isConfirmed ? '已确认' : '待确认' }}</strong>
          </article>
        </div>
      </div>
    </section>

    <section class="feature-area reveal-up delay-3">
      <div class="section-head">
        <h2>常用功能</h2>
        <span>点击进入对应模块</span>
      </div>
      <div class="feature-grid">
        <button
          v-for="item in featureCards"
          :key="item.path"
          class="feature-card"
          @click="jumpTo(item.path)"
        >
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <span>进入模块</span>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.landing-wrap {
  min-height: calc(100vh - 7rem);
  padding: 1.5rem clamp(1rem, 3vw, 2.5rem) 2.5rem;
  color: #f5f7ff;
  position: relative;
}

.landing-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 10% 0%, rgba(56, 189, 248, 0.32), transparent 45%),
    radial-gradient(circle at 85% 15%, rgba(251, 191, 36, 0.24), transparent 42%);
  pointer-events: none;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 1.2rem;
  position: relative;
  z-index: 1;
}

.glass-card {
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 24px;
  background: linear-gradient(120deg, rgba(11, 44, 112, 0.55), rgba(12, 74, 110, 0.45));
  backdrop-filter: blur(8px);
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.28);
  padding: clamp(1.2rem, 2vw, 2rem);
}

.hero-tag {
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  color: #dbeafe;
  margin-bottom: 0.85rem;
}

.hero-title {
  font-family: 'ZNtitle', 'Microsoft YaHei', sans-serif;
  font-size: clamp(2rem, 4vw, 3.3rem);
  line-height: 1.1;
  letter-spacing: 0.02em;
  margin-bottom: 0.7rem;
}

.hero-subtitle {
  max-width: 680px;
  line-height: 1.8;
  color: rgba(239, 246, 255, 0.9);
  margin-bottom: 1.3rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.action-btn {
  border: none;
  border-radius: 999px;
  padding: 0.68rem 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn.primary {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff;
  box-shadow: 0 10px 26px rgba(249, 115, 22, 0.32);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #f8fafc;
}

.hero-panel {
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.34);
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 1rem;
}

.hero-panel h3 {
  font-size: 1rem;
  margin-bottom: 0.8rem;
  color: #e2e8f0;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.panel-grid article {
  border-radius: 14px;
  padding: 0.75rem;
  background: linear-gradient(140deg, rgba(30, 64, 175, 0.24), rgba(6, 182, 212, 0.18));
}

.panel-grid p {
  font-size: 0.8rem;
  color: #cbd5e1;
  margin-bottom: 0.35rem;
}

.panel-grid strong {
  font-size: 1.05rem;
  color: #f8fafc;
}

.feature-area {
  margin-top: 1.35rem;
  position: relative;
  z-index: 1;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  color: #eff6ff;
}

.section-head h2 {
  font-family: 'ENtitle', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.2rem, 2.2vw, 1.65rem);
  letter-spacing: 0.03em;
}

.section-head span {
  color: rgba(219, 234, 254, 0.92);
  font-size: 0.9rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.feature-card {
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 18px;
  padding: 1rem;
  background: linear-gradient(145deg, rgba(15, 118, 110, 0.38), rgba(30, 64, 175, 0.3));
  color: #ecfeff;
  cursor: pointer;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.48);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.35);
}

.feature-card h3 {
  font-size: 1.05rem;
  margin-bottom: 0.45rem;
}

.feature-card p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(226, 232, 240, 0.95);
  min-height: 4.2em;
}

.feature-card span {
  display: inline-flex;
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: #fef3c7;
}

.reveal-up {
  opacity: 0;
  transform: translateY(18px);
  animation: revealUp 0.7s ease forwards;
}

.delay-1 {
  animation-delay: 0.05s;
}

.delay-2 {
  animation-delay: 0.16s;
}

.delay-3 {
  animation-delay: 0.28s;
}

@keyframes revealUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .landing-wrap {
    padding: 1rem 0.85rem 1.5rem;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .panel-grid {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 1.9rem;
  }
}
</style>