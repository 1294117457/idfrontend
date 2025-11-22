import ServiceProviderCreate from '@/views/service/create.vue'
import ServiceProviderManage from '@/views/service/manage.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'service',
  // component: ValidatePage,
  meta: { title: '服务商', icon: SettingIcon,sort:4 },
  children: [
    { path: 'create', component: ServiceProviderCreate, meta: { title: '审核管理' } },
    { path: 'manage', component: ServiceProviderManage, meta: { title: '变更管理' } },
  ],
}
