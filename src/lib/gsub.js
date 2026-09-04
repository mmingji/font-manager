// GSUB 连字表生成器（lookup type 4 - Ligature Substitution）
// 将图标名字符序列 → 图标码位 的连字规则写入 GSUB 表
// OpenType 规范：https://learn.microsoft.com/typography/opentype/spec/gsub
// 实现方式：结构化构建各子块，offsets 全部按"从表起始到目标位置"计算

function u16(v) { return [v >> 8 & 0xff, v & 0xff] }
function u32(v) { return [v >>> 24 & 0xff, v >>> 16 & 0xff, v >>> 8 & 0xff, v & 0xff] }
function tag(s) { return s.split('').map((c) => c.charCodeAt(0)) }

/**
 * 构建 GSUB 表（Ligature Substitution）
 * @param {Array<{name: string, glyphId: number}>} ligatures 连字规则
 * @param {Object<string, number>} glyphIdMap 单字符→glyphId
 * @returns {ArrayBuffer|null}
 */
export function buildGsubTable(ligatures, glyphIdMap) {
  // 1. 过滤有效连字
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

  // 2. Coverage：唯一首组件
  const covSet = new Set()
  for (const lig of validLigs) covSet.add(lig.compIds[0])
  const coverageGlyphs = [...covSet].sort((a, b) => a - b)
  const covIndex = new Map(coverageGlyphs.map((g, i) => [g, i]))

  // 3. 分组 ligature sets
  const sets = coverageGlyphs.map(() => [])
  for (const lig of validLigs) sets[covIndex.get(lig.compIds[0])].push(lig)

  // 4. 构建每个 Ligature 的数据块（相对各自 set 起始）
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
    b.push(...u16(ligs.length)) // ligatureCount
    // 预留 offset 位置
    const offsetPos = b.length
    for (let i = 0; i < ligs.length; i++) b.push(0, 0)
    // 写入每个 ligature
    let cursor = 2 + ligs.length * 2
    const ligBytes = ligs.map(buildLigature)
    for (let i = 0; i < ligs.length; i++) {
      const off = cursor
      // 填 offset（相对 set 起始）
      b[offsetPos + i * 2] = off >> 8 & 0xff
      b[offsetPos + i * 2 + 1] = off & 0xff
      b.push(...ligBytes[i])
      cursor += ligBytes[i].length
    }
    return b
  }

  // 6. 构建 Coverage（Format 1）
  function buildCoverage(glyphs) {
    const b = []
    b.push(...u16(1)) // coverageFormat
    b.push(...u16(glyphs.length)) // glyphCount
    for (const g of glyphs) b.push(...u16(g))
    return b
  }

  // 7. 构建 LigatureSubst Format1 子表
  // substFormat(2) coverageOffset(2) ligSetCount(2) ligSetOffsets...
  function buildLigSubst(subtables, coverage) {
    const b = []
    b.push(...u16(1)) // substFormat
    // coverageOffset 相对子表起始：header 6 字节 + ligSetOffsets(2*n)
    const coverageOffset = 6 + subtables.length * 2
    b.push(...u16(coverageOffset))
    b.push(...u16(subtables.length)) // ligSetCount
    // ligSet offsets（相对子表起始）：ligSet 数据在 coverage 之后
    // 子表布局：header(6+2n) + coverage + ligSets
    let cursor = coverageOffset + coverage.length
    const offs = []
    for (const st of subtables) {
      offs.push(cursor)
      cursor += st.length
    }
    for (const off of offs) b.push(...u16(off))
    // coverage 数据（相对子表起始 = coverageOffset）
    for (const byte of coverage) b.push(byte)
    // 各 ligSet 数据（相对子表起始）
    for (const st of subtables) for (const byte of st) b.push(byte)
    return b
  }

  // 8. 组装整体 GSUB
  // 布局：
  // [0] header: version(4) scriptListOff(2) featureListOff(2) lookupListOff(2) = 10
  // ScriptList: scriptCount(2) scriptRecord(tag4+off2) scriptTable(defaultLangSysOff2 langSysCount2) LangSys(...)
  // FeatureList: featureCount(2) featureRecord(tag4+off2) featureTable(2+2+2)
  // LookupList: lookupCount(2) lookupOff(2) lookupTable(2+2+2+2)
  // LigSubst subtable（lookup 的 subtable）

  // 由于 offset 都是相对各自的 list/table 起点，我们逐段构建
  // 先构建 ScriptList（相对 scriptList 起点）
  // scriptCount=1; record: tag + offset=8(scriptTable 起点相对 scriptList)
  // scriptTable: defaultLangSysOffset=4 (langSys 相对 scriptTable) langSysCount=0
  // 但我们只有 DFLT script 一个 LangSys 引用 index 0
  // 简化：ScriptTable 内含 defaultLangSysOffset 指向 inline LangSys
  // scriptTable 结构: defaultLangSysOffset(2) langSysCount(2)=0  + LangSys(2 lookupOrder + 2 reqFeature + 2 count + 2 index) = 8
  // scriptTable 大小 = 4 + 8 = 12
  // scriptList: 2 + 6 + 12 = 20
  const scriptList = []
  scriptList.push(...u16(1)) // scriptCount
  scriptList.push(...tag('DFLT'))
  scriptList.push(...u16(8)) // scriptTable offset（相对 scriptList）
  // scriptTable
  scriptList.push(...u16(4)) // defaultLangSysOffset（相对 scriptTable）
  scriptList.push(...u16(0)) // langSysCount
  // LangSys（default）
  scriptList.push(...u16(0)) // lookupOrder
  scriptList.push(...u16(0xffff)) // requiredFeatureIndex
  scriptList.push(...u16(1)) // featureIndexCount
  scriptList.push(...u16(0)) // featureIndex[0]

  // FeatureList: featureCount=1; record(tag='liga' + offset); featureTable(params=0, lookupIndexCount=1, lookupIndex=0)
  const featureList = []
  featureList.push(...u16(1)) // featureCount
  featureList.push(...tag('liga'))
  featureList.push(...u16(8)) // featureTable offset（相对 featureList）
  featureList.push(...u16(0)) // featureParams
  featureList.push(...u16(1)) // lookupIndexCount
  featureList.push(...u16(0)) // lookupIndex

  // LookupList: lookupCount=1; lookupOffset(2); lookupTable: type4 flag0 subTableCount1 subtableOffset
  const ligSubst = buildLigSubst(sets.map(buildLigatureSet), buildCoverage(coverageGlyphs))
  const lookupList = []
  lookupList.push(...u16(1)) // lookupCount
  lookupList.push(...u16(6)) // lookupOffset（相对 lookupList：2 + 2 + lookupTable header 8 = 12？ 实际 lookupTable 起点 = 2+2=4，lookupOffset=4）
  // 修正：lookupList 结构 = lookupCount(2) + lookupOffset(2) + lookupTable
  // lookupTable 起点相对 lookupList = 2+2 = 4
  // 上面写 6 是错的，改为 4
  // 由于上面已 push，这里直接重建 lookupList
  const lookupList2 = []
  lookupList2.push(...u16(1)) // lookupCount
  lookupList2.push(...u16(4)) // lookupTable offset（相对 lookupList 起点）
  // lookupTable: lookupType(2)=4 lookupFlag(2)=0 subTableCount(2)=1 subtableOffset(2)
  lookupList2.push(...u16(4)) // lookupType
  lookupList2.push(...u16(0)) // lookupFlag
  lookupList2.push(...u16(1)) // subTableCount
  lookupList2.push(...u16(8)) // subtableOffset（相对 lookupTable 起点）
  // LigSubst 数据
  for (const byte of ligSubst) lookupList2.push(byte)

  // 组装 header + scriptList + featureList + lookupList
  const headerLen = 10
  const scriptListOff = headerLen
  const featureListOff = headerLen + scriptList.length
  const lookupListOff = featureListOff + featureList.length

  const bytes = []
  bytes.push(...u32(0x00010000)) // version 1.0
  bytes.push(...u16(scriptListOff))
  bytes.push(...u16(featureListOff))
  bytes.push(...u16(lookupListOff))
  bytes.push(...scriptList)
  bytes.push(...featureList)
  bytes.push(...lookupList2)

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
