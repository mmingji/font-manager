# 第三方组件与许可说明（THIRD-PARTY NOTICES）

本项目自身代码以 MIT 许可发布（见 [LICENSE](./LICENSE)）。以下为运行/构建所依赖的第三方组件及其许可。

## 运行时依赖（会进入构建产物）

| 组件 | 版本 | 许可 | 用途 |
| --- | --- | --- | --- |
| vue | 3.x | MIT | 界面框架 |
| pinia | 2.x | MIT | 状态管理 |
| jszip | 3.x | MIT 或 GPL-3.0-or-later（本项目按 **MIT** 使用） | 项目/字体/SVG 打包 |
| file-saver | 2.x | MIT | 触发浏览器下载 |
| fonteditor-core | 2.x | MIT | 字体读写（ttf/woff/woff2、GSUB 表） |
| opentype.js | 1.x | MIT | 字体校验与回读（scripts 工具） |
| pinyin-pro | 3.x | MIT | 中文名称按拼音分组/排序 |
| **esm-potrace-wasm** | 0.5.x | **GPL-2.0** | 图片转 SVG 的位图矢量化引擎（WASM） |
| fontkit | 2.0.4 | MIT | 字体解析内核（以 vendored 单文件形式引入，见 src/lib/fontkit-bundle.mjs） |

## 开发依赖（不进入产物）

| 组件 | 许可 |
| --- | --- |
| vite / @vitejs/plugin-vue / vite-plugin-singlefile | MIT |
| puppeteer-core | Apache-2.0 |

## ⚠️ 关于 esm-potrace-wasm 的 GPL-2.0（重要）

- 该组件是**图片转 SVG（位图矢量化）**功能的引擎，**其代码（WASM）会被内联进构建产物**（`dist/index.html`）。
- **自己使用 / 组织内部使用**：不受影响，GPL 的义务只在「分发」时触发。
- **对外分发构建产物**（例如把 `SnFont-便携版.zip` 或 `dist/` 提供给他人、放到网上供下载）时，需遵守 GPL-2.0：
  1. 随附 GPL-2.0 许可证文本；
  2. 提供获取对应源代码的方式（本项目源码 + esm-potrace-wasm 源码地址 https://github.com/gnss/esm-potrace-wasm ）；
  3. 不得对接收方依 GPL 享有的权利附加额外限制。
- **不想要该义务时**的可选做法：不要把「图片转 SVG」功能打进对外分发的产物（可另出一个不含该功能的构建版本）。

## 内置名称映射数据的来源

`public/unicode-map.data.js`（图标名称映射表）中的**图标命名来自 Font Awesome v7.3.1 的命名**。
该文件仅为「码位 → 名称」的命名参考数据，**不包含** Font Awesome 的字体文件、图标资源或代码；
若对外分发时需保留相应署名，可在此处与本项目 README 中一并说明。
