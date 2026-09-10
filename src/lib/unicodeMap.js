// unicode → 图标名称 映射表（#8）
// 数据来源：内置映射文件 public/unicode-map.json（直接编辑即可维护名称）
// loadBuiltinMap(true) 强制 no-cache 重读，供解析字体命名与管理页按映射批量改名使用
// 兼容两种格式：
// 1. 嵌套格式: { "icon-name": { "unicode": "f8f8", ... } }
// 2. 扁平格式: { "f8f8": "icon-name" } 或 { "icon-name": "f8f8" }

// 加载内置映射表（从 public 静态资源；force=true 时绕过内存缓存重新拉取）
// fetch 固定 cache:'no-cache'：确保打开/刷新页面时总是读取磁盘上的最新 unicode-map.json（不被浏览器 HTTP 缓存）
// 绿色免安装版（file://）无法 fetch 外部文件：回退到构建时内联的 json 快照（dataURL）
import mapJsonInline from '../assets/unicode-map.json?url'
const MAP_URL = './unicode-map.json'

// file://（绿色免安装版）下 fetch 本地文件必然被 CORS 拦截，直接走内联快照，避免无谓报错
const isFileProtocol = typeof location !== 'undefined' && location.protocol === 'file:'
async function fetchMapJson() {
  if (!isFileProtocol) {
    try {
      const res = await fetch(MAP_URL, { cache: 'no-cache' })
      if (res.ok) return await res.json()
    } catch { /* 静态资源缺失等：回退内联快照 */ }
  }
  const res2 = await fetch(mapJsonInline)
  return await res2.json()
}

let builtinCache = null
export async function loadBuiltinMap(force = false) {
  if (builtinCache && !force) return builtinCache
  try {
    const data = await fetchMapJson()
    // 归一化为 { hexCode: name }
    const map = {}
    for (const [name, unicode] of Object.entries(data)) {
      const hex = String(unicode).toLowerCase().replace(/^u\+?/, '')
      if (/^[0-9a-f]{2,6}$/.test(hex)) map[hex] = name
    }
    builtinCache = map
    return map
  } catch {
    return {}
  }
}

// 解析用户提供的映射数据，返回 { hexCode: name } 的小写 hex → 名称 映射
export function parseUnicodeMap(json) {
  try {
    const data = JSON.parse(json)
    const map = {}
    if (!data || typeof data !== 'object') return map

    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && typeof value.unicode === 'string') {
        // 嵌套格式: { "trash": { "unicode": "f1f8" } }
        const hex = value.unicode.toLowerCase().replace(/^u\+?/, '')
        if (/^[0-9a-f]{2,6}$/.test(hex)) map[hex] = key
      } else if (typeof value === 'string') {
        // { "f8f8": "name" } 或 { "name": "f8f8" }
        const v = value.toLowerCase().replace(/^u\+?/, '')
        if (/^[0-9a-f]{2,6}$/.test(key)) map[key.toLowerCase()] = value // key 是 hex
        else if (/^[0-9a-f]{2,6}$/.test(v)) map[v] = key // value 是 hex
      }
    }
    return map
  } catch {
    return {}
  }
}

// 用映射表给无名字的字形补名
// items: [{ name, unicode }]，unicode 为十进制数字或 null
// map: { hexCode: name }
// 返回补名后的 items（有名字的保留，无名字但命中映射的用映射名，仍无名的用 glyph-N）
// 占位名（glyph/uni/u 开头等自动生成的名字）也尝试用映射补名
export function applyUnicodeNameMap(items, map) {
  return items.map((item, i) => {
    const name = item.name || ''
    const isPlaceholder =
      !name ||
      name === 'glyph' ||
      name.startsWith('glyph') ||
      name.startsWith('uni') ||
      name.startsWith('u') ||
      /^gid\d+$/.test(name)
    // 有意义的名字（非占位）直接保留
    if (!isPlaceholder && item.unicode != null && !map[item.unicode.toString(16).toLowerCase()]) {
      return item
    }
    // 用映射补名（命中则替换，包括占位名）
    if (item.unicode != null) {
      const hex = item.unicode.toString(16).toLowerCase()
      const mapped = map[hex]
      if (mapped) return { ...item, name: mapped }
    }
    // 非占位名且未命中映射：保留原名字
    if (!isPlaceholder) return item
    // 兜底：glyph-N
    return { ...item, name: `glyph-${i + 1}` }
  })
}
