<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import { useAuthStore } from '@/stores/auth'
import { DASHBOARD_QUERY } from '@/graphql/operations'
import PendingInvites from '@/components/PendingInvites.vue'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const visible = ref(false)

const { result, loading, refetch } = useQuery(DASHBOARD_QUERY, null, () => ({
  enabled: isAuthenticated.value,
}))

const dashboard = computed(() => result.value?.dashboard)
const groups = computed(() => result.value?.groups || [])
const activity = computed(() => result.value?.recentActivities || [])

const firstName = computed(() => authStore.user?.user_metadata?.name?.split(' ')[0] || 'there')

onMounted(() => setTimeout(() => visible.value = true, 50))

const actIcon = (t: string) => ({
  'EXPENSE_CREATE': '💸', 'EXPENSE_UPDATE': '✏️', 'SETTLEMENT_CREATE': '🤝',
  'MEMBER_ADD': '👤', 'INVITE_ACCEPT': '✅'
}[t] || '🔔')

const ago = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

const fmt = (a: number) => `₹${(a / 100).toLocaleString('en-IN')}`
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- DASHBOARD -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div v-if="isAuthenticated" class="dash" :class="{ visible }">
    
    <!-- Hero Section with Balance -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="greeting">
          <PendingInvites @responded="refetch" />
          <p class="hello">Hello, {{ firstName }} 👋</p>
        </div>
        
        <!-- The Balance Card - The Star -->
        <div class="balance-hero" v-if="!loading && dashboard">
          <div class="balance-glow"></div>
          <div class="balance-inner">
            <span class="balance-label">Your Net Balance</span>
            <span class="balance-amount" :class="dashboard.netBalance >= 0 ? 'positive' : 'negative'">
              {{ dashboard.formattedNet }}
            </span>
            <div class="balance-breakdown">
              <div class="breakdown-item">
                <span class="breakdown-value positive">{{ dashboard.formattedOwed }}</span>
                <span class="breakdown-label">owed to you</span>
              </div>
              <div class="breakdown-divider"></div>
              <div class="breakdown-item">
                <span class="breakdown-value negative">{{ dashboard.formattedOwe }}</span>
                <span class="breakdown-label">you owe</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Skeleton -->
        <div class="balance-hero skeleton" v-else>
          <div class="skeleton-pulse"></div>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <div class="main-content">
      
      <!-- Debts Section -->
      <section class="section debts-section" v-if="!loading && (dashboard?.topOwedBy?.length || dashboard?.topOwedTo?.length)">
        <div class="section-header">
          <h2>
            <span class="section-icon">👥</span>
            People
          </h2>
          <span class="pill">{{ (dashboard?.topOwedBy?.length || 0) + (dashboard?.topOwedTo?.length || 0) }}</span>
        </div>
        
        <div class="debts-grid">
          <!-- Owed to you -->
          <div v-for="p in dashboard.topOwedBy" :key="'owed-'+p.userId" class="debt-card owed">
            <div class="debt-avatar">{{ p.name[0] }}</div>
            <div class="debt-info">
              <span class="debt-name">{{ p.name }}</span>
              <span class="debt-hint">owes you</span>
            </div>
            <span class="debt-amount positive">{{ fmt(p.amount) }}</span>
          </div>
          
          <!-- You owe -->
          <div v-for="p in dashboard.topOwedTo" :key="'owe-'+p.userId" class="debt-card owe">
            <div class="debt-avatar owe">{{ p.name[0] }}</div>
            <div class="debt-info">
              <span class="debt-name">{{ p.name }}</span>
              <span class="debt-hint">you owe</span>
            </div>
            <span class="debt-amount negative">{{ fmt(p.amount) }}</span>
          </div>
        </div>
      </section>

      <!-- All Settled State -->
      <section class="section settled-section" v-else-if="!loading">
        <div class="settled-card">
          <div class="settled-icon">✨</div>
          <h3>All Settled Up!</h3>
          <p>You're square with everyone. Nice work.</p>
        </div>
      </section>

      <!-- Groups & Activity Row -->
      <div class="duo-row">
        <!-- Groups -->
        <section class="section">
          <div class="section-header">
            <h2>
              <span class="section-icon">📁</span>
              Groups
            </h2>
            <router-link to="/groups" class="see-all">View all →</router-link>
          </div>
          <div class="groups-list">
            <router-link 
              v-for="g in groups.slice(0, 3)" 
              :key="g.id" 
              :to="`/groups/${g.id}`"
              class="group-card"
            >
              <span class="group-icon">{{ g.icon || '👥' }}</span>
              <span class="group-name">{{ g.name }}</span>
              <span class="group-arrow">→</span>
            </router-link>
            <router-link v-if="groups.length === 0" to="/groups" class="group-card empty">
              <span class="group-icon">+</span>
              <span class="group-name">Create your first group</span>
              <span class="group-arrow">→</span>
            </router-link>
          </div>
        </section>

        <!-- Activity -->
        <section class="section">
          <div class="section-header">
            <h2>
              <span class="section-icon">⚡</span>
              Activity
            </h2>
          </div>
          <div class="activity-feed">
            <div v-for="a in activity.slice(0, 4)" :key="a.id" class="activity-item">
              <span class="activity-icon">{{ actIcon(a.type) }}</span>
              <div class="activity-content">
                <p><strong>{{ a.actor?.name?.split(' ')[0] }}</strong> {{ a.description?.split(' ').slice(0, 4).join(' ') }}</p>
                <span class="activity-time">{{ ago(a.createdAt) }}</span>
              </div>
            </div>
            <div v-if="activity.length === 0" class="activity-empty">
              <span>🔔</span>
              <p>No recent activity</p>
            </div>
          </div>
        </section>
      </div>

    </div>

    <!-- Floating Action -->
    <router-link to="/groups" class="fab">
      <span class="fab-icon">+</span>
      <span class="fab-label">Add</span>
    </router-link>

  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- LANDING PAGE -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div v-else class="landing" :class="{ visible }">
    
    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <!-- HERO -->
    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-text">
          <div class="badge">
            <span class="badge-dot"></span>
            Free forever. No ads.
          </div>
          <h1>Split smart.<br><span class="grad">Settle easily.</span></h1>
          <p class="subtitle">The modern expense splitter for roommates, trips, and friend groups. Know exactly who owes what—beautifully organized, always in sync.</p>
          <div class="hero-actions">
            <router-link to="/login" class="btn-primary">
              Start Splitting Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </router-link>
            <a href="#features" class="btn-ghost">See Features</a>
          </div>
          <div class="trust-row">
            <div class="avatars">
              <span>K</span><span>S</span><span>V</span><span>R</span>
            </div>
            <span class="trust-text">Join thousands settling up smarter</span>
          </div>
        </div>
        <div class="hero-visual">
          <div class="mock-card">
            <div class="mock-header">
              <span class="mock-icon">🏖️</span>
              <div>
                <strong>Goa Trip 2024</strong>
                <span>5 people</span>
              </div>
            </div>
            <div class="mock-balance">
              <span class="balance-label">Your Balance</span>
              <span class="balance-value positive">+₹2,450</span>
            </div>
            <div class="mock-transactions">
              <div class="mock-tx">
                <span class="tx-icon">🍔</span>
                <div class="tx-info">
                  <strong>Beach shack dinner</strong>
                  <span>Paid by Kiran</span>
                </div>
                <span class="tx-amount">₹3,200</span>
              </div>
              <div class="mock-tx">
                <span class="tx-icon">🚕</span>
                <div class="tx-info">
                  <strong>Airport cab</strong>
                  <span>Paid by Mala</span>
                </div>
                <span class="tx-amount">₹1,800</span>
              </div>
              <div class="mock-tx">
                <span class="tx-icon">🏠</span>
                <div class="tx-info">
                  <strong>Villa booking</strong>
                  <span>Split equally</span>
                </div>
                <span class="tx-amount">₹15,000</span>
              </div>
            </div>
          </div>
          <div class="float-badge badge-1">₹2,450 owed to you</div>
          <div class="float-badge badge-2">✓ 12 expenses tracked</div>
        </div>
      </div>
    </section>

    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <!-- FEATURES -->
    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="features" id="features">
      <div class="section-inner">
        <div class="section-head">
          <span class="section-badge">Features</span>
          <h2>Everything you need to<br><span class="grad">split expenses fairly</span></h2>
          <p>Designed for real-world groups. No more awkward money conversations.</p>
        </div>
        <div class="features-grid">
          <div class="feat-card">
            <span class="feat-icon">⚡</span>
            <h3>Lightning Fast</h3>
            <p>Add expenses in under 5 seconds. Just tap, type, and you're done.</p>
          </div>
          <div class="feat-card">
            <span class="feat-icon">🧮</span>
            <h3>Any Split Type</h3>
            <p>Equal, exact amounts, percentages, or shares. You decide how to divide.</p>
          </div>
          <div class="feat-card">
            <span class="feat-icon">✨</span>
            <h3>Smart Simplification</h3>
            <p>Automatically minimizes the number of payments needed to settle up.</p>
          </div>
          <div class="feat-card">
            <span class="feat-icon">👥</span>
            <h3>Multiple Payers</h3>
            <p>Bill split at dinner? Multiple people can pay for the same expense.</p>
          </div>
          <div class="feat-card">
            <span class="feat-icon">🏷️</span>
            <h3>Categories & Notes</h3>
            <p>Organize with categories. Add notes and receipts for full transparency.</p>
          </div>
          <div class="feat-card">
            <span class="feat-icon">💬</span>
            <h3>Comments & Activity</h3>
            <p>Discuss expenses, track changes, and see full activity history.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <!-- HOW IT WORKS -->
    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="how-it-works">
      <div class="section-inner">
        <div class="section-head">
          <span class="section-badge">How It Works</span>
          <h2>Three steps to<br><span class="grad">stress-free splitting</span></h2>
        </div>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-content">
              <h3>Create a Group</h3>
              <p>Start a group for your trip, apartment, or event. Invite friends via email.</p>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-content">
              <h3>Add Expenses</h3>
              <p>Log who paid, for what, and choose how to split. Takes seconds.</p>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-content">
              <h3>Settle Up</h3>
              <p>See simplified debts. Record payments when you're square.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <!-- USE CASES -->
    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="use-cases">
      <div class="section-inner">
        <div class="section-head">
          <span class="section-badge">Use Cases</span>
          <h2>Perfect for<br><span class="grad">every group</span></h2>
        </div>
        <div class="cases-grid">
          <div class="case-card">
            <span class="case-emoji">🏠</span>
            <h3>Roommates</h3>
            <p>Rent, utilities, groceries—track shared living expenses effortlessly.</p>
          </div>
          <div class="case-card">
            <span class="case-emoji">✈️</span>
            <h3>Travel</h3>
            <p>Flights, hotels, dinners. Keep the trip fun, not the finances.</p>
          </div>
          <div class="case-card">
            <span class="case-emoji">💑</span>
            <h3>Couples</h3>
            <p>Fair expense sharing for partners. Know who owes dinner.</p>
          </div>
          <div class="case-card">
            <span class="case-emoji">🎉</span>
            <h3>Events</h3>
            <p>Group gifts, parties, weddings. Everyone contributes fairly.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <!-- FINAL CTA -->
    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="final-cta">
      <div class="cta-inner">
        <h2>Ready to stop the<br><span class="grad">money awkwardness?</span></h2>
        <p>Start splitting expenses fairly with your friends, roommates, or travel group.</p>
        <router-link to="/login" class="btn-primary large">
          Get Started — It's Free
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </router-link>
        <span class="cta-note">No credit card required. Free forever.</span>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-inner">
        <span class="footer-brand">Settlr</span>
        <span class="footer-copy">© {{ new Date().getFullYear() }} • Made with ❤️</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════ */
/* DASHBOARD */
/* ═══════════════════════════════════════════════════════════════════════════ */

.dash {
  min-height: 100vh;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.dash.visible { opacity: 1; }

/* ─────────────────────────────────────────────────────────────────────────── */
/* HERO SECTION */
/* ─────────────────────────────────────────────────────────────────────────── */

.hero-section {
  padding: 100px 24px 40px;
  display: flex;
  justify-content: center;
}

.hero-content {
  width: 100%;
  max-width: 600px;
}

.greeting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.hello {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

/* The Balance Card */
.balance-hero {
  position: relative;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 28px;
  padding: 32px;
  color: white;
  overflow: hidden;
}

.balance-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%);
  top: -60px;
  right: -60px;
  animation: glow-pulse 4s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.balance-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.balance-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  opacity: 0.7;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 3.5rem;
  font-weight: 800;
  font-family: var(--font-mono);
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 24px;
}

.balance-amount.positive { color: #34d399; }
.balance-amount.negative { color: #fb7185; }

.balance-breakdown {
  display: flex;
  gap: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  width: 100%;
  justify-content: center;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.breakdown-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.breakdown-value.positive { color: #34d399; }
.breakdown-value.negative { color: #fb7185; }

.breakdown-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
  margin-top: 4px;
}

.breakdown-divider {
  width: 1px;
  height: 40px;
  background: rgba(255,255,255,0.15);
}

/* Skeleton */
.balance-hero.skeleton {
  height: 220px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.skeleton-pulse {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* MAIN CONTENT */
/* ─────────────────────────────────────────────────────────────────────────── */

.main-content {
  max-width: 648px;
  margin: 0 auto;
  padding: 0 24px 120px;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
}

.section-icon {
  font-size: 1.125rem;
}

.pill {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 4px 10px;
  background: var(--color-bg-secondary);
  border-radius: 100px;
  color: var(--color-text-secondary);
}

.see-all {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  transition: opacity 0.2s;
}
.see-all:hover { opacity: 0.7; }

/* ─────────────────────────────────────────────────────────────────────────── */
/* DEBTS SECTION */
/* ─────────────────────────────────────────────────────────────────────────── */

.debts-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debt-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.04);
  transition: all 0.2s ease;
}

.debt-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}

.debt-avatar {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 700;
  font-size: 1rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.debt-avatar.owe {
  background: linear-gradient(135deg, #f43f5e, #ec4899);
}

.debt-info {
  flex: 1;
  min-width: 0;
}

.debt-name {
  display: block;
  font-size: 0.9375rem;
  font-weight: 600;
}

.debt-hint {
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}

.debt-amount {
  font-size: 1.125rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.positive { color: #10b981; }
.negative { color: #f43f5e; }

/* Settled State */
.settled-card {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 1px solid #a7f3d0;
  border-radius: 20px;
  padding: 48px 24px;
  text-align: center;
}

.settled-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.settled-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: #065f46;
}

.settled-card p {
  color: #047857;
  font-size: 0.9375rem;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* DUO ROW */
/* ─────────────────────────────────────────────────────────────────────────── */

.duo-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 640px) {
  .duo-row { grid-template-columns: 1fr; }
}

/* Groups */
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.04);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.06);
}

.group-card.empty {
  border-style: dashed;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.group-icon {
  font-size: 1.5rem;
}

.group-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-arrow {
  font-size: 0.875rem;
  color: var(--color-text-dimmed);
  transition: transform 0.2s;
}

.group-card:hover .group-arrow { transform: translateX(3px); }

/* Activity */
.activity-feed {
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.04);
  overflow: hidden;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  transition: background 0.15s;
}

.activity-item:last-child { border-bottom: none; }
.activity-item:hover { background: rgba(0,0,0,0.01); }

.activity-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-content p {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 2px;
}

.activity-content strong {
  color: var(--color-text);
}

.activity-time {
  font-size: 0.6875rem;
  color: var(--color-text-dimmed);
}

.activity-empty {
  padding: 32px;
  text-align: center;
  color: var(--color-text-dimmed);
}

.activity-empty span {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 8px;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* FAB */
/* ─────────────────────────────────────────────────────────────────────────── */

.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: white;
  text-decoration: none;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
}

.fab:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}

.fab-icon {
  font-size: 1.25rem;
  font-weight: 300;
}

.fab-label {
  font-size: 0.875rem;
  font-weight: 700;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* LANDING PAGE */
/* ═══════════════════════════════════════════════════════════════════════════ */

.landing {
  min-height: 100vh;
  opacity: 0;
  transition: opacity 0.5s ease;
}
.landing.visible { opacity: 1; }

.grad {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* HERO */
/* ─────────────────────────────────────────────────────────────────────────── */

.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 80px;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

@media (max-width: 900px) {
  .hero-inner { grid-template-columns: 1fr; text-align: center; }
  .hero-visual { order: -1; max-width: 360px; margin: 0 auto; }
}

.hero-text h1 {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 20px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 100px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
}

.subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 32px;
  max-width: 500px;
}

@media (max-width: 900px) {
  .subtitle { margin: 0 auto 32px; }
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

@media (max-width: 900px) {
  .hero-actions { justify-content: center; flex-wrap: wrap; }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: white;
  font-size: 0.9375rem;
  font-weight: 700;
  border-radius: 14px;
  text-decoration: none;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
}

.btn-primary.large {
  padding: 18px 36px;
  font-size: 1.0625rem;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: 14px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-ghost:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-text-dimmed);
}

.trust-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 900px) {
  .trust-row { justify-content: center; }
}

.avatars {
  display: flex;
}

.avatars span {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  border: 2px solid white;
  margin-left: -8px;
}

.avatars span:first-child { margin-left: 0; }

.trust-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* Hero Visual - Mock Card */
.hero-visual {
  position: relative;
}

.mock-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
}

.mock-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.mock-icon {
  width: 48px;
  height: 48px;
  background: var(--color-bg-secondary);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.mock-header div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mock-header strong {
  font-size: 1rem;
  font-weight: 700;
}

.mock-header span {
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}

.mock-balance {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
  color: white;
}

.mock-balance .balance-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
  margin-bottom: 4px;
}

.mock-balance .balance-value {
  font-size: 1.75rem;
  font-weight: 800;
}

.mock-balance .balance-value.positive { color: #34d399; }

.mock-transactions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-tx {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
}

.tx-icon {
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.tx-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tx-info strong {
  font-size: 0.8125rem;
  font-weight: 600;
}

.tx-info span {
  font-size: 0.6875rem;
  color: var(--color-text-dimmed);
}

.tx-amount {
  font-size: 0.875rem;
  font-weight: 700;
}

/* Floating badges */
.float-badge {
  position: absolute;
  padding: 10px 16px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.8125rem;
  font-weight: 600;
  box-shadow: 0 8px 30px rgba(0,0,0,0.1);
  animation: float 3s ease-in-out infinite;
}

.badge-1 {
  top: -10px;
  right: -20px;
  color: #10b981;
}

.badge-2 {
  bottom: 40px;
  left: -30px;
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECTIONS COMMON */
/* ─────────────────────────────────────────────────────────────────────────── */

.section-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-head {
  text-align: center;
  margin-bottom: 48px;
}

.section-badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.section-head h2 {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 12px;
}

.section-head p {
  font-size: 1rem;
  color: var(--color-text-secondary);
  max-width: 500px;
  margin: 0 auto;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* FEATURES */
/* ─────────────────────────────────────────────────────────────────────────── */

.features {
  padding: 80px 0;
  background: var(--color-bg-secondary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.feat-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 28px;
  transition: all 0.3s ease;
}

.feat-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.08);
}

.feat-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 16px;
}

.feat-card h3 {
  font-size: 1.0625rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.feat-card p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* HOW IT WORKS */
/* ─────────────────────────────────────────────────────────────────────────── */

.how-it-works {
  padding: 80px 0;
}

.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
}

@media (max-width: 700px) {
  .steps { flex-direction: column; align-items: center; gap: 24px; }
  .step-line { width: 2px; height: 40px; }
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 240px;
}

.step-num {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 16px;
}

.step-content h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.step-content p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.step-line {
  width: 60px;
  height: 2px;
  background: var(--color-border);
  margin-top: 24px;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* USE CASES */
/* ─────────────────────────────────────────────────────────────────────────── */

.use-cases {
  padding: 80px 0;
  background: var(--color-bg-secondary);
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.case-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 28px;
  text-align: center;
  transition: all 0.3s ease;
}

.case-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.08);
}

.case-emoji {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 16px;
}

.case-card h3 {
  font-size: 1.0625rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.case-card p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* FINAL CTA */
/* ─────────────────────────────────────────────────────────────────────────── */

.final-cta {
  padding: 100px 24px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  text-align: center;
  color: white;
}

.cta-inner {
  max-width: 600px;
  margin: 0 auto;
}

.cta-inner h2 {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 16px;
}

.cta-inner p {
  font-size: 1.0625rem;
  opacity: 0.8;
  margin-bottom: 32px;
}

.final-cta .btn-primary {
  background: white;
  color: #1a1a2e;
}

.cta-note {
  display: block;
  margin-top: 16px;
  font-size: 0.8125rem;
  opacity: 0.6;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* FOOTER */
/* ─────────────────────────────────────────────────────────────────────────── */

.landing-footer {
  padding: 24px;
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 500px) {
  .footer-inner { flex-direction: column; gap: 8px; }
}

.footer-brand {
  font-size: 1.125rem;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.footer-copy {
  font-size: 0.8125rem;
  color: var(--color-text-dimmed);
}
</style>
