<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { type Toast, useToastStore } from '@/stores/toast'

const props = defineProps<{
  toast: Toast
}>()

const store = useToastStore()
const progress = ref(100)
let timer: any = null
let interval: any = null
const isActive = ref(true)

const duration = props.toast.duration || 3000
const step = 10 
const totalSteps = duration / step

function startTimer() {
  if (duration <= 0) return
  
  // Clear any existing
  clearInterval(interval)
  clearTimeout(timer)
  
  const decrement = 100 / totalSteps
  interval = setInterval(() => {
    progress.value -= decrement
    if (progress.value <= 0) {
      close()
    }
  }, step)
}

function pause() {
  isActive.value = false
  clearInterval(interval)
  clearTimeout(timer)
}

function resume() {
  isActive.value = true
  startTimer()
}

function close() {
  clearInterval(interval)
  store.removeToast(props.toast.id)
}

onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<template>
  <div 
    class="toast-card" 
    :class="toast.type" 
    @mouseenter="pause" 
    @mouseleave="resume"
    role="alert"
  >
    <!-- Icon Area -->
    <div class="toast-icon-wrapper">
      <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" class="toast-icon">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" class="circle-path"/>
        <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-path"/>
      </svg>
      <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" class="toast-icon">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" class="toast-icon">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>

    <!-- Content -->
    <div class="toast-content">
      <span class="toast-message">{{ toast.message }}</span>
    </div>

    <!-- Close -->
    <button class="toast-close" @click="close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>

    <!-- Progress -->
    <div class="toast-progress" v-if="duration > 0">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.toast-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px; /* Pill shapeish */
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 0 0 1px rgba(0, 0, 0, 0.03);
  min-width: 320px;
  max-width: 420px;
  width: 100%;
  pointer-events: auto;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.toast-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 10px 25px -5px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.03);
}

.toast-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  width: 28px; /* Fixed width for alignment */
}

/* Colors */
.toast-card.success .toast-icon { color: #10b981; }
.toast-card.error .toast-icon { color: #ef4444; }
.toast-card.info .toast-icon { color: #6366f1; }

/* SVG Animations setup if needed, using simple CSS for now */
.toast-card.success .check-path {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: draw 0.4s ease-out forwards 0.2s;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

.toast-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.toast-message {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  padding: 8px;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  border-radius: 50%;
  transition: all 0.2s;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
}

/* Progress Bar */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: transparent;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, transparent, currentColor);
  opacity: 0.2;
  border-radius: 0 4px 4px 0;
  transition: width 0.01s linear; /* Smooth linear update */
}

.toast-card.success .progress-bar { background: #10b981; opacity: 0.3; }
.toast-card.error .progress-bar { background: #ef4444; opacity: 0.3; }
.toast-card.info .progress-bar { background: #6366f1; opacity: 0.3; }

</style>
