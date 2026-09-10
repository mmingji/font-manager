// 构建前置：由"可编辑数据文件"生成"内联兜底快照"，并复制需要内联的二进制资源
// 数据文件统一为 public/*.data.js（唯一数据源，内容即 JSON；开发/构建/绿色版一致）：
//   unicode-map.data.js    图标名称映射表
//   codepoint-plan.data.js 码位规划配置
// 运行时（HTTP 与 file:// 一致）用经典 <script> 动态加载这两个文件（见 src/lib/loadDataScript.js），
// 加载失败（用户删了文件）时回退到本脚本生成的 src/assets/*.json 内联快照 —— 保证"仅有 index.html 也能用"。
import fs from 'node:fs'
import path from 'node:path'

const FILES = ['unicode-map.json', 'codepoint-plan.json', 'woff2.wasm']
const from = 'public'
const to = 'src/assets'

fs.mkdirSync(to, { recursive: true })

// 1) 由 data.js 提取 JSON → src/assets/*.json（内联兜底快照）
const DATASETS = [
  ['unicode-map.data.js', 'unicode-map.json', '__SNFONT_UNICODE_MAP__'],
  ['codepoint-plan.data.js', 'codepoint-plan.json', '__SNFONT_CODEPOINT_PLAN__']
]
const extracted = []
for (const [jsFile, jsonFile, globalName] of DATASETS) {
  const src = path.join(from, jsFile)
  if (!fs.existsSync(src)) {
    console.warn('[sync-inline-assets] 缺少 ' + src + '（跳过，将沿用上一次的快照）')
    continue
  }
  const text = fs.readFileSync(src, 'utf8')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) {
    console.warn('[sync-inline-assets] ' + jsFile + ' 内容异常（未找到 JSON 主体），跳过')
    continue
  }
  const json = text.slice(start, end + 1)
  try {
    JSON.parse(json) // 校验合法性：数据文件被改坏时构建即报错，避免把坏数据打进产物
  } catch (e) {
    console.error('[sync-inline-assets] ' + jsFile + ' 不是合法 JSON：' + e.message)
    process.exit(1)
  }
  fs.writeFileSync(path.join(to, jsonFile), json)
  extracted.push(jsonFile + ' ← ' + jsFile)
}

// 2) woff2.wasm：file:// 下无法 fetch 外部文件，复制到 src/assets 供构建内联为 dataURL
const copied = []
for (const f of ['woff2.wasm']) {
  const src = path.join(from, f)
  if (!fs.existsSync(src)) {
    console.warn('[sync-inline-assets] 缺少 ' + src + '（跳过）')
    continue
  }
  fs.copyFileSync(src, path.join(to, f))
  copied.push(f)
}

console.log('[sync-inline-assets] 内联快照:', extracted.join('; ') || '（无）')
console.log('[sync-inline-assets] 内联资源:', copied.join(', ') || '（无）')
