<script setup lang="ts">
interface Props {
  variant?: 'default' | 'glass' | 'bordered'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  hoverable: false,
})
</script>

<template>
  <div :class="['card', `card-${variant}`, `card-p-${padding}`, { 'card-hoverable': hoverable }]">
    <slot />
  </div>
</template>

<style scoped>
.card {
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
}

/* Variants */
.card-default {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
}

.card-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
}

.card-bordered {
  background: transparent;
  border: 1px solid var(--color-border);
}

/* Padding */
.card-p-none { padding: 0; }
.card-p-sm { padding: var(--space-sm); }
.card-p-md { padding: var(--space-md); }
.card-p-lg { padding: var(--space-lg); }

/* Hoverable */
.card-hoverable {
  cursor: pointer;
}

.card-hoverable:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}
</style>
