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

【推荐浏览器】
Chrome / Edge（双击 index.html 直接打开即可）。
Firefox 对本地文件（file://）的数据存储限制较严，可能无法保存项目，建议改用 Chrome/Edge。

【数据存在哪】
图标项目数据保存在浏览器本地（IndexedDB，与 file:// 绑定）。
- 换电脑 / 换浏览器 / 清理浏览器数据前，请用「导出 ▾ → 下载项目」保存 Project 备份；
- 在新环境用「导入 ▾ → 导入 SVG」选择该 project.json 即可完整恢复项目。

【从旧版（localhost 网页版）迁移】
旧版数据存在 http://localhost:2333 这个站点里，与本绿色版的数据互不相通：
先在旧版执行「导出 ▾ → 下载项目」，再在本绿色版「导入 ▾ → 导入 SVG」选择该 project.json。

【功能一览】
导入 SVG / 图片转 SVG（位图矢量化）/ 解析字体（ttf/otf/woff/woff2）→ 图标管理 → 一键导出
ttf/woff/woff2 + css + demo.html（支持 GSUB 连字：文字里输入图标名自动替换）。
`

const zip = new JSZip()
if (!fs.existsSync(DIST) || !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('未找到 ' + DIST + '/index.html，请先执行 npm run build')
  process.exit(1)
}
// 绿色版只需 index.html（JS/CSS/wasm/映射表已全部内联）+ 页签图标；
// dist 里的 public 复制品（unicode-map.json / woff2.wasm 等）是给 HTTP 部署场景实时读取用的，打包时排除
const KEEP = ['index.html', 'favicon.svg']
const folder = zip.folder('SnFont')
for (const name of KEEP) {
  const p = path.join(DIST, name)
  if (fs.existsSync(p)) folder.file(name, fs.readFileSync(p))
}
zip.file('SnFont/' + DESC, readme)

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
fs.writeFileSync(OUT, buf)
console.log('已生成 ' + OUT + '（' + (buf.length / 1048576).toFixed(2) + ' MB）—— 解压后双击 SnFont/index.html 使用')
