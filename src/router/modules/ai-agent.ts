import Profile from '@/views/ai-agent/index.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'ai-agent',
  component: Profile,
  meta: { title: 'AIagent', icon: SettingIcon, sort: 99,hidden:true }
}
