// 构建前置：准备"绿色免安装版（file:// 双击）"所需的两类资源
// ① 内联进 bundle 的资源 → 复制到 src/assets/（Vite 只内联被 import 的资源，public 禁止 import）
//    woff2.wasm（woff2 编解码 wasm）/ unicode-map.json / codepoint-plan.json（构建时快照，作最终兜底）
// ② 运行时可编辑的数据文件 → 生成 public/*.data.js（经典 <script> 加载，file:// 下不受 CORS 限制）
//    用户在绿色版目录里直接编辑 unicode-map.data.js 并刷新页面即可生效（等价于 HTTP 版的改 json 生效）
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

// 生成可编辑的数据脚本：内容就是对应 json（外面包一层全局变量赋值，便于本地文件直接加载）
const DATASETS = [
  ['unicode-map.json', 'unicode-map.data.js', '__SNFONT_UNICODE_MAP__', 'unicode → 图标名称映射表'],
  ['codepoint-plan.json', 'codepoint-plan.data.js', '__SNFONT_CODEPOINT_PLAN__', '码位规划基线（保留区/参考占用段）']
]
const generated = []
for (const [jsonFile, jsFile, globalName, title] of DATASETS) {
  const src = path.join(from, jsonFile)
  if (!fs.existsSync(src)) continue
  const json = fs.readFileSync(src, 'utf8').trim()
  const out = [
    '// ' + title + '（绿色版可编辑数据文件）',
    '// 内容与 public/' + jsonFile + ' 相同；直接编辑本文件保存后，刷新页面即生效。',
    '// file:// 下浏览器禁止 fetch 本地文件，故用经典 script 提供数据（HTTP 部署时仍优先读取 ' + jsonFile + '）。',
    'window.' + globalName + ' = ' + json,
    ''
  ].join('\n')
  fs.writeFileSync(path.join(from, jsFile), out)
  generated.push(jsFile)
}

console.log('[sync-inline-assets] 内联资源:', copied.join(', '))
console.log('[sync-inline-assets] 可编辑数据文件:', generated.join(', '))
