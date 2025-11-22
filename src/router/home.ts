import HomePage from '@/views/home/component/show.vue'
import HomeIndex from '@/views/home/index.vue'
import SettingIcon from '@/assets/icons/setting.vue' // 导入 setting.vue 组件

// 自动导入 modules 文件夹下的所有路由模块
const modules = import.meta.glob('./modules/*.ts', { eager: true }) // 自动加载所有模块

// 提取路由对象
const childrenRoutes = Object.values(modules).map((module: any) => module.default)

export default {
  path: '/home',
  component: HomePage,
  children: [
    { path: 'index', component: HomeIndex, meta: { title: '首页', icon: SettingIcon, sort: 0 } }, // 首页路由
    ...childrenRoutes, // 自动加载的子路由
    { path: '', redirect: 'home/index' }, // 修正重定向为字符串路径
  ],
}