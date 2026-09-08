// 项目数据持久化：localStorage 读写（项目 JSON 的下载/导入分别由 zip.js 与 ImportModal 负责）

const STORAGE_KEY = 'snfont.project.v1'

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

// 保存项目到 localStorage；返回是否成功。
// localStorage 容量约 5MB，图标 SVG 较多时可能超限抛异常（QuotaExceededError），
// 调用方据此给用户可见提示，避免"静默丢失、刷新后图标没了"
export function saveProject(project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    return true
  } catch (e) {
    console.error('保存项目失败（可能超出 localStorage 容量）', e)
    return false
  }
}
