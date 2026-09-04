// 字体文件解析：将 ttf/otf/woff/woff2 解析为统一尺寸的 SVG 文件
import opentype from 'opentype.js'
import fonteditor from 'fonteditor-core'

const FONT_EXT = ['ttf', 'otf', 'woff', 'woff2']

export function isFontFile(file) {
  const name = (file.name || '').toLowerCase()
  return FONT_EXT.some((ext) => name.endsWith('.' + ext))
}

// 判断 buffer 是否为 woff2（魔数 wOF2）
function isWoff2Buffer(buffer) {
  if (buffer.byteLength < 4) return false
  const dv = new DataView(buffer)
  return dv.getUint32(0) === 0x774f4632 // 'wOF2'
}

let woff2Ready = null
function ensureWoff2() {
  if (!woff2Ready) {
    woff2Ready = fonteditor.woff2.init('./woff2.wasm')
  }
  return woff2Ready
}

// 将 buffer 规范化为 opentype 可解析的 ttf/otf buffer
async function toParseableBuffer(buffer) {
  if (isWoff2Buffer(buffer)) {
    await ensureWoff2()
    const ttf = fonteditor.woff2.decode(buffer)
    return ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength)
  }
  return buffer
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  })
}

// 将字形 path 命令序列转换为 svg path 数据（归一化到 0~1000 的 viewBox 内）
function glyphToPathData(glyph) {
  const cmds = glyph.getPath(0, 0, 1000).commands
  if (!cmds.length) return ''

  // 第一遍：计算所有点的 bbox（getPath 输出 y 已翻转，y 向下）
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const collect = (x, y) => {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  for (const c of cmds) {
    switch (c.type) {
      case 'M':
      case 'L':
        collect(c.x, c.y); break
      case 'C':
        collect(c.x1, c.y1); collect(c.x2, c.y2); collect(c.x, c.y); break
      case 'Q':
        collect(c.x1, c.y1); collect(c.x, c.y); break
    }
  }
  if (!isFinite(minX) || !isFinite(minY)) return ''

  const w = maxX - minX
  const h = maxY - minY
  if (w <= 0 || h <= 0) return ''

  // 等比缩放使最长边 = 1000，并居中
  const s = 1000 / Math.max(w, h)
  const ox = (1000 - w * s) / 2 - minX * s
  const oy = (1000 - h * s) / 2 - minY * s
  const tx = (x) => +(x * s + ox).toFixed(2)
  const ty = (y) => +(y * s + oy).toFixed(2)

  // 第二遍：生成归一化后的 path 数据
  let d = ''
  for (const c of cmds) {
    switch (c.type) {
      case 'M': d += `M${tx(c.x)} ${ty(c.y)}`; break
      case 'L': d += `L${tx(c.x)} ${ty(c.y)}`; break
      case 'C': d += `C${tx(c.x1)} ${ty(c.y1)} ${tx(c.x2)} ${ty(c.y2)} ${tx(c.x)} ${ty(c.y)}`; break
      case 'Q': d += `Q${tx(c.x1)} ${ty(c.y1)} ${tx(c.x)} ${ty(c.y)}`; break
      case 'Z': d += 'Z'; break
      default: break
    }
  }
  return d
}

// 解析字体文件为 { name, svg } 列表
// size: SVG 边长（输出 viewBox 与 width/height 一致）
export async function parseFontFile(file, size = 512) {
  const raw = await file.arrayBuffer()
  const buffer = await toParseableBuffer(raw)
  const font = opentype.parse(buffer)

  const result = []
  const seenNames = new Set()

  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i)
    // 跳过 .notdef 等系统字形
    if (glyph.name === '.notdef' || glyph.name === '.null' || glyph.name === 'nonmarkingreturn') continue
    // 无轮廓字形（如空格、组合用空字形）不作为图标导出
    const d = glyphToPathData(glyph)
    if (!d) continue

    // 无 glyph name 的字体（如 111.ttf 全字形无名字）：
    // 有 unicode 用 uniXXXX 命名，无 unicode 用 glyph-N 兜底，避免整个字体被静默丢弃
    let name = glyph.name
    if (!name) {
      if (glyph.unicode != null && glyph.unicode > 0) {
        name = 'uni' + glyph.unicode.toString(16).toUpperCase().padStart(4, '0')
      } else {
        name = 'glyph-' + (i + 1)
      }
    }
    // 重名处理
    if (seenNames.has(name)) {
      let n = 2
      while (seenNames.has(`${name}_${n}`)) n++
      name = `${name}_${n}`
    }
    seenNames.add(name)

    const svg = buildSvg(d, size)
    result.push({ name, svg, unicode: glyph.unicode, advanceWidth: glyph.advanceWidth })
  }

  return result
}

// 根据 path 数据生成统一尺寸 SVG（viewBox 与 width/height 均为 size）
export function buildSvg(d, size = 512) {
  const s = Number(size) || 512
  const viewBox = `0 0 1000 1000`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${s}" height="${s}" data-name="${escapeXml('')}">` +
    `<path d="${escapeXml(d)}" fill="currentColor"/></svg>`
}
