// 项目数据持久化：IndexedDB 为主存储（大容量，支持数千图标），localStorage 作旧版快照/回退
// 背景：localStorage 约 5MB 上限，图标 SVG 多时（数千个）setItem 抛 QuotaExceededError，
// 数据存不进 → 刷新即丢。IndexedDB 容量远超（通常数百 MB 级），作为项目主存储。
// 兼容：旧数据只存在 localStorage 时仍可读出；新数据双写（IDB 完整 + LS 快照，LS 超限时忽略）。

const STORAGE_KEY = 'snfont.project.v1'
const DB_NAME = 'snfont-db'
const DB_STORE = 'projects'
const DB_KEY = 'snfont.project.v1'

let idbPromise = null
// 惰性打开 IndexedDB（首次调用才建库，避免不支持环境报错）
function openDb() {
  if (idbPromise) return idbPromise
  idbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('indexedDB 不可用')); return }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE) // keyPath 缺省，用 put(key, value)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      // 打开失败：重置缓存，下次调用可重试（避免永久卡在 rejected promise）
      idbPromise = null
      reject(req.error || new Error('indexedDB 打开失败'))
    }
  })
  return idbPromise
}

// 从 IndexedDB 读取项目；无数据或失败返回 null
export async function loadProjectFromIdb() {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const req = tx.objectStore(DB_STORE).get(DB_KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

// 从 localStorage 同步读取（快速路径 / 兼容旧数据；新建库时为空）
export function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data && Array.isArray(data.icons)) return data
    return null
  } catch {
    return null
  }
}

// 保存项目：主写 IndexedDB，快照写 localStorage（LS 超限时静默忽略）
// 返回 Promise<boolean>：IndexedDB 写入成功即为 true（localStorage 失败不算失败）
// 写队列串行化：连续多次 persist 排队执行，避免并发事务交错；同时也让「最后一次保存」
// 有完整的事务完成时机（调用方可 await 后确认落盘）
let saveQueue = Promise.resolve()
export function saveProject(project) {
  // Pinia state 里的 icons 是响应式 Proxy，含函数/内部引用；IDB put 要求可结构化克隆的值，
  // 直接存 Proxy 会抛 DataCloneError。先 JSON 往返转成纯数据再写（也顺带排除 undefined/函数字段）
  const clean = JSON.parse(JSON.stringify(project))
  latestSnapshot = clean // 记录最新数据，供刷新前 pagehide 同步兜底
  // 串行入队：每次保存等前一次完成
  const run = saveQueue.then(() => doSave(clean))
  saveQueue = run.catch(() => {}) // 队列自身不因某次失败中断
  return run
}

async function doSave(clean) {
  let idbOk = false
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(clean, DB_KEY)
      tx.oncomplete = () => { idbOk = true; resolve() }
      tx.onerror = () => reject(tx.error || new Error('IndexedDB 写入失败'))
      tx.onabort = () => reject(tx.error || new Error('IndexedDB 写入中止'))
    })
  } catch (e) {
    console.error('IndexedDB 保存失败', e)
  }
  // localStorage 快照尽力写；超限静默（IDB 已保底）
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  } catch {
    /* 快照超限可忽略：IndexedDB 已保存完整数据 */
  }
  return idbOk
}

// 刷新/关闭页面前同步兜底：把队列里最新一次待写数据同步写进 localStorage 快照
// （IDB 异步可能来不及完成；LS 同步写入保证刷新后至少有快照可恢复）
let latestSnapshot = null
// 每次 doSave 前记录最新快照，供 pagehide 同步落 LS
export function flushPendingSnapshot() {
  if (latestSnapshot == null) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(latestSnapshot))
  } catch { /* 超限可忽略 */ }
}

// 清除项目（IDB + LS）
export async function clearProject() {
  try {
    const db = await openDb()
    await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).delete(DB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch { /* ignore */ }
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
