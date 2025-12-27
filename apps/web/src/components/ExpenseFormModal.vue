<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMutation } from '@vue/apollo-composable'
import ImageUpload from '@/components/ImageUpload.vue'
import { CREATE_EXPENSE_MUTATION, UPDATE_EXPENSE_MUTATION } from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  open: boolean
  group: any
  expense?: any
}>()

const emit = defineEmits(['close', 'saved'])
const toast = useToastStore()

const { mutate: createExpense, loading: creating } = useMutation(CREATE_EXPENSE_MUTATION)
const { mutate: updateExpense, loading: updating } = useMutation(UPDATE_EXPENSE_MUTATION)

// Form state
const description = ref('')
const amount = ref('')
const category = ref('OTHER')
const splitType = ref<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'>('EQUAL')
const notes = ref('')
const receiptUrl = ref<string | null>(null)

// Participants & Payers
const participantIds = ref<string[]>([])
const memberSplits = ref<Record<string, number>>({})

// Multi-payer
const payerMode = ref<'single' | 'multi'>('single')
const paidById = ref('')
const payers = ref<Record<string, number>>({})

// UI state
const showExtras = ref(false)
const showCatDropdown = ref(false)
const showParticipantPicker = ref(false)
const participantSearch = ref('')

const categories = [
  { value: 'FOOD', icon: '🍔', label: 'Food' },
  { value: 'TRANSPORT', icon: '🚗', label: 'Transport' },
  { value: 'ACCOMMODATION', icon: '🏠', label: 'Stay' },
  { value: 'ENTERTAINMENT', icon: '🎉', label: 'Fun' },
  { value: 'SHOPPING', icon: '🛍️', label: 'Shop' },
  { value: 'UTILITIES', icon: '💡', label: 'Bills' },
  { value: 'GROCERIES', icon: '🥦', label: 'Grocery' },
  { value: 'OTHER', icon: '📄', label: 'Other' }
]

const loading = computed(() => creating.value || updating.value)
const currentCat = computed(() => categories.find(c => c.value === category.value) || categories[7])

const totalPaid = computed(() => Object.values(payers.value).reduce((s, v) => s + (v || 0), 0))

// Participants who are selected (for display)
const selectedParticipants = computed(() => 
  (props.group?.members || []).filter((m: any) => participantIds.value.includes(m.user.id))
)

// Initialize
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    showExtras.value = false
    showCatDropdown.value = false
    
    if (props.expense) {
      description.value = props.expense.description
      amount.value = (props.expense.amount / 100).toString()
      category.value = props.expense.category || 'OTHER'
      splitType.value = props.expense.splitType as any
      notes.value = props.expense.notes || ''
      receiptUrl.value = props.expense.receiptUrl || null
      participantIds.value = props.expense.shares.map((s: any) => s.user.id)
      memberSplits.value = {}
      props.expense.shares.forEach((s: any) => {
        memberSplits.value[s.user.id] = props.expense.splitType !== 'EQUAL' ? s.amount / 100 : 1
      })
      payerMode.value = 'single'
      paidById.value = props.expense.paidBy?.id || ''
      payers.value = props.expense.paidBy?.id ? { [props.expense.paidBy.id]: props.expense.amount / 100 } : {}
    } else {
      description.value = ''
      amount.value = ''
      category.value = 'OTHER'
      splitType.value = 'EQUAL'
      notes.value = ''
      receiptUrl.value = null
      participantIds.value = props.group.members.map((m: any) => m.user.id)
      memberSplits.value = {}
      props.group.members.forEach((m: any) => { memberSplits.value[m.user.id] = 1 })
      payerMode.value = 'single'
      paidById.value = props.group.members[0]?.user.id || ''
      payers.value = {}
    }
  }
})

function toggleParticipant(id: string) {
  const idx = participantIds.value.indexOf(id)
  if (idx === -1) {
    participantIds.value.push(id)
    memberSplits.value[id] = 1
  } else if (participantIds.value.length > 1) {
    participantIds.value.splice(idx, 1)
    delete memberSplits.value[id]
    delete payers.value[id]
    if (paidById.value === id) paidById.value = participantIds.value[0]
  }
}

function selectAllParticipants() {
  participantIds.value = props.group.members.map((m: any) => m.user.id)
  props.group.members.forEach((m: any) => { memberSplits.value[m.user.id] = 1 })
}

function selectPayer(id: string) {
  paidById.value = id
  if (!participantIds.value.includes(id)) {
    participantIds.value.push(id)
    memberSplits.value[id] = 1
  }
}

function toggleMultiPayer(id: string) {
  if (payers.value[id] !== undefined) delete payers.value[id]
  else payers.value[id] = 0
}

function setPayerMode(mode: 'single' | 'multi') {
  payerMode.value = mode
  if (mode === 'single' && Object.keys(payers.value).length > 0) {
    paidById.value = Object.keys(payers.value)[0]
  } else if (mode === 'multi' && paidById.value) {
    payers.value = { [paidById.value]: parseFloat(amount.value) || 0 }
  }
}

function selectCategory(val: string) {
  category.value = val
  showCatDropdown.value = false
}

const firstName = (n: string) => n.split(' ')[0]

// Validation
const splitOk = computed(() => {
  const total = parseFloat(amount.value) || 0
  if (splitType.value === 'EQUAL') return participantIds.value.length > 0
  if (splitType.value === 'EXACT') {
    const sum = Object.entries(memberSplits.value).filter(([id]) => participantIds.value.includes(id)).reduce((s, [, v]) => s + (v || 0), 0)
    return Math.abs(total - sum) < 0.01
  }
  if (splitType.value === 'PERCENTAGE') {
    const sum = Object.entries(memberSplits.value).filter(([id]) => participantIds.value.includes(id)).reduce((s, [, v]) => s + (v || 0), 0)
    return Math.abs(100 - sum) < 0.1
  }
  return Object.entries(memberSplits.value).filter(([id]) => participantIds.value.includes(id)).reduce((s, [, v]) => s + (v || 0), 0) > 0
})

const payerOk = computed(() => {
  if (payerMode.value === 'single') return !!paidById.value
  return Object.keys(payers.value).length > 0 && Math.abs(totalPaid.value - (parseFloat(amount.value) || 0)) < 0.01
})

const splitHint = computed(() => {
  const total = parseFloat(amount.value) || 0
  const count = participantIds.value.length
  if (splitType.value === 'EQUAL' && count > 0 && total > 0) return `₹${Math.round(total / count)}/person`
  return ''
})

const canSubmit = computed(() => amount.value && description.value && participantIds.value.length > 0 && splitOk.value && payerOk.value)

async function handleSubmit() {
  if (!canSubmit.value) return
  
  const amtPaise = Math.round(parseFloat(amount.value) * 100)
  let shares: { userId: string; amount: number }[] = []
  
  if (splitType.value === 'EQUAL') {
    const c = participantIds.value.length
    const base = Math.floor(amtPaise / c)
    const rem = amtPaise - base * c
    shares = participantIds.value.map((id, i) => ({ userId: id, amount: base + (i === 0 ? rem : 0) }))
  } else if (splitType.value === 'EXACT') {
    shares = Object.entries(memberSplits.value).filter(([id]) => participantIds.value.includes(id)).map(([id, v]) => ({ userId: id, amount: Math.round(v * 100) })).filter(s => s.amount > 0)
  } else if (splitType.value === 'PERCENTAGE') {
    let run = 0
    const ent = Object.entries(memberSplits.value).filter(([id, p]) => participantIds.value.includes(id) && p > 0)
    shares = ent.map(([id, pct], i) => { let a = i === ent.length - 1 ? amtPaise - run : Math.floor(amtPaise * pct / 100); run += a; return { userId: id, amount: a } })
  } else {
    const ts = Object.entries(memberSplits.value).filter(([id]) => participantIds.value.includes(id)).reduce((s, [, v]) => s + (v || 0), 0)
    let run = 0
    const ent = Object.entries(memberSplits.value).filter(([id, v]) => participantIds.value.includes(id) && v > 0)
    shares = ent.map(([id, sh], i) => { let a = i === ent.length - 1 ? amtPaise - run : Math.floor(amtPaise * sh / ts); run += a; return { userId: id, amount: a } })
  }

  const finalPaidById = payerMode.value === 'single' ? paidById.value : Object.keys(payers.value)[0]

  try {
    const vars = { description: description.value, amount: amtPaise, paidById: finalPaidById, category: category.value, splitType: splitType.value, notes: notes.value || undefined, receiptUrl: receiptUrl.value || undefined, shares }
    if (props.expense) await updateExpense({ id: props.expense.id, ...vars })
    else await createExpense({ groupId: props.group.id, ...vars })
    emit('saved'); emit('close')
    toast.success(props.expense ? 'Updated' : 'Added')
  } catch (e: any) { toast.error(e.message || 'Failed') }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" @click.self="emit('close')">
        <div class="sheet">
          <!-- Header -->
          <header>
            <button class="close" @click="emit('close')">✕</button>
            <h2>{{ expense ? 'Edit' : 'New' }} Expense</h2>
            <button class="save" @click="handleSubmit" :disabled="loading || !canSubmit">{{ loading ? '...' : 'Save' }}</button>
          </header>

          <div class="body">
            <!-- Hero: Amount + Description + Category -->
            <section class="hero">
              <div class="amount-row">
                <button class="cat" @click="showCatDropdown = !showCatDropdown">
                  {{ currentCat.icon }}
                </button>
                <Transition name="pop">
                  <div v-if="showCatDropdown" class="cat-menu">
                    <button v-for="c in categories" :key="c.value" :class="{ on: category === c.value }" @click="selectCategory(c.value)">{{ c.icon }} {{ c.label }}</button>
                  </div>
                </Transition>
                <span class="curr">₹</span>
                <input v-model="amount" type="number" step="0.01" placeholder="0" inputmode="decimal" class="amt" @focus="showCatDropdown = false" />
              </div>
              <input v-model="description" type="text" placeholder="What's this for?" class="desc" @focus="showCatDropdown = false" />
            </section>

            <!-- Participants: Who's involved? -->
            <section class="sec">
              <div class="sec-head">
                <label>Who's involved?</label>
                <button class="edit-btn" @click="showParticipantPicker = !showParticipantPicker">
                  {{ showParticipantPicker ? 'Done' : 'Edit' }}
                </button>
              </div>

              <!-- Compact summary (default) -->
              <div v-if="!showParticipantPicker" class="p-summary" @click="showParticipantPicker = true">
                <div class="p-avatars">
                  <span v-for="(m, idx) in selectedParticipants.slice(0, 5)" :key="m.user.id" class="p-av" :style="{ zIndex: 10 - Number(idx) }">{{ m.user.name[0] }}</span>
                  <span v-if="participantIds.length > 5" class="p-av more">+{{ participantIds.length - 5 }}</span>
                </div>
                <span class="p-text">
                  {{ participantIds.length === group.members.length ? 'Everyone' : `${participantIds.length} of ${group.members.length}` }}
                </span>
                <svg class="p-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>

              <!-- Expandable picker -->
              <div v-if="showParticipantPicker" class="p-picker">
                <input v-if="group.members.length > 8" v-model="participantSearch" type="text" placeholder="Search..." class="p-search" />
                <div class="p-picker-actions">
                  <button class="p-action" @click="selectAllParticipants">All</button>
                  <button class="p-action" @click="participantIds = [paidById]; memberSplits = { [paidById]: 1 }">None</button>
                </div>
                <div class="p-grid">
                  <button 
                    v-for="m in (participantSearch ? group.members.filter((x: any) => x.user.name.toLowerCase().includes(participantSearch.toLowerCase())) : group.members)" 
                    :key="m.user.id"
                    :class="['p-item', { on: participantIds.includes(m.user.id) }]"
                    @click="toggleParticipant(m.user.id)"
                  >
                    <span class="p-item-av">{{ m.user.name[0] }}</span>
                    <span class="p-item-name">{{ firstName(m.user.name) }}</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Paid By -->
            <section class="sec">
              <div class="sec-head">
                <label>Paid by</label>
                <div class="toggle">
                  <button :class="{ on: payerMode === 'single' }" @click="setPayerMode('single')">One</button>
                  <button :class="{ on: payerMode === 'multi' }" @click="setPayerMode('multi')">Multi</button>
                </div>
              </div>

              <!-- Single Payer - Chip Row -->
              <div v-if="payerMode === 'single'" class="payer-chips">
                <button 
                  v-for="m in selectedParticipants" :key="m.user.id"
                  :class="['chip', { on: paidById === m.user.id }]"
                  @click="selectPayer(m.user.id)"
                >
                  <span class="chip-av">{{ m.user.name[0] }}</span>
                  {{ firstName(m.user.name) }}
                </button>
              </div>

              <!-- Multi Payer -->
              <div v-else class="multi-payer">
                <div v-for="m in selectedParticipants" :key="m.user.id" :class="['mp-row', { on: payers[m.user.id] !== undefined }]">
                  <button class="mp-name" @click="toggleMultiPayer(m.user.id)">
                    <span class="chip-av">{{ m.user.name[0] }}</span>
                    {{ firstName(m.user.name) }}
                  </button>
                  <input v-if="payers[m.user.id] !== undefined" v-model.number="payers[m.user.id]" type="number" step="0.01" placeholder="0" class="mp-amt" />
                </div>
                <div :class="['mp-total', payerOk ? 'ok' : 'warn']">₹{{ totalPaid }} / ₹{{ parseFloat(amount) || 0 }}</div>
              </div>
            </section>

            <!-- Split -->
            <section class="sec">
              <div class="sec-head">
                <label>Split</label>
                <div class="split-tabs">
                  <button v-for="t in [{v:'EQUAL',l:'='},{v:'EXACT',l:'₹'},{v:'PERCENTAGE',l:'%'},{v:'SHARES',l:'⚖'}]" :key="t.v" :class="{ on: splitType === t.v }" @click="splitType = t.v as any">{{ t.l }}</button>
                </div>
                <span v-if="splitHint" class="hint">{{ splitHint }}</span>
              </div>

              <!-- Non-equal split amounts -->
              <div v-if="splitType !== 'EQUAL'" class="split-list">
                <div v-for="m in selectedParticipants" :key="m.user.id" class="sp-row">
                  <span class="sp-name">{{ firstName(m.user.name) }}</span>
                  <input v-model.number="memberSplits[m.user.id]" type="number" step="0.01" :placeholder="splitType === 'SHARES' ? '1' : '0'" class="sp-amt" />
                  <span class="sp-unit">{{ splitType === 'PERCENTAGE' ? '%' : '' }}</span>
                </div>
              </div>
            </section>

            <!-- Extras -->
            <button class="extras-btn" @click="showExtras = !showExtras">{{ showExtras ? '−' : '+' }} Notes / Receipt</button>
            <div v-if="showExtras" class="extras">
              <textarea v-model="notes" placeholder="Notes..." rows="2"></textarea>
              <ImageUpload v-model="receiptUrl" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
.sheet { background: #fff; width: 100%; max-width: 400px; max-height: 90vh; border-radius: 20px 20px 0 0; display: flex; flex-direction: column; }
@media (min-width: 640px) { .overlay { align-items: center; padding: 24px; } .sheet { border-radius: 20px; } }

header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(0,0,0,.05); }
header h2 { font-size: .875rem; font-weight: 700; }
.close { width: 28px; height: 28px; background: var(--color-bg-secondary); border: none; border-radius: 8px; cursor: pointer; font-size: .75rem; }
.save { padding: 6px 12px; background: var(--color-primary); color: #fff; border: none; border-radius: 8px; font-size: .6875rem; font-weight: 700; cursor: pointer; }
.save:disabled { opacity: .4; }

.body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }

/* Hero */
.hero { background: var(--color-bg-secondary); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 8px; position: relative; }

.amount-row { display: flex; align-items: center; gap: 6px; }
.cat { padding: 6px 8px; background: #fff; border: none; border-radius: 8px; font-size: 1.125rem; cursor: pointer; }
.cat-menu { position: absolute; top: 50px; left: 10px; background: #fff; border-radius: 12px; padding: 6px; box-shadow: 0 8px 30px rgba(0,0,0,.15); display: grid; grid-template-columns: 1fr 1fr; gap: 2px; z-index: 10; }
.cat-menu button { padding: 7px 10px; background: none; border: none; border-radius: 8px; font-size: .6875rem; font-weight: 500; cursor: pointer; text-align: left; }
.cat-menu button:hover { background: var(--color-bg-secondary); }
.cat-menu button.on { background: rgba(99,102,241,.1); color: var(--color-primary); }
.curr { font-size: 1.125rem; font-weight: 700; color: #9ca3af; }
.amt { flex: 1; min-width: 0; border: none; background: none; font-size: 1.5rem; font-weight: 800; outline: none; }
.amt::placeholder { color: #d1d5db; }

.desc { padding: 8px 10px; background: #fff; border: 1px solid rgba(0,0,0,.05); border-radius: 10px; font-size: .8125rem; font-weight: 500; }
.desc:focus { outline: none; border-color: var(--color-primary); }

/* Section */
.sec { display: flex; flex-direction: column; gap: 8px; }
.badge { font-size: .625rem; font-weight: 700; color: var(--color-text-dimmed); background: var(--color-bg-secondary); padding: 2px 8px; border-radius: 10px; }
.edit-btn { padding: 3px 8px; background: none; border: 1px solid rgba(0,0,0,.1); border-radius: 6px; font-size: .5625rem; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; margin-left: auto; }
.edit-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

/* Compact participant summary */
.p-summary { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--color-bg-secondary); border-radius: 12px; cursor: pointer; }
.p-summary:hover { background: #e5e7eb; }
.p-avatars { display: flex; }
.p-av { width: 28px; height: 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .625rem; font-weight: 700; border: 2px solid #fff; margin-left: -8px; }
.p-av:first-child { margin-left: 0; }
.p-av.more { background: #e5e7eb; color: #6b7280; font-size: .5rem; }
.p-text { flex: 1; font-size: .8125rem; font-weight: 600; }
.p-chevron { color: var(--color-text-dimmed); }

/* Expandable picker */
.p-picker { background: var(--color-bg-secondary); border-radius: 12px; padding: 10px; }
.p-search { width: 100%; padding: 8px 10px; margin-bottom: 8px; background: #fff; border: 1px solid rgba(0,0,0,.06); border-radius: 8px; font-size: .75rem; }
.p-search:focus { outline: none; border-color: var(--color-primary); }
.p-picker-actions { display: flex; gap: 6px; margin-bottom: 8px; }
.p-action { padding: 6px 12px; background: #fff; border: none; border-radius: 6px; font-size: .625rem; font-weight: 600; cursor: pointer; }
.p-action:hover { background: #e5e7eb; }
.p-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 6px; max-height: 150px; overflow-y: auto; }
.p-item { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px; background: #fff; border: 2px solid transparent; border-radius: 10px; cursor: pointer; }
.p-item:hover { border-color: var(--color-border); }
.p-item.on { border-color: var(--color-primary); background: rgba(99,102,241,.05); }
.p-item-av { width: 28px; height: 28px; background: #d1d5db; color: #6b7280; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: .625rem; font-weight: 700; }
.p-item.on .p-item-av { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
.p-item-name { font-size: .5625rem; font-weight: 600; color: var(--color-text-secondary); max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Member Pills - Participant Selection (small groups) */
.member-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill { display: flex; align-items: center; gap: 6px; padding: 6px 10px 6px 6px; background: var(--color-bg-secondary); border: 2px solid transparent; border-radius: 20px; cursor: pointer; transition: all .15s; }
.pill:hover { border-color: var(--color-border); }
.pill.on { background: rgba(99,102,241,.1); border-color: var(--color-primary); }
.pill-av { width: 22px; height: 22px; background: #d1d5db; color: #6b7280; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .5625rem; font-weight: 700; }
.pill.on .pill-av { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
.pill-name { font-size: .6875rem; font-weight: 600; color: var(--color-text-secondary); }
.pill.on .pill-name { color: var(--color-primary); }

/* Section Header */
.sec-head { display: flex; align-items: center; gap: 8px; }
.sec-head label { font-size: .625rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-dimmed); }
.toggle, .split-tabs { display: flex; gap: 2px; padding: 2px; background: var(--color-bg-secondary); border-radius: 6px; }
.toggle button, .split-tabs button { padding: 4px 8px; background: none; border: none; border-radius: 5px; font-size: .5625rem; font-weight: 600; color: var(--color-text-dimmed); cursor: pointer; }
.toggle button.on, .split-tabs button.on { background: #fff; color: var(--color-text); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.split-tabs button { font-size: .75rem; padding: 5px 8px; }
.hint { margin-left: auto; font-size: .625rem; font-weight: 600; color: #059669; }

/* Payer Chips */
.payer-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--color-bg-secondary); border: 2px solid transparent; border-radius: 10px; font-size: .6875rem; font-weight: 600; cursor: pointer; transition: all .15s; }
.chip:hover { border-color: var(--color-border); }
.chip.on { border-color: var(--color-primary); background: rgba(99,102,241,.08); }
.chip-av { width: 20px; height: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: .5rem; font-weight: 700; }

/* Multi Payer */
.multi-payer { background: var(--color-bg-secondary); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.mp-row { display: flex; align-items: center; gap: 8px; }
.mp-name { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: #fff; border: 2px solid transparent; border-radius: 8px; font-size: .6875rem; font-weight: 600; cursor: pointer; flex: 1; }
.mp-row.on .mp-name { border-color: var(--color-primary); }
.mp-amt { width: 70px; padding: 6px 8px; background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; font-size: .6875rem; font-weight: 700; text-align: right; }
.mp-amt:focus { outline: none; border-color: var(--color-primary); }
.mp-total { font-size: .625rem; font-weight: 600; text-align: right; margin-top: 4px; }
.mp-total.ok { color: #059669; }
.mp-total.warn { color: #d97706; }

/* Split List */
.split-list { background: var(--color-bg-secondary); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.sp-row { display: flex; align-items: center; gap: 8px; }
.sp-name { flex: 1; font-size: .6875rem; font-weight: 600; }
.sp-amt { width: 60px; padding: 6px 8px; background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; font-size: .6875rem; font-weight: 700; text-align: right; }
.sp-amt:focus { outline: none; border-color: var(--color-primary); }
.sp-unit { font-size: .5625rem; color: var(--color-text-dimmed); width: 12px; }

/* Extras */
.extras-btn { padding: 8px; background: none; border: 1px dashed rgba(0,0,0,.1); border-radius: 8px; font-size: .6875rem; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; }
.extras-btn:hover { background: var(--color-bg-secondary); border-style: solid; }
.extras { display: flex; flex-direction: column; gap: 8px; }
.extras textarea { padding: 8px 10px; background: var(--color-bg-secondary); border: none; border-radius: 8px; font-size: .75rem; resize: none; }
.extras textarea:focus { outline: none; background: #fff; box-shadow: 0 0 0 2px var(--color-primary); }

/* Transitions */
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-active .sheet, .modal-leave-active .sheet { transition: transform .25s cubic-bezier(.16,1,.3,1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .sheet { transform: translateY(100%); }
.modal-leave-to .sheet { transform: translateY(100%); }
@media (min-width: 640px) { .modal-enter-from .sheet, .modal-leave-to .sheet { transform: translateY(16px) scale(.98); } }
.pop-enter-active, .pop-leave-active { transition: all .15s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
