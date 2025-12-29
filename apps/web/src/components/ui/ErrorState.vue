<script setup lang="ts">
defineProps<{
  title?: string
  message?: string
  icon?: string
  retryable?: boolean
}>()

const emit = defineEmits(['retry'])
</script>

<template>
  <div class="error-state">
    <div class="error-icon">{{ icon || '😕' }}</div>
    <h3 class="error-title">{{ title || 'Something went wrong' }}</h3>
    <p class="error-message">{{ message || 'Please try again later.' }}</p>
    <button v-if="retryable" class="retry-btn" @click="emit('retry')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M1 4v6h6M23 20v-6h-6"/>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
      </svg>
      Try Again
    </button>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text);
}

.error-message {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  max-width: 280px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.retry-btn:active {
  transform: translateY(0);
}
</style>
