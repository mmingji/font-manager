// GSUB 连字表生成器（lookup type 4 - Ligature Substitution）
// 将图标名字符序列 → 图标码位 的连字规则写入 GSUB 表
// OpenType 规范：https://learn.microsoft.com/typography/opentype/spec/gsub
//
// 实现要点（都是踩过的坑，改动前请先读）：
// 1) **LigatureSet 内的 Ligature 必须按「组件数降序」排列**（规范硬要求）。
//    渲染器取「第一个能匹配的」连字：若短名排在前面，输入长名时会被短名抢先替换，
//    表现为「apple-pay 显示成 [苹果图标]-pay」这类"只替换了一半"的现象（2026-09 实测）。
// 2) **GSUB 表内所有偏移均为 u16（相对各自表/子表起点），单表数据超过 ~64KB 就会截断**：
//    超过后部分连字静默失效（表现为"某些图标名不触发连字"，如 3810 个图标时 x-ray/zzz 无效）。
//    解法：把连字数据按字节预算分片，每片一个 lookup；片子多于 1 时改用 **Lookup Type 7
//    (Extension Substitution)** —— 它的 extensionOffset 是 **u32**，可指向表尾任意位置，
//    从而突破 u16 上限（单片的场景仍用 type 4 直连，兼容性最好）。

function u16(v) { return [v >> 8 & 0xff, v & 0xff] }
function u32(v) { return [v >>> 24 & 0xff, v >>> 16 & 0xff, v >>> 8 & 0xff, v & 0xff] }
function tag(s) { return s.split('').map((c) => c.charCodeAt(0)) }

// 单块数据的字节预算：留足余量（子表内偏移是 u16，上限 65535）
const CHUNK_BUDGET = 50000

/**
 * 构建 GSUB 表（Ligature Substitution）
 * @param {Array<{name: string, glyphId: number}>} ligatures 连字规则
 * @param {Object<string, number>} glyphIdMap 单字符→glyphId
 * @returns {ArrayBuffer|null}
 */
export function buildGsubTable(ligatures, glyphIdMap) {
  // 1. 过滤有效连字（名字至少 2 个字符，且每个字符都有对应字形）
  const validLigs = []
  for (const lig of ligatures) {
    const chars = lig.name.split('')
    const compIds = []
    let ok = chars.length >= 2
    for (const ch of chars) {
      const gid = glyphIdMap[ch]
      if (gid == null) { ok = false; break }
      compIds.push(gid)
    }
    if (ok) validLigs.push({ compIds, ligGlyph: lig.glyphId })
  }
  if (!validLigs.length) return null

  // 2. 【关键】全局按组件数降序（同长按首组件排序保证确定性）。
  //    渲染器对同一位置取"第一个能匹配的连字"，且跨子表/分片时按顺序尝试 ——
  //    短名排在前面会把长名"吃掉一半"（apple 抢在 apple-pay 之前，实测现象）。
  const sortedLigs = [...validLigs].sort((a, b) => b.compIds.length - a.compIds.length || a.compIds[0] - b.compIds[0])

  // 3. 分片：**按首组件（first glyph）分组后打包**，每组（一个 LigatureSet）不拆分。
  //    为什么按"首组件组"而不是按"连字条目"切片：
  //    同一 lookup 的多个子表若覆盖同一个首组件，引擎的匹配行为不可靠（实测 fontkit 会跨子表串味，
  //    输入 xxx-0001 却替换成 xxx-1112）。按首组件打包可保证各子表 coverage 互不重叠 —— 这才是引擎友好形态。
  //    编组顺序沿用全局"组件数降序"，因此长的连字仍排在靠前的子表。
  const groups = new Map() // firstGlyph → [ligs]
  for (const lig of sortedLigs) {
    const g = lig.compIds[0]
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(lig)
  }
  const groupList = [...groups.entries()].sort((a, b) => a[0] - b[0]) // 首组件升序，便于阅读与排查
  const groupBytes = (ligs) => 2 + ligs.length * 2 + ligs.reduce((a, l) => a + 4 + (l.compIds.length - 1) * 2, 0) + 6

  const chunks = []
  let curChunk = { groups: [], bytes: 0 }
  for (const [g, ligs] of groupList) {
    const bytes = groupBytes(ligs)
    // 单组就超过预算（极端：同一首字符下名字极多，如 test-icon-number-*）：
    // 该组独占一片。此时该片内部偏移仍可能接近上限，属于已知边界（真实字体名字首字符分布广，不会发生）
    if (curChunk.groups.length && curChunk.bytes + bytes > CHUNK_BUDGET) {
      chunks.push(curChunk)
      curChunk = { groups: [], bytes: 0 }
    }
    curChunk.groups.push([g, ligs])
    curChunk.bytes += bytes
  }
  if (curChunk.groups.length) chunks.push(curChunk)

  // 4. 片内整理成 coverage（首组件升序）+ ligature sets
  for (const ch of chunks) {
    ch.glyphs = ch.groups.map(([g]) => g).sort((a, b) => a - b)
    const idx = new Map(ch.glyphs.map((g, i) => [g, i]))
    ch.sets = ch.glyphs.map(() => [])
    for (const [g, ligs] of ch.groups) ch.sets[idx.get(g)] = ligs
  }

  // 4. 构建单个 Ligature 数据块（相对各自 set 起始）
  // Ligature: ligGlyph(2) compCount(2) components(compCount-1)*2
  function buildLigature(lig) {
    const b = []
    b.push(...u16(lig.ligGlyph))
    b.push(...u16(lig.compIds.length))
    for (let i = 1; i < lig.compIds.length; i++) b.push(...u16(lig.compIds[i]))
    return b
  }

  // 5. 构建 LigatureSet（相对 set 起始）
  function buildLigatureSet(ligs) {
    const b = []
    b.push(...u16(ligs.length))
    const offsetPos = b.length
    for (let i = 0; i < ligs.length; i++) b.push(0, 0)
    let cursor = 2 + ligs.length * 2
    const ligBytes = ligs.map(buildLigature)
    for (let i = 0; i < ligs.length; i++) {
      const off = cursor
      b[offsetPos + i * 2] = off >> 8 & 0xff
      b[offsetPos + i * 2 + 1] = off & 0xff
      b.push(...ligBytes[i])
      cursor += ligBytes[i].length
    }
    return b
  }

  // 6. Coverage（Format 1）
  function buildCoverage(glyphs) {
    const b = []
    b.push(...u16(1))
    b.push(...u16(glyphs.length))
    for (const g of glyphs) b.push(...u16(g))
    return b
  }

  // 7. LigatureSubst Format1 子表（type 4 的实际数据）
  function buildLigSubst(subtables, coverage) {
    const b = []
    b.push(...u16(1)) // substFormat
    const coverageOffset = 6 + subtables.length * 2
    b.push(...u16(coverageOffset)) // coverageOffset（相对子表起始）
    b.push(...u16(subtables.length)) // ligSetCount
    let cursor = coverageOffset + coverage.length
    const offs = []
    for (const st of subtables) { offs.push(cursor); cursor += st.length }
    for (const off of offs) b.push(...u16(off))
    for (const byte of coverage) b.push(byte)
    for (const st of subtables) for (const byte of st) b.push(byte)
    return b
  }

  // 9. 组装：header + ScriptList + FeatureList + LookupList，随后是各片数据（表尾）
  //
  // 分片结构的选择（关键，踩过坑）：
  // · 不能"每片一个 lookup" —— 多片都覆盖同一首字符时，引擎（实测 fontkit）会把它们的
  //   LigatureSet 混在一起，匹配到别的片的连字（现象：输入 xxx-0001 却替换成 xxx-1112）。
  // · 正确做法：**1 个 lookup + N 个 Extension 子表**。规范里同一 lookup 的多个子表是"依次尝试"，
  //   而每个 ExtensionSubst 的 extensionOffset 是 u32 → 数据可放表尾任意位置，突破 u16 的 64KB 上限。
  //   同时"长连字排在靠前的子表"由前面的全局降序切分保证。
  const useExtension = chunks.length > 1

  const scriptList = []
  scriptList.push(...u16(1))
  scriptList.push(...tag('DFLT'))
  scriptList.push(...u16(8))
  scriptList.push(...u16(4))
  scriptList.push(...u16(0))
  scriptList.push(...u16(0))
  scriptList.push(...u16(0xffff))
  scriptList.push(...u16(1))
  scriptList.push(...u16(0))

  const featureList = []
  featureList.push(...u16(1))
  featureList.push(...tag('liga'))
  featureList.push(...u16(8)) // featureTable offset（相对 featureList 起点：featureCount(2) + record(4+2)）
  featureList.push(...u16(0)) // featureParams
  featureList.push(...u16(1)) // lookupIndexCount：始终只有 1 个 lookup
  featureList.push(...u16(0))

  // lookupTable：
  //   type 4 直连（单片）：header(8) + LigSubst 数据（紧跟其后，subTableOffset=8）
  //   type 7 分片（多片）：header(8) + subTableOffsets[N](2N) + N × ExtensionSubst(8)
  const N = chunks.length
  // lookupTable 头 = lookupType(2) + lookupFlag(2) + subTableCount(2) = 6 字节，subTableOffsets 紧跟其后
  const subOffsetsStart = 6
  const extBase = subOffsetsStart + N * 2 // subTableOffsets 之后即 ExtensionSubst 区
  const lookupTableLen = useExtension ? extBase + N * 8 : subOffsetsStart + N * 2
  const lookupList = []
  lookupList.push(...u16(1)) // lookupCount
  lookupList.push(...u16(4)) // lookupTable offset（相对 lookupList：lookupCount(2)+offset(2)）
  lookupList.push(...u16(useExtension ? 7 : 4)) // lookupType
  lookupList.push(...u16(0)) // lookupFlag
  lookupList.push(...u16(N)) // subTableCount
  for (let i = 0; i < N; i++) lookupList.push(...u16(useExtension ? extBase + i * 8 : subOffsetsStart + N * 2))
  if (useExtension) {
    for (let i = 0; i < N; i++) {
      lookupList.push(...u16(1)) // substFormat
      lookupList.push(...u16(4)) // extensionLookupType = Ligature
      lookupList.push(...u32(0)) // extensionOffset（稍后回填，相对本 ExtensionSubst 起点）
    }
  }

  const headerLen = 10
  const scriptListOff = headerLen
  const featureListOff = headerLen + scriptList.length
  const lookupListOff = featureListOff + featureList.length
  const dataStart = lookupListOff + lookupList.length

  // 10. 逐片构建数据并回填偏移
  const dataBytes = []
  let dataCursor = dataStart
  for (let ci = 0; ci < N; ci++) {
    const ch = chunks[ci]
    const cov = buildCoverage(ch.glyphs)
    const subs = ch.sets.map((set) => buildLigatureSet(set))
    const ligData = buildLigSubst(subs, cov)
    if (useExtension) {
      // lookupList 数组布局：lookupCount(2) + lookupOffset(2) + lookupTable（从索引 4 开始）
      // lookupTable 内：type(2)+flag(2)+count(2)+subTableOffsets(2N)+N×ExtensionSubst(8)
      const lookupTableStartIdx = 4
      const extAbs = lookupListOff + lookupTableStartIdx + extBase + ci * 8 // ExtensionSubst 绝对位置
      const off = dataCursor - extAbs
      const writeAt = lookupTableStartIdx + extBase + ci * 8 + 4 // u32 位于 ExtensionSubst 内偏移 4 处
      lookupList[writeAt] = off >>> 24 & 0xff
      lookupList[writeAt + 1] = off >>> 16 & 0xff
      lookupList[writeAt + 2] = off >>> 8 & 0xff
      lookupList[writeAt + 3] = off & 0xff
    } else {
      // 单片：type 4 直连，subTableOffset=8 → LigSubst 数据必须紧跟 lookupTable
      // 此时 dataStart 正好紧接 lookupList 尾部（lookupTable 是其中最后一段）
      const lutStartAbs = lookupListOff + 2 + 2 // lookupList 内 lookupTable 的绝对位置
      // 校验：lookupTable 必须紧贴数据区起点，否则偏移需要修正
      const expectedData = lutStartAbs + 8
      if (dataCursor !== expectedData) {
        // 兜底：按实际距离回填 subTableOffset（u16）
        const off = dataCursor - lutStartAbs
        lookupList[6] = off >> 8 & 0xff
        lookupList[7] = off & 0xff
      }
    }
    for (const byte of ligData) dataBytes.push(byte)
    dataCursor += ligData.length
  }

  const bytes = []
  bytes.push(...u32(0x00010000))
  bytes.push(...u16(scriptListOff))
  bytes.push(...u16(featureListOff))
  bytes.push(...u16(lookupListOff))
  bytes.push(...scriptList)
  bytes.push(...featureList)
  bytes.push(...lookupList)
  bytes.push(...dataBytes)

  const buf = new ArrayBuffer(bytes.length)
  new Uint8Array(buf).set(bytes)
  return buf
}

// 将 GSUB 表注入 ttf：完整重建 sfnt 文件（所有表字节 + GSUB 追加）
export function injectGsub(ttfBuffer, gsubBuffer) {
  // 统一为纯 ArrayBuffer（兼容 Node Buffer / 带 byteOffset 的视图）
  const raw = ttfBuffer instanceof ArrayBuffer
    ? ttfBuffer
    : ttfBuffer.buffer.slice(ttfBuffer.byteOffset, ttfBuffer.byteOffset + ttfBuffer.byteLength)
  const dv = new DataView(raw)
  const numTables = dv.getUint16(4)
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    tables.push({
      tag: String.fromCharCode(dv.getUint8(rec), dv.getUint8(rec + 1), dv.getUint8(rec + 2), dv.getUint8(rec + 3)),
      offset: dv.getUint32(rec + 8),
      length: dv.getUint32(rec + 12)
    })
  }
  // 去掉已存在的 GSUB（若有），后面重新加
  const cleanTables = tables.filter((t) => t.tag !== 'GSUB')
  const finalTables = [...cleanTables.map((t) => ({ ...t, origOffset: t.offset })), { tag: 'GSUB', length: gsubBuffer.byteLength }]

  // 计算新布局：目录(12 + n*16) + 各表数据(4字节对齐)
  let cursor = 12 + finalTables.length * 16
  const layout = finalTables.map((t) => {
    const offset = cursor
    cursor += align4(t.length)
    return { ...t, offset }
  })

  // 拷贝表数据
  const out = new Uint8Array(cursor)
  const src = new Uint8Array(raw)
  for (const t of layout) {
    if (t.tag === 'GSUB') {
      out.set(new Uint8Array(gsubBuffer), t.offset)
    } else {
      out.set(src.subarray(t.origOffset, t.origOffset + t.length), t.offset)
    }
  }

  // 写目录
  const outDv = new DataView(out.buffer)
  outDv.setUint32(0, dv.getUint32(0)) // version
  outDv.setUint16(4, finalTables.length)
  // searchRange / entrySelector / rangeShift
  const pow = Math.floor(Math.log2(finalTables.length))
  outDv.setUint16(6, 16 * Math.pow(2, pow))
  outDv.setUint16(8, pow)
  outDv.setUint16(10, finalTables.length * 16 - 16 * Math.pow(2, pow))

  // 表目录（按 tag 排序是规范要求，但多数渲染器不强制；保持原序 + GSUB 在后）
  for (let i = 0; i < finalTables.length; i++) {
    const rec = 12 + i * 16
    const t = finalTables[i]
    outDv.setUint32(rec, tag32(t.tag))
    outDv.setUint32(rec + 4, 0) // checksum 置 0（渲染器一般容忍）
    outDv.setUint32(rec + 8, layout[i].offset)
    outDv.setUint32(rec + 12, t.length)
  }

  // 修正 head 表的 checkSumAdjustment（可选，置 0 通常可用）
  return out.buffer
}

function tag32(s) {
  return (s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3)
}

function align4(n) {
  return (n + 3) & ~3
}
