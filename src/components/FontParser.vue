<script setup>
import { ref, computed, onMounted } from 'vue'
import { parseFontFile, isFontFile } from '../lib/parseFont'
import { exportSvgZip } from '../lib/zip'
import { useProjectStore } from '../store/project'
import { parseUnicodeMap, applyUnicodeNameMap, loadBuiltinMap } from '../lib/unicodeMap'
import { RESERVED_START, RESERVED_END } from '../lib/codepointPlan'

const emit = defineEmits(['close'])
const store = useProjectStore()

const SVG_SIZES = [128, 512, 1024]

const dragging = ref(false)
const fileInput = ref(null)
const parsing = ref(false)
const error = ref('')
const warning = ref('')
const parsed = ref([]) // { name, svg, unicode, advanceWidth }
const size = ref(512)
const customSize = ref('')
const selected = ref(new Set())
// #7：保持原字体 unicode 码（#8：默认选中）
const keepUnicode = ref(true)
// #8：unicode→名称映射
const showMap = ref(false)
const mapText = ref('')          // 输入框内手动粘贴的映射
const mapStatus = ref('')        // 提示文案（应用后显示条数）
const mapFileName = 'unicode-map.json'  // 内置映射文件名（public/ 下，可直接点击打开）
const builtinMap = ref({})       // 从 json 读取到的映射（{hex: name}），未应用前不生效
const builtinLoaded = ref(false)
const unicodeNameMap = ref({})   // 已应用的合并映射（json + 输入框粘贴），用于解析补名

const fileInfo = ref(null)

// 挂载时读取映射 json（仅计数，不应用；点"应用映射"才生效）
onMounted(async () => {
  const map = await loadBuiltinMap()
  if (Object.keys(map).length) {
    builtinMap.value = map
    builtinLoaded.value = true
  }
})

function onDrop(e) {
  dragging.value = false
  const files = [...(e.dataTransfer?.files || [])]
  handleFiles(files)
}

function onSelect(e) {
  handleFiles([...(e.target.files || [])])
}

async function handleFiles(files) {
  const fontFile = files.find(isFontFile)
  if (!fontFile) {
    error.value = '请选择 ttf / otf / woff / woff2 格式的字体文件'
    return
  }
  error.value = ''
  warning.value = ''
  parsing.value = true
  parsed.value = []
  selected.value = new Set()
  try {
    // 文件过大预警（>10MB 可能解析失败或极慢，但不阻断）
    if (fontFile.size > 10 * 1024 * 1024) {
      warning.value = '⚠️ 文件超过 10MB，可能解析失败或耗时较长'
    }
    let icons = await parseFontFile(fontFile, size.value)
    // 字形数过多预警（>5000 不阻断）
    if (icons.length > 5000) {
      warning.value = (warning.value ? warning.value + '；' : '') + `字形数达 ${icons.length}（>5000），可能耗时较长或超出部分系统限制`
    }
    if (!icons.length) {
      error.value = '解析结果为空：该字体没有可导出的字形（可能全是空格/组合字符，或无轮廓字形）'
      return
    }
    // #8：若有映射表，给无名字的字形补名
    if (Object.keys(unicodeNameMap.value).length) {
      icons = applyUnicodeNameMap(icons, unicodeNameMap.value)
    }
    parsed.value = icons
    fileInfo.value = { name: fontFile.name, count: icons.length }
    selected.value = new Set(icons.map((_, i) => i))
  } catch (e) {
    // #6：解析失败原因回显
    error.value = '解析失败：' + (e?.message || e)
  } finally {
    parsing.value = false
  }
}

function toggleAll() {
  if (selected.value.size === parsed.value.length) {
    selected.value = new Set()
  } else {
    selected.value = new Set(parsed.value.map((_, i) => i))
  }
}

const exportable = computed(() =>
  parsed.value.filter((_, i) => selected.value.has(i))
)

async function downloadSvgs() {
  const icons = exportable.value.map((p) => ({ name: p.name, svg: p.svg }))
  await exportSvgZip(icons, size.value, `${store.fontName}-svgs.zip`)
}

function importToProject() {
  const items = exportable.value.map((p) => ({
    name: p.name,
    svg: p.svg,
    // #7：保持原 unicode 时传 unicode 码，否则 null 走稳定分配
    code: keepUnicode.value && p.unicode != null ? p.unicode : null
  }))
  // 保持原 unicode 的码位若落在本项目保留区（U+EE00–U+EFFF），先提醒确认
  const kept = items.filter((it) => it.code != null).map((it) => it.code)
  const reservedHits = [...new Set(kept.map((c) => {
    const n = typeof c === 'number' ? c : parseInt(String(c), 16)
    return (n >= RESERVED_START && n <= RESERVED_END) ? n : null
  }).filter((x) => x != null))]
  if (reservedHits.length) {
    const list = reservedHits.slice(0, 8).map((c) => 'U+' + c.toString(16).toUpperCase().padStart(4, '0')).join(', ')
    const more = reservedHits.length > 8 ? ' 等 ' + reservedHits.length + ' 个码位' : ''
    if (!confirm('⚠️ 所选字形中有 ' + reservedHits.length + ' 个原 unicode 码位落在本项目保留区（U+EE00–U+EFFF）：\n' + list + more + '\n\n该区域是「新增图标自动分配」使用的区间。\n建议：取消勾选「保持原字体 unicode」让这些字形走自动分配，或继续导入（保留原码位）。\n\n点击「确定」继续导入；点击「取消」返回调整。')) {
      return
    }
  }
  const res = store.addIcons(items)
  if (res.overflow) alert(res.overflow)
  emit('close')
}

// #8：应用映射（点击按钮后，把 json 文件映射 + 输入框映射合并应用，用于解析补名）
function applyMap() {
  const merged = { ...builtinMap.value }
  const pasted = parseUnicodeMap(mapText.value)
  Object.assign(merged, pasted) // 输入框粘贴覆盖 json
  if (!Object.keys(merged).length) {
    mapStatus.value = '未找到有效映射：请确认映射 json 存在且格式正确'
    return
  }
  unicodeNameMap.value = merged
  const jsonN = Object.keys(builtinMap.value).length
  const pasteN = Object.keys(pasted).length
  mapStatus.value = '已应用 json 文件 ' + jsonN + ' 条' + (pasteN ? '、输入框 ' + pasteN + ' 条' : '') + '映射关系'
  // 已解析的图标按最新映射重新补名
  if (parsed.value.length) {
    parsed.value = applyUnicodeNameMap(parsed.value, unicodeNameMap.value)
  }
}

// #11：预览里改名
function renameItem(i) {
  const newName = prompt('输入新名称：', parsed.value[i].name)
  if (newName && newName.trim()) {
    parsed.value[i].name = newName.trim()
  }
}

function miniSvg(svg) {
  return svg
    .replace(/width="[^"]*"/, 'width="32"')
    .replace(/height="[^"]*"/, 'height="32"')
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <header>
        <h3>解析字体文件</h3>
        <button class="close" @click="emit('close')">×</button>
      </header>

      <div class="body">
        <div class="settings">
          <label class="size-field">
            <span>SVG 尺寸</span>
            <div class="size-row">
              <select v-model="size">
                <option v-for="s in SVG_SIZES" :key="s" :value="s">{{ s }} × {{ s }}</option>
                <option value="custom">自定义</option>
              </select>
              <input v-if="size === 'custom'" v-model="customSize" class="custom-size" type="number" min="16" max="2048" placeholder="如 256" />
            </div>
          </label>
          <button class="map-btn" @click="showMap = !showMap" type="button" :class="{ active: showMap }">名称映射表</button>
          <label class="keep-unicode" title="#7：导入时保持原字体的 unicode 码位">
            <input type="checkbox" v-model="keepUnicode" />
            保持原字体 unicode
          </label>
        </div>

        <!-- #8：unicode→名称 映射表 -->
        <div v-if="showMap" class="map-box">
          <p class="map-desc">
            <template v-if="builtinLoaded">
              映射文件 <a :href="'./' + mapFileName" target="_blank" class="map-file-link" title="点击打开/下载该 json">{{ mapFileName }}</a>
              （读取到 {{ Object.keys(builtinMap).length }} 条映射关系），点击下方「应用映射」后生效，解析字形时自动命名。<br />
            </template>
            也可在下方输入框粘贴映射内容补充/覆盖。<small>格式示例：{"trash":"f1f8"}</small>
          </p>
          <textarea v-model="mapText" rows="4" placeholder='{"icon-name": "hex", ...}'></textarea>
          <div class="map-actions">
            <button type="button" @click="applyMap">应用映射</button>
            <span v-if="mapStatus" class="map-status">{{ mapStatus }}</span>
          </div>
        </div>

        <div
          class="dropzone"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="fileInput.click()"
        >
          <input ref="fileInput" type="file" accept=".ttf,.otf,.woff,.woff2" hidden @change="onSelect" />
          <p v-if="!parsing && !parsed.length">拖入字体文件，或点击选择<br /><small>支持 ttf / otf / woff / woff2</small></p>
          <p v-else-if="parsing">解析中…</p>
          <p v-else>已解析：{{ fileInfo?.name }}（{{ fileInfo?.count }} 个字形）<br /><small>点击可重新选择字体</small></p>
        </div>

        <p v-if="warning" class="warning">{{ warning }}</p>
        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="parsed.length">
          <div class="preview-head">
            <label><input type="checkbox" :checked="selected.size === parsed.length && parsed.length > 0" @change="toggleAll" /> 全选</label>
            <span>{{ selected.size }} / {{ parsed.length }}</span>
          </div>
          <div class="icon-list">
            <div
              v-for="(item, i) in parsed"
              :key="item.name + i"
              class="icon-item"
              :class="{ on: selected.has(i) }"
              @click="selected.has(i) ? selected.delete(i) : selected.add(i)"
            >
              <input type="checkbox" :checked="selected.has(i)" @click.stop />
              <div class="mini" v-html="miniSvg(item.svg)"></div>
              <span class="iname" :title="item.name">{{ item.name }}</span>
              <span class="icode" v-if="item.unicode != null">{{ item.unicode.toString(16).toUpperCase().padStart(4, '0') }}</span>
              <!-- #11：预览改名 -->
              <button class="rename-btn" type="button" @click.stop="renameItem(i)" title="改名">改名</button>
            </div>
          </div>
        </template>
      </div>

      <footer>
        <button @click="emit('close')">取消</button>
        <template v-if="parsed.length">
          <button @click="importToProject" :disabled="!exportable.length" class="primary">导入项目 ({{ exportable.length }})</button>
          <button @click="downloadSvgs" :disabled="!exportable.length">下载 SVG (zip)</button>
        </template>
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
  width: min(760px, 92vw);
  max-height: 86vh;
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
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.settings {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.settings label {
  font-size: 13px;
  color: var(--text-2);
}

/* SVG 尺寸字段：标签 + 下拉 横排 */
.size-field {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.size-field > span {
  color: var(--text-2);
  font-size: 13px;
}

.size-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.custom-size {
  width: 90px;
}

.keep-unicode {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}

.map-btn {
  padding: 7px 14px;
}

.map-btn.active {
  border-color: var(--primary);
  color: var(--primary);
  background: #f0f6ff;
}

.map-box {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: #fafbfd;
}

.map-desc {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
}

.map-file-link {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
  font-family: Consolas, monospace;
}

.map-file-link:hover {
  color: var(--primary-dark);
}

.map-box textarea {
  width: 100%;
  font-family: Consolas, monospace;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  resize: vertical;
}

.map-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.map-status {
  font-size: 12px;
  color: var(--primary);
}

.icode {
  /* 最小字号规则：全局不低于 12px */
  font-size: 12px;
  color: var(--text-2);
  font-family: Consolas, monospace;
}

.rename-btn {
  padding: 1px 6px;
  font-size: 12px;
  border-radius: 4px;
}

.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 30px;
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

.warning {
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 10px 0 0;
  font-size: 12px;
}

.error {
  color: var(--danger);
  margin: 10px 0 0;
}

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

.icon-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 6px;
  cursor: pointer;
  position: relative;
}

.icon-item.on {
  border-color: var(--primary);
  background: #f0f6ff;
}

.icon-item input {
  position: absolute;
  top: 6px;
  left: 6px;
}

.mini {
  color: #333;
  height: 36px;
  display: flex;
  align-items: center;
}

.iname {
  font-size: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}
</style>