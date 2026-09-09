<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 通用下拉菜单：props.label 为触发按钮文字，slots 放菜单项
// 用法：<DropdownMenu label="导入"><button>导入 SVG</button>…</DropdownMenu>
// open 受控（v-model:open）：父组件协调互斥（导入/导出同时只开一个）
defineProps({
  label: { type: String, required: true },
  title: { type: String, default: '' }
})
const open = defineModel('open', { type: Boolean, default: false })
const root = ref(null)

function toggle() {
  open.value = !open.value
}
function close() {
  open.value = false
}
// 点击页面其他区域关闭
function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) close()
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="dropdown" ref="root">
    <button class="trigger" :title="title" @click.stop="toggle">
      {{ label }}
      <!-- 下拉三角：单色线性 svg（用 currentColor 继承按钮颜色，替换原文字光标符 ▾） -->
      <svg class="caret" viewBox="0 0 12 8" width="10" height="7" aria-hidden="true">
        <path d="M1 1.5 L6 6.5 L11 1.5" fill="none" stroke="currentColor" stroke-width="1.6"
          stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div class="menu" v-if="open" @click="close">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
}
.trigger {
  /* 与其它顶部按钮一致 */
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;
}
.trigger:hover {
  border-color: var(--primary);
  color: var(--primary);
}
/* primary 变体：下拉按钮整体作为主操作（主色背景），如"导出" */
.dropdown.primary .trigger {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 600;
}
.dropdown.primary .trigger:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
  color: #fff;
}
.dropdown.primary .caret { opacity: 1; }
.caret {
  margin-left: 5px;
  vertical-align: middle;
  opacity: .65;
  flex-shrink: 0;
}
.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,.1);
  min-width: 150px;
  padding: 6px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
/* 触发按钮靠近右缘时菜单向右对齐，避免溢出视口 */
.dropdown.menu-right .menu {
  left: auto;
  right: 0;
}
.menu :deep(button) {
  border: none;
  background: transparent;
  text-align: left;
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}
.menu :deep(button:hover) {
  background: #f0f4ff;
  color: var(--primary);
}
/* 主操作项(如"下载项目")：主色强调，区别于普通菜单项 */
.menu :deep(button.primary-item) {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}
.menu :deep(button.primary-item:hover) {
  background: var(--primary-dark);
  color: #fff;
}
</style>
