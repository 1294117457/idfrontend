import Profile from '@/views/profile/index.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'profile',
  component: Profile,
  meta: { title: '用户信息', icon: SettingIcon, sort: 1,hidden:true }
}
