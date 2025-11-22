import ActivityCreate from '@/views/activity/create.vue'
import AactivitySearch from '@/views/activity/search.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件
import component from 'element-plus/es/components/tree-select/src/tree-select-option.mjs'

export default {
  path: 'activity',
  component: ActivityCreate,
  meta: { title: '活动管理', icon: SettingIcon, sort: 5 },
}
