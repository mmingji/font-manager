// 字体文件解析：将 ttf/otf/woff/woff2 解析为统一尺寸的 SVG 文件
// 引擎选型（重要）：opentype.js 解析 CFF/OTF 字体的紧凑曲线编码（vv/hv/vh/hvcurveto）
// 存在控制点错位 bug——实测 Font Awesome 7 Pro 的细线圆环（内外圆半径比 72/56）
// 被解析成粗环（500/333），"只有单圆圈/单线条图标粗细大小不对"即此因（2026-09 排查实锤）。
// fontkit（2.x，浏览器官方构建）对 CFF/TrueType 均正确，改为 fontkit 取轮廓。
// 流程：woff2 → fonteditor wasm decode 成 ttf（无损，已验证）→ fontkit 解析
import { create as fontkitCreate } from './fontkit-bundle.mjs'
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

// 将 buffer 规范化为 fontkit 可解析的 ttf/otf buffer（woff2 先经 wasm 无损解码）
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

// fontkit Path 命令 → 通用命令序列（y 翻转：字体内部坐标 y 向上 → SVG y 向下）
function fontkitPathToCommands(pathCmd) {
  const out = []
  for (const c of pathCmd.commands) {
    switch (c.command) {
      case 'moveTo': out.push({ type: 'M', x: c.args[0], y: -c.args[1] }); break
      case 'lineTo': out.push({ type: 'L', x: c.args[0], y: -c.args[1] }); break
      case 'bezierCurveTo': out.push({ type: 'C', x1: c.args[0], y1: -c.args[1], x2: c.args[2], y2: -c.args[3], x: c.args[4], y: -c.args[5] }); break
      case 'quadraticCurveTo': out.push({ type: 'Q', x1: c.args[0], y1: -c.args[1], x: c.args[2], y: -c.args[3] }); break
      case 'closePath': out.push({ type: 'Z' }); break
      default: break
    }
  }
  return out
}

// 将命令序列转换为 svg path 数据（归一化到 0~1000 的 viewBox 内）
function glyphToPathData(cmds) {
  if (!cmds.length) return ''

  // 第一遍：计算所有点的 bbox（命令坐标已 y 翻转，y 向下）
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
// size: SVG 边长（输出 viewBox 1000 系，width/height=size）
export async function parseFontFile(file, size = 512) {
  const raw = await file.arrayBuffer()
  const buffer = await toParseableBuffer(raw)
  // fontkit：ttf/otf 均支持；CFF 轮廓提取正确（opentype.js 的 bug 见文件头注释）
  const font = fontkitCreate(new Uint8Array(buffer))

  const result = []
  const seenNames = new Set()

  // fontkit 无按 glyph 索引遍历的公开 API，用 characterSet（码位列表）反查，
  // 按 glyph id 排序输出，保持与"字形序"一致的稳定顺序；无 unicode 的字形不导出
  //（woff2 制作时通常已剔除；与 opentype 的差异仅为极少数无码位字形）
  const byGlyph = new Map() // glyphId → 首个码位
  for (const cp of font.characterSet) {
    const g = font.glyphForCodePoint(cp)
    if (g && !byGlyph.has(g.id)) byGlyph.set(g.id, cp)
  }
  const ordered = [...byGlyph.entries()].sort((a, b) => a[0] - b[0])

  for (const [gid, cp] of ordered) {
    const glyph = font.glyphForCodePoint(cp)
    // 无轮廓字形（如空格、组合用空字形）不作为图标导出
    const cmds = fontkitPathToCommands(glyph.path)
    const d = glyphToPathData(cmds)
    if (!d) continue

    // 命名：优先 glyph 名（CFF CharStrings 名，如 wifi-weak）；无名字时用 uniXXXX 兜底
    let name = glyph.name
    if (!name || /^[gG]l?yph/i.test(name)) {
      name = cp > 0 ? 'uni' + cp.toString(16).toUpperCase().padStart(4, '0') : 'glyph-' + (gid + 1)
    }
    // 重名处理
    if (seenNames.has(name)) {
      let n = 2
      while (seenNames.has(`${name}_${n}`)) n++
      name = `${name}_${n}`
    }
    seenNames.add(name)

    // advanceWidth（fontkit 字体单位，仅随结果返回供参考）
    result.push({ name, svg: buildSvg(d, size), unicode: cp, advanceWidth: glyph.advanceWidth })
  }

  return result
}

// 根据 path 数据生成统一尺寸 SVG（viewBox 1000，width/height=size）
export function buildSvg(d, size = 512) {
  const s = Number(size) || 512
  const viewBox = `0 0 1000 1000`
  // fill-rule=evenodd：内外嵌套子路径按几何挖孔，不依赖路径方向。
  // CFF/字体轮廓的方向约定与 SVG nonzero 不完全一致（opentype 解析 CFF 时方向被破坏，
  // 曾导致空心环类图标被填充成实心大圆/粗环），evenodd 对该类字体图标是正确且健壮的选择
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${s}" height="${s}" data-name="${escapeXml('')}">` +
    `<path d="${escapeXml(d)}" fill="currentColor" fill-rule="evenodd"/></svg>`
}
