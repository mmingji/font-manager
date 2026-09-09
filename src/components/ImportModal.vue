<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from '../store/project'
import { normalizeSvgImport } from '../lib/svgNormalize'

const emit = defineEmits(['close'])
const store = useProjectStore()

// 空状态快捷上传传入的 svg/project 文件列表：挂载后自动进入导入预览
const props = defineProps({
  initialFiles: { type: Array, default: null }
})

const dragging = ref(false)
const error = ref('')
const importedNote = ref('')
const fileInput = ref(null)
const importing = ref(false)
// #11：SVG 导入预览
const previews = ref([]) // [{ id, name, svg, selected }]
const selectedAll = ref(true)
// 当前大预览项 id（点击卡片切换）；失效时回退到第一项
const currentId = ref(null)
const currentItem = computed(() => previews.value.find((p) => p.id === currentId.value) || previews.value[0] || null)

function onDrop(e) {
  dragging.value = false
  const files = [...(e.dataTransfer?.files || [])]
  handleFiles(files)
}

function onSelect(e) {
  handleFiles([...(e.target.files || [])])
}

// 空状态快捷上传：挂载后自动处理传入的文件（进入预览，等用户确认导入）
onMounted(() => {
  if (props.initialFiles?.length) handleFiles(props.initialFiles)
})

async function handleFiles(files) {
  if (!files.length) return
  error.value = ''
  importing.value = true
  try {
    const svgs = []
    const projects = []
    for (const file of files) {
      const lower = (file.name || '').toLowerCase()
      if (lower.endsWith('.svg')) {
        const text = await file.text()
        svgs.push({ file, text })
      } else if (lower.endsWith('.json')) {
        const text = await file.text()
        projects.push(text)
      }
    }

    let imported = 0
    // 导入项目 json
    for (const text of projects) {
      try {
        const data = JSON.parse(text)
        if (data && Array.isArray(data.icons) && data.icons.length) {
          const res = store.importProject(data)
          imported += (typeof res === 'number' ? res : res.count)
          const msgs = []
          if (res && res.codeAlerts && res.codeAlerts.length) msgs.push(...res.codeAlerts)
          if (res && res.overflow) msgs.push(res.overflow)
          if (msgs.length) alert(msgs.join('\n'))
        } else {
          error.value = '无效的项目文件（缺少 icons）'
        }
      } catch {
        error.value = 'json 解析失败：' + text.slice(0, 50)
      }
    }

    // #11：SVG 先进预览（规范化 + 可改名 + 勾选）
    // #11：SVG 规范化提示用计数累积（多个文件被规范化时逐次覆盖会误导为只有最后一个）
    let normalizedCount = 0
    for (const { file, text } of svgs) {
      const name = file.name.replace(/\.svg$/i, '')
      const { svg: clean, changed } = normalizeSvgImport(text, store.svgSize)
      previews.value.push({ id: Date.now() + Math.random(), name, svg: clean, selected: true })
      if (changed) normalizedCount++
    }
    if (normalizedCount > 0) {
      importedNote.value = normalizedCount === 1
        ? '（1 个 SVG 已自动规范化坐标）'
        : `（${normalizedCount} 个 SVG 已自动规范化坐标）`
    }

    if (imported) {
      emit('close')
    }
  } catch (e) {
    error.value = '导入失败：' + e.message
  } finally {
    importing.value = false
  }
}

// #11：确认导入预览的 SVG
function confirmImport() {
  const items = previews.value
    .filter((p) => p.selected)
    .map((p) => ({ name: p.name, svg: p.svg }))
  if (items.length) {
    const res = store.addIcons(items)
    if (res && res.overflow) alert(res.overflow)
    previews.value = []
    emit('close')
  }
}

function toggleAllPreview() {
  previews.value.forEach((p) => (p.selected = selectedAll.value))
}

function renamePreview(p) {
  const newName = prompt('输入新名称：', p.name)
  if (newName && newName.trim()) p.name = newName.trim()
}

function cancelPreview() {
  previews.value = []
}

function miniSvg(svg) {
  return svg
    .replace(/width="[^"]*"/, 'width="32"')
    .replace(/height="[^"]*"/, 'height="32"')
}

const previewCount = computed(() => previews.value.filter((p) => p.selected).length)
</script>

<template>
  <div class="modal-mask">
    <div class="modal">
      <header>
        <h3>导入图标</h3>
        <!-- 关闭：svg 图标（字符 × 已在全项目统一替换为 svg 图标） -->
        <button class="close" @click="emit('close')" title="关闭">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </header>
      <div class="body">
        <div
          class="dropzone"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="fileInput.click()"
        >
          <input ref="fileInput" type="file" accept=".svg,.json" multiple hidden @change="onSelect" />
          <p v-if="!importing">拖入 SVG 或项目备份文件，或点击选择<br /><small>支持 .svg（批量）、项目备份 .json（含 icons 的备份文件）</small></p>
          <p v-else>导入中…</p>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="importedNote && !error" class="note">{{ importedNote }}</p>

        <!-- #11：SVG 导入预览（大图预览 + 可改名、勾选） -->
        <template v-if="previews.length">
          <!-- 大预览：按项目设置的 SVG 尺寸渲染当前项（点击下方卡片切换） -->
          <div class="hero" v-if="currentItem">
            <div class="hero-head">
              <span class="hero-name">{{ currentItem.name }}</span>
              <span class="hero-note">按项目设置的 SVG 尺寸（{{ store.svgSize }}px）预览</span>
            </div>
            <div class="hero-svg-box" v-html="currentItem.svg"></div>
          </div>
          <div class="preview-head">
            <label><input type="checkbox" v-model="selectedAll" @change="toggleAllPreview" /> 全选</label>
            <span>已选 {{ previewCount }} / {{ previews.length }}</span>
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
              <button class="prename" type="button" @click.stop="renamePreview(p)" title="改名">改名</button>
            </div>
          </div>
          <div class="preview-actions">
            <button type="button" @click="cancelPreview">清空</button>
            <button type="button" class="primary" @click="confirmImport" :disabled="!previewCount">导入 {{ previewCount }} 个</button>
          </div>
        </template>
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
  width: min(620px, 92vw);
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
}

.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 36px;
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

.error {
  color: var(--danger);
  margin-top: 10px;
}

.note {
  color: var(--primary);
  margin-top: 10px;
  font-size: 12px;
}

/* 大预览：按项目 SVG 尺寸渲染，容器内等比压缩显示 */
.hero {
  margin: 14px 0 4px;
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
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 320px;
  color: #333;
}

/* #11：预览 */
.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0 8px;
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

/* current = 大预览正在显示的项：加粗外描边（明显强于勾选边框） */
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
  height: 34px;
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

</style>
