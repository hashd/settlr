<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  defaultValue?: string
}>()

const emit = defineEmits(['close', 'confirm'])

const inputValue = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    inputValue.value = props.defaultValue || ''
  }
})

function handleConfirm() {
  if (!inputValue.value) return
  emit('confirm', inputValue.value)
}
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="overlay">
      <div class="modal-card">
        <h3 class="title">{{ title }}</h3>
        <p v-if="message" class="message">{{ message }}</p>
        
        <input 
          v-model="inputValue"
          type="text" 
          class="input mb-6"
          :placeholder="placeholder"
          @keyup.enter="handleConfirm"
          autofocus
        />

        <div class="actions">
          <button class="btn btn-ghost" @click="emit('close')">
            {{ cancelText || 'Cancel' }}
          </button>
          <button 
            class="btn btn-primary"
            :disabled="!inputValue"
            @click="handleConfirm"
          >
            {{ confirmText || 'Submit' }}
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
  margin-bottom: 16px;
  line-height: 1.5;
}

.mb-6 {
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  flex: 1;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
