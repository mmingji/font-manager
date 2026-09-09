import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

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
  build: {
    chunkSizeWarningLimit: 1600
  }
})
