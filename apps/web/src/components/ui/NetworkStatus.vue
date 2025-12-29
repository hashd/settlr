<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOffline = ref(!navigator.onLine)
const showBanner = ref(false)

function handleOnline() {
  isOffline.value = false
  // Show "back online" briefly
  showBanner.value = true
  setTimeout(() => showBanner.value = false, 3000)
}

function handleOffline() {
  isOffline.value = true
  showBanner.value = true
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  // Show if starting offline
  if (!navigator.onLine) showBanner.value = true
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<template>
  <Transition name="slide">
    <div v-if="showBanner" :class="['network-status', { offline: isOffline }]">
      <div class="status-content">
        <span class="status-icon">{{ isOffline ? '📡' : '✅' }}</span>
        <span class="status-text">
          {{ isOffline ? 'You\'re offline. Some features may be limited.' : 'Back online!' }}
        </span>
      </div>
      <button v-if="!isOffline" class="dismiss-btn" @click="showBanner = false">
        ✕
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.network-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.network-status.offline {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-icon {
  font-size: 1rem;
}

.status-text {
  line-height: 1.3;
}

.dismiss-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
