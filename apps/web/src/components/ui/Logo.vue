<template>
  <div class="logo-wrapper" :style="{ '--size': size + 'px' }">
    <div class="logo-mark">
      <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#logo-grad)"/>
        <path d="M2 17l10 5 10-5" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12l10 5 10-5" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="logo-grad" x1="2" y1="2" x2="22" y2="22">
            <stop offset="0%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#a855f7"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <span v-if="!hideText" class="logo-text">Settlr</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  size?: number | string
  hideText?: boolean
}>()
</script>

<style scoped>
.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  user-select: none;
}

.logo-mark {
  width: calc(var(--size, 24px) * 1.5);
  height: calc(var(--size, 24px) * 1.5);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
