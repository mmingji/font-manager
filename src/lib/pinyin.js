// 汉字 → 拼音首字母（封装 pinyin-pro）
// 用途：图标名按拼音首字母分组/排序（管理页 + 预览 demo）。
// 说明：CSS 类名与 GSUB 连字输入仍只支持 ASCII（图标名字符集），中文名仅用于展示分组。
// pinyin-pro 自动处理多音字（如 长城 → c c），pattern:'first' 只取每字声母首字母。

import { pinyin } from 'pinyin-pro'

// 单字符 → 大写首字母；英文原样大写；数字/符号返回 null（调用方归入 '#'/'0-9'）
export function pinyinInitial(ch) {
  if (!ch) return null
  if (/[A-Za-z]/.test(ch)) return ch.toUpperCase()
  if (/[\u4e00-\u9fa5]/.test(ch)) {
    const r = pinyin(ch, { pattern: 'first', toneType: 'none', type: 'array' })
    const first = r && r[0] ? String(r[0]).trim().toUpperCase() : ''
    return first || null
  }
  return null
}

// 名称 → 分组 key：首字符拼音首字母；数字归 '0-9'；符号/无法识别归 '#'
export function groupKeyOf(name) {
  const first = String(name || '').trim()[0]
  if (!first) return '#'
  if (/[0-9]/.test(first)) return '0-9'
  return pinyinInitial(first) || '#'
}

// 名称完整拼音键（用于组内拼音排序）：英文原样、数字原样、中文转拼音(无声调)
// 例：'长城' → 'changcheng'，'Trash爱心' → 'Trash\u0000aixin'
// 罗马↔中文交界处插入 \u0000 分隔，防止拼音与相邻罗马字符粘连造成排序歧义
// （如 'Trash爱' 连写 'Trashaixin' 会与 'Trasha' + 'i' 混淆）；纯中文/纯罗马段不插分隔符
export function pinyinFullKey(name) {
  const s = String(name || '')
  let out = ''
  let cnRun = ''
  let prevIsCn = false // 上一个处理段是否为中文，用于判断是否需要在分段间插分隔符
  const flush = () => {
    if (cnRun) {
      const py = pinyin(cnRun, { toneType: 'none', type: 'array' })
      out += (Array.isArray(py) ? py.join('') : '')
      cnRun = ''
    }
  }
  for (const ch of s) {
    const isCn = /[\u4e00-\u9fa5]/.test(ch)
    if (isCn) {
      // 从罗马段进入中文段：中文段前是罗马字符时插分隔符防粘连
      if (!cnRun && prevIsCn === false && out.length > 0) out += '\u0000'
      cnRun += ch
      prevIsCn = true
    } else {
      // 从中文段进入罗马段：flush 后若中文段前有罗马内容则插分隔符
      if (cnRun) {
        const hadRoman = out.length > 0
        flush()
        if (hadRoman) out += '\u0000'
      }
      out += ch
      prevIsCn = false
    }
  }
  flush()
  return out
}
