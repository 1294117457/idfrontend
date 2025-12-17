import BugContact from '@/views/contact/index.vue'
import CollegeContact from '@/views/contact/college.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'contact',
  meta: { title: '联系我们', icon: SettingIcon, sort: 6},
  children: [
    { path: 'index', component: BugContact, meta: { title: 'BUG提交', sort: 0 } },
    { path: 'college', component: CollegeContact, meta: { title: '学院信息', sort: 1 } },
  ],
}
