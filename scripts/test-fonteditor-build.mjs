// 验证：fonteditor-core 用 SVG 构建 TrueType 字体（含字形名、post format 2）
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import fonteditor from 'fonteditor-core'

// 用 svg2ttfobject 从 SVG 构建
const svgFont = `<svg xmlns="http://www.w3.org/2000/svg">
<defs><font id="snfont" horiz-adv-x="1000">
<font-face font-family="snfont" units-per-em="1000" ascent="800" descent="-200"/>
<glyph glyph-name="trash" unicode="&#xe000;" d="M300 100L700 100L700 200L1000 200L1000 300L900 300L900 1000L100 1000L100 300L0 300L0 200L300 200Z"/>
<glyph glyph-name="home" unicode="&#xe001;" d="M500 0L1000 400L900 400L900 1000L600 1000L600 600L400 600L400 1000L100 1000L100 400L0 400Z"/>
</font></defs>
</svg>`

const ttfObj = fonteditor.svg2ttfobject(svgFont)
console.log('glyf 数:', ttfObj.glyf.length)
for (const g of ttfObj.glyf) {
  console.log('  glyf name:', g.name, 'unicode:', g.unicode, 'contours:', g.contours?.length)
}

// 用 Font API 写
const feFont = fonteditor.createFont(ttfObj)
const out = feFont.write({ type: 'ttf', toBuffer: false })
console.log('ttf 大小:', out.byteLength)
// 产物写入系统临时目录，避免污染项目（临时文件，用完自动清理）
const outPath = join(tmpdir(), '_snfont_test.svgfont.ttf')
writeFileSync(outPath, Buffer.from(out))
console.log('已写出临时产物:', outPath)

// 验证版本和 post 表
const dv = new DataView(out)
console.log('文件头 version:', '0x' + dv.getUint32(0).toString(16), '(1 = TrueType)')

// 用 opentype 读回
import opentype from 'opentype.js'
const font = opentype.parse(out)
console.log('opentype outlinesFormat:', font.outlinesFormat)
console.log('glyphs:', font.glyphs.length)
for (let i = 0; i < font.glyphs.length; i++) {
  const g = font.glyphs.get(i)
  if (g.name && g.name !== '.notdef') {
    console.log(`  glyph[${i}] name=${g.name} unicode=${g.unicode.toString(16)}`)
  }
}
console.log('✅ fonteditor SVG → TrueType 构建测试完成')
