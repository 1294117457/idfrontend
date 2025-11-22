import FilesManage from '@/views/files/index.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

export default {
  path: 'files',
  component: FilesManage,
  meta: { title: '文件查询', icon: SettingIcon, sort: 1 }
}
