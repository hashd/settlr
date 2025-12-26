<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'primary'
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'sm',
})
</script>

<template>
  <span :class="['badge', `badge-${variant}`, `badge-${size}`]">
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

/* Sizes */
.badge-sm {
  padding: 2px 8px;
  font-size: 0.625rem;
}

.badge-md {
  padding: 4px 12px;
  font-size: 0.75rem;
}

/* Variants */
.badge-default {
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
}

.badge-primary {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-light);
}

.badge-success {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-success);
}

.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
}

.badge-warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning);
}
</style>
