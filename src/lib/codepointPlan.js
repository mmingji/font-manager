// 码位规划与告警（与 public/codepoint-plan.json 描述一致，此处为程序唯一事实源）
// 保留区：U+EE00–U+EFFF（512 个），本项目新增图标按顺序取用
// 参考字体映射（unicode-map.json）已占用的码位段：E000–E8CC / F000+，不与保留区重叠
export const RESERVED_START = 0xee00
export const RESERVED_END = 0xefff
export const RESERVED_COUNT = RESERVED_END - RESERVED_START + 1 // 512

// 基础字形区间：buildFont 内置的可见 ASCII 94 字符（0x21-0x7E）+ 空格(0x20)
// 这些码位已被内置拉丁字形占用。导入图标若保持原 unicode 落在此区间，
// 生成字体时会因「重复 unicode」报错（fonteditor 抛 Repeat unicode），必须提醒
export const BASE_ASCII_START = 0x20
export const BASE_ASCII_END = 0x7e

// 从 store 图标列表计算保留区已用/剩余
export function reservedUsage(icons) {
  let used = 0
  const usedCodes = new Set(icons.map((i) => i.code))
  for (let c = RESERVED_START; c <= RESERVED_END; c++) if (usedCodes.has(c)) used++
  return { used, total: RESERVED_COUNT, free: RESERVED_COUNT - used }
}

// 是否落在内置基础字形区间（ASCII 0x20-0x7E）——保持原码位时与该区冲突会导致字体构建报错
export function isBaseAscii(code) {
  return typeof code === 'number' && code >= BASE_ASCII_START && code <= BASE_ASCII_END
}

// 供「导入时保持原 unicode」校验：原码位是否落在保留区（会与自动分配图标争抢区域）
export function isInReserved(code) {
  return typeof code === 'number' && code >= RESERVED_START && code <= RESERVED_END
}
