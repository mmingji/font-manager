<script setup>
// 图片转 SVG 弹窗：多图拖入 → potrace 矢量化（阈值/反色可调，调参自动全量重转）→ 预览（勾选/改名）→ 导入项目
// 转换链路与参数语义见 lib/traceImage.js（含库选型/许可决策记录）
// 交互范式对齐 ImportModal（导入 SVG）：预览网格勾选 + 改名 + 一键导入；结果经 normalizeSvgForce
// 统一为 0~1000 坐标系（fill=currentColor），与字体解析产物一致，入库后可直接参与字体构建
import { ref, computed } from 'vue'
import { useProjectStore } from '../store/project'
import { imageFileToSvg, isBitmapFile, DEFAULT_THRESHOLD } from '../lib/traceImage'

const emit = defineEmits(['close'])
const store = useProjectStore()

const dragging = ref(false)
const fileInput = ref(null)
const error = ref('')
// 转换参数（对本批所有图统一生效：同一批图通常同风格同底色；
// 个别图不理想可移除后单独转换，或调参数后自动全量重转）
const threshold = ref(DEFAULT_THRESHOLD)
const invert = ref(false)
// 预览项：{ id, name, svg, selected, file } —— file 保留源文件引用，调参后据此重转
const previews = ref([])
const selectedAll = ref(true)
// 转换状态（进度文案展示在参数条右侧）
const tracing = ref(false)
const traceStatus = ref('')

let retraceTimer = null // 参数防抖定时器（拖动滑杆不立刻全量重转，松手停顿 200ms 后执行）
let taskToken = 0       // 任务令牌：新任务（拖入/重转）递增并作废旧任务的剩余循环，防止结果乱序

// ---------- 文件接入 ----------
function onDrop(e) {
  dragging.value = false
  handleFiles([...(e.dataTransfer?.files || [])])
}

function onSelect(e) {
  handleFiles([...(e.target.files || [])])
  e.target.value = '' // 允许再次选择同一文件（否则同名文件 change 不触发）
}

function handleFiles(files) {
  const images = files.filter(isBitmapFile)
  if (!images.length) {
    error.value = '未识别到图片：请拖入或选择 PNG / JPG / WebP / GIF 等位图文件'
    return
  }
  error.value = ''
  clearTimeout(retraceTimer) // 作废排队中的参数重转，直接处理新文件
  const tasks = images.map((file) => ({ file, name: file.name.replace(/\.[^.]+$/, '') }))
  traceTasks(tasks)
}

// ---------- 转换 ----------
// tasks: [{ file, name }]；同名任务覆盖旧预览项（重转同一文件不产生重复卡片）
async function traceTasks(tasks) {
  const token = ++taskToken
  tracing.value = true
  let done = 0
  const total = tasks.length
  for (const t of tasks) {
    if (token !== taskToken) break // 期间有新任务/清空 → 放弃剩余
    traceStatus.value = `转换中 ${done + 1}/${total}：${t.name}`
    try {
      const svg = await imageFileToSvg(t.file, {
        threshold: threshold.value,
        invert: invert.value,
        size: store.svgSize // 与项目设置里的 SVG 尺寸三处统一生效
      })
      if (token !== taskToken) break
      const idx = previews.value.findIndex((p) => p.name === t.name)
      const item = { id: Date.now() + Math.random(), name: t.name, svg, file: t.file, selected: true }
      if (idx >= 0) previews.value[idx] = item // 覆盖同名项，保持原位置
      else previews.value.push(item)
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

// 参数变化 → 防抖全量重转（保留每项的勾选状态与顺序）
function scheduleRetrace() {
  clearTimeout(retraceTimer)
  retraceTimer = setTimeout(() => {
    if (previews.value.length) {
      traceTasks(previews.value.map((p) => ({ file: p.file, name: p.name })))
    }
  }, 200)
}

// ---------- 预览操作（与 ImportModal 一致） ----------
function toggleAllPreview() {
  previews.value.forEach((p) => (p.selected = selectedAll.value))
}

function renamePreview(p) {
  const newName = prompt('输入新名称：', p.name)
  if (newName && newName.trim()) p.name = newName.trim()
}

function cancelPreview() {
  clearTimeout(retraceTimer)
  taskToken++ // 作废进行中的转换循环
  previews.value = []
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

const previewCount = computed(() => previews.value.filter((p) => p.selected).length)

// 预览缩略：只改渲染尺寸，不动源 svg（同 ImportModal miniSvg 的做法）
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
        <h3>图片转 SVG</h3>
        <button class="close" @click="emit('close')">×</button>
      </header>
      <div class="body">
        <!-- 数据来源：拖入/点选的本地图片文件；已转出预览项后可继续追加，同名文件会覆盖重转 -->
        <div
          class="dropzone"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="fileInput.click()"
        >
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" multiple hidden @change="onSelect" />
          <p v-if="!previews.length">拖入图片，或点击选择（可多选）<br /><small>支持 png / jpg / webp / gif 等；建议使用 ≥128px 的白底或透明底单色图，效果最佳</small></p>
          <p v-else class="append-hint">继续拖入或点击可追加图片<small>（同名文件将覆盖重转）</small></p>
        </div>
        <p v-if="error" class="error">{{ error }}</p>

        <!-- 参数条：阈值滑杆 + 反色；调整后 200ms 自动全量重转预览 -->
        <div class="param-bar" v-if="previews.length">
          <label class="param-item" title="亮度低于该值的像素视为图形（前景）；调高则图形范围变大">
            阈值
            <input type="range" min="0" max="255" step="1" v-model.number="threshold" @input="scheduleRetrace" />
            <span class="param-val">{{ threshold }}</span>
          </label>
          <label class="param-item invert">
            <input type="checkbox" v-model="invert" @change="scheduleRetrace" />
            反色（暗底亮图勾选）
          </label>
          <span class="trace-status" v-if="tracing">⟳ {{ traceStatus }}</span>
          <span class="trace-status" v-else>已转 {{ previews.length }} 张（调参后自动重转）</span>
        </div>

        <!-- 转换结果预览（与导入 SVG 一致的勾选/改名交互） -->
        <template v-if="previews.length">
          <div class="preview-head">
            <label><input type="checkbox" v-model="selectedAll" @change="toggleAllPreview" /> 全选</label>
            <span>已选 {{ previewCount }} / {{ previews.length }}</span>
          </div>
          <div class="preview-list">
            <div
              v-for="p in previews"
              :key="p.id"
              class="preview-item"
              :class="{ on: p.selected }"
              @click="p.selected = !p.selected"
            >
              <input type="checkbox" v-model="p.selected" @click.stop />
              <div class="mini" v-html="miniSvg(p.svg)"></div>
              <span class="pname" :title="p.name">{{ p.name }}</span>
              <button class="prename" type="button" @click.stop="renamePreview(p)" title="改名">改名</button>
            </div>
          </div>
          <div class="preview-actions">
            <button type="button" @click="cancelPreview">清空</button>
            <button type="button" class="primary" @click="confirmImport" :disabled="!previewCount">导入 {{ previewCount }} 个</button>
          </div>
        </template>
        <!-- 空状态说明（还没有转换结果时） -->
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
  width: min(680px, 94vw);
  max-height: 88vh;
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

.close {
  border: none;
  background: transparent;
  font-size: 22px;
  color: var(--text-2);
  padding: 0 6px;
}

.body {
  padding: 20px;
  overflow-y: auto;
}

.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 24px;
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

/* 已有结果时 dropzone 折叠为细条，避免挤占预览空间 */
.dropzone .append-hint {
  font-size: 13px;
}

.error {
  color: var(--danger);
  margin: 10px 0 0;
}

.hint {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.8;
  margin: 14px 0 0;
  text-align: center;
}

/* 参数条：阈值滑杆 + 反色 + 状态 */
.param-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin: 14px 0 4px;
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
  width: 140px;
}

.param-val {
  font-family: Consolas, Monaco, monospace;
  color: var(--text);
  min-width: 24px;
}

.param-item.invert {
  display: inline-flex;
}

.trace-status {
  margin-left: auto;
  font-size: 12px;
}

/* 预览区（同 ImportModal） */
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

.preview-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 300px;
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
  padding: 8px 4px;
  cursor: pointer;
  position: relative;
}

.preview-item.on {
  border-color: var(--primary);
  background: #f0f6ff;
}

.preview-item input {
  position: absolute;
  top: 5px;
  left: 5px;
}

.mini {
  color: #333;
  height: 42px;
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

.prename {
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
