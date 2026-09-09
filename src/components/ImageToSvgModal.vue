<script setup>
// 图片转 SVG 弹窗：多图拖入 → potrace 矢量化（阈值/反色/去噪点可调，调参自动全量重转）→
// 大尺寸预览（按项目设置 SVG 尺寸渲染）→ 预览网格（勾选/改名/下载）→ 导入项目或替换指定图标
// 交互与链路细节见 lib/traceImage.js（库选型/许可/方向修正等决策记录）
// 替换模式（replaceTarget 非空）：从图标卡片「替换」进入，支持 .svg 与位图文件，结果直接替换目标图标
import { ref, computed } from 'vue'
import { useProjectStore } from '../store/project'
import { imageFileToSvg, isBitmapFile, DEFAULT_THRESHOLD, DEFAULT_TURDSIZE } from '../lib/traceImage'
import { normalizeSvgImport } from '../lib/svgNormalize'
import { exportSvgZip } from '../lib/zip'

const props = defineProps({
  // 替换目标：{ id, name }；非空 = 替换模式（只处理单张，结果为替换而非新增）
  replaceTarget: { type: Object, default: null }
})
const emit = defineEmits(['close'])
const store = useProjectStore()

const isReplace = computed(() => !!props.replaceTarget)

const dragging = ref(false)
const fileInput = ref(null)
const error = ref('')
// 转换参数（对本批所有位图统一生效：同批图通常同风格；个别不满意可调参数自动全量重转）
const threshold = ref(DEFAULT_THRESHOLD)
const invert = ref(false)
const turdsize = ref(DEFAULT_TURDSIZE) // 去噪点：映射 potrace turdsize，0~20
// 预览项：{ id, name, svg, selected, kind: 'bitmap'|'svg', file? }
// kind=bitmap 保留 file 引用用于调参重转；kind=svg 直接规范化展示（替换模式允许选 svg 文件）
const previews = ref([])
const selectedAll = ref(true)
// 当前大预览项 id（点击卡片切换）；失效时回退到第一项
const currentId = ref(null)
const tracing = ref(false)
const traceStatus = ref('')

let retraceTimer = null // 参数防抖：拖动滑杆不立刻全量重转，停顿 200ms 后执行
let taskToken = 0       // 任务令牌：新任务（拖入/重转/清空）递增并作废旧任务剩余循环，防结果乱序

const currentItem = computed(() => previews.value.find((p) => p.id === currentId.value) || previews.value[0] || null)
const previewCount = computed(() => previews.value.filter((p) => p.selected).length)

// ---------- 文件接入 ----------
function onDrop(e) {
  dragging.value = false
  handleFiles([...(e.dataTransfer?.files || [])])
}

function onSelect(e) {
  handleFiles([...(e.target.files || [])])
  e.target.value = '' // 允许再次选择同一文件（同名文件 change 不触发）
}

function isSvgFile(file) {
  return /.svg$/i.test(file.name || '') || file.type === 'image/svg+xml'
}

function handleFiles(files) {
  if (!files.length) return
  error.value = ''
  // 替换模式只处理一张（取第一个可用文件）；导入模式支持多图批量
  const usable = isReplace.value
    ? files.filter((f) => isBitmapFile(f) || isSvgFile(f)).slice(0, 1)
    : files.filter(isBitmapFile)
  if (!usable.length) {
    error.value = isReplace.value
      ? '请选择 PNG / JPG / WebP 等位图或 SVG 文件'
      : '未识别到图片：请拖入或选择 PNG / JPG / WebP / GIF 等位图文件'
    return
  }
  // 替换模式：新选择清空旧预览（防止误替换到多张）
  if (isReplace.value && previews.value.length) {
    if (!confirm('将替换当前弹窗里的预览内容（已选择的文件会清空），是否继续？')) return
    cancelPreview()
  }
  // 同名文件确认：继续将覆盖并重新转换（避免拖错文件覆盖已有结果）
  const dups = usable.filter((f) => previews.value.some((p) => p.name === f.name.replace(/\.[^.]+$/, '')))
  if (dups.length) {
    const names = dups.map((f) => f.name).join('、')
    if (!confirm(`已存在同名图标「${names}」，继续将覆盖并重新转换，是否继续？`)) return
  }
  clearTimeout(retraceTimer)
  const tasks = usable.map((file) => {
    const isSvg = isSvgFile(file)
    return {
      file,
      name: file.name.replace(/\.[^.]+$/, ''),
      kind: isSvg ? 'svg' : 'bitmap'
    }
  })
  traceTasks(tasks)
}

// ---------- 转换 ----------
// tasks: [{ file, name, kind }]；同名任务覆盖旧预览项（不产生重复卡片）
async function traceTasks(tasks) {
  const token = ++taskToken
  tracing.value = true
  error.value = '' // 每次转换/重转清空旧警示：失效的错误提示不应残留（如调阈值后已无空轮廓）
  let done = 0
  const total = tasks.length
  for (const t of tasks) {
    if (token !== taskToken) break // 期间有新任务/清空 → 放弃剩余
    traceStatus.value = `转换中 ${done + 1}/${total}：${t.name}`
    try {
      let svg
      if (t.kind === 'svg') {
        const text = await t.file.text()
        const { svg: clean } = normalizeSvgImport(text, store.svgSize)
        if (!clean || !clean.includes('<path')) throw { code: 'EMPTY_TRACE', message: '未找到有效的 SVG path 数据' }
        svg = clean
      } else {
        svg = await imageFileToSvg(t.file, {
          threshold: threshold.value,
          invert: invert.value,
          turdsize: turdsize.value,
          size: store.svgSize // 与项目设置里的 SVG 尺寸三处统一生效
        })
      }
      if (token !== taskToken) break
      const idx = previews.value.findIndex((p) => p.name === t.name)
      const item = { id: Date.now() + Math.random(), name: t.name, svg, file: t.kind === 'bitmap' ? t.file : null, kind: t.kind, selected: true }
      if (idx >= 0) previews.value[idx] = item // 覆盖同名项，保持原位置
      else previews.value.push(item)
      currentId.value = item.id // 新转换/覆盖的项设为当前大预览
    } catch (e) {
      if (token !== taskToken) break
      error.value = e.code === 'EMPTY_TRACE'
        ? `「${t.name}」${e.message}`
        : `「${t.name}」转换失败：${e.message}`
    }
    done++
    await new Promise((r) => setTimeout(r, 0)) // 让出主线程，进度文案能渲染
  }
  tracing.value = false
  traceStatus.value = ''
}

// 参数变化 → 防抖全量重转（只重转位图项；svg 项直接规范化无需重转；保留勾选状态与顺序）
function scheduleRetrace() {
  clearTimeout(retraceTimer)
  retraceTimer = setTimeout(() => {
    const tasks = previews.value
      .filter((p) => p.kind === 'bitmap')
      .map((p) => ({ file: p.file, name: p.name, kind: 'bitmap' }))
    if (tasks.length) traceTasks(tasks)
  }, 200)
}

// ---------- 预览操作 ----------
function toggleAllPreview() {
  previews.value.forEach((p) => (p.selected = selectedAll.value))
}

function renamePreview(p) {
  const newName = prompt('输入新名称：', p.name)
  if (newName && newName.trim()) p.name = newName.trim()
}

// 下载单张转换结果 SVG（供其他矢量工具精修微调）
function downloadSvg(p) {
  const blob = new Blob([p.svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = p.name + '.svg'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000) // 延迟释放，确保下载已开始
}

// 下载全部转换结果（zip，复用导出 SVG 打包逻辑）
async function downloadAllSvg() {
  const items = previews.value.map((p) => ({ name: p.name, svg: p.svg }))
  if (items.length) {
    await exportSvgZip(items, store.svgSize, `${store.fontName}-img2svg.zip`)
  }
}

function cancelPreview() {
  clearTimeout(retraceTimer)
  taskToken++ // 作废进行中的转换循环
  previews.value = []
  currentId.value = null
  error.value = ''
}

// 导入选中项（store.addIcons：自动分配 U+EE00–EFFF 稳定码位，重名自动加 _2 后缀）
function confirmImport() {
  const items = previews.value
    .filter((p) => p.selected)
    .map((p) => ({ name: p.name, svg: p.svg }))
  if (!items.length) return
  const res = store.addIcons(items)
  if (res && res.overflow) alert(res.overflow)
  emit('close')
}

// 替换模式：把当前选中项替换为目标图标（name/code 不变）
function confirmReplace() {
  const p = previews.value.find((item) => item.selected)
  if (!p) return
  store.replaceSvg(props.replaceTarget.id, p.svg)
  emit('close')
}

// 缩略图渲染尺寸（大预览按 store.svgSize 渲染，卡片缩略固定 40px）
function miniSvg(svg) {
  return svg
    .replace(/width="[^"]*"/, 'width="40"')
    .replace(/height="[^"]*"/, 'height="40"')
}
</script>

<template>
  <div class="modal-mask">
    <div class="modal">
      <header>
        <h3>{{ isReplace ? `替换图标「${props.replaceTarget.name}」` : '图片转 SVG' }}</h3>
        <!-- 关闭按钮走右上 × 已移除：避免误触，统一由底部「关闭」操作 -->
      </header>
      <div class="body">
        <!-- 拖入/点选；替换模式允许 svg 文件，导入模式仅位图 -->
        <div
          class="dropzone"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="fileInput.click()"
        >
          <input ref="fileInput" type="file" hidden multiple
            :accept="isReplace ? 'image/png,image/jpeg,image/webp,image/gif,image/bmp,.svg' : 'image/png,image/jpeg,image/webp,image/gif,image/bmp'"
            @change="onSelect" />
          <p v-if="!previews.length">
            <template v-if="isReplace">选择一张图片或 SVG 用于替换<br /></template>
            <template v-else>拖入图片，或点击选择（可多选）<br /></template>
            <small v-if="isReplace">支持 png / jpg / webp / gif / svg</small>
            <small v-else>支持 png / jpg / webp / gif 等；建议使用 ≥128px 的白底或透明底单色图，效果最佳</small>
          </p>
          <p v-else class="append-hint">
            <template v-if="isReplace">再次选择将替换当前预览内容</template>
            <template v-else>继续拖入或点击可追加图片（同名文件将确认后覆盖重转）</template>
          </p>
        </div>
        <p v-if="error" class="error">{{ error }}</p>

        <!-- 参数条：阈值 / 反色 / 去噪点；仅位图项存在时显示（调整后 200ms 自动全量重转） -->
        <div class="param-bar" v-if="previews.some((p) => p.kind === 'bitmap')">
          <label class="param-item" title="亮度低于该值的像素视为图形（前景）；调高则图形范围变大">
            阈值
            <input type="range" min="0" max="255" step="1" v-model.number="threshold" @input="scheduleRetrace" />
            <span class="param-val">{{ threshold }}</span>
          </label>
          <label class="param-item" title="暗底亮形状的图勾选后，亮色成为图形">
            <input type="checkbox" v-model="invert" @change="scheduleRetrace" />
            反色
          </label>
          <label class="param-item" title="面积小于该值的孤立色块/噪点被忽略；越大越干净但细节越少">
            去噪点
            <input type="range" min="0" max="20" step="1" v-model.number="turdsize" @input="scheduleRetrace" />
            <span class="param-val">{{ turdsize }}</span>
          </label>
          <span class="trace-status" v-if="tracing">⟳ {{ traceStatus }}</span>
          <span class="trace-status" v-else>已转 {{ previews.length }} 项（调参后自动重转）</span>
        </div>

        <!-- 大预览：按项目设置的 SVG 尺寸渲染当前项（可点击下方卡片切换） -->
        <div class="hero" v-if="currentItem">
          <div class="hero-head">
            <span class="hero-name">{{ currentItem.name }}</span>
            <span class="hero-note">按项目设置的 SVG 尺寸（{{ store.svgSize }}px）预览</span>
          </div>
          <div class="hero-svg-box" v-html="currentItem.svg"></div>
        </div>

        <!-- 结果网格：勾选 / 改名 / 下载单张，点击卡片切换大预览 -->
        <template v-if="previews.length">
          <div class="preview-head">
            <label><input type="checkbox" v-model="selectedAll" @change="toggleAllPreview" /> 全选</label>
            <span class="head-right">
              <span class="sel-count">已选 {{ previewCount }} / {{ previews.length }}</span>
              <button type="button" class="dl-all" title="下载全部转换为 zip" @click="downloadAllSvg">下载全部</button>
            </span>
          </div>
          <div class="preview-list">
            <div
              v-for="p in previews"
              :key="p.id"
              class="preview-item"
              :class="{ on: p.selected, current: currentItem && currentItem.id === p.id }"
              @click="currentId = p.id"
              :title="'点击查看大预览（' + p.name + '）'"
            >
              <input type="checkbox" v-model="p.selected" @click.stop />
              <div class="mini" v-html="miniSvg(p.svg)"></div>
              <span class="pname" :title="p.name">{{ p.name }}</span>
              <div class="pops">
                <button type="button" class="prename" @click.stop="renamePreview(p)" title="改名">改名</button>
                <button type="button" class="pdownload" @click.stop="downloadSvg(p)" title="下载该 SVG（供矢量工具精修）">下载</button>
              </div>
            </div>
          </div>
          <div class="preview-actions">
            <button type="button" @click="cancelPreview">清空</button>
            <button type="button" class="primary" @click="isReplace ? confirmReplace() : confirmImport()" :disabled="!previewCount">
              {{ isReplace ? '替换' : '导入 ' + previewCount + ' 个' }}
            </button>
          </div>
        </template>
        <!-- 空状态说明 -->
        <p v-else class="hint">转换后在此预览描边结果：<br />黑色轮廓即未来字体的填充形状（单色 currentColor），照片/渐变/复杂细节不适合矢量化。</p>
      </div>
      <footer>
        <button @click="emit('close')">关闭</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 12px;
  width: min(760px, 94vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

header h3 {
  margin: 0;
  font-size: 16px;
}

.body {
  padding: 20px;
  overflow-y: auto;
}

.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.dropzone.dragging {
  border-color: var(--primary);
  background: #f0f6ff;
}

.dropzone p {
  margin: 0;
}

.dropzone small {
  opacity: 0.7;
}

.dropzone .append-hint {
  font-size: 13px;
}

.error {
  color: var(--danger);
  margin: 10px 0 0;
  font-size: 13px;
}

.hint {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.8;
  margin: 14px 0 0;
  text-align: center;
}

/* 参数条 */
.param-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 14px 0 0;
  padding: 8px 10px;
  background: #f8f9fc;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-2);
}

.param-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.param-item input[type='range'] {
  width: 120px;
}

.param-val {
  font-family: Consolas, Monaco, monospace;
  color: var(--text);
  min-width: 22px;
}

.trace-status {
  margin-left: auto;
  font-size: 12px;
}

/* 大预览：按项目 SVG 尺寸渲染，容器内等比压缩显示 */
.hero {
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
}

.hero-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}

.hero-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-note {
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
}

.hero-svg-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  max-height: 340px;
  overflow: hidden;
}

.hero-svg-box :deep(svg) {
  /* 内联 width/height=svgSize 是真实输出尺寸；容器内等比压缩只为看得下，导出/入库仍是设置尺寸 */
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 320px;
  color: #333;
}

/* 结果网格 */
.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0 8px;
  font-size: 13px;
  color: var(--text-2);
}

.preview-head label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dl-all {
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 6px;
}

.preview-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 4px 6px;
  cursor: pointer;
  position: relative;
}

.preview-item.on {
  border-color: var(--primary);
  background: #f0f6ff;
}

/* current = 大预览正在显示的项：外圈高亮，与勾选(on)区分 */
.preview-item.current {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}
.preview-item.current.on {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}

.preview-item input {
  position: absolute;
  top: 5px;
  left: 5px;
}

.mini {
  color: #333;
  height: 40px;
  display: flex;
  align-items: center;
}

.pname {
  font-size: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pops {
  display: flex;
  gap: 4px;
}

.pops button {
  padding: 1px 6px;
  /* 最小字号规则：全局不低于 12px */
  font-size: 12px;
  border-radius: 4px;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}
</style>
