<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>()

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="overlay">
      <div class="modal-card">
        <h3 class="title">{{ title }}</h3>
        <p class="message">{{ message }}</p>
        <div class="actions">
          <button class="btn btn-ghost" @click="emit('close')">
            {{ cancelText || 'Cancel' }}
          </button>
          <button 
            class="btn" 
            :class="danger ? 'btn-danger' : 'btn-primary'"
            @click="emit('confirm')"
          >
            {{ confirmText || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
  animation: bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.message {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  flex: 1;
}

/* Animations from global style are available, but defined locally for safety if transition logic differs */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
