<script setup>
// 图片转 SVG 弹窗：多图拖入 → potrace 矢量化（阈值/反色/去噪点可调，调参自动全量重转）→
// 大尺寸预览（按项目设置 SVG 尺寸渲染）→ 预览网格（勾选/改名/下载）→ 导入项目或替换指定图标
// 交互与链路细节见 lib/traceImage.js（库选型/许可/方向修正等决策记录）
// 替换模式（replaceTarget 非空）：从图标卡片「替换」进入，支持 .svg 与位图文件，结果直接替换目标图标
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from '../store/project'
import { imageFileToSvg, isBitmapFile, DEFAULT_THRESHOLD, DEFAULT_TURDSIZE } from '../lib/traceImage'
import { normalizeSvgImport } from '../lib/svgNormalize'
import { exportSvgZip } from '../lib/zip'

const props = defineProps({
  // 替换目标：{ id, name }；非空 = 替换模式（只处理单张，结果为替换而非新增）
  replaceTarget: { type: Object, default: null },
  // 空状态快捷上传传入的图片文件：挂载后自动开始转换
  initialFiles: { type: Array, default: null }
})
const emit = defineEmits(['close'])
const store = useProjectStore()

const isReplace = computed(() => !!props.replaceTarget)

const dragging = ref(false)
const fileInput = ref(null)
const error = ref('')
// 新图的默认参数（当前选中项可独立调整，调整结果保存在项内 params 上）
const threshold = ref(DEFAULT_THRESHOLD)
const invert = ref(false)
const turdsize = ref(DEFAULT_TURDSIZE) // 去噪点：映射 potrace turdsize，0~20
// 预览项：{ id, name, svg, selected, kind: 'bitmap'|'svg', file? }
// kind=bitmap 保留 file 引用用于调参重转；kind=svg 直接规范化展示（替换模式允许选 svg 文件）
const previews = ref([])
const selectedAll = ref(true)
// 当前大预览项 id（点击卡片切换）；失效时回退到第一项
const currentId = ref(null)
// 当前项的调整参数（未调整过则用默认值初始化并保存到该项）。参数随项保存：每张图独立调参，互不影响
const currentParams = computed(() => {
  const cur = currentItem.value
  if (!cur || cur.kind !== 'bitmap') return null
  if (!cur.params) {
    cur.params = { threshold: threshold.value, invert: invert.value, turdsize: turdsize.value }
  }
  return cur.params
})
const tracing = ref(false)
const traceStatus = ref('')

let retraceTimer = null // 参数防抖：拖动滑杆不立刻全量重转，停顿 200ms 后执行
let taskToken = 0       // 任务令牌：新任务（拖入/重转/清空）递增并作废旧任务剩余循环，防结果乱序

const currentItem = computed(() => previews.value.find((p) => p.id === currentId.value) || previews.value[0] || null)
const previewCount = computed(() => previews.value.filter((p) => p.selected).length)

// 空状态快捷上传：挂载后自动转换传入的图片（进入预览，等用户确认导入）
onMounted(() => {
  if (props.initialFiles?.length && !props.replaceTarget) handleFiles(props.initialFiles)
})

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
    traceStatus.value = `转换中：${t.name}`
    try {
      let svg
      if (t.kind === 'svg') {
        const text = await t.file.text()
        const { svg: clean } = normalizeSvgImport(text, store.svgSize)
        if (!clean || !clean.includes('<path')) throw { code: 'EMPTY_TRACE', message: '未找到有效的 SVG path 数据' }
        svg = clean
      } else {
        // 参数从该项自己的 params 取（未调整过则用 map 里的当前默认值）
        const idx = previews.value.findIndex((p) => p.name === t.name)
        const existing = idx >= 0 ? previews.value[idx] : null
        const params = existing?.params || { threshold: threshold.value, invert: invert.value, turdsize: turdsize.value }
        svg = await imageFileToSvg(t.file, {
          threshold: params.threshold,
          invert: params.invert,
          turdsize: params.turdsize,
          size: store.svgSize // 与项目设置里的 SVG 尺寸三处统一生效
        })
      }
      if (token !== taskToken) break
      const idx = previews.value.findIndex((p) => p.name === t.name)
      if (idx >= 0) {
        // 覆盖同名项：保留原 id/selected/params，只换 svg（当前大预览不跳变、勾选不丢）
        const old = previews.value[idx]
        previews.value[idx] = { ...old, svg, file: t.kind === 'bitmap' ? t.file : null, kind: t.kind }
      } else {
        const item = { id: Date.now() + Math.random(), name: t.name, svg, file: t.kind === 'bitmap' ? t.file : null, kind: t.kind, selected: true, params: null }
        previews.value.push(item)
        currentId.value = item.id // 新项目设为当前大预览
      }
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

// 参数变化 → 防抖只重转当前选中项（参数按单张图独立保存，其他图不受影响）
function scheduleRetrace() {
  clearTimeout(retraceTimer)
  retraceTimer = setTimeout(() => {
    const cur = currentItem.value
    if (cur && cur.kind === 'bitmap') {
      traceTasks([{ file: cur.file, name: cur.name, kind: 'bitmap' }])
    }
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
        <!-- 关闭：右侧 svg 关闭图标（字符 × 已在全项目统一替换为 svg 图标） -->
        <button class="close" @click="emit('close')" title="关闭">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
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
        <!-- 错误提示预留整行高度：避免提示出现/消失时把下方内容推上推下（弹窗跳动） -->
        <div class="msg-line"><p v-if="error" class="error">{{ error }}</p></div>

        <!-- 大预览：按项目设置的 SVG 尺寸渲染当前项；参数随当前选中项独立保存与调整 -->
        <div class="hero" v-if="currentItem">
          <div class="hero-head">
            <span class="hero-name">{{ currentItem.name }}</span>
            <!-- 转换状态放在标题行右侧（而非参数条内）：参数条保持单行，不再因状态文字出现/消失而换行 -->
            <span class="trace-status" v-show="tracing">⟳ {{ traceStatus }}</span>
            <span class="hero-note">按项目设置的 SVG 尺寸（{{ store.svgSize }}px）预览</span>
          </div>
          <!-- 参数条（仅位图项）：调整作用于当前选中项，下方点选其他图切换各自的参数 -->
          <div class="param-bar" v-if="currentItem.kind === 'bitmap' && currentParams">
            <span class="param-scope">参数仅作用于当前选中项</span>
            <label class="param-item" title="亮度低于该值的像素视为图形（前景）；调高则图形范围变大">
              阈值
              <input type="range" min="0" max="255" step="1" v-model.number="currentParams.threshold" @input="scheduleRetrace" />
              <span class="param-val">{{ currentParams.threshold }}</span>
            </label>
            <label class="param-item" title="暗底亮形状的图勾选后，亮色成为图形">
              <input type="checkbox" v-model="currentParams.invert" @change="scheduleRetrace" />
              反色
            </label>
            <label class="param-item" title="面积小于该值的孤立色块/噪点被忽略；越大越干净但细节越少">
              去噪点
              <input type="range" min="0" max="20" step="1" v-model.number="currentParams.turdsize" @input="scheduleRetrace" />
              <span class="param-val">{{ currentParams.turdsize }}</span>
            </label>

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

.close {
  border: 1px solid transparent; /* 默认无边框（透明边框占位，hover 变实色不位移） */
  background: transparent;
  color: var(--text-2);
  padding: 8px 12px; /* 放大点击区域（图标保持 14px，热区约 40x32） */
  border-radius: 2px; /* hover 出现边框时的圆角 */
  display: inline-flex;
  align-items: center;
  line-height: 1;
  cursor: pointer;
}
.close:hover {
  border-color: var(--border);
  color: var(--text);
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

.msg-line {
  /* 常驻占位：无错误时也是同样高度（见模板注释） */
  min-height: 22px;
  margin-top: 6px;
}

.error {
  color: var(--danger);
  margin: 0;
  font-size: 13px;
}

.hint {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.8;
  margin: 14px 0 0;
  text-align: center;
}

/* 参数条（位于大预览头部下方） */
.param-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 10px;
  padding: 8px 10px;
  background: #f8f9fc;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-2);
}

.param-scope {
  font-size: 12px;
  color: var(--primary);
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
  /* 固定宽度 + 等宽右对齐：数值位数变化（9→255）不引起参数条内元素位移 */
  min-width: 30px;
  text-align: right;
  flex: 0 0 auto;
}

.trace-status {
  /* 位于标题行：固定宽度 + 单行省略，文案长短变化不影响布局 */
  flex: 0 0 auto;
  width: 190px;
  font-size: 12px;
  color: var(--text-2);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  /* 标题行内与其他元素一起右对齐（hero-name 占满剩余空间） */
  margin-left: auto;
  flex: 0 0 auto;
}

.hero-name { flex: 1 1 auto; }

.hero-svg-box {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 固定高度：调整阈值/去噪点时图形大小会变化，高度若自适应会导致整个弹窗跳动（用户反馈） */
  height: 340px;
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

/* current = 大预览正在显示的项：加粗外描边（明显强于勾选边框），与勾选(on)区分 */
.preview-item.current {
  box-shadow: 0 0 0 3px var(--primary);
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

</style>
