<script setup>
import { ref, onMounted } from 'vue'
import { useProjectStore } from '../store/project'
import { loadBuiltinMap } from '../lib/unicodeMap'

const emit = defineEmits(['close'])
const store = useProjectStore()

const SVG_SIZES = [128, 512, 1024]
const WEIGHTS = [
  { value: 'regular', label: '常规体 Regular' },
  { value: 'bold', label: '粗体 Bold' }
]

// 本地编辑副本，保存时应用
const projectName = ref(store.name)
const classPrefix = ref(store.classPrefix)
const fontName = ref(store.fontName)
const svgSize = ref(store.svgSize)
const customSize = ref('')
const weight = ref(store.weight)

function applySize() {
  if (svgSize.value === 'custom') {
    const n = parseInt(customSize.value, 10)
    if (n > 0) {
      store.setSvgSize(n)
      return
    }
    svgSize.value = store.svgSize
  } else {
    store.setSvgSize(Number(svgSize.value))
  }
}

function save() {
  store.renameProject(projectName.value.trim())
  store.setClassPrefix(classPrefix.value.trim() || 'sn-')
  store.setFontName(fontName.value.trim() || 'snfont')
  store.setWeight(weight.value)
  applySize()
  emit('close')
}

// ---------- 映射批量改名（unicode-map.json → 当前项目图标） ----------
// 需求：修改 public/unicode-map.json 后，管理页按映射批量把命中 unicode 的图标改成 json 里的名称
const mapStatus = ref('')
const mapLoading = ref(false)

onMounted(async () => {
  try {
    await loadBuiltinMap() // 预热，只加载一次
  } catch { /* 忽略 */ }
})

async function applyMapRename() {
  mapLoading.value = true
  mapStatus.value = ''
  try {
    const map = await loadBuiltinMap(true) // 强制重新读取（绕过浏览器缓存）
    const hexToName = map
    // 对当前项目每个图标：若其 code 在映射中且映射名与现名不同，则改名（改名在 store 内保证唯一）
    const icons = store.icons
    let changed = 0
    const applied = []
    for (const icon of icons) {
      if (icon.code == null) continue
      const hex = icon.code.toString(16).toLowerCase()
      const target = hexToName[hex]
      if (target && target !== icon.name) {
        store.renameIcon(icon.id, target)
        changed++
        applied.push({ from: icon.name, to: target })
      }
    }
    if (changed) {
      mapStatus.value = `已按映射批量改名 ${changed} 个图标`
    } else {
      mapStatus.value = '映射中无匹配当前项目 unicode 的名称，未改动'
    }
  } catch (e) {
    mapStatus.value = '读取映射失败：' + (e.message || e)
  } finally {
    mapLoading.value = false
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <header>
        <h3>项目设置</h3>
        <button class="close" @click="emit('close')">×</button>
      </header>
      <div class="body">
        <label class="field">
          <span>项目名称</span>
          <input v-model="projectName" type="text" placeholder="snfont" />
        </label>
        <label class="field">
          <span>CSS 类前缀</span>
          <input v-model="classPrefix" type="text" placeholder="sn-" />
          <small>如 .sn-trash 中的 sn-</small>
        </label>
        <label class="field">
          <span>字体名称</span>
          <input v-model="fontName" type="text" placeholder="snfont" />
          <small>影响 ttf/woff/woff2/css 文件名与 font-family</small>
        </label>
        <label class="field">
          <span>基础字符字重</span>
          <select v-model="weight">
            <option v-for="w in WEIGHTS" :key="w.value" :value="w.value">{{ w.label }}</option>
          </select>
          <small>决定生成字体内字母/符号取常规还是粗体字形；图标名与 unicode 不受影响。常规产物文件名为 snfont-regular，粗体为 snfont-bold</small>
        </label>
        <label class="field">
          <span>SVG 尺寸</span>
          <select v-model="svgSize">
            <option v-for="s in SVG_SIZES" :key="s" :value="s">{{ s }} × {{ s }}</option>
            <option value="custom">自定义</option>
          </select>
          <input v-if="svgSize === 'custom'" v-model="customSize" type="number" min="16" max="2048" placeholder="如 256" class="custom-size" />
          <small>应用于解析字体、导入 SVG、导出 SVG</small>
        </label>

        <div class="map-rename">
          <div class="map-rename-head">
            <span class="mr-title">按 unicode 映射批量改名</span>
            <button class="small" :disabled="mapLoading" @click="applyMapRename">应用映射改名</button>
          </div>
          <p class="mr-desc">读取 public/unicode-map.json，把当前项目中 unicode 命中映射的图标统一改成 json 中的名称（改 json 后点此即生效）。</p>
          <p v-if="mapStatus" class="mr-status">{{ mapStatus }}</p>
        </div>
      </div>
      <footer>
        <button @click="emit('close')">取消</button>
        <button class="primary" @click="save">保存</button>
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
  width: min(440px, 92vw);
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
}

.field span {
  font-weight: 600;
}

.field small {
  color: var(--text-2);
  /* 最小字号规则：全局不低于 12px */
  font-size: 12px;
}

.custom-size {
  margin-top: 4px;
}

.map-rename {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafbfd;
}

.map-rename-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mr-title {
  font-size: 13px;
  font-weight: 600;
}

.mr-desc {
  margin: 6px 0 0;
  /* 最小字号规则：全局不低于 12px */
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}

.mr-status {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--primary);
}

button.small {
  padding: 4px 10px;
  font-size: 12px;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}
</style>
