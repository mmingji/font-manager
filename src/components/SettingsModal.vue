<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from '../store/project'
import { loadBuiltinMap } from '../lib/unicodeMap'
import { RESERVED } from '../lib/codepointPlan'

const emit = defineEmits(['close'])
const store = useProjectStore()

const SVG_SIZES = [128, 512, 1024]

// 配置文件链接：开发版与构建版统一为 public/*.data.js（内容即 JSON）
// 点击可直接打开编辑，保存后刷新页面即生效（映射表 / 码位规划均如此）
// 保留区范围标签（跟随码位规划配置，见 lib/codepointPlan.js 的 RESERVED）
const reservedRangeLabel = `U+${RESERVED.start.toString(16).toUpperCase()}–U+${RESERVED.end.toString(16).toUpperCase()}`

const mapFileName = 'unicode-map.data.js'
const planFileName = 'codepoint-plan.data.js'
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

// ---------- 映射批量改名（unicode-map.data.js → 当前项目图标） ----------
// 需求：修改 public/unicode-map.data.js 后，管理页按映射批量把命中 unicode 的图标改成其中的名称
const mapStatus = ref('')
const mapLoading = ref(false)

onMounted(async () => {
  try {
    await loadBuiltinMap() // 预热映射表（解析命名/批量改名用），只加载一次
  } catch { /* 忽略 */ }
})

// ---------- 本项目保留区占用（设置面板显示） ----------
// 数据来源：当前项目的图标列表（store.icons）中落在保留区范围内的码位数；
// 保留区范围来自 codepoint-plan.data.js 的 project_alloc（启动时读取，改文件后刷新页面生效）。
// 说明：此处只统计「本项目」，参考图标集（unicode-map.data.js）的占用情况不再占用面板空间，
//       如需要可直接查看 codepoint-plan.data.js 的 reference_sections 说明。
const projectReserved = computed(() => {
  const total = RESERVED.end - RESERVED.start + 1
  let used = 0
  for (const icon of store.icons) {
    if (icon.code != null && icon.code >= RESERVED.start && icon.code <= RESERVED.end) used++
  }
  return { used, total, free: total - used, percent: total > 0 ? Math.round((used / total) * 100) : 0 }
})

async function applyMapRename() {
  mapLoading.value = true
  mapStatus.value = ''
  try {
    const map = await loadBuiltinMap(true) // 强制重新读取（绕过浏览器缓存）
    const hexToName = map
    // 对当前项目每个图标：若其 code 在映射中且映射名与现名不同，则改名（改名在 store 内保证唯一）
    // 交给 store 一次性批量改名（内部只持久化一次；逐个 renameIcon 会因 3700 次写盘卡死页面）
    const changed = store.renameByMap(hexToName)
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
  <div class="drawer-backdrop">
    <aside class="drawer" role="dialog" aria-label="项目设置">
      <header>
        <h3>项目设置</h3>
        <button class="close" @click="emit('close')" title="关闭">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </header>
      <div class="drawer-body">
        <!-- 基本信息：无标题，字段单列排布作为抽屉主体（移除了原「基本信息」标题） -->
        <div class="info-grid">
          <label class="field">
            <span>项目名称</span>
            <input v-model="projectName" type="text" placeholder="默认 snfont" />
          </label>
          <label class="field">
            <span>CSS 类前缀</span>
            <input v-model="classPrefix" type="text" placeholder="默认 sn-" />
            <small>如 .sn-trash 中的 sn-</small>
          </label>
          <label class="field">
            <span>字体名称</span>
            <input v-model="fontName" type="text" placeholder="默认 snfont" />
            <small>影响 ttf/woff/woff2/css 文件名与 font-family</small>
          </label>
          <label class="field">
            <span>基础字符字重</span>
            <select v-model="weight">
              <option v-for="w in WEIGHTS" :key="w.value" :value="w.value">{{ w.label }}</option>
            </select>
            <small>决定生成字体内字母/符号取常规还是粗体字形；图标名与 unicode 不受影响。常规产物文件名为 {{ fontName }}-regular，粗体为 {{ fontName }}-bold</small>
          </label>
          <label class="field">
            <span>SVG 尺寸</span>
            <div class="size-row">
              <select v-model="svgSize">
                <option v-for="s in SVG_SIZES" :key="s" :value="s">{{ s }} × {{ s }}</option>
                <option value="custom">自定义</option>
              </select>
              <input v-if="svgSize === 'custom'" v-model="customSize" type="number" min="16" max="2048" placeholder="如 256" class="custom-size" />
            </div>
            <small>应用于解析字体、导入 SVG、导出 SVG</small>
          </label>
        </div>

        <section class="panel">
          <div class="panel-head">
            <h4>按 unicode 映射批量改名</h4>
            <button class="small" :disabled="mapLoading" @click="applyMapRename">{{ mapLoading ? '处理中…' : '应用映射改名' }}</button>
          </div>
          <p class="panel-desc">
            读取
            <a :href="'./' + mapFileName" target="_blank" class="cfg-link" @click.stop title="点击打开该配置文件，编辑保存后刷新页面即生效">{{ mapFileName }}</a>
            ，把当前项目中 unicode 命中映射的图标统一改成该文件中的名称（改完保存、刷新页面后点此即生效）。
          </p>
          <p v-if="mapStatus" class="mr-status">{{ mapStatus }}</p>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h4>本项目保留区占用</h4>
          </div>
          <p class="panel-desc">
            本项目新增图标按顺序取用保留区 <b>{{ reservedRangeLabel }}</b>（{{ projectReserved.total }} 个）；
            导入字形原码位落在此区间时会提醒。
          </p>
          <!-- 范围标签与「已用」同一行、同样式（粗体等宽），条形容器只保留进度条与计数 -->
          <p class="cp-line">
            <b>{{ reservedRangeLabel }}</b>
            <b>已用</b> {{ projectReserved.used }} / {{ projectReserved.total }} 个
            <span class="cp-free">（剩余 {{ projectReserved.free }} 个）</span>
          </p>
          <div class="cp-seg">
            <span class="seg-bar"><i :style="{ width: projectReserved.percent + '%' }"></i></span>
            <span class="seg-count">{{ projectReserved.used }} / {{ projectReserved.total }}</span>
          </div>
          <p class="cp-note">
            保留区范围来自
            <a :href="'./' + planFileName" target="_blank" class="cfg-link" @click.stop title="点击打开该配置文件，编辑 project_alloc.start/end 后刷新页面即生效">{{ planFileName }}</a>
            的 <code>project_alloc</code>（保存后刷新页面生效）；
            该文件中也记录了参考图标集的占用分段定义（<code>reference_sections</code>），本面板不再显示。
          </p>
        </section>
      </div>
      <footer>
        <button class="ghost" @click="emit('close')">取消</button>
        <button class="primary" @click="save">保存</button>
      </footer>
    </aside>
  </div>
</template>
<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.35);
  /* 点击背景不关闭设置抽屉 */
}
.drawer {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: min(500px, 100vw);
  background: #fff;
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.22s ease-out;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 26px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
header h3 { margin: 0; font-size: 17px; font-weight: 700; }
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
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 26px 30px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
/* 基本信息：单列排布，字段纵向依次排列 */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* 面板容器：浅灰底 + 虚线描边（映射改名 / 码位占用共用） */
.panel {
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #fafbfd;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.panel h4 { margin: 0; font-size: 13px; font-weight: 700; }
.panel-desc, .cp-desc, .cp-line, .cp-error { font-size: 12px; line-height: 1.7; margin: 0; color: var(--text-2); }
.field { display: flex; flex-direction: column; gap: 7px; font-size: 13px; color: var(--text); }
.field > span { font-weight: 600; }
.field small { color: var(--text-2); font-size: 12px; line-height: 1.6; }
.field input, .field select {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  font-size: 13px;
  outline: none;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field input:focus, .field select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.size-row { display: flex; gap: 8px; align-items: center; }
.size-row select { flex: 1; }
.custom-size { width: 120px; }
button.small {
  padding: 6px 14px;
  font-size: 12px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text);
  transition: all 0.15s;
}
button.small:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
button.small:disabled { opacity: 0.5; cursor: not-allowed; }
.mr-status { margin: 0; font-size: 12px; color: var(--primary); }
.cp-line b { font-family: Consolas, monospace; color: var(--text); }
.cp-line b + b { margin-left: 10px; } /* 范围与「已用」之间留出间隔（两者样式一致） */
.cp-note { color: var(--text-2); }
.cp-free { color: var(--text-2); font-size: 12px; }

/* 配置文件链接：与字体解析弹窗的映射文件链接风格一致 */
.cfg-link {
  color: var(--primary);
  text-decoration: none;
  border-bottom: 1px dashed currentColor;
  cursor: pointer;
}
.cfg-link:hover { color: var(--primary-dark); }
.cp-error { color: #c03535; }
.cp-seg { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.seg-bar { flex: 1; height: 6px; border-radius: 3px; background: #eef1f6; overflow: hidden; }
.seg-bar i { display: block; height: 100%; background: var(--primary); border-radius: 3px; }
.seg-count { width: 74px; text-align: right; font-family: Consolas, monospace; color: var(--text-2); }
footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 26px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
footer button { padding: 10px 22px; font-size: 13px; border-radius: 9px; cursor: pointer; transition: all 0.15s; }
footer .ghost { border: 1px solid var(--border); background: #fff; color: var(--text); }
footer .ghost:hover { background: #f5f7fa; }
footer .primary { border: none; background: var(--primary); color: #fff; font-weight: 600; }
footer .primary:hover { background: var(--primary-dark); }
</style>