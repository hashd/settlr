<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import ToastItem from './ToastItem.vue'

const store = useToastStore()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <ToastItem 
        v-for="toast in store.toasts" 
        :key="toast.id" 
        :toast="toast" 
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  pointer-events: none;
  width: auto;
  min-width: 320px;
}

.toast-move,
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
  position: absolute; /* Ensure smooth removal from flow */
}

/* Ensure leaves don't block moves */
.toast-leave-active {
  position: absolute;
  width: 100%; /* Maintain width during leave */
}
</style>
