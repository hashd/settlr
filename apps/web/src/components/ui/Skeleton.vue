<script setup lang="ts">
defineProps<{
  width?: string
  height?: string
  borderRadius?: string
}>()
</script>

<template>
  <div 
    class="skeleton" 
    :style="{ 
      width: width || '100%', 
      height: height || '1em',
      borderRadius: borderRadius || 'var(--radius-md)'
    }"
  ></div>
</template>

<style scoped>
.skeleton {
  background: var(--color-bg-secondary);
  position: relative;
  overflow: hidden;
  /* Ensure it has some size if empty */
  min-height: 1px;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
