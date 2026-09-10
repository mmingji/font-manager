// 动态加载"可编辑数据脚本"（绿色版 file:// 场景）
// 背景：file:// 下浏览器禁止 fetch 本地文件，改用经典 <script> 承载数据（unicode-map.data.js 等）；
// 但静态 <script src> 会被浏览器缓存 —— 用户改完文件普通刷新可能读到旧内容。
// 这里改为运行时动态插入 <script> 并带时间戳参数（绕过缓存），确保"编辑文件 → 刷新即生效"。
export function loadDataScript(file, globalName) {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window[globalName]) return Promise.resolve(window[globalName])
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = './' + file + '?t=' + Date.now()
    s.onload = () => resolve(window[globalName] || null)
    s.onerror = () => resolve(null) // 文件缺失/加载失败：由调用方回退到构建内联快照
    document.head.appendChild(s)
  })
}
