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

const getGradeText = (grade?: number) => {
  if (!grade) return '--'
  const gradeMap: Record<number, string> = { 1: '大一', 2: '大二', 3: '大三', 4: '大四', 5: '大五' }
  return gradeMap[grade] || `年级${grade}`
}

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
    // fallback to default
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
  return userStore.studentInfo?.fullName || userStore.userInfo?.fullName || userStore.userInfo?.username || '同学'
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
  const iconMap: Record<string, string> = {
    files: '📁',
    score: '📊',
    demand: '📝',
    contact: '💬',
  }

  return children
    .filter((routeItem: any) => !routeItem.redirect && !routeItem.meta?.hidden && routeItem.path !== 'index')
    .sort((a: any, b: any) => (a.meta?.sort ?? Infinity) - (b.meta?.sort ?? Infinity))
    .map((routeItem: any) => {
      const child = routeItem.children?.find((sub: any) => !sub.redirect && !sub.meta?.hidden)
      const path = child ? `/home/${routeItem.path}/${child.path}` : `/home/${routeItem.path}`
      const title = routeItem.meta?.title || routeItem.path
      const descriptionMap: Record<string, string> = {
        files: '快速检索已上传材料与状态，避免重复提交',
        score: '查看加分申请、历史记录与综合得分变化',
        demand: '完善条件填写，系统会自动关联材料信息',
        contact: '反馈问题并查看联系方式，及时获取支持',
      }

      return {
        path,
        title,
        icon: iconMap[routeItem.path] || '📋',
        description: descriptionMap[routeItem.path] || '进入模块继续完善你的保研材料',
      }
    })
})

const jumpTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <main class="dashboard">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-left anim-up">
        <p class="hero-greeting">{{ greeting }}</p>
        <h1 class="hero-title">{{ welcomeName }}，欢迎回来</h1>
        <p class="hero-desc">保研材料系统已为你准备好今天的任务入口，先完善关键信息，再提交申请会更高效。</p>
        <div class="hero-actions">
          <button class="btn-primary" @click="jumpTo('/home/score/index')">开始加分申请</button>
          <button class="btn-ghost" @click="jumpTo('/home/demand')">完善条件信息</button>
        </div>
      </div>

      <div class="hero-right anim-up delay-1">
        <h3 class="panel-title">当前概览</h3>
        <div class="stat-grid">
          <template v-if="scoreFieldConfigs.length > 0">
            <div v-for="f in scoreFieldConfigs" :key="f.id" class="stat-item">
              <span class="stat-label">{{ f.displayName }}</span>
              <strong class="stat-value">{{ getScoreByFieldKey(f.fieldKey) }}</strong>
            </div>
          </template>
          <template v-else>
            <div class="stat-item">
              <span class="stat-label">综合得分</span>
              <strong class="stat-value">{{ scoreText }}</strong>
            </div>
          </template>
          <div class="stat-item">
            <span class="stat-label">专业</span>
            <strong class="stat-value text-sm">{{ userStore.studentInfo?.major || '--' }}</strong>
          </div>
          <div class="stat-item">
            <span class="stat-label">年级</span>
            <strong class="stat-value">{{ getGradeText(userStore.studentInfo?.grade) }}</strong>
          </div>
          <div class="stat-item">
            <span class="stat-label">状态</span>
            <strong class="stat-value" :class="userStore.studentInfo?.isConfirmed ? 'text-emerald-400' : 'text-amber-400'">
              {{ userStore.studentInfo?.isConfirmed ? '已确认' : '待确认' }}
            </strong>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Cards -->
    <section class="features anim-up delay-2">
      <div class="section-header">
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
          <span class="feature-icon">{{ item.icon }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <span class="feature-enter">进入模块 &rarr;</span>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard {
  min-height: calc(100vh - 5rem);
  padding: 1.5rem clamp(1rem, 3vw, 2.5rem) 2.5rem;
  color: #1e293b;
  max-width: 1440px;
  margin: 0 auto;
}

/* Hero */
.hero {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 1.25rem;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 22px;
  padding: clamp(1.25rem, 2vw, 2rem);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.hero-greeting {
  font-size: 0.9rem;
  color: #2563eb;
  letter-spacing: 0.06em;
  margin-bottom: 0.5rem;
}

.hero-title {
  font-family: 'ZNtitle', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  line-height: 1.15;
  margin-bottom: 0.6rem;
  color: #0f172a;
}

.hero-desc {
  max-width: 600px;
  line-height: 1.8;
  color: #475569;
  margin-bottom: 1.25rem;
  font-size: 0.95rem;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.24);
}

.btn-ghost {
  padding: 0.65rem 1.5rem;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.btn-ghost:hover {
  background: #dbeafe;
}

/* Panel */
.hero-right {
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 1rem 1.2rem;
}

.panel-title {
  font-size: 0.95rem;
  color: #e2e8f0;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.stat-item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.7rem;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.2rem;
}

.stat-value {
  font-size: 1rem;
  color: #f8fafc;
}

/* Features */
.features {
  margin-top: 1.5rem;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.section-header h2 {
  font-family: 'ZNtitle', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  letter-spacing: 0.02em;
  color: #0f172a;
}

.section-header span {
  color: #64748b;
  font-size: 0.85rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.85rem;
}

.feature-card {
  text-align: left;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.94);
  color: #1e293b;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: #bfdbfe;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.12);
}

.feature-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.feature-card h3 {
  font-size: 1rem;
  margin-bottom: 0.4rem;
  font-weight: 600;
}

.feature-card p {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #64748b;
  min-height: 3em;
}

.feature-enter {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #2563eb;
  font-weight: 500;
}

/* Animations */
.anim-up {
  opacity: 0;
  transform: translateY(16px);
  animation: fadeUp 0.6s ease forwards;
}

.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.22s; }

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1080px) {
  .hero { grid-template-columns: 1fr; }
  .feature-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 640px) {
  .dashboard { padding: 1rem 0.85rem 1.5rem; }
  .feature-grid { grid-template-columns: 1fr; }
  .stat-grid { grid-template-columns: 1fr; }
  .hero-title { font-size: 1.7rem; }
  .hero { border-radius: 18px; }
  .hero-actions { display: grid; grid-template-columns: 1fr; }
  .btn-primary,
  .btn-ghost { width: 100%; }
  .section-header { align-items: flex-start; flex-direction: column; gap: 0.25rem; }
  .feature-card p { min-height: auto; }
}
</style>
