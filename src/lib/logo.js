// 应用 Logo 文字生成：用内置 regular 基础字形（latin-regular.woff2 提取的 94 个 ASCII 字形）
// 拼出"SnFont"字样的 SVG path（数据来源见 baseGlyphs.js 注释：Cera Round Pro Regular，unitsPerEm=1000）
// 为什么用字形 path 而不是 <text>：不依赖外部字体文件/系统字体渲染，任何环境（离线/脱字体）显示一致
import { getBaseGlyphData } from './baseGlyphs.js'

// 浅灰色 Logo（与界面装饰色一致：滚动条浅灰 #c9cfdb）
export const WORDMARK_COLOR = '#c9cfdb'

// 用内置字形按 advance 步进横向拼出文本 SVG
// 方向修正：字形 d 是字体内部坐标（y 向上、baseline=0、顶部≈672），SVG 默认 y 向下，
// 直接渲染会上下颠倒——外层整体做 y 翻转（translate(0,800) scale(1,-1)）后即正常文字排版
export function buildWordmarkSvg(text = 'SnFont', weight = 'regular') {
  const { paths, adv } = getBaseGlyphData(weight)
  let x = 0
  const parts = []
  for (const ch of String(text)) {
    const d = paths[ch]
    if (d) {
      parts.push(`<g transform="translate(${x.toFixed(1)} 0)"><path d="${d}"/></g>`)
    } else {
      x += 380 // 缺失字符按空格宽度占位（正常不会发生：内置字形覆盖全部 ASCII）
      continue
    }
    x += adv[ch] || 500
  }
  const W = Math.ceil(x)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 800" fill="${WORDMARK_COLOR}"><g transform="translate(0 800) scale(1 -1)">${parts.join('')}</g></svg>`
}
