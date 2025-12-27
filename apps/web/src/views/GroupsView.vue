<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { GROUPS_QUERY, CREATE_GROUP_MUTATION } from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'

interface Group {
  id: string
  name: string
  icon: string
  category: string
  createdAt: string
  expenseCount: number
  userBalance: number | null
  members: { id: string; user: { id: string; name: string } }[]
}

const { result, loading, refetch } = useQuery<{ groups: Group[] }>(GROUPS_QUERY)
const { mutate: createGroup, loading: creating } = useMutation(CREATE_GROUP_MUTATION)
const toast = useToastStore()

const visible = ref(false)
const showModal = ref(false)
const formName = ref('')
const formIcon = ref('👥')
const formCategory = ref('OTHER')

// Filter & Sort
const search = ref('')
const sortBy = ref<'name' | 'recent' | 'balance'>('recent')
const filterCat = ref('')

const groups = computed(() => {
  let list = result.value?.groups || []
  
  // Search filter
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(g => g.name.toLowerCase().includes(q))
  }
  
  // Category filter
  if (filterCat.value) {
    list = list.filter(g => g.category === filterCat.value)
  }
  
  // Sort
  list = [...list].sort((a, b) => {
    if (sortBy.value === 'name') return a.name.localeCompare(b.name)
    if (sortBy.value === 'balance') return Math.abs(b.userBalance || 0) - Math.abs(a.userBalance || 0)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  
  return list
})

const icons = ['👥', '🏠', '✈️', '💑', '🍕', '🎉', '💼', '🎮', '⚽', '🍔', '🍺', '🛍️']
const categories = [
  { value: 'FRIENDS', label: 'Friends' },
  { value: 'HOME', label: 'Home' },
  { value: 'TRIP', label: 'Trip' },
  { value: 'COUPLE', label: 'Couple' },
  { value: 'WORK', label: 'Work' },
  { value: 'OTHER', label: 'Other' },
]

function formatBalance(bal: number | null) {
  if (!bal || bal === 0) return null
  const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(bal) / 100)
  return bal > 0 ? `+${formatted}` : `-${formatted}`
}

async function handleCreate() {
  if (!formName.value.trim()) return
  try {
    await createGroup({ name: formName.value, icon: formIcon.value, category: formCategory.value })
    showModal.value = false
    formName.value = ''
    formIcon.value = '👥'
    formCategory.value = 'OTHER'
    refetch()
    toast.success('Group created!')
  } catch (e: any) {
    toast.error(e.message || 'Failed')
  }
}

onMounted(() => setTimeout(() => visible.value = true, 50))
</script>

<template>
  <div class="page" :class="{ visible }">
    <div class="container">
      
      <!-- Header -->
      <header class="header">
        <h1>Groups</h1>
        <button class="add-btn" @click="showModal = true">
          + New
        </button>
      </header>

      <!-- Filter Bar -->
      <div class="filter-bar" v-if="!loading && (result?.groups?.length || 0) > 0">
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input v-model="search" type="text" placeholder="Search groups..." class="search-input" />
        </div>
        <div class="filter-controls">
          <select v-model="filterCat" class="filter-select">
            <option value="">All types</option>
            <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <select v-model="sortBy" class="filter-select">
            <option value="recent">Recent</option>
            <option value="name">A-Z</option>
            <option value="balance">Balance</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="card">
        <div v-for="i in 4" :key="i" class="row skeleton">
          <div class="sk-icon"></div>
          <div class="sk-text"><div class="sk-line"></div><div class="sk-line sm"></div></div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!result?.groups?.length" class="empty-card">
        <span class="empty-emoji">✨</span>
        <h2>No groups yet</h2>
        <p>Create a group to start splitting expenses.</p>
        <button class="cta" @click="showModal = true">Create Group</button>
      </div>

      <!-- No Results -->
      <div v-else-if="!groups.length" class="empty-card">
        <span class="empty-emoji">🔍</span>
        <h2>No matches</h2>
        <p>Try a different search or filter.</p>
        <button class="cta" @click="search = ''; filterCat = ''">Clear Filters</button>
      </div>

      <!-- Groups -->
      <div v-else class="card">
        <router-link 
          v-for="g in groups" 
          :key="g.id" 
          :to="`/groups/${g.id}`"
          class="row"
        >
          <span class="row-icon">{{ g.icon }}</span>
          <div class="row-body">
            <span class="row-name">{{ g.name }}</span>
            <span class="row-sub">{{ g.members.length }} member{{ g.members.length !== 1 ? 's' : '' }} · {{ g.expenseCount }} expense{{ g.expenseCount !== 1 ? 's' : '' }}</span>
          </div>
          <div class="row-end">
            <span 
              v-if="g.userBalance && g.userBalance !== 0" 
              :class="['row-balance', g.userBalance > 0 ? 'positive' : 'negative']"
            >
              {{ formatBalance(g.userBalance) }}
            </span>
            <span v-else class="row-settled">settled</span>
          </div>
        </router-link>
      </div>

    </div>

    <!-- FAB -->
    <button class="fab" @click="showModal = true">+</button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="overlay" @click.self="showModal = false">
          <div class="modal">
            <div class="modal-head">
              <h2>New Group</h2>
              <button class="close" @click="showModal = false">✕</button>
            </div>
            <form @submit.prevent="handleCreate" class="modal-body">
              <input v-model="formName" placeholder="Group name" class="input" required autofocus />
              
              <label class="label">Icon</label>
              <div class="icon-row">
                <button 
                  v-for="ic in icons" :key="ic" type="button"
                  :class="['icon-btn', { active: formIcon === ic }]"
                  @click="formIcon = ic"
                >{{ ic }}</button>
              </div>

              <label class="label">Type</label>
              <div class="cat-row">
                <button 
                  v-for="c in categories" :key="c.value" type="button"
                  :class="['cat-btn', { active: formCategory === c.value }]"
                  @click="formCategory = c.value"
                >{{ c.label }}</button>
              </div>

              <button type="submit" class="submit" :disabled="creating || !formName.trim()">
                {{ creating ? 'Creating...' : 'Create' }}
              </button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 100px 24px 120px;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.page.visible { opacity: 1; }

.container {
  max-width: 600px;
  margin: 0 auto;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 800;
}

.add-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-wrap {
  flex: 1;
  min-width: 180px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-dimmed);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 38px;
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 10px 12px;
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  min-width: 90px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Card */
.card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.04);
}

/* Row */
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}

.row:not(:last-child) { border-bottom: 1px solid rgba(0,0,0,0.04); }
.row:hover { background: rgba(0,0,0,0.015); }

.row-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #f5f7ff, #fdf4ff);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
  flex-shrink: 0;
}

.row-body { flex: 1; min-width: 0; }

.row-name {
  display: block;
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-sub {
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}

.row-end {
  flex-shrink: 0;
  text-align: right;
}

.row-balance {
  font-size: 0.875rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
}

.row-balance.positive { color: #10b981; }
.row-balance.negative { color: #ef4444; }

.row-settled {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-dimmed);
  background: rgba(0,0,0,0.03);
  padding: 4px 8px;
  border-radius: 6px;
}

/* Skeleton */
.row.skeleton { pointer-events: none; }

.sk-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

.sk-text { flex: 1; }

.sk-line {
  height: 10px;
  width: 50%;
  border-radius: 5px;
  background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  margin-bottom: 6px;
}
.sk-line.sm { width: 30%; margin-bottom: 0; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty */
.empty-card {
  text-align: center;
  padding: 48px 24px;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.04);
}

.empty-emoji { font-size: 2.5rem; display: block; margin-bottom: 12px; }
.empty-card h2 { font-size: 1.125rem; font-weight: 700; margin-bottom: 4px; }
.empty-card p { font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 16px; }

.cta {
  padding: 10px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

/* FAB */
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 1.5rem;
  font-weight: 300;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
  z-index: 100;
  display: none;
}

@media (max-width: 640px) {
  .add-btn { display: none; }
  .fab { display: flex; align-items: center; justify-content: center; }
  .filter-bar { flex-direction: column; }
  .filter-controls { width: 100%; }
  .filter-select { flex: 1; }
}

/* Modal */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 360px;
  overflow: hidden;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0;
}

.modal-head h2 { font-size: 1.25rem; font-weight: 800; }

.close {
  width: 32px;
  height: 32px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-dimmed);
}

.close:hover { background: #fef2f2; color: #ef4444; }

.modal-body {
  padding: 20px;
}

.input {
  width: 100%;
  padding: 12px 14px;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 500;
  margin-bottom: 16px;
}

.input:focus {
  outline: none;
  background: white;
  border-color: var(--color-primary);
}

.label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dimmed);
  margin-bottom: 8px;
}

.icon-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.icon-btn {
  width: 38px;
  height: 38px;
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover { background: white; border-color: var(--color-border); }
.icon-btn.active { background: white; border-color: var(--color-primary); }

.cat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.cat-btn {
  padding: 6px 12px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-btn:hover { background: #e5e7eb; }
.cat-btn.active { background: #1a1a2e; color: white; }

.submit {
  width: 100%;
  padding: 14px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
}

.submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
