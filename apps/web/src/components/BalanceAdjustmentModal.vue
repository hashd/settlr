<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMutation } from '@vue/apollo-composable'
import { ADJUST_BALANCE_MUTATION } from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  groupId: string
  members: { user: { id: string; name: string } }[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const toast = useToastStore()

const fromUserId = ref('')
const toUserId = ref('')
const amount = ref('')
const notes = ref('')

const { mutate: adjustBalance, loading } = useMutation(ADJUST_BALANCE_MUTATION)

const canSubmit = computed(() => 
  fromUserId.value && 
  toUserId.value && 
  fromUserId.value !== toUserId.value &&
  parseFloat(amount.value) > 0 &&
  notes.value.trim()
)

// Default to first two members
watch(() => props.members, (m) => {
  if (m.length >= 2) {
    fromUserId.value = m[0].user.id
    toUserId.value = m[1].user.id
  }
}, { immediate: true })

async function handleSubmit() {
  if (!canSubmit.value) return
  
  try {
    await adjustBalance({
      groupId: props.groupId,
      fromUserId: fromUserId.value,
      toUserId: toUserId.value,
      amount: Math.round(parseFloat(amount.value) * 100),
      notes: notes.value
    })
    toast.success('Balance adjusted')
    emit('saved')
    emit('close')
  } catch (e: any) {
    toast.error(e.message || 'Failed to adjust balance')
  }
}

const fromName = computed(() => props.members.find(m => m.user.id === fromUserId.value)?.user.name || '')
const toName = computed(() => props.members.find(m => m.user.id === toUserId.value)?.user.name || '')
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>⚖️ Adjust Balance</h2>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>
      
      <div class="modal-body">
        <p class="explainer">
          Use this to manually correct balances when the actual amounts differ from what's recorded.
        </p>
        
        <div class="form-group">
          <label>From</label>
          <select v-model="fromUserId">
            <option v-for="m in members" :key="m.user.id" :value="m.user.id">
              {{ m.user.name }}
            </option>
          </select>
        </div>
        
        <div class="arrow">↓</div>
        
        <div class="form-group">
          <label>To</label>
          <select v-model="toUserId">
            <option v-for="m in members" :key="m.user.id" :value="m.user.id">
              {{ m.user.name }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Amount (₹)</label>
          <input v-model="amount" type="number" placeholder="0.00" />
        </div>
        
        <div class="form-group">
          <label>Reason (required)</label>
          <textarea v-model="notes" placeholder="e.g. Correcting previous error, Starting fresh, etc." rows="2" />
        </div>
        
        <div v-if="fromUserId && toUserId && amount" class="preview">
          This will reduce <strong>{{ fromName }}</strong>'s balance and 
          increase <strong>{{ toName }}</strong>'s balance by 
          <strong>₹{{ parseFloat(amount || '0').toLocaleString('en-IN') }}</strong>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button class="btn-primary" @click="handleSubmit" :disabled="!canSubmit || loading">
          {{ loading ? 'Saving...' : 'Adjust Balance' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-bg-secondary);
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
}

.modal-body {
  padding: 24px;
}

.explainer {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 0.9375rem;
  font-family: inherit;
}

.arrow {
  text-align: center;
  font-size: 1.25rem;
  color: var(--color-text-dimmed);
  margin: -8px 0;
}

.preview {
  margin-top: 20px;
  padding: 14px;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  font-size: 0.8125rem;
  line-height: 1.6;
}

.preview strong {
  color: var(--color-primary);
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-border);
}
</style>
