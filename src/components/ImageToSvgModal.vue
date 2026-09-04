<script setup>
// 图片转 SVG 弹窗（当前为"功能开发中"占位示意，功能待后续开发）
// 仅保留弹窗外壳与说明文字，不包含任何转换/上传/下载逻辑
const emit = defineEmits(['close'])
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <header>
        <h3>图片转 SVG</h3>
        <button class="close" @click="emit('close')">×</button>
      </header>
      <div class="body">
        <div class="dev-placeholder">
          <div class="dev-icon">🚧</div>
          <p class="dev-title">功能开发中</p>
          <p class="dev-desc">
            图片转 SVG 功能正在开发中，敬请期待。<br />
            当前仅提供弹窗作为功能入口示意，暂无转换能力。
          </p>
        </div>
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
  width: min(420px, 92vw);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
header h3 { margin: 0; font-size: 16px; }
.close { border: none; background: transparent; font-size: 22px; color: var(--text-2); }
.body { padding: 32px 20px; text-align: center; }
.dev-icon { font-size: 48px; }
.dev-title { font-size: 16px; font-weight: 600; margin: 12px 0 8px; color: var(--text); }
.dev-desc { font-size: 13px; color: var(--text-2); line-height: 1.7; margin: 0; }
footer {
  display: flex; justify-content: flex-end; padding: 14px 20px;
  border-top: 1px solid var(--border);
}
</style>
