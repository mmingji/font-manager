// fontkit 浏览器构建顶层 require('brotli/decompress.js')，但 brotli 依赖 Node 原生绑定无法入浏览器。
// 本项目 woff2 解码走 fonteditor-core 的 wasm（parseFont.js 先 decode 成 ttf 再交给 fontkit），
// fontkit 的 woff2 路径永不触发——此 stub 仅满足打包器依赖解析（若误触发即抛错提示）
export default function brotliStub() {
  throw new Error('brotli 不可用：woff2 请经 fonteditor wasm 解码（lib/parseFont.js 已处理）')
}
