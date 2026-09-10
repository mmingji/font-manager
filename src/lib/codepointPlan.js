// 码位规划与告警
// 保留区：默认 U+EE00–U+EFFF（512 个），本项目新增图标按顺序取用；
// 参考字体映射（unicode-map.data.js）已占用的码位段：E000–E8CC / F000+，不与保留区重叠。
// 可配置：public/codepoint-plan.data.js 的 project_alloc.start/end 会覆盖下面默认值
//（绿色版读同目录 codepoint-plan.data.js；改文件后刷新页面即生效，见 initCodepointPlan）
import { loadDataScript } from './loadDataScript.js'
import planInline from '../assets/codepoint-plan.json?url'

// 默认保留区（与 public/codepoint-plan.data.js 的 project_alloc 一致）；运行时可能被配置覆盖
export const RESERVED = { start: 0xee00, end: 0xefff }

// 基础字形区间：buildFont 内置的可见 ASCII 94 字符（0x21-0x7E）+ 空格(0x20)
// 这些码位已被内置拉丁字形占用。导入图标若保持原 unicode 落在此区间，
// 生成字体时会因「重复 unicode」报错（fonteditor 抛 Repeat unicode），必须提醒
export const BASE_ASCII_START = 0x20
export const BASE_ASCII_END = 0x7e

// 从 store 图标列表计算保留区已用/剩余（按当前生效的保留区范围）
export function reservedUsage(icons) {
  let used = 0
  const usedCodes = new Set(icons.map((i) => i.code))
  for (let c = RESERVED.start; c <= RESERVED.end; c++) if (usedCodes.has(c)) used++
  const total = RESERVED.end - RESERVED.start + 1
  return { used, total, free: total - used }
}

// 是否落在内置基础字形区间（ASCII 0x20-0x7E）——保持原码位时与该区冲突会导致字体构建报错
export function isBaseAscii(code) {
  return typeof code === 'number' && code >= BASE_ASCII_START && code <= BASE_ASCII_END
}

// 供「导入时保持原 unicode」校验：原码位是否落在保留区（会与自动分配图标争抢区域）
export function isInReserved(code) {
  return typeof code === 'number' && code >= RESERVED.start && code <= RESERVED.end
}

// 解析 "U+EE00" / "EE00" / 0xEE00 形式的码位
function toCode(v) {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return null
  const hex = v.trim().replace(/^u\+?/i, '')
  if (!/^[0-9a-f]{2,6}$/i.test(hex)) return null
  return parseInt(hex, 16)
}

// 应用配置（project_alloc.start/end 覆盖保留区；非法值忽略并保留默认）
export function applyCodepointPlan(raw) {
  try {
    const alloc = raw && raw.project_alloc
    if (!alloc) return false
    const start = toCode(alloc.start)
    const end = toCode(alloc.end)
    if (start == null || end == null || end <= start) return false
    RESERVED.start = start
    RESERVED.end = end
    return true
  } catch {
    return false
  }
}

// 启动时读取码位规划配置（开发版与构建版一致：动态加载 ./codepoint-plan.data.js；
// 文件缺失时回退构建内联快照）。必须在应用挂载前 await，保证 store 初始化（nextCode 起点）用上配置值
export async function initCodepointPlan() {
  const fromScript = await loadDataScript('codepoint-plan.data.js', '__SNFONT_CODEPOINT_PLAN__')
  if (fromScript) return applyCodepointPlan(fromScript)
  try {
    const res2 = await fetch(planInline)
    return applyCodepointPlan(await res2.json())
  } catch {
    return false
  }
}
