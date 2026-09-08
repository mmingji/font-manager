<script setup>
import { ref, computed, nextTick } from 'vue'
import { useProjectStore } from '../store/project'
import { normalizeSvgImport } from '../lib/svgNormalize'

const props = defineProps({
  icon: { type: Object, required: true },
  selectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-select'])

const store = useProjectStore()

const editing = ref(false)
const editName = ref('')
const inputEl = ref(null)
const svgFileInput = ref(null)

// #12：显示 unicode 码位（hex 大写）
const codeHex = computed(() => {
  const c = props.icon.code
  return c != null ? c.toString(16).toUpperCase().padStart(4, '0') : '—'
})

const previewSvg = computed(() => {
  // 预览用小尺寸渲染，但保留原 svg
  return props.icon.svg
    .replace(/width="[^"]*"/, 'width="48"')
    .replace(/height="[^"]*"/, 'height="48"')
})

function startEdit() {
  editing.value = true
  editName.value = props.icon.name
  nextTick(() => inputEl.value?.select())
}

function commitEdit() {
  const name = editName.value.trim()
  if (name && name !== props.icon.name) {
    store.renameIcon(props.icon.id, name)
  }
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

// #2：替换 SVG
function pickSvg() {
  svgFileInput.value?.click()
}

async function onSvgSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const { svg: clean } = normalizeSvgImport(text, store.svgSize)
    if (!clean || !clean.includes('<path')) {
      alert('未找到有效的 SVG path 数据')
      return
    }
    store.replaceSvg(props.icon.id, clean)
  } catch (err) {
    alert('替换失败：' + err.message)
  }
}

function remove() {
  if (confirm(`确认删除图标「${props.icon.name}」？`)) {
    store.removeIcons([props.icon.id])
  }
}
</script>

<template>
  <div
    class="card"
    :class="{ selected, editing }"
    @click="selectMode && emit('toggle-select')"
  >
    <label v-if="selectMode" class="check" @click.stop>
      <input type="checkbox" :checked="selected" @change="emit('toggle-select')" @click.stop />
    </label>

    <!-- #13：内容整体居中，hover 上移，底部留出按钮空间 -->
    <div class="content-wrap">
      <div class="preview" v-html="previewSvg" @dblclick="startEdit"></div>
      <div class="name-row">
        <input
          v-if="editing"
          ref="inputEl"
          v-model="editName"
          class="name-input"
          @blur="commitEdit"
          @keydown.enter="commitEdit"
          @keydown.esc="cancelEdit"
        />
        <span v-else class="name" :title="icon.name" @dblclick="startEdit">{{ icon.name }}</span>
      </div>
      <div class="code" :title="codeHex">{{ codeHex }}</div>
    </div>

    <!-- #13：hover 时底部显示操作按钮 -->
    <div class="ops" v-if="!selectMode">
      <button class="op" title="重命名" @click="startEdit">改名</button>
      <button class="op" title="替换 SVG" @click="pickSvg">替换</button>
      <button class="op danger" title="删除" @click="remove">删除</button>
    </div>
    <input ref="svgFileInput" type="file" accept=".svg" hidden @change="onSvgSelected" />
  </div>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0;
  text-align: center;
  transition: all 0.15s;
  cursor: default;
  display: flex;
  flex-direction: column;
  height: 150px;
}

.card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
}

.card.selected {
  border-color: var(--primary);
  background: #f0f6ff;
}

.card.editing {
  border-color: var(--primary);
}

.check {
  position: absolute;
  top: 8px;
  left: 8px;
  cursor: pointer;
  z-index: 2;
}

/* #13：内容居中，hover 时上移露出底部按钮 */
.content-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  transition: transform 0.15s;
}

.card:hover .content-wrap {
  transform: translateY(-12px);
}

.preview {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}

.preview :deep(svg) {
  width: 48px;
  height: 48px;
  max-width: 100%;
  max-height: 100%;
}

.name-row {
  min-height: 20px;
  max-width: 100%;
  overflow: hidden;
}

.name {
  font-size: 13px;
  color: var(--text);
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.name-input {
  width: 90%;
  text-align: center;
  font-size: 13px;
  padding: 3px 6px;
}

.code {
  /* 最小字号规则：全局不低于 12px */
  font-size: 12px;
  color: var(--text-2);
  font-family: Consolas, Monaco, monospace;
}

/* #13：底部按钮区，hover 显示（留边距） */
.ops {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.card:hover .ops {
  opacity: 1;
  pointer-events: auto;
}

.op {
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 6px;
}

.op.danger {
  color: var(--danger);
}
</style>
