# snfont 图标管理

一个纯前端（零后端）的字体图标管理应用：上传字体文件解析为统一尺寸的 SVG，管理图标项目（增删改查、按首字母分组、批量操作），一键生成 `snfont-regular` / `snfont-bold` 两套产物（ttf / woff / woff2）及配套 CSS。字体支持 **GSUB 连字**——安装后在文本里直接输入图标名（如 `trash`）即自动替换为对应图标；也可在字符映射表按字形名搜索插入。

## 功能

| 功能 | 说明 |
|---|---|
| 字体解析 | 上传 ttf / otf / woff / woff2，解析为统一尺寸 SVG（预置 128 / 512 / 1024，可自定义），支持预览、勾选、改名、一键下载 zip；「保持原字体 unicode」默认开启；内置 unicode→名称映射表（`public/unicode-map.json`，独立 json 可维护：直接改名称 → 解析命名或「应用映射改名」即时生效），解析时自动给无名字字形命名；无名字字体按 uniXXXX 兜底命名不再静默丢弃 |
| 图标管理 | 主页面即图标管理：按名称首字母分组（通讯录式 + 侧边字母索引）、搜索按钮展开搜索栏、新增/改名/**替换 SVG**/删除，卡片显示 unicode 码位，hover 显示操作按钮；所有操作实时生效并持久化 |
| 批量操作 | 多选模式：全选、批量删除、**导出选中 SVG**（导出需先选择）；页面固定布局单滚动条 |
| 项目设置 | 可修改：项目名称、CSS 类前缀（默认 `sn-`）、字体名称（默认 `snfont`）、**基础字符字重**（常规→`snfont-regular` / 粗体→`snfont-bold`）、SVG 尺寸（三处统一生效）；含「按 unicode 映射批量改名」 |
| 项目下载 | 一键下载完整项目包 zip，文件安排在按产物字体名命名的文件夹内（`snfont-regular/` 或 `snfont-bold/`）：字体 ttf/woff/woff2 + css + demo.html（本地预览页，顶部显示字重）+ snfont-project.json |
| 导入 | 批量拖入 SVG（先预览可改名、勾选）、导入 `snfont-project.json` 恢复项目 |
| 字体能力 | ① **GSUB 连字**：输入图标名自动替换为图标（Word/PS/浏览器均支持）；② 字形名写入 post 表，字符映射表可按名搜索；③ 字形 y 坐标已修正，Word/PS 显示正常；④ **稳定码位**：图标码位永久固定，删除不释放、改名不影响；⑤ **内置拉丁字形取自真实字体**（latin-regular/bold.woff2，可见 ASCII 94 字符全量提取），连字触发字符显示正常；⑥ 基础字符字重可选（常规/粗体），产物分别命名 |
| 预览页 | demo.html 图标为**真实 unicode 文本**（可鼠标选中复制到 PS 显示图标）、搜索框在标题栏、首字母分组、点击名称/unicode/类名复制 + Toast 提示 |

## 技术栈

- Vue 3 + Vite + Pinia（纯前端，数据存 localStorage）
- opentype.js：字体解析（woff2 解码）
- fonteditor-core：TrueType 构建（glyf + post 表字形名）、ttf → woff / woff2 转换
- 自研 GSUB 生成器：连字表（lookup type 4）手写二进制注入
- JSZip + file-saver：zip 打包下载

## 快速开始

要求：Node.js ≥ 18

```bash
npm install        # 安装依赖
npm run dev        # 开发模式，访问 http://localhost:5173
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物
```

## 部署

构建产物 `dist/` 是纯静态文件，可部署到任意静态托管：

- Nginx / Apache：直接把 `dist/` 作为站点根目录
- GitHub Pages / Vercel / Netlify：上传 `dist/` 即可
- 内网 / 本地：把 `dist/` 放到共享目录或直接双击 `dist/index.html` 打开（需注意浏览器 localStorage 的可用性）

无数据库、无后端服务，运行时零环境依赖。

## 使用流程

1. **解析字体**：点击顶部「解析字体」→ 选择 SVG 尺寸 → 拖入字体文件 → 预览字形（可改名）→ 勾选 → 「导入项目」或「下载 SVG」；可选「保持原字体 unicode」或用 unicode→名称映射表自动命名；文件 >10MB / 字形 >5000 会提示但不阻断；解析失败原因会回显
2. **管理图标**：主页面按首字母分组展示；卡片显示 unicode 码位，hover 显示「改名」「删除」；右上角「多选」可批量删除/导出；「设置」可改项目名/CSS 前缀/字体名/SVG 尺寸
3. **下载项目**：点击「下载项目」，得到 `snfont-regular-project.zip`（或 `snfont-bold-project.zip`），zip 内按产物名建文件夹，内含三种字体格式 + CSS + 预览页 `demo.html`
4. **使用字体**：
   - Web：引入 `snfont-regular.css`（或 `snfont-bold.css`），用 `<i class="sn-trash"></i>` 显示图标
   - 桌面（Word/PS）：安装 `snfont-regular.ttf`（或 `snfont-bold.ttf`），**直接输入图标名（如 `trash`）自动变为图标**（GSUB 连字）；也可打开字符映射表按字形名搜索插入
   - 预览页 demo.html：可复制进 PS 使用；若用 Chrome 双击打开提示字体加载失败，请用本地服务器（`npx serve`）或 Firefox

## 项目结构

```
src/
├─ lib/
│  ├─ parseFont.js      # 字体 → SVG 解析（woff2 解码）
│  ├─ buildFont.js      # TrueType 构建 + y 翻转 + css 生成
│  ├─ gsub.js           # GSUB 连字表生成与注入
│  ├─ baseGlyphs.js     # 内置基础拉丁字形（常规/粗体两套，连字触发）
│  ├─ svgNormalize.js   # 复杂 SVG 规范化（全命令支持）
│  ├─ unicodeMap.js     # unicode→名称 映射表工具
│  ├─ zip.js            # zip 打包（SVG / 项目包 / demo.html）
│  └─ persist.js        # localStorage + 项目 JSON 导入导出
├─ store/project.js     # Pinia 状态：CRUD、分组、稳定码位、项目配置
└─ components/          # 页面组件
```

## 说明

- 所有数据保存在浏览器 localStorage，刷新不丢失；导出 `snfont-project.json` 可备份/迁移
- 图标码位**永久固定**（删除不释放、改名不变），保证已发布文档引用不失效
- 基础字符字重（常规/粗体）只影响生成字体里的字母/符号字形与产物文件名（`snfont-regular` / `snfont-bold`），图标名、unicode、css 类名与字重无关
- 图标名无需带前缀，字体内字形名即图标名；前缀（默认 `sn-`）仅用于 CSS 类名，可在设置中修改
- 生成字体过程中不会出现任何第三方图标库名称
