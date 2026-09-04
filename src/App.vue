<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from './store/project'
import IconGrid from './components/IconGrid.vue'
import FontParser from './components/FontParser.vue'
import ImportModal from './components/ImportModal.vue'
import ImageToSvgModal from './components/ImageToSvgModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import DropdownMenu from './components/DropdownMenu.vue'
import { exportSvgZip, exportProjectZip } from './lib/zip'

const store = useProjectStore()

// 启动时自动修复旧版本解析出的异常 SVG
const repairNotice = ref('')
onMounted(() => {
  const n = store.repairAll()
  if (n > 0) {
    repairNotice.value = `已自动修复 ${n} 个异常图标（坐标越界）`
    setTimeout(() => (repairNotice.value = ''), 5000)
  }
})

// 弹窗控制
const showParser = ref(false)
const showImport = ref(false)
const showImageToSvg = ref(false)
const showSettings = ref(false)

// 搜索（#1：默认隐藏，按钮展开）
const keyword = ref('')
const showSearch = ref(false)
const searchInput = ref(null)

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    // 展开后聚焦输入框
    setTimeout(() => searchInput.value?.focus(), 50)
  } else {
    keyword.value = ''
  }
}

function closeSearch() {
  showSearch.value = false
  keyword.value = ''
}

// 批量选择
const selectMode = ref(false)
const selectedIds = ref([])

const filteredIcons = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return store.icons
  return store.icons.filter((i) => {
    if (i.name.toLowerCase().includes(kw)) return true
    // 支持按 unicode 搜索（hex，如 e000、f1f8）
    if (i.code != null) {
      const hex = i.code.toString(16).toLowerCase()
      if (hex.includes(kw) || ('u+' + hex).includes(kw)) return true
    }
    return false
  })
})

function toggleAll() {
  if (selectedIds.value.length === filteredIcons.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredIcons.value.map((i) => i.id)
  }
}

function removeSelected() {
  if (!selectedIds.value.length) return
  if (confirm(`确认删除选中的 ${selectedIds.value.length} 个图标？`)) {
    store.removeIcons(selectedIds.value)
    selectedIds.value = []
  }
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) selectedIds.value = []
}

// 导出
// #9：导出 SVG 需先选择图标
async function exportSvgs() {
  if (!selectMode.value) {
    // 未选择：进入多选模式提示先选择
    selectMode.value = true
    alert('请先勾选要导出的图标，再点「导出 SVG」')
    return
  }
  const selectedIcons = store.icons.filter((i) => selectedIds.value.includes(i.id))
  if (!selectedIcons.length) {
    alert('请先勾选要导出的图标')
    return
  }
  await exportSvgZip(selectedIcons, store.svgSize, `${store.fontName}-svgs.zip`)
}

// 多选模式下导出选中项（工具栏按钮用）
async function exportSelectedSvgs() {
  const selectedIcons = store.icons.filter((i) => selectedIds.value.includes(i.id))
  if (!selectedIcons.length) {
    alert('请先勾选要导出的图标')
    return
  }
  await exportSvgZip(selectedIcons, store.svgSize, `${store.fontName}-svgs.zip`)
}

async function exportProject() {
  await exportProjectZip(
    {
      name: store.name,
      fontName: store.fontName,
      classPrefix: store.classPrefix,
      weight: store.weight,
      icons: store.icons,
      svgSize: store.svgSize
    },
    store.svgSize
  )
}

</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <div class="brand-text">
          <!-- 顶栏固定为功能名「图标管理」；字体名/项目名不写入标题（工具性质），项目名在副信息行展示 -->
          <h1>图标管理</h1>
          <div class="project-sub">
            <span>{{ store.name }}</span>
            <span class="sub-sep">·</span>
            <span>前缀 {{ store.classPrefix }}</span>
            <span class="sub-sep">·</span>
            <span>{{ store.weight === 'bold' ? '粗体 Bold' : '常规 Regular' }}</span>
            <span class="sub-sep">·</span>
            <span>共 {{ store.count }} 个图标</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button @click="toggleSearch" :class="{ active: showSearch }" title="搜索图标">搜索</button>
        <button @click="toggleSelectMode">{{ selectMode ? '退出多选' : '多选' }}</button>
        <button @click="showSettings = true" title="项目名称/CSS前缀/字体名/SVG尺寸">设置</button>
        <DropdownMenu label="导入" title="导入 SVG / 图片转 SVG / 解析字体">
          <button @click="showImport = true">导入 SVG</button>
          <button @click="showImageToSvg = true">图片转 SVG</button>
          <button @click="showParser = true">解析字体</button>
        </DropdownMenu>
        <!-- 导出下拉：整个按钮为主色主操作(导出)，下载项目为普通菜单项 -->
        <DropdownMenu label="导出" title="下载项目 / 导出 SVG" class="export-dd primary">
          <button @click="exportProject">下载项目</button>
          <button @click="exportSvgs">导出 SVG</button>
        </DropdownMenu>
      </div>
    </header>

    <!-- toolbar：未点搜索时仅显示一条灰色线；点搜索后显示搜索框 + 匹配统计；多选操作保留 -->
    <section class="toolbar" :class="{ searching: showSearch || selectMode }">
      <template v-if="showSearch">
        <div class="search-box">
          <input v-model="keyword" type="text" placeholder="搜索名称或 unicode…" ref="searchInput" @keydown.esc="closeSearch" />
        </div>
        <!-- 搜索统计始终显示；repairNotice 为独立的启动修复提示，不与统计互斥 -->
        <div class="stat">共 {{ filteredIcons.length }} / {{ store.count }} 个图标</div>
      </template>
      <div class="stat repair-notice" v-if="repairNotice">{{ repairNotice }}</div>
      <div class="toolbar-right" v-if="selectMode">
        <label class="select-all">
          <input type="checkbox" :checked="selectedIds.length === filteredIcons.length && filteredIcons.length > 0" @change="toggleAll" />
          全选
        </label>
        <button :disabled="!selectedIds.length" @click="exportSelectedSvgs">导出选中 SVG</button>
        <button class="danger" :disabled="!selectedIds.length" @click="removeSelected">删除选中 ({{ selectedIds.length }})</button>
      </div>
    </section>

    <main class="content" :class="{ empty: !store.count }">
      <!-- 项目有图标时渲染网格；无图标时只显示引导提示(避免空网格+引导叠加) -->
      <IconGrid
        v-if="store.count"
        :icons="filteredIcons"
        :select-mode="selectMode"
        :selected-ids="selectedIds"
        @toggle-select="(id) => {
          const idx = selectedIds.indexOf(id)
          idx >= 0 ? selectedIds.splice(idx, 1) : selectedIds.push(id)
        }"
      />
      <!-- 首次打开/无图标时的引导提示（替代"没有匹配的图标"，引导用户导入或解析） -->
      <div v-if="!store.count" class="empty">
        <p class="empty-hint">项目还没有图标，请先导入 SVG，或上传字体文件解析</p>
        <div class="empty-actions">
          <button class="primary" @click="showImport = true">导入 SVG</button>
          <button @click="showParser = true">解析字体文件</button>
        </div>
      </div>
    </main>

    <FontParser v-if="showParser" @close="showParser = false" />
    <ImportModal v-if="showImport" @close="showImport = false" />
    <ImageToSvgModal v-if="showImageToSvg" @close="showImageToSvg = false" />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<style scoped>
.app {
  /* 去掉 max-width，页面自适应撑满 */
  margin: 0 auto;
  padding: 0 20px;
  /* #4：占满视口高度，flex 布局，main 内部滚动 */
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0;
  gap: 12px;
  flex-wrap: wrap;
}

/* 顶栏左侧仅文字块 */
.brand {
  min-width: 0;
}

.brand-text h1 {
  margin: 0;
  font-size: 20px;
}

.project-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-sep {
  color: #c9cfdb;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar {
  /* 默认：只有一条灰色线（不占高度，仅下边框） */
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 0;
  margin-bottom: 16px;
  flex-wrap: wrap;
  height: 0;
  overflow: visible;
}

/* 搜索/多选时：正常内容布局，恢复高度 */
.toolbar.searching {
  height: auto;
  padding: 8px 0;
  min-height: 37px;
  gap: 12px;
}

.search-box {
  flex: 1;
  min-width: 200px;
}

.search-box input {
  width: 100%;
}

.stat {
  /* 无填充，只保留底部一条线（与 head 风格一致） */
  color: var(--text-2);
  font-size: 12px;
  white-space: nowrap;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 2px 2px 2px 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-2);
  cursor: pointer;
}

.content {
  position: relative;
  /* #4：占满剩余高度 */
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* #6：空状态给 main 区域加边框 */
.content.empty {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  background: #fafbfd;
  min-height: 300px;
}

.empty {
  text-align: center;
  padding: 80px 0;
  color: var(--text-2);
}

.empty-hint {
  font-size: 15px;
  color: var(--text);
  margin: 0 0 16px;
}

.empty-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 16px;
}
</style>
