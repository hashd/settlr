<script setup lang="ts">
defineProps<{
  variant?: 'card' | 'line' | 'circle' | 'text'
  width?: string
  height?: string
}>()
</script>

<template>
  <div 
    class="skeleton" 
    :class="variant || 'card'"
    :style="{ width: width, height: height }"
  >
    <div class="shimmer"></div>
  </div>
</template>

<style scoped>
.skeleton {
  position: relative;
  background: var(--color-bg-secondary, #f3f4f6);
  border-radius: 8px;
  overflow: hidden;
}

.skeleton.card {
  width: 100%;
  height: 80px;
  border-radius: 16px;
}

.skeleton.line {
  width: 100%;
  height: 16px;
  border-radius: 8px;
}

.skeleton.circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.skeleton.text {
  width: 60%;
  height: 14px;
  border-radius: 4px;
}

.shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.5) 50%, 
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
