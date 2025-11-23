import Evaluation from '@/views/score/history.vue'
import ScoreIndex from '@/views/score/index.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'score',
  meta: { title: '成绩计算', icon: SettingIcon, sort: 2 },
  children: [
    { path: 'index', component: ScoreIndex, meta: { title: '加分申请', sort: 0 } },
    { path: 'evaluation', component: Evaluation, meta: { title: '申请记录', sort: 1 } },
  ],
}
