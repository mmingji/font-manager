// 打包绿色免安装版：dist/ → SnFont-便携版.zip（含使用说明）
// 用法：npm run pack（先 build 再打包）
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'

const DIST = 'dist'
const OUT = 'SnFont-便携版.zip'
const DESC = '使用说明.txt'

const readme = `SnFont 图标管理 · 绿色免安装版
=====================================

【怎么用】
解压本压缩包到任意目录（例如 D:\\SnFont），双击其中的 index.html 即可使用。
不需要安装、不需要启动任何服务、不联网。

【浏览器要求】
- Chrome / Edge 90 或更高版本（推荐使用最新版）
- Firefox：可打开使用，但浏览器对本地文件（file://）的数据存储限制较严，项目可能无法保存，不推荐
- Safari / 其他浏览器：未做兼容与测试，不推荐

【数据存在哪】
图标项目数据保存在浏览器本地（IndexedDB，与解压位置所在的 file:// 来源绑定）。
- 换电脑、换浏览器、清理浏览器数据之前，请用「导出 ▾ → 下载项目」保存 Project 备份；
- 在新环境用「导入 ▾ → 导入 SVG」选择该 project.json 即可完整恢复项目。
- 建议固定解压位置（移动文件夹后浏览器会视为新的来源，读取不到旧数据）。

【图标名称映射表（可自行编辑）】
本目录下的 unicode-map.data.js 就是名称映射表（内容为 JSON 格式）。
用记事本等编辑器修改其中的名称后保存，刷新页面即生效（解析字体自动命名、「设置 → 按映射批量改名」、
码位占用统计都会按新映射工作）。

【功能一览】
导入 SVG / 图片转 SVG（位图矢量化）/ 解析字体（ttf/otf/woff/woff2）→ 图标管理 → 一键导出
ttf/woff/woff2 + css + demo.html（支持 GSUB 连字：文字里输入图标名自动替换）。
`

const zip = new JSZip()
if (!fs.existsSync(DIST) || !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('未找到 ' + DIST + '/index.html，请先执行 npm run build')
  process.exit(1)
}
// 绿色版只需 index.html（JS/CSS/wasm/映射表已内联，favicon 已内联为 data URI）
// + 两个"可编辑数据文件"（用户改映射表后刷新即生效）
const KEEP = ['index.html', 'unicode-map.data.js', 'codepoint-plan.data.js']
const folder = zip.folder('SnFont')
for (const name of KEEP) {
  const p = path.join(DIST, name)
  if (fs.existsSync(p)) folder.file(name, fs.readFileSync(p))
}
zip.file('SnFont/' + DESC, readme)

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
fs.writeFileSync(OUT, buf)
console.log('已生成 ' + OUT + '（' + (buf.length / 1048576).toFixed(2) + ' MB）—— 解压后双击 SnFont/index.html 使用')
