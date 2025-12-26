<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import { useAuthStore } from '@/stores/auth'
import { DASHBOARD_QUERY } from '@/graphql/operations'
import PendingInvites from '@/components/PendingInvites.vue'
import Logo from '@/components/ui/Logo.vue'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isVisible = ref(false)

// Dashboard query (only for authenticated users)
const { result, loading, refetch: refetchDashboard } = useQuery(DASHBOARD_QUERY, null, () => ({
  enabled: isAuthenticated.value,
}))

const dashboard = computed(() => result.value?.dashboard)
const groups = computed(() => result.value?.groups || [])
const recentActivities = computed(() => result.value?.recentActivities || [])

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const userName = computed(() => {
  return authStore.user?.user_metadata?.name?.split(' ')[0] || 'there'
})

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})

function getActivityIcon(type: string) {
  switch (type) {
    case 'EXPENSE_CREATE': return '💸';
    case 'EXPENSE_UPDATE': return '📝';
    case 'EXPENSE_DELETE': return '🗑️';
    case 'SETTLEMENT_CREATE': return '🤝';
    case 'MEMBER_ADD': return '👤';
    case 'INVITE_ACCEPT': return '✅';
    default: return '🔔';
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function formatAmount(amount: number) {
  return `₹${(amount / 100).toLocaleString('en-IN')}`
}

// Landing page features
const features = [
  { icon: '⚡', title: 'Lightning Fast', desc: 'Add expenses in seconds', color: '#f59e0b' },
  { icon: '🧮', title: 'Smart Splits', desc: 'Any split type you need', color: '#6366f1' },
  { icon: '✨', title: 'Simplified Debts', desc: 'Minimum transactions', color: '#10b981' },
  { icon: '📱', title: 'Works Offline', desc: 'Sync when connected', color: '#ec4899' },
]
</script>

<template>
  <!-- Dashboard for logged-in users -->
  <div v-if="isAuthenticated" class="dashboard">
    <!-- Global background is handled in App.vue -->


    <div class="container dashboard-container" :class="{ visible: isVisible }">
      <!-- Top Bar / Greeting -->
      <header class="dashboard-header-simple">
        <div class="greeting-content">
          <Logo size="24" class="dashboard-logo" />
          <p class="greeting-subtitle">{{ greeting }}, {{ userName }}</p>
          <h1 class="greeting-title">Global <span class="premium-text">Ledger</span></h1>
        </div>
        <div class="header-actions">
          <PendingInvites @responded="refetchDashboard" />
        </div>
      </header>

      <!-- Horizontal Global Balance Bar -->
      <section class="global-balance-bar glass" v-if="!loading && dashboard">
        <div class="balance-item">
          <span class="lbl">Total you are owed</span>
          <span class="val positive">{{ dashboard.formattedOwed }}</span>
        </div>
        <div class="balance-divider"></div>
        <div class="balance-item">
          <span class="lbl">Total you owe</span>
          <span class="val negative">{{ dashboard.formattedOwe }}</span>
        </div>
        <div class="balance-divider"></div>
        <div class="balance-item featured">
          <span class="lbl">Total balance</span>
          <span class="val" :class="dashboard.netBalance >= 0 ? 'positive' : 'negative'">
            {{ dashboard.formattedNet }}
          </span>
        </div>
      </section>

      <!-- Skeleton for Balance -->
      <section class="global-balance-bar glass skeleton" v-else>
        <div class="skeleton-shimmer"></div>
      </section>

      <!-- Main Dashboard Content -->
      <div class="dashboard-grid-main">
        <!-- Primary Area: Peer Balances (THE CORE FEATURE) -->
        <div class="ledger-peers-area">
          <div class="section-head">
            <h2 class="section-title">Direct Settlements <span class="count-badge" v-if="dashboard">{{ dashboard.topOwedBy.length + dashboard.topOwedTo.length }}</span></h2>
            <p class="section-hint">Who owes what across all your groups</p>
          </div>

          <div class="peers-list-view glass" v-if="!loading && (dashboard?.topOwedTo.length || dashboard?.topOwedBy.length)">
            <!-- People who owe you -->
            <div class="peer-category" v-if="dashboard.topOwedBy.length">
              <h3 class="peer-cat-title positive">You are owed</h3>
              <div v-for="peer in dashboard.topOwedBy" :key="peer.userId" class="peer-row">
                <div class="peer-avatar">{{ peer.name[0] }}</div>
                <div class="peer-details">
                  <span class="peer-name">{{ peer.name }}</span>
                  <span class="peer-status">owes you overall</span>
                </div>
                <div class="peer-net-amount positive">{{ formatAmount(peer.amount) }}</div>
              </div>
            </div>

            <!-- People you owe -->
            <div class="peer-category" v-if="dashboard.topOwedTo.length">
              <h3 class="peer-cat-title negative">You owe</h3>
              <div v-for="peer in dashboard.topOwedTo" :key="peer.userId" class="peer-row">
                <div class="peer-avatar owe">{{ peer.name[0] }}</div>
                <div class="peer-details">
                  <span class="peer-name">{{ peer.name }}</span>
                  <span class="peer-status">you owe overall</span>
                </div>
                <div class="peer-net-amount negative">{{ formatAmount(peer.amount) }}</div>
              </div>
            </div>
          </div>

          <div v-else-if="!loading" class="empty-peers glass">
            <div class="empty-peers-icon">⚖️</div>
            <p>You are all settled up with everyone!</p>
          </div>
        </div>

        <!-- Sidebar Area: Groups & Activity -->
        <aside class="dashboard-sidebar">
          <div class="sidebar-block">
            <div class="section-head">
              <h3 class="section-title-sm">Active Groups</h3>
              <router-link to="/groups" class="view-all">All</router-link>
            </div>
            <div class="mini-groups-list">
              <router-link 
                v-for="group in groups.slice(0, 4)" 
                :key="group.id" 
                :to="`/groups/${group.id}`"
                class="mini-group-item glass"
              >
                <span class="icon">{{ group.icon || '👥' }}</span>
                <span class="name">{{ group.name }}</span>
              </router-link>
            </div>
          </div>

          <div class="sidebar-block">
            <h3 class="section-title-sm">Recent Activity</h3>
            <div class="mini-activity-feed glass">
              <div v-for="act in recentActivities.slice(0, 5)" :key="act.id" class="mini-act-row">
                <span class="act-icon">{{ getActivityIcon(act.type) }}</span>
                <div class="act-body">
                  <p><strong>{{ act.actor.name }}</strong> {{ act.description.split(' ').slice(0, 3).join(' ') }}...</p>
                  <span class="time">{{ formatDate(act.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="quick-actions-box">
             <router-link to="/groups" class="quick-act-btn glass primary">
               <span>+ Split Expense</span>
             </router-link>
             <router-link to="/groups" class="quick-act-btn glass">
               <span>Settlement</span>
             </router-link>
          </div>
        </aside>
      </div>
    </div>
  </div>

  <!-- Landing page for guests -->
  <div v-else class="landing">
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient"></div>
        <div class="hero-grid"></div>
      </div>
      
      <div class="hero-content" :class="{ visible: isVisible }">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          Now with offline support
        </div>
        
        <h1 class="hero-title">
          Split expenses,
          <br />
          <span class="gradient-text">not friendships.</span>
        </h1>
        
        <p class="hero-subtitle">
          The modern way to share costs with roommates, trips, and friends.
          Know exactly who owes what—always.
        </p>
        
        <div class="hero-actions">
          <router-link to="/login" class="btn btn-primary btn-lg">
            <span>Get Started Free</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="container">
        <div class="section-header centered">
          <span class="section-eyebrow">Why Settlr?</span>
          <h2 class="section-title large">Designed for real life</h2>
        </div>
        
        <div class="features-grid">
          <div 
            v-for="(feature, index) in features" 
            :key="feature.title"
            class="feature-card"
            :style="{ animationDelay: `${index * 100}ms` }"
          >
            <div class="feature-icon" :style="{ background: feature.color + '15', color: feature.color }">
              {{ feature.icon }}
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-desc">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ============================================ */
/* DASHBOARD STYLES */
/* ============================================ */

.dashboard {
  min-height: 100vh;
  position: relative;
  background: transparent;
  color: var(--color-text);
  overflow-x: hidden;
  padding-bottom: var(--space-3xl);
}

.dashboard-container {
  position: relative;
  z-index: 1;
  padding-top: 80px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 800ms var(--ease-out-expo);
}

.dashboard-container.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Simplified Header */
.dashboard-header-simple {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--space-xl);
}

.greeting-content {
  display: flex;
  flex-direction: column;
}

.dashboard-logo {
  margin-bottom: 8px;
  transform: translateX(-4px);
}

.greeting-subtitle {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.greeting-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.premium-text {
  background: linear-gradient(135deg, var(--color-primary) 0%, #f472b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Global Balance Bar */
.global-balance-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-2xl);
  border-radius: var(--radius-2xl);
  margin-bottom: var(--space-2xl);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.balance-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.balance-item .lbl {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.balance-item .val {
  font-size: 1.5rem;
  font-weight: 800;
  font-family: var(--font-mono);
}

.balance-item .positive { color: #10b981; }
.balance-item .negative { color: #f43f5e; }

.balance-item.featured .val {
  font-size: 1.75rem;
}

.balance-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 768px) {
  .global-balance-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-lg);
  }
  .balance-divider {
    width: 100%;
    height: 1px;
  }
}

/* Main Dashboard Grid */
.dashboard-grid-main {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-2xl);
}

@media (max-width: 1024px) {
  .dashboard-grid-main {
    grid-template-columns: 1fr;
  }
}

/* Ledger Peers Area */
.ledger-peers-area {
  display: flex;
  flex-direction: column;
}

.section-head {
  margin-bottom: var(--space-lg);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.count-badge {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
}

.section-hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.peers-list-view {
  border-radius: var(--radius-2xl);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.peer-category {
  padding: var(--space-xl);
}

.peer-category + .peer-category {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.peer-cat-title {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: var(--space-lg);
  letter-spacing: 0.02em;
}

.peer-cat-title.positive { color: #10b981; }
.peer-cat-title.negative { color: #f43f5e; }

.peer-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  transition: transform 200ms ease;
}

.peer-row:hover {
  transform: translateX(4px);
}

.peer-avatar {
  width: 44px;
  height: 44px;
  background: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.peer-avatar.owe {
  background: #f43f5e;
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.2);
}

.peer-details {
  flex: 1;
}

.peer-name {
  display: block;
  font-size: 1rem;
  font-weight: 600;
}

.peer-status {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.peer-net-amount {
  font-size: 1.125rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.peer-net-amount.positive { color: #10b981; }
.peer-net-amount.negative { color: #f43f5e; }

.empty-peers {
  padding: var(--space-3xl);
  text-align: center;
  border-radius: var(--radius-2xl);
  color: var(--color-text-muted);
}

.empty-peers-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
  opacity: 0.5;
}

/* Sidebar */
.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.sidebar-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title-sm {
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.mini-groups-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mini-group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: all 200ms ease;
  font-size: 0.8125rem;
}

.mini-group-item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.mini-group-item .icon { font-size: 1.1rem; }
.mini-group-item .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.mini-activity-feed {
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.mini-act-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.act-icon { font-size: 1rem; margin-top: 2px; }
.act-body p { font-size: 0.8125rem; color: var(--color-text-secondary); line-height: 1.3; margin-bottom: 2px; }
.act-body strong { color: var(--color-text); }
.act-body .time { font-size: 0.75rem; color: var(--color-text-muted); }

.quick-actions-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-act-btn {
  padding: var(--space-md);
  border-radius: var(--radius-xl);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.875rem;
  text-align: center;
  transition: all 300ms ease;
  color: var(--color-text);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.quick-act-btn.primary {
  background: var(--color-primary);
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.quick-act-btn:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.1);
}

.quick-act-btn.primary:hover {
  background: #5a67d8;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* Skeleton */
.skeleton-shimmer {
  width: 100%;
  height: 60px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
}

/* ============================================ */
/* LANDING STYLES */
/* ============================================ */

.landing {
  min-height: 100vh;
}

.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  position: relative;
  overflow: hidden;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(var(--color-border-light) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border-light) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 70%);
}

.landing .hero-content {
  text-align: center;
  max-width: 700px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xl);
  box-shadow: var(--shadow-sm);
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.landing .hero-title {
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: var(--space-lg);
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xl);
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  justify-content: center;
}

/* Features */
.features {
  padding: var(--space-3xl) 0;
  background: var(--color-bg-secondary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-lg);
}

.feature-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-xl);
  text-align: center;
  transition: all var(--transition-base);
  animation: scale-in 600ms var(--ease-out-back) backwards;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  border-radius: var(--radius-xl);
  margin: 0 auto var(--space-md);
}

.feature-title {
  font-weight: 700;
  margin-bottom: var(--space-xs);
}

.feature-desc {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}
</style>
