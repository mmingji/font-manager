import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    // PWA：manifest + Service Worker（workbox 预缓存构建产物），离线可打开、可安装到桌面/手机
    // 构建时自动生成 sw.js/manifest.webmanifest；预缓存清单自动纳入后加的静态资源（重新 build 即可）
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SnFont 图标管理',
        short_name: 'SnFont',
        description: '纯前端字体图标管理：导入 SVG / 图片转 SVG / 解析字体，一键生成 snfont 字体',
        lang: 'zh-CN',
        theme_color: '#3b82f6',
        background_color: '#f5f6fa',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // 预缓存全部构建与静态产物（含 wasm/woff2 等离线能力依赖）
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json,wasm,woff2,woff,ttf}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  base: './',
  resolve: {
    alias: {
      // fontkit 统一使用 node 版构建（dist/module.mjs）：
      // 浏览器官方构建（browser-module.mjs）在浏览器运行时对 CFF 紧凑曲线编码存在不稳定的
      // 解析 bug（F6AA 细线圆环被时好时坏解析成粗环，实测 112/96/64 波动，2026-09 排查确认）；
      // node 版稳定可靠（fontkit 2.0.4，node 端多轮验证一致）。
      // 依赖替代：node 版的 brotli 引用指到 stub（项目 woff2 解码走 fonteditor wasm，不触发）
      'fontkit': fileURLToPath(new URL('./node_modules/fontkit/dist/module.mjs', import.meta.url)),
      'brotli/decompress.js': fileURLToPath(new URL('./src/lib/brotli-stub.js', import.meta.url))
    }
  },
  build: {
    chunkSizeWarningLimit: 1600
  }
})
