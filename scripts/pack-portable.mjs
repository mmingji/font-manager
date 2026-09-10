// 打包绿色免安装版：dist/ → SnFont-便携版.zip（含使用说明）
// 用法：npm run pack（先 build 再打包）
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'

const DIST = 'dist'
const OUT = 'SnFont-便携版.zip'
const DESC = '使用说明.txt'

const readme = `SnFont 字体图标管理 · 绿色免安装版
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
- 建议固定解压位置（移动文件夹后，浏览器会视为新的来源，读取不到旧数据）。

【可编辑的配置文件（改完保存，刷新页面即生效）】
1) unicode-map.data.js —— 图标名称映射表（内容为 JSON 格式）
   解析字体自动命名、「设置 → 按映射批量改名」、码位占用统计都会按它工作。
   内置映射文件中的图标命名来自 Font Awesome v7.3.1 的命名；该文件仅为「码位 → 名称」的命名参考数据
   （不含其字体、图标资源或代码），可自行编辑维护。
2) codepoint-plan.data.js —— 码位规划配置（内容为 JSON 格式）
   其中 project_alloc.start / end 决定本项目「保留区」范围（默认 U+EE00–U+EFFF，512 个）：
   新建/导入图标时的自动分配码位从 start 起顺序取用，用满后顺延。
   修改后刷新页面生效；「设置 → 码位占用」面板会显示当前生效范围。

提示：两个 .data.js 与 index.html 在同一目录，用记事本等编辑器直接改即可。
     若删除了这两个文件，应用仍可正常使用（改用内置的默认配置快照）。

【功能一览】
导入 SVG / 图片转 SVG（位图矢量化）/ 解析字体（ttf/otf/woff/woff2）→ 图标管理 → 一键导出
ttf/woff/woff2 + css + demo.html（支持 GSUB 连字：文字里输入图标名自动替换）。

【研发方式与许可】
本软件为 AI 辅助编程产物：需求与验收由作者 sn476 完成，代码实现由 DeepSeek Harness 的 AI 编码代理生成
（使用模型：deepseek-v4-flash-vision-exp）。
本项目代码以 MIT 许可发布；内置的图片矢量化组件 esm-potrace-wasm 为 GPL-2.0
（自己使用/内部使用不受影响；对外分发本软件时需遵守 GPL-2.0 并随附许可文本与源码获取方式）。
内置名称映射文件中的图标命名来自 Font Awesome v7.3.1 的命名（仅为「码位 → 名称」的命名参考数据）。
`

const zip = new JSZip()
if (!fs.existsSync(DIST) || !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('未找到 ' + DIST + '/index.html，请先执行 npm run build')
  process.exit(1)
}
// 绿色版只需 index.html（JS/CSS/wasm/映射表已内联，favicon 已内联为 data URI）
// + 两个"可编辑数据文件"（用户改映射表/码位规划后刷新即生效）
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
