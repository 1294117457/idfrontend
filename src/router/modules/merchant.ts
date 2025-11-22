import AccountCreate from '@/views/merchant/create.vue'
import AccountManage from '@/views/merchant/manage.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'merchant',
  meta: { title: '商户管理', icon: SettingIcon, sort: 3, desc: '管理平台商户处理、商户申请' },
  children: [
    { path: 'create', component: AccountCreate, meta: { title: '创建审核', sort: 0 } },
    { path: 'manage', component: AccountManage, meta: { title: '商户管理', sort: 1 } },
  ],
}
