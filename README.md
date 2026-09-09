# snfont 图标管理

一个纯前端（零后端）的字体图标管理应用：上传字体文件解析为统一尺寸的 SVG，管理图标项目（增删改查、按首字母分组、批量操作），一键生成 `snfont-regular` / `snfont-bold` 两套产物（ttf / woff / woff2）及配套 CSS。字体支持 **GSUB 连字**——安装后在文本里直接输入图标名（如 `trash`）即自动替换为对应图标；也可在字符映射表按字形名搜索插入。

## 功能

| 功能 | 说明 |
|---|---|
| 字体解析 | 上传 ttf/otf/woff/woff2 解析为统一尺寸 SVG（128/512/1024 可自定义）。虚线框上半为解析前设置（SVG 尺寸/名称映射表/保持原 unicode），下半浅灰文件区（已解析信息+点击重选）。预览可勾选/改名/下载 zip；内置 unicode→名称映射表 `public/unicode-map.json` 自动命名，无名字字形按 uniXXXX 兜底 |
| 码位冲突处理 | 解析预览检测字形原码位与内置 ASCII 基础字形(0x20-0x7E)或项目已有图标码位冲突：卡片标红 + 三选一处理（自动分配/移除冲突/覆盖旧图标）。有冲突必须三选一才能导入 |
| 图标管理 | 主页面按名称首字母分组（中文按拼音），侧边字母索引、搜索、改名/替换/删除，卡片显示 unicode 码位，实时持久化 |
| 项目设置 | 右侧抽屉：项目名/CSS 前缀/字体名/字重/SVG 尺寸 + 「按 unicode 映射批量改名」 + 「码位占用」统计面板 |
| 项目下载 | 完整 zip：ttf/woff/woff2 + css + demo.html + `<项目名>.project.json`，按产物字体名建文件夹 |
| 导入 | 批量 SVG（预览改名/勾选）、导入项目 json 恢复 |
| 顶部交互 | 搜索｜多选｜设置｜导入▾｜导出▾；导入/导出下拉互斥，导出菜单右对齐 |
| 字体能力 | GSUB 连字输入图标名即替换；post 表字形名可按名搜索；稳定码位删除不释放；内置拉丁字形取自真实字体(ASCII 94 字符)且可被覆盖；字重可选 |
| 码位规划 | 新增图标从 U+EE00–U+EFFF 保留区(512 个)顺序分配，避开参考字体已占区；allocateCode 双向跳过已占用 |
| 数据持久化 | IndexedDB 主存储 + localStorage 快照：数千图标不丢；写队列串行 + 刷新前同步兜底；启动 boot gate 避免大数据先空白 |
| 启动自检 | 按需检测异常 SVG 坐标（越界→归一化 0~1000）；仅确有异常才提示修复进度，正常数据完全静默（幂等） |
| 离线运行 | `启动服务.bat` 起本地服务开浏览器 http://localhost:2333，`关闭服务.bat` 停止 |
| 图片转 SVG | 入口占位「功能开发中」（矢量化难点已记录） |

## 技术栈

- Vue 3 + Vite + Pinia（纯前端；数据存 IndexedDB + localStorage 快照）
- opentype.js：字体解析（woff2 解码）
- fonteditor-core：TrueType 构建、ttf→woff/woff2 转换
- 自研 GSUB 生成器：连字表(lookup type 4)手写二进制注入
- JSZip + file-saver：zip 打包下载

## 快速开始

要求：Node.js ≥ 18

### 开发模式
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 构建到 dist/
```

### 本地运行（离线、双击）
构建 dist 后双击 `启动服务.bat` → 起本地服务并打开 http://localhost:2333；`关闭服务.bat` 停止。

## 部署

`dist/` 纯静态，可部署到任意静态托管（Nginx/GitHub Pages/Vercel/Netlify/内网）。无后端、零环境依赖。

## 使用流程

1. **解析字体**：顶部「导入▾」→「解析字体」→ 虚线框上半设置、下半拖入字体 → 预览（改名/处理码位冲突）→ 导入或下载
2. **管理图标**：主页面分组展示；「多选」批量删除/导出；「设置」抽屉改配置
3. **下载项目**：「导出▾」→「下载项目」，得 `<字体名>-project.zip`
4. **使用字体**：Web 引 css 用 `<i class="sn-trash">`；桌面装 ttf 输入图标名即替换（GSUB）；demo.html 可复制进 PS

## 项目结构

```
src/
├─ lib/
│  ├─ parseFont.js      # 字体 → SVG 解析（woff2 解码）
│  ├─ buildFont.js      # TrueType 构建 + y 翻转 + css 生成
│  ├─ gsub.js           # GSUB 连字表生成与注入
│  ├─ baseGlyphs.js     # 内置基础拉丁字形（双字重，连字触发）
│  ├─ svgNormalize.js   # 复杂 SVG 规范化（幂等）
│  ├─ unicodeMap.js     # unicode→名称 映射表工具
│  ├─ codepointPlan.js  # 码位规划常量（保留区/ASCII 基础区）与判定
│  ├─ codepointStats.js # 参考映射占用动态统计
│  ├─ pinyin.js         # 中文拼音分组/排序
│  ├─ zip.js            # zip 打包（SVG/项目包/demo.html）
│  └─ persist.js        # IndexedDB + localStorage 持久化
├─ store/project.js     # Pinia：CRUD/分组/稳定码位/冲突覆盖/启动引导
└─ components/          # 页面组件（FontParser/ImportModal/SettingsModal 抽屉…）
```

## 说明

- 数据存 IndexedDB（大容量）+ localStorage 快照；导出 `<项目名>.project.json` 可备份迁移
- 图标码位永久固定；新增从 U+EE00+ 保留区分配，与参考字体不冲突
- 字重只影响产物文件名与字母/符号字形；图标名/unicode/css 类名与字重无关
- 生成字体过程不出现任何第三方图标库名称
