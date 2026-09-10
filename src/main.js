import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { initCodepointPlan } from './lib/codepointPlan.js'

// 先读取码位规划配置（保留区范围可被 public/codepoint-plan.data.js 覆盖），再挂载应用 ——
// 保证 Pinia store 初始化（nextCode 分配起点）已经用上配置值。
// 注意：构建为 IIFE（file:// 双击可用）不支持顶层 await，故用 finally 链式挂载
initCodepointPlan().finally(() => {
  const app = createApp(App)
  app.use(createPinia())
  app.mount('#app')
})
