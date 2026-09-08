// 参考字体映射占用动态统计
// 页面刷新/打开时调用 computeReferenceOccupancy(true)，强制重新读取 public/unicode-map.json，
// 基于最新映射内容重新分析各码位段占用情况（不依赖静态 json，保证刷新即最新）
const MAP_URL = './unicode-map.json'

// 分析 unicode-map.json 的原始数据（扁平或嵌套都兼容）：返回 { codeSet, total }
function parseOccupied(raw) {
  // 归一化原始 json（兼容扁平 { "hex": name } / { "name": "hex" } 与嵌套 { name: { unicode } } 两种格式）
  const set = new Set()
  if (!raw || typeof raw !== 'object') return { set }
  for (const [key, value] of Object.entries(raw)) {
    let hex = null
    if (value && typeof value === 'object' && typeof value.unicode === 'string') hex = value.unicode
    else if (typeof value === 'string') {
      if (/^[0-9a-fA-F]+$/.test(String(key))) hex = key       // { "f8f8": "name" }
      else hex = value                                        // { "name": "f8f8" }
    }
    if (hex != null) {
      const h = String(hex).toLowerCase().replace(/^u\+?/, '')
      if (/^[0-9a-fA-F]{2,6}$/.test(h)) set.add(parseInt(h, 16))
    }
  }
  return { set }
}

// 占用统计（各段）
export function analyzeOccupancy(codeSet) {
  const count = (s, e) => { let n = 0; for (let c = s; c <= e; c++) if (codeSet.has(c)) n++; return n }
  return {
    total: codeSet.size,
    bmp: { start: 'E000', end: 'F8FF', size: 0xF8FF - 0xE000 + 1, occupied: count(0xE000, 0xF8FF) },
    sections: [
      { range: 'E000–E8CC', start: 0xE000, end: 0xE8CC, size: 0xE8CC - 0xE000 + 1, occupied: count(0xE000, 0xE8CC) },
      { range: 'E8CD–EFFF', start: 0xE8CD, end: 0xEFFF, size: 0xEFFF - 0xE8CD + 1, occupied: count(0xE8CD, 0xEFFF) },
      { range: 'F000–F0FF', start: 0xF000, end: 0xF0FF, size: 0xF0FF - 0xF000 + 1, occupied: count(0xF000, 0xF0FF) },
      { range: 'F100–F8FF', start: 0xF100, end: 0xF8FF, size: 0xF8FF - 0xF100 + 1, occupied: count(0xF100, 0xF8FF) }
    ],
    reserved: { start: 0xEE00, end: 0xEFFF, size: 0xEFFF - 0xEE00 + 1, occupied: count(0xEE00, 0xEFFF) }
  }
}

let lastStats = null
// force=true 绕过浏览器缓存强制重读
export async function computeReferenceOccupancy(force = false) {
  if (lastStats && !force) return lastStats
  try {
    const res = await fetch(MAP_URL, { cache: 'no-cache' })
    if (!res.ok) return null
    const raw = await res.json()
    const { set } = parseOccupied(raw)
    lastStats = analyzeOccupancy(set)
    return lastStats
  } catch {
    return null
  }
}
