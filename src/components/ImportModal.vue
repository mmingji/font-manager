<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '../store/project'
import { normalizeSvgImport } from '../lib/svgNormalize'

const emit = defineEmits(['close'])
const store = useProjectStore()

const dragging = ref(false)
const error = ref('')
const importedNote = ref('')
const fileInput = ref(null)
const importing = ref(false)
// #11：SVG 导入预览
const previews = ref([]) // [{ id, name, svg, selected }]
const selectedAll = ref(true)

function onDrop(e) {
  dragging.value = false
  const files = [...(e.dataTransfer?.files || [])]
  handleFiles(files)
}

function onSelect(e) {
  handleFiles([...(e.target.files || [])])
}

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
          const count = store.importProject(data)
          imported += count
        } else {
          error.value = '无效的项目文件（缺少 icons）'
        }
      } catch {
        error.value = 'json 解析失败：' + text.slice(0, 50)
      }
    }

    // #11：SVG 先进预览（规范化 + 可改名 + 勾选）
    for (const { file, text } of svgs) {
      const name = file.name.replace(/\.svg$/i, '')
      const { svg: clean, changed } = normalizeSvgImport(text, store.svgSize)
      previews.value.push({ id: Date.now() + Math.random(), name, svg: clean, selected: true })
      if (changed) importedNote.value = `（${name} 已自动规范化坐标）`
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
    store.addIcons(items)
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
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <header>
        <h3>导入图标</h3>
        <button class="close" @click="emit('close')">×</button>
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

        <!-- #11：SVG 导入预览（可改名、勾选） -->
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
  border: none;
  background: transparent;
  font-size: 22px;
  color: var(--text-2);
  padding: 0 6px;
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

footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}
</style>
