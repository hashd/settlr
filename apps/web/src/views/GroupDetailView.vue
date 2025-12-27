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
  CLAIM_PSEUDO_USER_MUTATION,
  SEND_PAYMENT_REMINDER_MUTATION
} from '@/graphql/operations'
import InviteMemberModal from '@/components/InviteMemberModal.vue'
import GroupSettingsModal from '@/components/GroupSettingsModal.vue'
import ExpenseFormModal from '@/components/ExpenseFormModal.vue'
import CommentSection from '@/components/CommentSection.vue'
import SpendingAnalysis from '@/components/SpendingAnalysis.vue'
import RecurringExpenses from '@/components/RecurringExpenses.vue'
import BalanceAdjustmentModal from '@/components/BalanceAdjustmentModal.vue'
import SpendingCharts from '@/components/SpendingCharts.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import PromptModal from '@/components/ui/PromptModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()
const groupId = computed(() => route.params.id as string)
const isVisible = ref(false)
const isScrolled = ref(false)
const activeTab = ref<'balances' | 'expenses' | 'members' | 'activity' | 'analysis'>('balances')

// Modal States
const confirmState = ref({
  open: false,
  title: '',
  message: '',
  danger: false,
  onConfirm: () => {}
})
const promptState = ref({
  open: false,
  title: '',
  message: '',
  placeholder: '',
  onConfirm: (_val: string) => {}
})

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
const showAdjustModal = ref(false)
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
    ower: { id: d.ower.id, name: d.ower.name },
    owee: { id: d.owee.id, name: d.owee.name },
    amount: d.amount,
    formattedAmount: d.formattedAmount || formatAmount(d.amount)
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

function handleCancelInvite(inviteId: string) {
  confirmState.value = {
    open: true,
    title: 'Cancel Invitation',
    message: 'Are you sure you want to cancel this invitation?',
    danger: true,
    onConfirm: async () => {
      try {
        await cancelInvite({ inviteId })
        refetchInvites()
        refetchActivities()
        toast.success('Invite cancelled')
      } catch (e: any) {
        toast.error(e.message || 'Failed to cancel invite')
      }
    }
  }
}


async function handleToggleAdmin(member: any) {
  const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
  if (newRole === 'MEMBER' && member.user.id === authStore.user?.id && adminsCount.value <= 1) {
    toast.warning("You are the only admin. Promote someone else before demoting yourself.")
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

function handleClaimPseudoUser(member: any) {
  promptState.value = {
    open: true,
    title: `Claim ${member.user.name}`,
    message: 'Enter email address for this user to send an invite.',
    placeholder: 'email@example.com',
    onConfirm: async (email: string) => {
      promptState.value.open = false
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
  }
}

const { mutate: sendPaymentReminder } = useMutation(SEND_PAYMENT_REMINDER_MUTATION)

async function handleRemind(debt: any) {
  try {
    await sendPaymentReminder({
      groupId: groupId.value,
      toUserId: debt.ower.id,
      amount: debt.amount
    })
    toast.success(`Reminder sent to ${debt.ower.name}`)
  } catch (e: any) {
    toast.error(e.message || 'Failed to send reminder')
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
    <!-- Compact Floating Header -->
    <header class="header-bar" :class="{ scrolled: isScrolled }">
      <div class="header-island">
        <router-link to="/groups" class="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </router-link>
        <div class="header-center" v-if="group">
          <span class="group-icon">{{ group.icon }}</span>
          <span class="group-name">{{ group.name }}</span>
        </div>
        <button class="settings-btn" @click="showSettingsModal = true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="groupLoading" class="loader-wrap">
      <div class="loader-spinner"></div>
    </div>

    <main v-else-if="group" class="main-content">
      <!-- Compact Balance Card -->
      <section class="balance-card">
        <div class="balance-row">
          <div class="balance-info">
            <span class="balance-label">{{ debts.length ? 'Balance' : 'All Clear' }}</span>
            <span class="balance-value">₹{{ debts.length ? (totalBalance / 100).toLocaleString('en-IN') : '0' }}</span>
          </div>
          <div class="quick-stats">
            <span class="stat">{{ members.length }} <small>people</small></span>
            <span class="stat">{{ expenses.length }} <small>items</small></span>
          </div>
        </div>
      </section>

      <!-- Icon Tab Bar -->
      <nav class="tab-bar">
        <button 
          v-for="tab in [
            { id: 'balances', icon: '⚖️', label: 'Balances' },
            { id: 'expenses', icon: '💳', label: 'Expenses' },
            { id: 'members', icon: '👥', label: 'Members' },
            { id: 'activity', icon: '📋', label: 'Activity' },
            { id: 'analysis', icon: '📊', label: 'Analysis' }
          ]"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id as any"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.id === 'balances' && debts.length" class="tab-badge"></span>
        </button>
      </nav>

      <!-- Content Panels -->
      <div class="panels">
        <!-- Balances -->
        <Transition name="fade">
          <div v-show="activeTab === 'balances'" class="panel">
            <div v-if="debts.length" class="debt-list">
              <button 
                v-for="debt in debts" 
                :key="`${debt.ower.id}-${debt.owee.id}`"
                class="debt-row"
                @click="openSettleModal(debt)"
              >
                <div class="debt-parties">
                  <span class="avatar ower">{{ getInitials(debt.ower.name) }}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="avatar owee">{{ getInitials(debt.owee.name) }}</span>
                </div>
                <div class="debt-info">
                  <span class="debt-names">{{ debt.ower.name }} → {{ debt.owee.name }}</span>
                  <span class="debt-amount">{{ debt.formattedAmount }}</span>
                </div>
                <div class="debt-actions">
                  <button 
                    v-if="debt.owee.id === authStore.user?.id" 
                    class="remind-btn" 
                    @click.stop="handleRemind(debt)"
                  >
                    🔔 Remind
                  </button>
                  <span class="settle-tag">Settle</span>
                </div>
              </button>
            </div>
            <div v-else class="empty-state">
              <span class="empty-icon">✨</span>
              <p>Everyone is settled up</p>
            </div>
            
            <!-- Adjust Balance Button -->
            <div class="balance-actions">
              <button class="adjust-btn" @click="showAdjustModal = true">
                ⚖️ Adjust Balance
              </button>
            </div>
          </div>
        </Transition>

        <!-- Expenses -->
        <Transition name="fade">
          <div v-show="activeTab === 'expenses'" class="panel">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input v-model="searchQuery" placeholder="Search..." />
              <select v-model="filterCategory" class="filter-select">
                <option value="">All</option>
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.icon }}</option>
              </select>
            </div>

            <div v-if="expensesLoading" class="skeleton-stack">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </div>

            <div v-else-if="expenses.length" class="expense-list">
              <div v-for="expense in expenses" :key="expense.id" class="expense-row">
                <div class="expense-icon">{{ categories.find(c => c.value === expense.category)?.icon || '📄' }}</div>
                <div class="expense-main">
                  <span class="expense-desc">{{ expense.description }}</span>
                  <span class="expense-meta">{{ expense.paidBy.name }} · {{ formatDate(expense.date) }}</span>
                </div>
                <span class="expense-amount">{{ expense.formattedAmount }}</span>
                <div class="expense-actions">
                  <button class="action-btn" @click="openEditExpense(expense)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn danger" @click="confirmDeleteExpense(expense)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
                <!-- Comments toggle (always visible) -->
                <button class="comment-btn" @click.stop="toggleComments(expense.id)" :class="{ active: expandedExpenseId === expense.id }">
                  💬 {{ expense.comments?.length || '' }}
                </button>
                <div v-if="expandedExpenseId === expense.id" class="comments-panel">
                  <CommentSection :expenseId="expense.id" :comments="expense.comments || []" @refresh="refetchExpenses"/>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">
              <span class="empty-icon">💸</span>
              <p>No expenses yet</p>
            </div>
            
            <!-- Recurring Expenses Section -->
            <RecurringExpenses v-if="group" :group-id="groupId" :members="group.members" @refresh="refetchExpenses" />
            
            <!-- Spending Charts -->
            <SpendingCharts v-if="expenses.length > 0" :expenses="expenses" />
          </div>
        </Transition>

        <!-- Members -->
        <Transition name="fade">
          <div v-show="activeTab === 'members'" class="panel">
            <!-- Pending Invites -->
            <div v-if="pendingInvites.length" class="section-header">Pending</div>
            <div v-if="pendingInvites.length" class="member-list pending">
              <div v-for="invite in pendingInvites" :key="invite.id" class="member-row">
                <span class="avatar pending">{{ invite.email[0].toUpperCase() }}</span>
                <div class="member-info">
                  <span class="member-name">{{ invite.email }}</span>
                  <span class="member-sub">Invited by {{ invite.inviter.name }}</span>
                </div>
                <button class="action-btn danger" @click="handleCancelInvite(invite.id)" :disabled="cancellingInvite">✕</button>
              </div>
            </div>

            <!-- Members -->
            <div class="section-header">Members</div>
            <div class="member-list">
              <div v-for="member in members" :key="member.id" class="member-row">
                <span class="avatar" :class="{ pseudo: member.user.isPseudo }">{{ getInitials(member.user.name) }}</span>
                <div class="member-info">
                  <span class="member-name">{{ member.user.name }}</span>
                  <span class="member-sub">{{ member.user.isPseudo ? 'Placeholder' : member.user.email }}</span>
                </div>
                <span v-if="member.role === 'ADMIN'" class="role-badge">Admin</span>
                <div v-if="isAdmin" class="member-actions">
                  <button v-if="member.user.isPseudo" class="action-btn" @click="handleClaimPseudoUser(member)" :disabled="claimingUser">📩</button>
                  <button v-if="!member.user.isPseudo" class="action-btn" @click="handleToggleAdmin(member)" :disabled="updatingRole">
                    {{ member.role === 'ADMIN' ? '↓' : '↑' }}
                  </button>
                </div>
              </div>
            </div>

            <button class="invite-btn" @click="showInviteModal = true">
              <span>+</span> Invite Member
            </button>
          </div>
        </Transition>

        <!-- Activity -->
        <Transition name="fade">
          <div v-show="activeTab === 'activity'" class="panel">
            <div v-if="activities.length" class="activity-list">
              <div v-for="act in activities" :key="act.id" class="activity-row">
                <span class="activity-icon">{{ getActivityIcon(act.type) }}</span>
                <div class="activity-info">
                  <span class="activity-text"><strong>{{ act.actor.name }}</strong> {{ act.description }}</span>
                  <span class="activity-time">{{ formatDate(act.createdAt) }}</span>
                </div>
                <span v-if="act.metadata?.amount" class="activity-amount">{{ formatAmount(act.metadata.amount) }}</span>
              </div>
            </div>
            <div v-else class="empty-state">
              <span class="empty-icon">📋</span>
              <p>No activity yet</p>
            </div>
          </div>
        </Transition>

        <!-- Analysis -->
        <Transition name="fade">
          <div v-show="activeTab === 'analysis'" class="panel">
            <SpendingAnalysis :expenses="rawExpenses" :members="group?.members || []" />
          </div>
        </Transition>
      </div>
    </main>

    <!-- FAB -->
    <button v-if="group" class="fab" :class="{ visible: isVisible }" @click="openAddExpense">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Settle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSettleModal && selectedDebt" class="modal-overlay" @click.self="showSettleModal = false">
          <div class="modal-box">
            <div class="modal-header">
              <h3>💸 Record Payment</h3>
              <button class="close-btn" @click="showSettleModal = false">✕</button>
            </div>
            <div class="settle-visual">
              <span class="avatar ower">{{ getInitials(selectedDebt.ower.name) }}</span>
              <span class="arrow">→</span>
              <span class="avatar owee">{{ getInitials(selectedDebt.owee.name) }}</span>
            </div>
            <p class="settle-desc">{{ selectedDebt.ower.name }} pays {{ selectedDebt.owee.name }}</p>
            <form @submit.prevent="handleSettle" class="settle-form">
              <div class="amount-input-wrap">
                <span class="currency">₹</span>
                <input v-model="settlementAmount" type="number" step="0.01" placeholder="0.00" required autofocus />
              </div>
              <p class="balance-hint">Balance: {{ selectedDebt.formattedAmount }}</p>
              <button type="submit" class="primary-btn" :disabled="creatingSettlement">
                {{ creatingSettlement ? 'Recording...' : 'Record Payment' }}
              </button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm && editingExpense" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal-box">
            <div class="modal-header">
              <h3>⚠️ Delete Expense</h3>
              <button class="close-btn" @click="showDeleteConfirm = false">✕</button>
            </div>
            <p class="confirm-text">Delete <strong>{{ editingExpense.description }}</strong>?</p>
            <p class="confirm-sub">This will recalculate all balances.</p>
            <div class="modal-actions">
              <button class="secondary-btn" @click="showDeleteConfirm = false">Cancel</button>
              <button class="danger-btn" @click="handleDeleteExpense" :disabled="deletingExpense">
                {{ deletingExpense ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Other Modals -->
    <InviteMemberModal :open="showInviteModal" :group-id="groupId" @close="showInviteModal = false" @invited="() => { refetchGroup(); showInviteModal = false; }"/>
    <GroupSettingsModal v-if="group" :open="showSettingsModal" :group="group" :current-user-id="authStore.user?.id || ''" @close="showSettingsModal = false" @updated="refetchGroup"/>
    <ExpenseFormModal v-if="group" :open="showExpenseModal" :group="group" :expense="editingExpense" @close="showExpenseModal = false" @saved="onExpenseSaved"/>
    <BalanceAdjustmentModal v-if="showAdjustModal && group" :group-id="groupId" :members="group.members" @close="showAdjustModal = false" @saved="() => { refetchBalances(); showAdjustModal = false; }"/>
  </div>
  <ConfirmModal
    :open="confirmState.open"
    :title="confirmState.title"
    :message="confirmState.message"
    :danger="confirmState.danger"
    @close="confirmState.open = false"
    @confirm="confirmState.onConfirm"
  />

  <PromptModal
    :open="promptState.open"
    :title="promptState.title"
    :message="promptState.message"
    :placeholder="promptState.placeholder"
    @close="promptState.open = false"
    @confirm="promptState.onConfirm"
  />
</template>


<style scoped>
/* Base */
.page-detail {
  min-height: 100vh;
  padding-bottom: 100px;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.page-detail.visible {
  opacity: 1;
}

/* Header */
.header-bar {
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 8px 16px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  transition: all 0.3s ease;
}
.header-bar.scrolled {
  top: 64px;
}
.header-island {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}
.back-btn, .settings-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}
.back-btn:hover, .settings-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}
.header-center {
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-icon { font-size: 1.25rem; }
.group-name {
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--color-text);
}

/* Loader */
.loader-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.loader-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-bg-secondary);
  border-top-color: var(--color-text);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Main Content */
.main-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 100px 16px 0;
}

/* Balance Card */
.balance-card {
  margin-bottom: 20px;
}
.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.balance-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.balance-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dimmed);
}
.balance-value {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
.quick-stats {
  display: flex;
  gap: 16px;
}
.stat {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
}
.stat small {
  font-weight: 500;
  color: var(--color-text-dimmed);
}

/* Tab Bar */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  margin-bottom: 16px;
}
.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.tab-btn:hover { background: rgba(0, 0, 0, 0.03); }
.tab-btn.active {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.tab-icon { font-size: 1rem; }
.tab-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.tab-btn.active .tab-label { color: var(--color-text); }
.tab-badge {
  position: absolute;
  top: 4px;
  right: 25%;
  width: 6px;
  height: 6px;
  background: var(--color-danger);
  border-radius: 50%;
}

/* Panels */
.panel { min-height: 200px; }

/* Debt List */
.debt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.debt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}
.debt-row:hover {
  border-color: var(--color-primary-light);
  transform: translateX(2px);
}
.debt-parties {
  display: flex;
  align-items: center;
  gap: 6px;
}
.debt-parties svg { color: var(--color-text-dimmed); }
.debt-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.debt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.remind-btn {
  padding: 4px 8px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.remind-btn:hover {
  border-color: var(--color-text-dimmed);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}
.debt-names {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}
.debt-amount {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
}
.settle-tag {
  padding: 6px 12px;
  background: var(--color-text);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 8px;
}

/* Avatar */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.avatar.ower { background: linear-gradient(135deg, #475569, #1e293b); }
.avatar.owee { background: linear-gradient(135deg, #10b981, #059669); }
.avatar.pending {
  background: var(--color-bg-secondary);
  color: var(--color-text-dimmed);
  border: 2px dashed var(--color-border);
}
.avatar.pseudo {
  background: var(--color-bg-secondary);
  color: var(--color-text-dimmed);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}
.empty-icon { font-size: 2rem; }
.empty-state p {
  font-size: 0.875rem;
  color: var(--color-text-dimmed);
}

/* Search Bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  margin-bottom: 12px;
}
.search-bar svg { color: var(--color-text-dimmed); flex-shrink: 0; }
.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  outline: none;
}
.filter-select {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.8125rem;
  background: white;
}

/* Skeleton */
.skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-row {
  height: 56px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

/* Expense List */
.expense-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.expense-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  flex-wrap: wrap;
}
.expense-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  font-size: 1rem;
}
.expense-main {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.expense-desc {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}
.expense-meta {
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}
.expense-amount {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
}
.expense-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.expense-row:hover .expense-actions { opacity: 1; }
.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-btn:hover {
  background: var(--color-text);
  color: white;
}
.action-btn.danger:hover {
  background: var(--color-danger);
}
.comment-btn {
  padding: 4px 10px;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.comment-btn:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border);
}
.comment-btn.active {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--color-primary);
}
.comments-panel {
  width: 100%;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

/* Balance Actions */
.balance-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.adjust-btn {
  width: 100%;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.adjust-btn:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-text-dimmed);
}

/* Member List */
.section-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dimmed);
  margin: 16px 0 8px;
}
.member-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
}
.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.member-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}
.member-sub {
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}
.role-badge {
  padding: 4px 8px;
  background: var(--color-primary-50);
  color: var(--color-primary);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 6px;
}
.member-actions {
  display: flex;
  gap: 4px;
}
.invite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin-top: 12px;
  background: transparent;
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.invite-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.activity-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}
.activity-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  font-size: 0.875rem;
}
.activity-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.activity-text {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}
.activity-time {
  font-size: 0.6875rem;
  color: var(--color-text-dimmed);
}
.activity-amount {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text);
}

/* FAB */
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-text);
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transform: translateY(16px) scale(0.9);
  transition: all 0.3s ease;
  z-index: 50;
}
.fab.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.fab:hover {
  transform: translateY(-2px) scale(1.05);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 200;
}
.modal-box {
  width: 100%;
  max-width: 380px;
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
}
.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.close-btn:hover {
  background: var(--color-text);
  color: white;
}
.settle-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.arrow {
  font-size: 1.25rem;
  color: var(--color-text-dimmed);
}
.settle-desc {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
}
.settle-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.amount-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
}
.currency {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-dimmed);
}
.amount-input-wrap input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  font-weight: 700;
  outline: none;
}
.balance-hint {
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}
.primary-btn {
  padding: 14px;
  background: var(--color-text);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.primary-btn:hover { opacity: 0.9; }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.confirm-text {
  font-size: 0.9375rem;
  color: var(--color-text);
  margin-bottom: 4px;
}
.confirm-sub {
  font-size: 0.8125rem;
  color: var(--color-text-dimmed);
  margin-bottom: 20px;
}
.modal-actions {
  display: flex;
  gap: 8px;
}
.secondary-btn {
  flex: 1;
  padding: 12px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
.danger-btn {
  flex: 1;
  padding: 12px;
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
.danger-btn:disabled { opacity: 0.5; }

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.modal-enter-active {
  animation: modal-in 0.3s ease;
}
.modal-leave-active {
  animation: modal-in 0.2s ease reverse;
}
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Mobile */
@media (max-width: 640px) {
  .header-bar { top: 56px; padding: 8px 12px; }
  .main-content { padding-top: 88px; }
  .balance-value { font-size: 1.5rem; }
  .tab-label { display: none; }
  .tab-btn { padding: 10px 6px; }
  .tab-icon { font-size: 1.25rem; }
  .fab { bottom: 16px; right: 16px; width: 52px; height: 52px; }
}
</style>
