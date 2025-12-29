<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', action: string): void
}>()

const isAnimating = ref(false)

watch(() => props.open, (newVal) => {
  if (newVal) {
    isAnimating.value = true
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

function handleAction(action: string) {
  emit('action', action)
  emit('close')
}

function handleClose() {
  emit('close')
}

const actions = [
  { id: 'expense', icon: '💸', label: 'Add Expense', description: 'Split a bill with the group' },
  { id: 'recurring', icon: '🔄', label: 'New Recurring', description: 'Set up automatic expenses' },
  { id: 'settle', icon: '✅', label: 'Record Payment', description: 'Settle a balance' },
]
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-overlay" @click.self="handleClose">
        <div class="sheet-container">
          <div class="sheet-handle" @click="handleClose">
            <span></span>
          </div>
          
          <h3 class="sheet-title">What would you like to do?</h3>
          
          <div class="action-list">
            <button 
              v-for="action in actions" 
              :key="action.id" 
              class="action-item"
              @click="handleAction(action.id)"
            >
              <span class="action-icon">{{ action.icon }}</span>
              <div class="action-content">
                <span class="action-label">{{ action.label }}</span>
                <span class="action-desc">{{ action.description }}</span>
              </div>
              <svg class="action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          
          <button class="cancel-btn" @click="handleClose">Cancel</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 300;
  padding: 0 16px 16px;
}

.sheet-container {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 20px 20px 16px 16px;
  padding: 12px 20px 20px;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
  cursor: pointer;
}

.sheet-handle span {
  width: 36px;
  height: 4px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 100px;
}

.sheet-title {
  font-size: 1.125rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 20px;
  color: var(--color-text);
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-item:hover {
  background: white;
  border-color: var(--color-border);
  transform: translateX(4px);
}

.action-item:active {
  transform: scale(0.98);
}

.action-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-label {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
}

.action-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.action-arrow {
  color: var(--color-text-dimmed);
  flex-shrink: 0;
}

.cancel-btn {
  width: 100%;
  padding: 14px;
  margin-top: 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

/* Transitions */
.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.3s ease;
}

.sheet-enter-active .sheet-container,
.sheet-leave-active .sheet-container {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  background: rgba(0, 0, 0, 0);
}

.sheet-enter-from .sheet-container,
.sheet-leave-to .sheet-container {
  transform: translateY(100%);
}

/* Desktop positioning */
@media (min-width: 640px) {
  .sheet-overlay {
    align-items: center;
    padding: 24px;
  }
  
  .sheet-container {
    border-radius: 20px;
  }
}
</style>
