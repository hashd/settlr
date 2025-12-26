<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
  centered?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  centered: true,
})
</script>

<template>
  <div :class="['spinner-container', { centered }]">
    <div :class="['spinner', `spinner-${size}`]"></div>
  </div>
</template>

<style scoped>
.spinner-container.centered {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}

.spinner {
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 20px;
  height: 20px;
}

.spinner-md {
  width: 32px;
  height: 32px;
}

.spinner-lg {
  width: 48px;
  height: 48px;
  border-width: 3px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
