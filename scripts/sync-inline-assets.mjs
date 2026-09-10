// 构建前置：把 public 下需要"内联进 bundle"的资源同步到 src/assets/
// 为什么需要：绿色免安装版（file:// 双击 index.html）不能 fetch 外部文件（CORS 拦截 data 之外的本地读取），
// 因此 woff2.wasm / 映射表 JSON 需以 dataURL 形式内联进 JS；Vite 只对"被 import 的资源"做内联
// （assetsInlineLimit），而 public/ 目录的文件禁止被 JS import —— 故构建前复制一份到 src/assets。
// 运行时语义：HTTP 环境仍优先 fetch 最新的 public 文件（可随时替换 json 生效）；file:// 环境回退到内联快照。
import fs from 'node:fs'
import path from 'node:path'

const FILES = ['unicode-map.json', 'codepoint-plan.json', 'woff2.wasm']
const from = 'public'
const to = 'src/assets'

fs.mkdirSync(to, { recursive: true })
const copied = []
for (const f of FILES) {
  const src = path.join(from, f)
  if (!fs.existsSync(src)) {
    console.warn('[sync-inline-assets] 缺少 ' + src + '（跳过）')
    continue
  }
  fs.copyFileSync(src, path.join(to, f))
  copied.push(f)
}
console.log('[sync-inline-assets] 已同步内联资源:', copied.join(', '))
