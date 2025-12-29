<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  expenses: any[]
  members: any[]
}>()

// --- Utilities ---
const catEmoji: Record<string, string> = {
  FOOD: '🍔',
  TRANSPORT: '🚗',
  ACCOMMODATION: '🏨',
  ENTERTAINMENT: '🎬',
  SHOPPING: '🛍️',
  UTILITIES: '💡',
  GROCERIES: '🛒',
  OTHER: '📦'
}

const catColors: Record<string, string> = {
  FOOD: '#f97316',
  TRANSPORT: '#3b82f6',
  ACCOMMODATION: '#8b5cf6',
  ENTERTAINMENT: '#ec4899',
  SHOPPING: '#14b8a6',
  UTILITIES: '#eab308',
  GROCERIES: '#22c55e',
  OTHER: '#6b7280'
}

// --- Summary Stats ---
const totalSpent = computed(() => {
  return props.expenses.reduce((sum, e) => sum + e.amount, 0)
})

const avgPerExpense = computed(() => {
  if (props.expenses.length === 0) return 0
  return Math.round(totalSpent.value / props.expenses.length)
})

// --- Category Breakdown ---
const categoryData = computed(() => {
  const cats: Record<string, number> = {}
  for (const e of props.expenses) {
    const cat = e.category || 'OTHER'
    cats[cat] = (cats[cat] || 0) + e.amount
  }
  const total = Object.values(cats).reduce((a, b) => a + b, 0)
  return Object.entries(cats)
    .map(([name, amt]) => ({
      name,
      amount: amt,
      percent: total > 0 ? Math.round((amt / total) * 100) : 0,
      formatted: `₹${(amt / 100).toLocaleString('en-IN')}`
    }))
    .sort((a, b) => b.amount - a.amount)
})

// --- Monthly Trend (last 6 months) ---
const monthlyData = computed(() => {
  const months: Record<string, number> = {}
  const now = new Date()
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = 0
  }
  
  for (const e of props.expenses) {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in months) {
      months[key] += e.amount
    }
  }
  
  const maxAmt = Math.max(...Object.values(months), 1)
  
  return Object.entries(months).map(([key, amt]) => {
    const [year, month] = key.split('-')
    return {
      key,
      label: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-IN', { month: 'short' }),
      amount: amt,
      height: Math.round((amt / maxAmt) * 100),
      formatted: `₹${(amt / 100).toLocaleString('en-IN')}`
    }
  })
})

// --- Member Contribution (who paid) ---
const memberPaidData = computed(() => {
  const totals: Record<string, number> = {}
  
  props.members.forEach(m => totals[m.user.id] = 0)
  
  props.expenses.forEach(e => {
    if (e.paidBy?.id) {
      totals[e.paidBy.id] = (totals[e.paidBy.id] || 0) + e.amount
    }
  })
  
  const total = Object.values(totals).reduce((a, b) => a + b, 0)
  
  return props.members
    .map(m => ({
      id: m.user.id,
      name: m.user.name,
      amount: totals[m.user.id] || 0,
      percent: total > 0 ? Math.round(((totals[m.user.id] || 0) / total) * 100) : 0,
      formatted: `₹${((totals[m.user.id] || 0) / 100).toLocaleString('en-IN')}`
    }))
    .sort((a, b) => b.amount - a.amount)
})

// --- Member Cost (who owes) ---
const memberOwesData = computed(() => {
  const totals: Record<string, number> = {}
  
  props.members.forEach(m => totals[m.user.id] = 0)
  
  props.expenses.forEach(e => {
    e.shares?.forEach((s: any) => {
      totals[s.user.id] = (totals[s.user.id] || 0) + s.amount
    })
  })
  
  const total = Object.values(totals).reduce((a, b) => a + b, 0)
  
  return props.members
    .map(m => ({
      id: m.user.id,
      name: m.user.name,
      amount: totals[m.user.id] || 0,
      percent: total > 0 ? Math.round(((totals[m.user.id] || 0) / total) * 100) : 0,
      formatted: `₹${((totals[m.user.id] || 0) / 100).toLocaleString('en-IN')}`
    }))
    .sort((a, b) => b.amount - a.amount)
})

// --- Top Spender (who added most expenses) ---
const topContributor = computed(() => {
  const counts: Record<string, { count: number; name: string }> = {}
  
  props.expenses.forEach(e => {
    if (e.paidBy?.id) {
      if (!counts[e.paidBy.id]) {
        counts[e.paidBy.id] = { count: 0, name: e.paidBy.name }
      }
      counts[e.paidBy.id].count++
    }
  })
  
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  
  const sorted = entries.sort((a, b) => b[1].count - a[1].count)
  const top = sorted[0]
  const percent = Math.round((top[1].count / props.expenses.length) * 100)
  
  return {
    name: top[1].name,
    count: top[1].count,
    percent
  }
})

// --- Biggest Expense ---
const biggestExpense = computed(() => {
  if (props.expenses.length === 0) return null
  
  const sorted = [...props.expenses].sort((a, b) => b.amount - a.amount)
  const biggest = sorted[0]
  
  return {
    description: biggest.description,
    amount: biggest.amount,
    formatted: `₹${(biggest.amount / 100).toLocaleString('en-IN')}`,
    paidBy: biggest.paidBy?.name || 'Unknown'
  }
})

// --- This Month vs Last ---
const monthComparison = computed(() => {
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  
  let thisMonthTotal = 0
  let lastMonthTotal = 0
  
  props.expenses.forEach(e => {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key === thisMonthKey) thisMonthTotal += e.amount
    if (key === lastMonthKey) lastMonthTotal += e.amount
  })
  
  const diff = lastMonthTotal > 0 
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : (thisMonthTotal > 0 ? 100 : 0)
  
  const lastMonthName = lastMonth.toLocaleDateString('en-IN', { month: 'long' })
  
  return {
    thisMonth: thisMonthTotal,
    lastMonth: lastMonthTotal,
    diff,
    isUp: diff > 0,
    lastMonthName,
    thisMonthFormatted: `₹${(thisMonthTotal / 100).toLocaleString('en-IN')}`,
    lastMonthFormatted: `₹${(lastMonthTotal / 100).toLocaleString('en-IN')}`
  }
})

function formatAmount(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString('en-IN')}`
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="analysis-container">
    <!-- Empty State -->
    <div v-if="expenses.length === 0" class="empty-state">
      <span class="empty-icon">📊</span>
      <p>No expenses to analyze yet</p>
      <span class="empty-hint">Add some expenses to see insights</span>
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-icon">💰</span>
          <div class="summary-content">
            <span class="summary-label">Total Spent</span>
            <span class="summary-value">{{ formatAmount(totalSpent) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">🧾</span>
          <div class="summary-content">
            <span class="summary-label">Expenses</span>
            <span class="summary-value">{{ expenses.length }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📈</span>
          <div class="summary-content">
            <span class="summary-label">Average</span>
            <span class="summary-value">{{ formatAmount(avgPerExpense) }}</span>
          </div>
        </div>
      </div>

      <!-- This Month vs Last -->
      <div v-if="monthComparison.lastMonth > 0 || monthComparison.thisMonth > 0" class="insight-card comparison">
        <div class="insight-header">
          <span class="insight-icon">📅</span>
          <span class="insight-title">This Month</span>
        </div>
        <div class="comparison-content">
          <span class="comparison-value">{{ monthComparison.thisMonthFormatted }}</span>
          <span 
            class="comparison-badge" 
            :class="{ up: monthComparison.isUp, down: !monthComparison.isUp && monthComparison.diff !== 0 }"
          >
            <span v-if="monthComparison.diff !== 0">
              {{ monthComparison.isUp ? '↑' : '↓' }} {{ Math.abs(monthComparison.diff) }}%
            </span>
            <span v-else>—</span>
          </span>
        </div>
        <span class="comparison-hint">vs {{ monthComparison.lastMonthName }} ({{ monthComparison.lastMonthFormatted }})</span>
      </div>

      <!-- Top Contributor & Biggest Expense -->
      <div class="insights-row">
        <div v-if="topContributor" class="insight-card small">
          <span class="insight-mini-icon">🏆</span>
          <div class="insight-mini-content">
            <span class="insight-mini-label">Top Contributor</span>
            <span class="insight-mini-value">{{ topContributor.name }}</span>
            <span class="insight-mini-hint">{{ topContributor.count }} expenses ({{ topContributor.percent }}%)</span>
          </div>
        </div>
        <div v-if="biggestExpense" class="insight-card small">
          <span class="insight-mini-icon">💎</span>
          <div class="insight-mini-content">
            <span class="insight-mini-label">Biggest Expense</span>
            <span class="insight-mini-value">{{ biggestExpense.formatted }}</span>
            <span class="insight-mini-hint">{{ biggestExpense.description }}</span>
          </div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="chart-card">
        <h4>📊 By Category</h4>
        <div class="cat-bars">
          <div v-for="cat in categoryData" :key="cat.name" class="cat-row">
            <div class="cat-info">
              <span class="cat-emoji">{{ catEmoji[cat.name] || '📦' }}</span>
              <span class="cat-name">{{ cat.name.charAt(0) + cat.name.slice(1).toLowerCase() }}</span>
            </div>
            <div class="cat-bar-wrap">
              <div 
                class="cat-bar" 
                :style="{ width: cat.percent + '%', background: catColors[cat.name] || '#6b7280' }"
              />
            </div>
            <span class="cat-amt">{{ cat.formatted }}</span>
          </div>
        </div>
      </div>

      <!-- Monthly Trend -->
      <div v-if="monthlyData.some(m => m.amount > 0)" class="chart-card">
        <h4>📈 Monthly Trend</h4>
        <div class="bar-chart">
          <div v-for="m in monthlyData" :key="m.key" class="bar-col">
            <div class="bar-value" v-if="m.amount > 0">{{ m.formatted }}</div>
            <div class="bar" :style="{ height: m.height + '%' }" />
            <div class="bar-label">{{ m.label }}</div>
          </div>
        </div>
      </div>

      <!-- Member Contribution -->
      <div class="chart-card">
        <h4>💳 Who Paid</h4>
        <div class="member-bars">
          <div v-for="m in memberPaidData" :key="m.id" class="member-row">
            <div class="member-avatar">{{ getInitials(m.name) }}</div>
            <div class="member-info">
              <span class="member-name">{{ m.name }}</span>
              <div class="member-bar-wrap">
                <div class="member-bar paid" :style="{ width: m.percent + '%' }" />
              </div>
            </div>
            <span class="member-amt">{{ m.formatted }}</span>
          </div>
        </div>
      </div>

      <!-- Member Cost Distribution -->
      <div class="chart-card">
        <h4>📊 Cost Distribution</h4>
        <div class="member-bars">
          <div v-for="m in memberOwesData" :key="m.id" class="member-row">
            <div class="member-avatar owes">{{ getInitials(m.name) }}</div>
            <div class="member-info">
              <span class="member-name">{{ m.name }}</span>
              <div class="member-bar-wrap">
                <div class="member-bar owes" :style="{ width: m.percent + '%' }" />
              </div>
            </div>
            <span class="member-amt">{{ m.formatted }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.analysis-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
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
.empty-icon { font-size: 2.5rem; }
.empty-state p {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}
.empty-hint {
  font-size: 0.875rem;
  color: var(--color-text-dimmed);
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 14px;
}

.summary-icon {
  font-size: 1.25rem;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-dimmed);
}

.summary-value {
  font-size: 0.9375rem;
  font-weight: 800;
  color: var(--color-text);
}

/* Insight Cards */
.insight-card {
  padding: 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 14px;
}

.insight-card.comparison {
  background: linear-gradient(135deg, #faf5ff 0%, #f0f9ff 100%);
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.insight-icon { font-size: 1rem; }

.insight-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.comparison-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.comparison-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text);
}

.comparison-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-secondary);
}

.comparison-badge.up {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.comparison-badge.down {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.comparison-hint {
  display: block;
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}

/* Insights Row */
.insights-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.insight-card.small {
  display: flex;
  gap: 12px;
  padding: 14px;
}

.insight-mini-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.insight-mini-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.insight-mini-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-dimmed);
}

.insight-mini-value {
  font-size: 0.875rem;
  font-weight: 800;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.insight-mini-hint {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Chart Cards */
.chart-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 14px;
  padding: 16px;
}

.chart-card h4 {
  font-size: 0.8125rem;
  font-weight: 700;
  margin: 0 0 14px 0;
  color: var(--color-text);
}

/* Category Bars */
.cat-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cat-row {
  display: grid;
  grid-template-columns: 100px 1fr 70px;
  align-items: center;
  gap: 12px;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cat-emoji { font-size: 1rem; }

.cat-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.cat-bar-wrap {
  height: 8px;
  background: var(--color-bg-secondary);
  border-radius: 100px;
  overflow: hidden;
}

.cat-bar {
  height: 100%;
  border-radius: 100px;
  transition: width 0.5s ease;
}

.cat-amt {
  font-size: 0.75rem;
  font-weight: 700;
  text-align: right;
  color: var(--color-text);
}

/* Bar Chart (Monthly) */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 120px;
  gap: 4px;
  padding-top: 24px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar {
  width: 100%;
  max-width: 40px;
  background: linear-gradient(180deg, #6366f1, #8b5cf6);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.5s ease;
}

.bar-value {
  font-size: 0.5625rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  white-space: nowrap;
}

.bar-label {
  margin-top: 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

/* Member Bars */
.member-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #10b981, #059669);
  flex-shrink: 0;
}

.member-avatar.owes {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.member-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.member-bar-wrap {
  height: 6px;
  background: var(--color-bg-secondary);
  border-radius: 100px;
  overflow: hidden;
}

.member-bar {
  height: 100%;
  border-radius: 100px;
  transition: width 0.5s ease;
}

.member-bar.paid {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.member-bar.owes {
  background: linear-gradient(90deg, #6366f1, #a78bfa);
}

.member-amt {
  font-size: 0.75rem;
  font-weight: 700;
  text-align: right;
  color: var(--color-text);
  min-width: 70px;
}

/* Responsive */
@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .insights-row {
    grid-template-columns: 1fr;
  }
  
  .cat-row {
    grid-template-columns: 80px 1fr 60px;
    gap: 8px;
  }
  
  .cat-name {
    font-size: 0.6875rem;
  }
}
</style>
