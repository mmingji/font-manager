// 位图 → SVG 矢量化封装，供「图片转 SVG」弹窗与图标卡片「替换」使用
// 职责：图片解码/缩放 → 灰度阈值二值化（含反色） → potrace(WASM) 轮廓追踪 → 强制归一化为项目标准 SVG
//
// 库选型背景（决策记录，2026-09 已记入交接文档）：
//   imagetracerjs 对细描边线稿效果差（填充成块）；potrace npm 版依赖 node 的 jimp 无法入浏览器；
//   最终选 esm-potrace-wasm（Google SVGcode PWA 同款）：纯浏览器 ESM、单文件内联 wasm、离线可用。
//   许可 GPL-2.0：本地/离线自用无分发义务，且其输出（svg/字体）为用户数据、不传染；
//   若未来把整个应用闭源商用分发，需换宽松许可库——届时只改本文件的内部调用，改动面可控。
//
// 为什么二值化而不是彩色分色：字体图标最终必须单色 path（fill=currentColor），
// 彩色/渐变在此产品形态下无意义，且 potrace 本质是二值轮廓追踪算法（产品决策，见交接文档）。
import { potrace, init as initPotrace } from 'esm-potrace-wasm'
import { normalizeSvgForce } from './svgNormalize'

// 处理长边上限：超过则等比缩小。potrace 逐像素追踪，超大图耗时陡增且对图标无意义
// （字体图标最终输出 0~1000 坐标系，源图 ≥256px 已足够）
export const MAX_EDGE = 1024
// 灰度阈值默认值：亮度 < 阈值判定为前景（深色图形）。白底深色图标是主流场景
export const DEFAULT_THRESHOLD = 128
// 去噪点默认值（映射 potrace turdsize）：面积小于该值的孤立色块被忽略。
// 源图扫描噪点/杂点多时可调大；线稿细节多（如细线与点）宜调小保留
export const DEFAULT_TURDSIZE = 2

// potrace 算法参数（图标场景经验值，固定不开放 UI；如需可后续暴露成滑杆）
// turdsize:  面积小于该值的孤立噪点丛被忽略。=2 在"去扫描噪点"与"保留细节"间平衡
// turnpolicy: 4=minority（potrace 推荐的拐角决策策略）
// alphamax:   拐角平滑阈值上限（1=默认平滑；越小越保留锐角，线条稿可降到 0.5 更锋利）
// opticurve:  1=启用贝塞尔拟合（输出 path 更精简平滑）
// opttolerance: 曲线拟合容差（越小越贴原像素轮廓）
// extractcolors: false=单色输出（本产品形态只用单色 path）
// pathonly:   false=返回完整 SVG 文档（内部再统一强制归一化，见 normalizeSvgForce 注释）
const POTRACE_OPTIONS = {
  turdsize: 2,
  turnpolicy: 4,
  alphamax: 1,
  opticurve: 1,
  opttolerance: 0.2,
  extractcolors: false,
  posterizelevel: 2,
  posterizationalgorithm: 0,
  pathonly: false
}

// wasm 懒初始化：首次转换时加载（约 70KB 单文件，内联 wasm 无需额外网络/资源请求）
let readyPromise = null
function ensurePotraceReady() {
  if (!readyPromise) readyPromise = initPotrace()
  return readyPromise
}

// 判断是否为可矢量化处理的位图文件（svg 是矢量，不在此列——走既有 normalizeSvgImport 链路）
export function isBitmapFile(file) {
  if (!file) return false
  const t = String(file.type || '').toLowerCase()
  const n = String(file.name || '').toLowerCase()
  if (t.startsWith('image/') && t !== 'image/svg+xml') return true
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/.test(n)
}

// 解码图片文件 → canvas 像素数据（等比限制长边）
// createImageBitmap：现代浏览器（Chrome/Edge/Firefox/Safari 15+）均支持，接受 File/Blob；
// 对 gif 等动画格式默认取第一帧（本项目场景只需要静态首帧）
async function decodeToCanvas(file, maxEdge = MAX_EDGE) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) // willReadFrequently：频繁 getImageData 走 CPU 路径更快
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return { ctx, width, height }
}

// RGBA 像素 → 二值 ImageData（黑=前景轮廓，白=背景），供 potrace 追踪
// 判定规则（顺序很重要）：
//   1. alpha < 128 的像素视为透明背景 → 置白（透明底 PNG 自动"抠图"，透明区域不产生轮廓）
//   2. 其余按灰度亮度：默认 亮度 < threshold → 前景黑；≥ threshold → 背景白
//   3. invert 反色：反转亮度判定（暗底亮形状的图勾反色后，形状才成为前景）
// 方向修正：potrace wasm 输出 y 轴与屏幕相反（位图首行被当作底部），
// 实测结果上下翻转——因此喂入前对位图做垂直镜像，追踪输出即恢复正确方向（2026-09 实测验证）
export function toBinaryImageData(imageData, threshold = DEFAULT_THRESHOLD, invert = false) {
  const { data, width, height } = imageData
  const out = new Uint8ClampedArray(data.length)
  for (let row = 0; row < height; row++) {
    const srcRow = height - 1 - row // 垂直镜像：源底行 → 输出顶行
    for (let col = 0; col < width; col++) {
      const si = (srcRow * width + col) * 4
      const oi = (row * width + col) * 4
      const a = data[si + 3]
      const r = data[si]
      const g = data[si + 1]
      const b = data[si + 2]
      let black
      if (a < 128) {
        black = false
      } else {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b // 标准灰度加权（人眼感知）
        black = invert ? lum >= threshold : lum < threshold
      }
      const v = black ? 0 : 255
      out[oi] = v
      out[oi + 1] = v
      out[oi + 2] = v
      out[oi + 3] = 255
    }
  }
  return new ImageData(out, width, height)
}

// 单张图片文件 → 项目标准 SVG 字符串（viewBox 0 0 1000 1000 + width/height=size + fill=currentColor）
// options: { threshold: 亮度阈值 0~255, invert: 反色, turdsize: 去噪点 0~20, size: 输出 svg 宽高（取项目设置 store.svgSize） }
// 异常：无轮廓（图全白/全透明/全黑但反色错误等）抛 { code: 'EMPTY_TRACE' }，调用方据此提示
export async function imageFileToSvg(file, { threshold = DEFAULT_THRESHOLD, invert = false, turdsize = DEFAULT_TURDSIZE, size = 512 } = {}) {
  await ensurePotraceReady()
  const { ctx, width, height } = await decodeToCanvas(file)
  const imageData = ctx.getImageData(0, 0, width, height)
  const binary = toBinaryImageData(imageData, threshold, invert)
  // potrace 输出：以像素坐标为 viewBox 的完整 svg（含 <path fill="#000000">）
  // 尺寸 300~1000px 的中间态会被 normalizeSvgImport 误判"已规范"而漏缩放，
  // 因此必须走 normalizeSvgForce（强制缩放居中到 0~1000 全幅）——见该函数注释
  const raw = await potrace(binary, { ...POTRACE_OPTIONS, turdsize })
  const { svg } = normalizeSvgForce(raw, size)
  if (!svg) {
    const err = new Error('未追踪到任何轮廓：图片可能全白/全透明，或需要勾选反色')
    err.code = 'EMPTY_TRACE'
    throw err
  }
  return svg
}
