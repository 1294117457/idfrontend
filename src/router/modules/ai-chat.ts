import AiChat from '@/views/ai-chat/index.vue'
import SettingIcon from '@/assets/icons/setting.vue'

export default {
  path: 'ai-chat',
  component: AiChat,
  meta: { title: 'AI助手', icon: SettingIcon, sort: 1, hidden: true }
}
