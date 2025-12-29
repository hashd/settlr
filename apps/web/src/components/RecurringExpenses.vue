<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { 
  RECURRING_EXPENSES_QUERY, 
  CREATE_RECURRING_EXPENSE_MUTATION,
  DELETE_RECURRING_EXPENSE_MUTATION,
  PROCESS_RECURRING_EXPENSE_MUTATION 
} from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const props = defineProps<{
  groupId: string
  members: { user: { id: string; name: string } }[]
}>()

const emit = defineEmits<{ (e: 'refresh'): void }>()
const toast = useToastStore()

const showForm = ref(false)
const confirmState = ref({
  open: false,
  title: '',
  message: '',
  onConfirm: () => {}
})
const description = ref('')
const amount = ref('')
const frequency = ref<'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'>('MONTHLY')
const dayOfMonth = ref(1)
const participantIds = ref<string[]>([])

const { result, loading, refetch } = useQuery(RECURRING_EXPENSES_QUERY, { groupId: props.groupId })
const recurring = computed(() => result.value?.recurringExpenses || [])

const { mutate: createRecurring, loading: creating } = useMutation(CREATE_RECURRING_EXPENSE_MUTATION)
const { mutate: deleteRecurring } = useMutation(DELETE_RECURRING_EXPENSE_MUTATION)
const { mutate: processRecurring } = useMutation(PROCESS_RECURRING_EXPENSE_MUTATION)

function openForm() {
  showForm.value = true
  participantIds.value = props.members.map(m => m.user.id)
}

async function handleCreate() {
  if (!description.value.trim() || !amount.value) return
  
  try {
    await createRecurring({
      groupId: props.groupId,
      description: description.value,
      amount: Math.round(parseFloat(amount.value) * 100),
      frequency: frequency.value,
      dayOfMonth: frequency.value === 'MONTHLY' ? dayOfMonth.value : null,
      participantIds: participantIds.value
    })
    toast.success('Recurring expense created')
    showForm.value = false
    description.value = ''
    amount.value = ''
    refetch()
  } catch (e: any) {
    toast.error(e.message || 'Failed to create')
  }
}

function handleDelete(id: string) {
  confirmState.value = {
    open: true,
    title: 'Delete Recurring Expense',
    message: 'Are you sure you want to delete this recurring expense?',
    onConfirm: async () => {
      try {
        await deleteRecurring({ id })
        toast.success('Deleted')
        refetch()
      } catch (e: any) {
        toast.error(e.message || 'Failed to delete')
      }
    }
  }
}

async function handleProcess(id: string) {
  try {
    await processRecurring({ id })
    toast.success('Expense created from recurring')
    refetch()
    emit('refresh')
  } catch (e: any) {
    toast.error(e.message || 'Failed to process')
  }
}

const freqLabel: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

// Expose openForm for parent components
defineExpose({ openForm })
</script>


<template>
  <div class="recurring-section">
    <div class="section-header">
      <h3>🔄 Recurring Expenses</h3>
    </div>


    <!-- Create Form -->
    <div v-if="showForm" class="form-card">
      <div class="form-group">
        <label>Description</label>
        <input v-model="description" placeholder="e.g. Rent, Electricity" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Amount (₹)</label>
          <input v-model="amount" type="number" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Frequency</label>
          <select v-model="frequency">
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Every 2 weeks</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
      </div>
      <div v-if="frequency === 'MONTHLY'" class="form-group">
        <label>Day of Month</label>
        <input v-model.number="dayOfMonth" type="number" min="1" max="31" />
      </div>
      <div class="form-group">
        <label>Split between</label>
        <div class="participant-chips">
          <label v-for="m in members" :key="m.user.id" class="chip">
            <input type="checkbox" :value="m.user.id" v-model="participantIds" />
            {{ m.user.name.split(' ')[0] }}
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-secondary" @click="showForm = false">Cancel</button>
        <button class="btn-primary" @click="handleCreate" :disabled="creating">
          {{ creating ? 'Creating...' : 'Create Recurring' }}
        </button>
      </div>
    </div>

    <!-- List -->
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="recurring.length === 0 && !showForm" class="empty">
      No recurring expenses set up yet.
    </div>
    <div v-else class="recurring-list">
      <div v-for="r in recurring" :key="r.id" class="recurring-item">
        <div class="recurring-info">
          <strong>{{ r.description }}</strong>
          <span class="meta">{{ r.formattedAmount }} • {{ freqLabel[r.frequency] }}</span>
          <span class="next-due">Next: {{ formatDate(r.nextDueDate) }}</span>
        </div>
        <div class="recurring-actions">
          <button class="action-btn" @click="handleProcess(r.id)" title="Create expense now">
            ▶️
          </button>
          <button class="action-btn danger" @click="handleDelete(r.id)" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    </div>
  </div>
  <ConfirmModal
    :open="confirmState.open"
    :title="confirmState.title"
    :message="confirmState.message"
    danger
    @close="confirmState.open = false"
    @confirm="() => { confirmState.onConfirm(); confirmState.open = false }"
  />
</template>

<style scoped>
.recurring-section {
  background: var(--color-bg-secondary);
  border-radius: 16px;
  padding: 20px;
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.btn-add {
  padding: 6px 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.form-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.9375rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.participant-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--color-bg-secondary);
  border-radius: 100px;
  font-size: 0.8125rem;
  cursor: pointer;
}

.chip input {
  width: auto;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
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

.btn-secondary {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
}

.recurring-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recurring-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.recurring-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recurring-info strong {
  font-size: 0.9375rem;
}

.meta {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.next-due {
  font-size: 0.6875rem;
  color: var(--color-primary);
  font-weight: 600;
}

.recurring-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.loading,
.empty {
  text-align: center;
  padding: 20px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
</style>
