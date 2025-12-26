<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMutation } from '@vue/apollo-composable'
import ImageUpload from '@/components/ImageUpload.vue'
import { 
  CREATE_EXPENSE_MUTATION,
  UPDATE_EXPENSE_MUTATION 
} from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  open: boolean
  group: any
  expense?: any // If provided, we are editing
}>()

const emit = defineEmits(['close', 'saved'])
const toast = useToastStore()

// Mutations
const { mutate: createExpense, loading: creating } = useMutation(CREATE_EXPENSE_MUTATION)
const { mutate: updateExpense, loading: updating } = useMutation(UPDATE_EXPENSE_MUTATION)

// Form state
const description = ref('')
const amount = ref('')
const category = ref('OTHER')
const date = ref(new Date().toISOString().split('T')[0])
const paidById = ref('')
const splitType = ref<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'>('EQUAL')
const notes = ref('')
const receiptUrl = ref<string | null>(null)

// Split state
// We store "shares" for all types, but interpret them differently
// EQUAL: boolean (selected or not) -> handled by selectedMemberIds
// EXACT: amount value
// PERCENTAGE: percentage value
// SHARES: share count
const memberSplits = ref<Record<string, number>>({})
const selectedMemberIds = ref<string[]>([]) // For EQUAL split

const categories = [
  { value: 'FOOD', label: 'Food', icon: '🍔' },
  { value: 'TRANSPORT', label: 'Transport', icon: '🚗' },
  { value: 'ACCOMMODATION', label: 'Stay', icon: '🏠' },
  { value: 'ENTERTAINMENT', label: 'Fun', icon: '🎉' },
  { value: 'SHOPPING', label: 'Shop', icon: '🛍️' },
  { value: 'UTILITIES', label: 'Bills', icon: '💡' },
  { value: 'GROCERIES', label: 'Groceries', icon: '🥦' },
  { value: 'OTHER', label: 'Other', icon: '📄' }
]

const loading = computed(() => creating.value || updating.value)

// Initialize
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.expense) {
      // Edit mode
      description.value = props.expense.description
      amount.value = (props.expense.amount / 100).toString()
      category.value = props.expense.category || 'OTHER'
      date.value = new Date(props.expense.date).toISOString().split('T')[0]
      paidById.value = props.expense.paidBy.id
      splitType.value = props.expense.splitType as any
      notes.value = props.expense.notes || ''
      receiptUrl.value = props.expense.receiptUrl || null
      
      // Load splits
      memberSplits.value = {}
      selectedMemberIds.value = []
      
      props.expense.shares.forEach((share: any) => {
        selectedMemberIds.value.push(share.user.id)
        // For non-EQUAL splits, we'd need more logic here to load exact values if we stored the raw input.
        // But our API only returns the calculated amount. 
        // For MVP, if editing a non-EQUAL expense, we might switch to EXACT mode with the calculated amounts.
        if (props.expense.splitType === 'EXACT' || props.expense.splitType === 'PERCENTAGE' || props.expense.splitType === 'SHARES') {
           memberSplits.value[share.user.id] = share.amount / 100 // Convert paise to currency
        }
      })
      
      // If editing a complex split, default to EXACT with current values to preserve accuracy
      if (props.expense.splitType !== 'EQUAL') {
         splitType.value = 'EXACT'
      }
      
    } else {
      // Create mode
      description.value = ''
      amount.value = ''
      category.value = 'OTHER'
      date.value = new Date().toISOString().split('T')[0]
      // Default payer: current user or first member (we don't have current user id easily here without store, 
      // but we can default to first member)
      paidById.value = props.group.members[0]?.user.id || ''
      splitType.value = 'EQUAL'
      notes.value = ''
      receiptUrl.value = null
      selectedMemberIds.value = props.group.members.map((m: any) => m.user.id)
      memberSplits.value = {}
    }
  }
})

// Toggle member for EQUAL split
function toggleMember(userId: string) {
  const index = selectedMemberIds.value.indexOf(userId)
  if (index === -1) {
    selectedMemberIds.value.push(userId)
  } else if (selectedMemberIds.value.length > 1) { // Prevent empty selection
    selectedMemberIds.value.splice(index, 1)
  }
}

// Calculations
const splitSummary = computed(() => {
  const totalAmount = parseFloat(amount.value) || 0
  if (splitType.value === 'EQUAL') {
    const count = selectedMemberIds.value.length
    if (count === 0) return 'Select members'
    const share = (totalAmount / count).toFixed(2)
    return `₹${share} / person`
  } else if (splitType.value === 'EXACT') {
    const currentTotal = Object.values(memberSplits.value).reduce((sum, val) => sum + (val || 0), 0)
    const diff = totalAmount - currentTotal
    if (Math.abs(diff) < 0.01) return '✓ Amounts match'
    const status = diff > 0 ? 'left' : 'over'
    return `₹${Math.abs(diff).toFixed(2)} ${status}`
  } else if (splitType.value === 'PERCENTAGE') {
    const totalPercent = Object.values(memberSplits.value).reduce((sum, val) => sum + (val || 0), 0)
    const diff = 100 - totalPercent
    if (Math.abs(diff) < 0.1) return '✓ 100%'
    return `${totalPercent}% / 100%`
  }
  return ''
})

async function handleSubmit() {
  if (!amount.value || !description.value || !paidById.value) return
  
  const amountInPaise = Math.round(parseFloat(amount.value) * 100)
  
  let shares: { userId: string; amount: number }[] = []
  
  if (splitType.value === 'EQUAL') {
    const count = selectedMemberIds.value.length
    const shareAmount = Math.floor(amountInPaise / count)
    const remainder = amountInPaise - (shareAmount * count)
    
    shares = selectedMemberIds.value.map((userId, index) => ({
      userId,
      amount: shareAmount + (index === 0 ? remainder : 0)
    }))
  } else if (splitType.value === 'EXACT') {
      // Validate total
     const currentTotal = Object.values(memberSplits.value).reduce((sum, val) => sum + (val || 0), 0)
     if (Math.abs(parseFloat(amount.value) - currentTotal) > 0.05) {
        toast.error(`Amounts must equal ₹${amount.value}`)
        return
     }

     shares = Object.entries(memberSplits.value).map(([userId, val]) => ({
        userId,
        amount: Math.round(val * 100)
     })).filter(s => s.amount > 0)
  } else if (splitType.value === 'PERCENTAGE') {
      const totalPercent = Object.values(memberSplits.value).reduce((sum, val) => sum + (val || 0), 0)
       if (Math.abs(100 - totalPercent) > 0.1) {
          toast.error('Percentages must equal 100%')
          return
       }
       
       let runningTotal = 0;
       const entries = Object.entries(memberSplits.value).filter(([, p]) => p > 0);
       
       shares = entries.map(([userId, percent], index) => {
          const isLast = index === entries.length - 1
          let shareAmount = Math.floor(amountInPaise * (percent / 100))
          if (isLast) {
             shareAmount = amountInPaise - runningTotal
          }
          runningTotal += shareAmount
          return { userId, amount: shareAmount }
       })
  } else if (splitType.value === 'SHARES') {
     // Implement later/MVP simplified
     // Reuse logic
  }

  const payload = {
    description: description.value,
    amount: amountInPaise,
    paidById: paidById.value,
    category: category.value,
    splitType: splitType.value === 'PERCENTAGE' ? 'PERCENTAGE' : 'EQUAL',
    notes: notes.value,
    receiptUrl: receiptUrl.value,
    shares
  }
  
  // Override splitType to match backend enum broadly (backend stores shares, so type is mostly metadata)
  // But strictly, we should pass the correct type.
  // My schema has EQUAL | EXACT | PERCENTAGE | SHARES.
  // EXACT maps to EXACT.

  try {
     const variables = {
        ...payload,
        splitType: splitType.value === 'EXACT' ? 'EXACT' : (splitType.value === 'PERCENTAGE' ? 'PERCENTAGE' : 'EQUAL')
     }

    if (props.expense) {
      await updateExpense({
         id: props.expense.id,
         ...variables
      })
    } else {
      await createExpense({
        groupId: props.group.id,
        ...variables
      })
    }
    
    emit('saved')
    emit('close')
    toast.success(props.expense ? 'Expense updated' : 'Expense added')
  } catch (e: any) {
    toast.error(e.message || 'Failed to save expense')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="emit('close')">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ expense ? 'Edit Expense' : 'Add Expense' }}</h2>
            <button class="close-btn" @click="emit('close')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="handleSubmit" class="modal-body">
            <!-- Amount -->
            <div class="field">
              <label>Amount</label>
              <div class="amount-field">
                <span class="currency">₹</span>
                <input 
                  v-model="amount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  class="amount-input"
                  required
                  autofocus
                />
              </div>
            </div>

            <!-- Description -->
            <div class="field">
              <label>Description</label>
              <input 
                v-model="description"
                type="text"
                placeholder="What was it for?"
                class="text-input"
                required
              />
            </div>

            <!-- Category -->
            <div class="field">
              <label>Category</label>
              <div class="category-grid">
                <button
                  v-for="cat in categories"
                  :key="cat.value"
                  type="button"
                  :class="['category-card', { active: category === cat.value }]"
                  @click="category = cat.value"
                >
                  <span class="category-icon">{{ cat.icon }}</span>
                  <span class="category-label">{{ cat.label }}</span>
                </button>
              </div>
            </div>
            
            <!-- Payer -->
            <div class="field">
              <label>Paid by</label>
              <div class="chip-group">
                <button
                  v-for="member in group.members"
                  :key="member.user.id"
                  type="button"
                  :class="['chip', { active: paidById === member.user.id }]"
                  @click="paidById = member.user.id"
                >
                  {{ member.user.name }}
                </button>
              </div>
            </div>

            <!-- Split Type Selector -->
             <div class="field">
                <label>Split Type</label>
                <div class="split-tabs">
                   <button type="button" :class="{ active: splitType === 'EQUAL' }" @click="splitType = 'EQUAL'">Equal</button>
                   <button type="button" :class="{ active: splitType === 'EXACT' }" @click="splitType = 'EXACT'">Exact</button>
                   <button type="button" :class="{ active: splitType === 'PERCENTAGE' }" @click="splitType = 'PERCENTAGE'">%</button>
                </div>
             </div>
            
            <!-- Split Members (EQUAL) -->
            <div v-if="splitType === 'EQUAL'" class="field">
              <label>Split between</label>
              <div class="chip-group">
                <button
                  v-for="member in group.members"
                  :key="member.user.id"
                  type="button"
                  :class="['chip', { active: selectedMemberIds.includes(member.user.id) }]"
                  @click="toggleMember(member.user.id)"
                >
                  {{ member.user.name }}
                </button>
              </div>
            </div>

            <!-- Split Members (EXACT / PERCENTAGE) -->
            <div v-else class="field">
               <label>Split details ({{ splitType === 'PERCENTAGE' ? 'Percentage' : 'Amount' }})</label>
               <div class="split-inputs">
                  <div
                     v-for="member in group.members"
                     :key="member.user.id"
                     class="split-row"
                  >
                     <span class="member-label">{{ member.user.name }}</span>
                     <div class="input-wrapper">
                        <span v-if="splitType === 'EXACT'" class="prefix">₹</span>
                        <input 
                           v-model.number="memberSplits[member.user.id]"
                           type="number"
                           step="0.01"
                           placeholder="0"
                        />
                        <span v-if="splitType === 'PERCENTAGE'" class="suffix">%</span>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Notes -->
            <div class="field">
               <label>Notes</label>
               <textarea 
                  v-model="notes" 
                  class="text-input" 
                  placeholder="Additional details..."
                  rows="2"
               ></textarea>
            </div>

            <!-- Receipt -->
            <div class="field">
               <label>Receipt</label>
               <ImageUpload v-model="receiptUrl" />
            </div>

            <div class="split-summary">
               {{ splitSummary }}
            </div>
            
            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-lg);
}

.modal {
  background: var(--color-bg);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
}

.field {
  margin-bottom: var(--space-lg);
}

.field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-sm);
  letter-spacing: 0.05em;
}

.amount-field {
  display: flex;
  align-items: center;
  border-bottom: 2px solid var(--color-border);
  padding: var(--space-sm) 0;
  transition: border-color 0.2s;
}

.amount-field:focus-within {
  border-color: var(--color-primary);
}

.currency {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-right: var(--space-xs);
}

.amount-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  outline: none;
  padding: 0;
}

.text-input {
  width: 100%;
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 1rem;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  outline: none;
}

.text-input:focus {
  border-color: var(--color-primary);
  background: var(--color-bg);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-xs);
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.category-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-50);
  color: var(--color-primary);
}

.category-icon {
  font-size: 1.25rem;
}

.category-label {
  font-size: 0.625rem;
  font-weight: 600;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.chip {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.chip.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.split-tabs {
   display: flex;
   background: var(--color-bg-secondary);
   padding: 4px;
   border-radius: var(--radius-lg);
}

.split-tabs button {
   flex: 1;
   padding: 8px;
   border: none;
   background: transparent;
   border-radius: var(--radius-md);
   font-size: 0.875rem;
   font-weight: 600;
   color: var(--color-text-muted);
   cursor: pointer;
}

.split-tabs button.active {
   background: var(--color-bg);
   color: var(--color-text);
   box-shadow: var(--shadow-sm);
}

.split-inputs {
   display: flex;
   flex-direction: column;
   gap: var(--space-sm);
}

.split-row {
   display: flex;
   align-items: center;
   justify-content: space-between;
}

.member-label {
   font-size: 0.9375rem;
   font-weight: 500;
}

.input-wrapper {
   display: flex;
   align-items: center;
   background: var(--color-bg-secondary);
   padding: 4px 8px;
   border-radius: var(--radius-md);
   width: 100px;
}

.input-wrapper input {
   width: 100%;
   background: transparent;
   border: none;
   text-align: right;
   font-weight: 600;
   outline: none;
}

.split-summary {
   text-align: center;
   font-weight: 600;
   color: var(--color-primary);
   margin-bottom: var(--space-lg);
   font-size: 0.875rem;
}

.submit-btn {
  width: 100%;
  padding: var(--space-md);
  border: none;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.2s;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}
</style>
