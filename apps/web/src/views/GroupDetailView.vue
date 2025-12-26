<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { 
  GROUP_QUERY, 
  EXPENSES_QUERY, 
  CREATE_SETTLEMENT_MUTATION,
  GROUP_BALANCES_QUERY,
  DELETE_EXPENSE_MUTATION,
  GROUP_INVITES_QUERY,
  CANCEL_INVITE_MUTATION,
  GROUP_ACTIVITIES_QUERY,
  UPDATE_MEMBER_ROLE_MUTATION,
  CLAIM_PSEUDO_USER_MUTATION
} from '@/graphql/operations'
import InviteMemberModal from '@/components/InviteMemberModal.vue'
import GroupSettingsModal from '@/components/GroupSettingsModal.vue'
import ExpenseFormModal from '@/components/ExpenseFormModal.vue'
import CommentSection from '@/components/CommentSection.vue'
import SpendingAnalysis from '@/components/SpendingAnalysis.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()
const groupId = computed(() => route.params.id as string)
const isVisible = ref(false)
const isScrolled = ref(false)
const activeTab = ref<'balances' | 'expenses' | 'members' | 'activity' | 'analysis'>('balances')

// Queries
const { result: groupResult, loading: groupLoading, refetch: refetchGroup } = useQuery(GROUP_QUERY, () => ({
  id: groupId.value
}))

const { result: expensesResult, loading: expensesLoading, refetch: refetchExpenses } = useQuery(EXPENSES_QUERY, () => ({
  groupId: groupId.value
}))

const { result: balancesResult, refetch: refetchBalances } = useQuery(GROUP_BALANCES_QUERY, () => ({
  groupId: groupId.value
}))

const { result: invitesResult, refetch: refetchInvites } = useQuery(GROUP_INVITES_QUERY, () => ({
  groupId: groupId.value
}))

const { result: activitiesResult, refetch: refetchActivities } = useQuery(GROUP_ACTIVITIES_QUERY, () => ({
  groupId: groupId.value
}))

// Mutations
const { mutate: createSettlement, loading: creatingSettlement } = useMutation(CREATE_SETTLEMENT_MUTATION)
const { mutate: deleteExpense, loading: deletingExpense } = useMutation(DELETE_EXPENSE_MUTATION)
const { mutate: cancelInvite, loading: cancellingInvite } = useMutation(CANCEL_INVITE_MUTATION)
const { mutate: updateMemberRole, loading: updatingRole } = useMutation(UPDATE_MEMBER_ROLE_MUTATION)
const { mutate: claimPseudoUser, loading: claimingUser } = useMutation(CLAIM_PSEUDO_USER_MUTATION)

// Modal states
const showExpenseModal = ref(false)
const showSettleModal = ref(false)
const showInviteModal = ref(false)
const showDeleteConfirm = ref(false)
const showSettingsModal = ref(false)
const expandedExpenseId = ref<string | null>(null)

// Expense state
const editingExpense = ref<any>(null)

// Settlement form
const selectedDebt = ref<{ 
  ower: { id: string; name: string }; 
  owee: { id: string; name: string }; 
  amount: number; 
  formattedAmount: string 
} | null>(null)
const settlementAmount = ref('')

// Filters
const searchQuery = ref('')
const filterCategory = ref('')
const filterPayer = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')
const sortOption = ref('date-desc')

// Categories (for display)
const categories = [
  { value: 'FRIENDS', label: 'Friends', icon: '👥' },
  { value: 'HOME', label: 'Home', icon: '🏠' },
  { value: 'TRIP', label: 'Trip', icon: '✈️' },
  { value: 'COUPLE', label: 'Couple', icon: '💑' },
  { value: 'WORK', label: 'Work', icon: '💼' },
  { value: 'FAMILY', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'STUDENT', label: 'Student', icon: '🎓' },
  { value: 'OFFICE', label: 'Office', icon: '🏢' },
  { value: 'CLUB', label: 'Club', icon: '⚽' },
  { value: 'DINING', label: 'Dining', icon: '🍣' },
  { value: 'HOBBY', label: 'Hobby', icon: '🎨' },
  { value: 'OTHER', label: 'Other', icon: '📁' }
]

// Computed values
const group = computed(() => groupResult.value?.group)
const rawExpenses = computed(() => expensesResult.value?.expenses || [])
const expenses = computed(() => {
  const filtered = rawExpenses.value.filter((e: any) => {
    const matchesSearch = e.description.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                          (e.notes && e.notes.toLowerCase().includes(searchQuery.value.toLowerCase()))
    const matchesCategory = !filterCategory.value || e.category === filterCategory.value
    const matchesPayer = !filterPayer.value || e.paidBy.id === filterPayer.value
    
    // Date filter
    let matchesDate = true
    if (filterStartDate.value) {
      matchesDate = matchesDate && new Date(e.date) >= new Date(filterStartDate.value)
    }
    if (filterEndDate.value) {
      matchesDate = matchesDate && new Date(e.date) <= new Date(filterEndDate.value)
    }

    return matchesSearch && matchesCategory && matchesPayer && matchesDate
  })

  // Sorting
  return filtered.sort((a: any, b: any) => {
    switch (sortOption.value) {
      case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime()
      case 'amount-desc': return b.amount - a.amount
      case 'amount-asc': return a.amount - b.amount
      default: return 0
    }
  })
})
const members = computed(() => group.value?.members || [])
const debts = computed(() => {
  const rawBalances = balancesResult.value?.groupBalances || []
  return rawBalances.map((d: any) => ({
    ower: { id: d.owerId, name: d.owerName },
    owee: { id: d.oweeId, name: d.oweeName },
    amount: d.amount,
    formattedAmount: formatAmount(d.amount)
  }))
})

const pendingInvites = computed(() => invitesResult.value?.groupInvites?.filter((i: any) => i.status === 'PENDING') || [])
const activities = computed(() => activitiesResult.value?.groupActivities || [])
const currentUserMember = computed(() => members.value.find((m: any) => m.user.id === authStore.user?.id))
const isAdmin = computed(() => currentUserMember.value?.role === 'ADMIN')
const adminsCount = computed(() => members.value.filter((m: any) => m.role === 'ADMIN').length)

const totalBalance = computed(() => {
  return debts.value.reduce((sum: number, d: any) => sum + d.amount, 0)
})

function formatAmount(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString('en-IN')}`
}

function openAddExpense() {
  editingExpense.value = null
  showExpenseModal.value = true
}

function openSettleModal(debt: any) {
  selectedDebt.value = {
    ower: { id: debt.ower.id, name: debt.ower.name },
    owee: { id: debt.owee.id, name: debt.owee.name },
    amount: debt.amount,
    formattedAmount: debt.formattedAmount
  }
  settlementAmount.value = (debt.amount / 100).toFixed(2)
  showSettleModal.value = true
}

function onExpenseSaved() {
  refetchExpenses()
  refetchBalances()
  refetchActivities()
  showExpenseModal.value = false
  editingExpense.value = null
}

async function handleSettle() {
  if (!selectedDebt.value || !settlementAmount.value) return
  
  const amountInPaise = Math.round(parseFloat(settlementAmount.value) * 100)
  
  try {
    await createSettlement({
      groupId: groupId.value,
      payerId: selectedDebt.value.ower.id,
      receiverId: selectedDebt.value.owee.id,
      amount: amountInPaise,
    })
    
    showSettleModal.value = false
    selectedDebt.value = null
    settlementAmount.value = ''
    refetchBalances()
    refetchActivities()
    refetchActivities()
    toast.success('Settlement recorded')
  } catch (e: any) {
    toast.error(e.message || 'Failed to record settlement')
  }
}

function openEditExpense(expense: any) {
  editingExpense.value = expense
  showExpenseModal.value = true
}

function confirmDeleteExpense(expense: any) {
  editingExpense.value = expense
  showDeleteConfirm.value = true
}

async function handleDeleteExpense() {
  if (!editingExpense.value) return
  
  try {
    await deleteExpense({ id: editingExpense.value.id })
    showDeleteConfirm.value = false
    editingExpense.value = null
    refetchExpenses()
    refetchBalances()
    refetchActivities()
    refetchActivities()
    toast.success('Expense deleted')
  } catch (e: any) {
    toast.error(e.message || 'Failed to delete expense')
  }
}

async function handleCancelInvite(inviteId: string) {
  if (!confirm('Cancel this invitation?')) return
  try {
    await cancelInvite({ inviteId })
    refetchInvites()
    refetchActivities()
    refetchInvites()
    refetchActivities()
    toast.success('Invite cancelled')
  } catch (e: any) {
    toast.error(e.message || 'Failed to cancel invite')
  }
}


async function handleToggleAdmin(member: any) {
  const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
  if (newRole === 'MEMBER' && member.user.id === authStore.user?.id && adminsCount.value <= 1) {
    alert("You are the only admin. Promote someone else before demoting yourself.")
    return
  }

  try {
    await updateMemberRole({
      groupId: groupId.value,
      userId: member.user.id,
      role: newRole
    })
    refetchGroup()
    refetchActivities()
    refetchGroup()
    refetchActivities()
    toast.success(`Role updated to ${newRole}`)
  } catch (e: any) {
    toast.error(e.message || 'Failed to update role')
  }
}

async function handleClaimPseudoUser(member: any) {
  const email = prompt(`Enter email address for ${member.user.name}`);
  if (!email) return;

  try {
     await claimPseudoUser({
        groupId: groupId.value,
        pseudoUserId: member.user.id,
        email: email
     })
     toast.success(`Invite sent to ${email}`);
     refetchGroup();
     refetchInvites();
     refetchActivities();
  } catch (e: any) {
    toast.error(e.message || 'Failed to claim user')
  }
}

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 100)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', handleScroll)
})

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    if (!showExpenseModal.value) {
       e.preventDefault()
       openAddExpense()
    }
  }
}

function toggleComments(id: string) {
  expandedExpenseId.value = expandedExpenseId.value === id ? null : id
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'EXPENSE_CREATE': return '💸';
    case 'EXPENSE_UPDATE': return '✏️';
    case 'EXPENSE_DELETE': return '🗑️';
    case 'SETTLEMENT_CREATE': return '✅';
    case 'MEMBER_ADD': return '👋';
    case 'MEMBER_REMOVE': return '🚫';
    case 'MEMBER_LEAVE': return '👋';
    case 'INVITE_SEND': return '📩';
    case 'INVITE_ACCEPT': return '🤝';
    case 'INVITE_DECLINE': return '👎';
    case 'INVITE_CANCEL': return '✖️';
    case 'GROUP_UPDATE': return '⚙️';
    default: return '📝';
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="page-detail" :class="{ visible: isVisible }">
    <!-- Floating Island Header -->
    <header class="sticky-nav" :class="{ 'scrolled': isScrolled }">
      <div class="nav-island glass">
        <router-link to="/groups" class="nav-back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </router-link>
        
        <div class="nav-identity" v-if="group">
          <span class="nav-icon">{{ group.icon }}</span>
          <h1 class="nav-title">{{ group.name }}</h1>
        </div>
        
        <button class="nav-settings" @click="showSettingsModal = true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2 0l-.29.17a1.99 1.99 0 0 0-1 2.82l.09.08a2 2 0 0 1 0 2.82l-.09.09a2 2 0 0 0 1.01 3.42h.38a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.74-.75 2 2 0 0 0-.75-2.74l-.15-.09a2 2 0 0 1 0-2.82l.15-.09a2 2 0 0 0-1.01-3.42z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Premium Loading State -->
    <div v-if="groupLoading" class="premium-loader">
      <div class="loader-orb"></div>
      <p>Syncing Circle...</p>
    </div>

    <main v-else-if="group" class="content-container container">
      <!-- Immersive Glass Hero -->
      <section v-if="group" class="hero-section">
        <div class="glass-hero glass-layered" :class="{ 'settled-state': !debts.length }">
          <div class="hero-decor"></div>
          <div class="hero-body">
            <span class="hero-label">{{ debts.length ? 'Outstanding Balance' : 'Pure Transparency' }}</span>
            <div class="hero-stat">
              <span class="currency">₹</span>
              <span class="value">{{ debts.length ? (totalBalance / 100).toLocaleString('en-IN') : '0' }}</span>
            </div>
            <div class="hero-meta">
              <div class="meta-pill glass">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                <span>{{ members.length }} People</span>
              </div>
              <div class="meta-pill glass">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span>{{ expenses.length }} Items</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Pill Switcher Navigation -->
      <nav class="pill-switcher glass">
        <div class="switcher-active-bg" :style="{ transform: `translateX(${['balances', 'expenses', 'members', 'activity', 'analysis'].indexOf(activeTab) * 100}%)` }"></div>
        <button 
          v-for="tab in ['balances', 'expenses', 'members', 'activity', 'analysis']"
          :key="tab"
          :class="['switch-op', { active: activeTab === tab }]"
          @click="activeTab = tab as any"
        >
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
          <span v-if="tab === 'balances' && debts.length" class="noti-dot"></span>
        </button>
      </nav>

      <!-- Tab Content Panels -->
      <div class="panels">
        <!-- Balances: Visual Debt Flow -->
        <Transition name="panel-fade">
          <div v-show="activeTab === 'balances'" class="premium-panel">
            <div v-if="debts.length" class="visual-debt-list">
              <button 
                v-for="debt in debts" 
                :key="`${debt.ower.id}-${debt.owee.id}`"
                class="debt-flow-card glass"
                @click="openSettleModal(debt)"
              >
                <div class="flow-visual">
                  <div class="flow-avatar ower">{{ getInitials(debt.ower.name) }}</div>
                  <div class="flow-path">
                    <div class="path-line"></div>
                    <svg class="path-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="flow-avatar owee">{{ getInitials(debt.owee.name) }}</div>
                </div>
                <div class="flow-info">
                  <p class="flow-names"><strong>{{ debt.ower.name }}</strong> owes <strong>{{ debt.owee.name }}</strong></p>
                  <p class="flow-amount">{{ debt.formattedAmount }}</p>
                </div>
                <div class="flow-action">
                  <span class="btn-settle">Settle</span>
                </div>
              </button>
            </div>
            
            <div v-else class="empty-zen">
              <div class="zen-circle glass">✨</div>
              <h3>Crystal Clear</h3>
              <p>Everyone is settled up in this circle.</p>
            </div>
          </div>
        </Transition>

        <!-- Expenses: High-Fidelity List -->
        <Transition name="panel-fade">
          <div v-show="activeTab === 'expenses'" class="premium-panel">
            <div class="search-filter-hub glass">
              <div class="search-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input v-model="searchQuery" placeholder="Search expenses..." />
              </div>
              <div class="filter-actions">
                <select v-model="filterCategory" class="glass-select">
                  <option value="">All Categories</option>
                  <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                </select>
              </div>
            </div>

            <!-- Inline Loading -->
            <div v-if="expensesLoading" class="loading-stack-placeholder">
              <div class="skeleton-billboard glass"></div>
              <div class="skeleton-billboard glass"></div>
            </div>

            <div v-if="expenses.length" class="premium-expense-stack">
              <div 
                v-for="expense in expenses" 
                :key="expense.id"
                class="expense-billboard glass-layered"
              >
                <div class="billboard-left">
                  <div class="cat-icon-box">
                    {{ categories.find(c => c.value === expense.category)?.icon || '📄' }}
                  </div>
                </div>
                <div class="billboard-main">
                  <div class="billboard-top">
                    <h3 class="expense-title">{{ expense.description }}</h3>
                    <span class="expense-price">{{ expense.formattedAmount }}</span>
                  </div>
                  <div class="billboard-meta">
                    <span class="payer-tag">Paid by {{ expense.paidBy.name }}</span>
                    <span class="dot-sep"></span>
                    <span class="date-tag">{{ formatDate(expense.date) }}</span>
                  </div>
                  <!-- Inlays -->
                  <div class="billboard-inlays" v-if="expense.notes || expense.receiptUrl || expense.comments?.length">
                    <div v-if="expense.notes" class="inlay glass" title="View notes">📝 Notes</div>
                    <div v-if="expense.receiptUrl" class="inlay glass" title="View receipt">📎 Receipt</div>
                    <div v-if="expense.comments?.length" class="inlay glass" @click.stop="toggleComments(expense.id)">
                      💬 {{ expense.comments.length }}
                    </div>
                  </div>
                </div>
                <div class="billboard-actions">
                  <button class="action-orb" @click="openEditExpense(expense)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-orb danger" @click="confirmDeleteExpense(expense)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
                <!-- Expanded Comments -->
                <div v-if="expandedExpenseId === expense.id" class="billboard-expansion">
                  <CommentSection 
                    :expenseId="expense.id" 
                    :comments="expense.comments || []" 
                    @refresh="refetchExpenses"
                  />
                </div>
              </div>
            </div>
            
            <div v-else class="empty-zen">
              <div class="zen-circle glass">💸</div>
              <h3>No Transactions</h3>
              <p>This circle is waiting for its first shared expense.</p>
            </div>
          </div>
        </Transition>

        <!-- Members: Premium List -->
        <Transition name="panel-fade">
          <div v-show="activeTab === 'members'" class="premium-panel">
            <!-- Pending Invites -->
            <div v-if="pendingInvites.length" class="section-label">Pending Invitations</div>
            <div v-if="pendingInvites.length" class="member-stack pending">
              <div 
                v-for="invite in pendingInvites" 
                :key="invite.id"
                class="member-row glass"
              >
                <div class="member-avatar-box pending">
                  {{ invite.email[0].toUpperCase() }}
                </div>
                <div class="member-info">
                  <h4 class="member-name">{{ invite.email }}</h4>
                  <p class="member-sub">Invited by {{ invite.inviter.name }}</p>
                </div>
                <div class="member-actions">
                  <button class="action-orb danger" @click="handleCancelInvite(invite.id)" title="Cancel Invite" :disabled="cancellingInvite">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Members -->
            <div class="section-label">Circle Members</div>
            <div class="member-stack">
              <div 
                v-for="member in members" 
                :key="member.id"
                class="member-row glass"
              >
                <div class="member-avatar-box" :class="{ pseudo: member.user.isPseudo }">
                  {{ getInitials(member.user.name) }}
                </div>
                <div class="member-info">
                  <h4 class="member-name">{{ member.user.name }}</h4>
                  <p class="member-sub">{{ member.user.isPseudo ? 'Placeholder Member' : member.user.email }}</p>
                </div>
                <div class="member-status">
                  <span v-if="member.role === 'ADMIN'" class="role-pill">Admin</span>
                  <div class="member-mod-actions" v-if="isAdmin">
                    <!-- Claim Pseudo-User -->
                    <button 
                      v-if="member.user.isPseudo"
                      class="mod-btn" 
                      @click.stop="handleClaimPseudoUser(member)"
                      title="Invite real user"
                      :disabled="claimingUser"
                    >
                      📩
                    </button>
                    <!-- Toggle Admin -->
                    <button 
                      v-if="!member.user.isPseudo"
                      class="mod-btn" 
                      @click.stop="handleToggleAdmin(member)" 
                      :title="member.role === 'ADMIN' ? 'Demote' : 'Promote'"
                      :disabled="updatingRole || (member.role === 'ADMIN' && adminsCount <= 1 && member.user.id === authStore.user?.id)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M7 11l5-5 5 5M7 13l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button class="add-member-hub glass" @click="showInviteModal = true">
              <div class="hub-orb">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
                </svg>
              </div>
              <span>Invite New Member</span>
            </button>
          </div>
        </Transition>

        <!-- Activity & Analysis -->
        <Transition name="panel-fade">
          <div v-show="activeTab === 'activity'" class="premium-panel">
             <div class="activity-timeline glass">
                <div v-for="act in activities" :key="act.id" class="timeline-step">
                   <div class="step-icon glass">{{ getActivityIcon(act.type) }}</div>
                   <div class="step-content">
                      <p class="step-text"><strong>{{ act.actor.name }}</strong> {{ act.description }}</p>
                      <span class="step-time">{{ formatDate(act.createdAt) }}</span>
                   </div>
                   <div v-if="act.metadata?.amount" class="step-value">{{ formatAmount(act.metadata.amount) }}</div>
                </div>
             </div>
          </div>
        </Transition>

        <Transition name="panel-fade">
          <div v-show="activeTab === 'analysis'" class="premium-panel">
            <div class="analysis-hub glass">
               <SpendingAnalysis :expenses="rawExpenses" :members="group?.members || []" />
            </div>
          </div>
        </Transition>
      </div>
    </main>

    <!-- Plus-Orb FAB -->
    <button 
      v-if="group" 
      class="productivity-fab" 
      :class="{ visible: isVisible }"
      @click="openAddExpense"
    >
      <div class="fab-orb">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
        </svg>
      </div>
      <span class="fab-label">Add Expense</span>
    </button>



    <!-- Settle Modal -->
    <Teleport to="body">
      <Transition name="modal-bounce">
        <div v-if="showSettleModal && selectedDebt" class="modal-overlay glass-fixed" @click.self="showSettleModal = false">
          <div class="modal-island glass-layered compact">
            <div class="modal-glow"></div>
            <div class="modal-header-premium">
              <div class="header-main">
                <span class="header-icon">💸</span>
                <h2>Record Payment</h2>
              </div>
              <button class="close-orb" @click="showSettleModal = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div class="settle-stage">
              <div class="settle-duo">
                <div class="duo-avatar ower">{{ getInitials(selectedDebt.ower.name) }}</div>
                <div class="duo-path">
                  <div class="path-line"></div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="duo-avatar owee">{{ getInitials(selectedDebt.owee.name) }}</div>
              </div>
              <p class="settle-narration">
                <strong>{{ selectedDebt.ower.name }}</strong> is paying <strong>{{ selectedDebt.owee.name }}</strong>
              </p>
            </div>
            
            <form @submit.prevent="handleSettle" class="modal-body-premium">
              <div class="amount-entry glass">
                <span class="currency-sym">₹</span>
                <input 
                  v-model="settlementAmount"
                  type="number"
                  step="0.01"
                  class="premium-num-input"
                  placeholder="0.00"
                  required
                  autofocus
                />
              </div>
              
              <div class="due-hint">
                Balance: {{ selectedDebt.formattedAmount }}
              </div>
              
              <button type="submit" class="premium-btn active" :disabled="creatingSettlement">
                <span>{{ creatingSettlement ? 'Recording...' : 'Record Payment' }}</span>
              </button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>



    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal-bounce">
        <div v-if="showDeleteConfirm && editingExpense" class="modal-overlay glass-fixed" @click.self="showDeleteConfirm = false">
          <div class="modal-island glass-layered compact">
            <div class="modal-glow danger"></div>
            <div class="modal-header-premium">
              <div class="header-main">
                <span class="header-icon">⚠️</span>
                <h2>Delete Expense</h2>
              </div>
              <button class="close-orb" @click="showDeleteConfirm = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div class="modal-body-premium">
              <div class="confirm-content">
                <p class="confirm-text">Are you sure you want to remove <strong>{{ editingExpense.description }}</strong>?</p>
                <p class="confirm-sub">This will permanently recalculate all balances in this circle.</p>
              </div>
              
              <div class="action-spread">
                <button type="button" class="premium-btn secondary" @click="showDeleteConfirm = false">Cancel</button>
                <button type="button" class="premium-btn danger" :disabled="deletingExpense" @click="handleDeleteExpense">
                  <span>{{ deletingExpense ? 'Deleting...' : 'Delete Forever' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Invite Modal -->
    <InviteMemberModal 
      :open="showInviteModal"
      :group-id="groupId"
      @close="showInviteModal = false"
      @invited="() => { refetchGroup(); showInviteModal = false; }"
    />

    <!-- Group Settings Modal -->
    <GroupSettingsModal
      v-if="group"
      :open="showSettingsModal"
      :group="group"
      :current-user-id="authStore.user?.id || ''"
      @close="showSettingsModal = false"
      @updated="refetchGroup"
    />

    <!-- Expense Form Modal -->
    <ExpenseFormModal
      v-if="group"
      :open="showExpenseModal"
      :group="group"
      :expense="editingExpense"
      @close="showExpenseModal = false"
      @saved="onExpenseSaved"
    />
  </div>
</template>

<style scoped>
.page-detail {
  min-height: 100vh;
  padding-bottom: 120px;
  background: transparent;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-detail.visible {
  opacity: 1;
  transform: translateY(0);
}

.container {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Floating Island Header */
.sticky-nav {
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  padding: 12px 24px;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-island {
  pointer-events: auto;
  width: 100%;
  max-width: 680px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-radius: 27px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.02);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.sticky-nav.scrolled {
  padding: 8px 24px;
}

.sticky-nav.scrolled .nav-island {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 10px 40px -10px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  max-width: 600px;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
}

.nav-back, .nav-settings {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-back:hover, .nav-settings:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
  transform: scale(1.05);
}

.nav-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-icon {
  font-size: 1.5rem;
}
@media (max-width: 640px) {
  .sticky-nav {
    padding: 8px;
    top: 64px;
  }
  .nav-island {
    height: 48px;
    padding: 0 12px;
  }
  .nav-title {
    font-size: 1rem;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.nav-title {
  font-size: 1.125rem;
  font-weight: 850;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

/* Immersive Hero */
.hero-section {
  padding-top: 140px;
  margin-bottom: 32px;
}

.glass-hero {
  position: relative;
  padding: 48px 32px;
  border-radius: 32px;
  text-align: center;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid white;
  box-shadow: 
    0 20px 40px -10px rgba(0, 0, 0, 0.1),
    inset 0 0 100px rgba(99, 102, 241, 0.03);
}

.hero-decor {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: radial-gradient(circle at center, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
  pointer-events: none;
  animation: drift 20s infinite linear;
}

@keyframes drift {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.hero-label {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-dimmed);
  margin-bottom: 12px;
  display: block;
}

.hero-stat {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 24px;
}

.hero-stat .currency {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.hero-stat .value {
  font-size: 4rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-meta {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.meta-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

/* Pill Switcher */
.pill-switcher {
  position: relative;
  display: flex;
  background: rgba(0, 0, 0, 0.03);
  padding: 6px;
  border-radius: 20px;
  margin-bottom: 32px;
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.switcher-active-bg {
  position: absolute;
  top: 6px;
  left: 6px;
  width: calc(20% - 2.4px);
  height: calc(100% - 12px);
  background: white;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1;
}

.switch-op {
  position: relative;
  flex: 1;
  padding: 12px 0;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  z-index: 2;
  transition: color 0.3s ease;
}

.switch-op.active {
  color: var(--color-text);
}

.noti-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: var(--color-danger);
  border-radius: 50%;
}

/* Debt Flow */
.visual-debt-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.debt-flow-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 24px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  width: 100%;
  text-align: left;
}

.debt-flow-card:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: var(--color-primary-light);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08);
}

.flow-visual {
  display: flex;
  align-items: center;
  gap: 12px;
}

.flow-avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: white;
  font-size: 0.875rem;
}

.flow-avatar.ower {
  background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
}

.flow-avatar.owee {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.flow-path {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--color-text-dimmed);
}

.path-line {
  width: 32px;
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--color-border) 0, var(--color-border) 4px, transparent 4px, transparent 8px);
}

.flow-info {
  flex: 1;
}

.flow-names {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.flow-names strong {
  color: var(--color-text);
  font-weight: 700;
}

.flow-amount {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.btn-settle {
  padding: 10px 20px;
  border-radius: 30px;
  background: var(--color-text);
  color: white;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.2);
}

/* Expense Stack */
.premium-expense-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expense-billboard {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 20px;
  padding: 20px;
  background: white;
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.expense-billboard:hover {
  border-color: rgba(99, 102, 241, 0.2);
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.98);
}

.cat-icon-box {
  width: 64px;
  height: 64px;
  background: var(--color-bg-secondary);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
}

.billboard-main {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.billboard-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.expense-title {
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.expense-price {
  font-size: 1.125rem;
  font-weight: 850;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.billboard-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-dimmed);
}

.dot-sep {
  width: 3px;
  height: 3px;
  background: var(--color-border);
  border-radius: 50%;
}

.billboard-inlays {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.inlay {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.03);
}

.billboard-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
}

.expense-billboard:hover .billboard-actions {
  opacity: 1;
  transform: translateX(0);
}

.action-orb {
  width: 32px;
  height: 32px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-orb:hover {
  background: var(--color-text);
  color: white;
  transform: scale(1.1);
}

.action-orb.danger:hover {
  background: var(--color-danger);
}

/* Member Stack */
.member-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.member-avatar-box {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: white;
  font-size: 0.8125rem;
}

.member-avatar-box.pseudo {
  background: var(--color-bg-secondary);
  color: var(--color-text-dimmed);
  border: 2px dashed var(--color-border);
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 750;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.member-sub {
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
  font-weight: 600;
}

.role-pill {
  font-size: 0.6875rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-primary);
  background: var(--color-primary-50);
  padding: 4px 8px;
  border-radius: 20px;
}

.add-member-hub {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 20px;
  border: 2px dashed var(--color-border);
  background: transparent;
  width: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.add-member-hub:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-50);
  color: var(--color-primary);
}

/* Activity Feed */
.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 12px;
  border-radius: 24px;
  background: white;
}

.timeline-step {
  display: flex;
  gap: 16px;
  padding: 16px;
  position: relative;
}

.timeline-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 56px;
  left: 36px;
  width: 2px;
  height: calc(100% - 40px);
  background: var(--color-bg-secondary);
}

.step-icon {
  width: 40px;
  height: 40px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  z-index: 2;
}

.step-content {
  flex: 1;
}

.step-text {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text);
}

.step-text strong {
  font-weight: 750;
}

.step-time {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dimmed);
}

.step-value {
  font-weight: 850;
  font-family: var(--font-mono);
  color: var(--color-text);
}

/* Productivity FAB */
.productivity-fab {
  position: fixed;
  bottom: 40px;
  right: 40px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px 12px 12px;
  background: var(--color-text);
  color: white;
  border-radius: 40px;
  border: none;
  cursor: pointer;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
  z-index: 150;
  opacity: 0;
  transform: translateY(20px) scale(0.9);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.productivity-fab.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.fab-orb {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-label {
  font-weight: 800;
  font-size: 0.9375rem;
  letter-spacing: -0.01em;
}

.productivity-fab:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.4);
}

/* Transitions */
.panel-fade-enter-active, .panel-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Search Hub */
.search-filter-hub {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.03);
  margin-bottom: 24px;
}

.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 0 16px;
  border-radius: 14px;
  color: var(--color-text-dimmed);
}

.search-wrap input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  outline: none;
}

.glass-select {
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: white;
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

/* Premium Loader */
.premium-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loader-orb {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-bg-secondary);
  border-top-color: var(--color-text);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.premium-loader p {
  font-weight: 700;
  color: var(--color-text-dimmed);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.75rem;
}

/* Premium Modal Overhaul */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 200;
}

.modal-island {
  position: relative;
  width: 100%;
  max-width: 440px;
  border-radius: 32px;
  overflow: hidden;
  padding: 32px;
}

.modal-island.compact {
  max-width: 400px;
}

.modal-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-main h2 {
  font-size: 1.25rem;
  font-weight: 850;
  letter-spacing: -0.02em;
}

.close-orb {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-orb:hover {
  background: var(--color-text);
  color: white;
  transform: rotate(90deg);
}

.settle-stage {
  text-align: center;
  margin-bottom: 32px;
}

.settle-duo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}

.duo-avatar {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: white;
  font-size: 1rem;
}

.duo-avatar.ower { background: linear-gradient(135deg, #475569 0%, #1e293b 100%); }
.duo-avatar.owee { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }

.duo-path {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-dimmed);
}

.modal-body-premium {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.amount-entry {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-radius: 20px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.currency-sym {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-dimmed);
}

.premium-num-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 2rem;
  font-weight: 850;
  color: var(--color-text);
  outline: none;
  width: 100%;
}

.due-hint {
  text-align: center;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text-dimmed);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.premium-btn {
  width: 100%;
  padding: 16px;
  border-radius: 18px;
  border: none;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.premium-btn.active {
  background: var(--color-text);
  color: white;
  box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.2);
}

.premium-btn.secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.premium-btn.danger {
  background: var(--color-danger);
  color: white;
  box-shadow: 0 12px 24px -6px rgba(239, 68, 68, 0.3);
}

.premium-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.modal-glow {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  background: radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
  z-index: -1;
  pointer-events: none;
}

.modal-glow.danger {
  background: radial-gradient(circle at center, rgba(239, 68, 68, 0.08) 0%, transparent 70%);
}

.modal-bounce-enter-active {
  animation: modal-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-bounce-leave-active {
  animation: modal-bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) reverse;
}

@keyframes modal-bounce-in {
  0% { opacity: 0; transform: scale(0.9) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.confirm-content {
  text-align: center;
  margin-bottom: 24px;
}

.confirm-text {
  font-size: 1.125rem;
  font-weight: 750;
  color: var(--color-text);
  margin-bottom: 8px;
}

.confirm-sub {
  font-size: 0.875rem;
  color: var(--color-text-dimmed);
  line-height: 1.5;
}

.action-spread {
  display: flex;
  gap: 12px;
}

.action-spread button {
  flex: 1;
}

.glass-layered {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(30px) saturate(200%);
  -webkit-backdrop-filter: blur(30px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  position: relative;
  box-shadow: 
    0 30px 60px -10px rgba(0, 0, 0, 0.15),
    0 10px 20px -5px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.9);
}

.loading-stack-placeholder {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-billboard {
  height: 104px;
  border-radius: 24px;
  animation: skeleton-pulse 1.5s infinite;
}

@keyframes skeleton-pulse {
  0% { opacity: 0.5; }
  50% { opacity: 0.8; }
  100% { opacity: 0.5; }
}
</style>
