<script setup lang="ts">
import { type Toast, useToastStore } from '@/stores/toast'

const props = defineProps<{
  toast: Toast
}>()

const store = useToastStore()

function close() {
  store.removeToast(props.toast.id)
}
</script>

<template>
  <div class="toast" :class="toast.type" role="alert">
    <div class="toast-content">{{ toast.message }}</div>
    <button class="toast-close" @click="close" aria-label="Close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  box-shadow: var(--shadow-xl);
  border-left: 4px solid var(--color-text-muted);
  pointer-events: auto;
  min-width: 280px;
  max-width: 360px;
}

.toast.success {
  border-left-color: var(--color-success);
}

.toast.error {
  border-left-color: var(--color-danger);
}

.toast.info {
  border-left-color: var(--color-primary);
}

.toast-content {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-close:hover {
  color: var(--color-text);
}
</style>
