// 项目数据持久化：localStorage 读写 + 项目 JSON 导出/导入

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

export function clearProject() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// 下载项目为 json 文件
export function downloadProjectJson(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'snfont-project.json'
  a.click()
  URL.revokeObjectURL(url)
}
