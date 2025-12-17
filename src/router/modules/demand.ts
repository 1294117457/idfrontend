import AccountCreate from '@/views/demand/index.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'demand',
  component: AccountCreate,
  meta: { title: '条件填写', icon: SettingIcon, sort: 3, desc: '填写分数外的信息' ,coverImg:'@/assets/images/demand_cover.png' }

}
