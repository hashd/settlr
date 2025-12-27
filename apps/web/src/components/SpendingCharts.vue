<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  expenses: any[]
  groupCurrency?: string
}>()

// Category distribution
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

// Monthly trend (last 6 months)
const monthlyData = computed(() => {
  const months: Record<string, number> = {}
  const now = new Date()
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = 0
  }
  
  // Fill with expense data
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

const totalSpent = computed(() => {
  const total = props.expenses.reduce((s, e) => s + e.amount, 0)
  return `₹${(total / 100).toLocaleString('en-IN')}`
})

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
</script>

<template>
  <div class="charts-section">
    <h3>📊 Spending Insights</h3>
    
    <!-- Summary -->
    <div class="summary-card">
      <div class="summary-stat">
        <span class="stat-label">Total Spent</span>
        <span class="stat-value">{{ totalSpent }}</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Expenses</span>
        <span class="stat-value">{{ expenses.length }}</span>
      </div>
    </div>
    
    <!-- Category Breakdown -->
    <div class="chart-card" v-if="categoryData.length > 0">
      <h4>By Category</h4>
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
    <div class="chart-card" v-if="monthlyData.some(m => m.amount > 0)">
      <h4>Monthly Trend</h4>
      <div class="bar-chart">
        <div v-for="m in monthlyData" :key="m.key" class="bar-col">
          <div class="bar-value" v-if="m.amount > 0">{{ m.formatted }}</div>
          <div class="bar" :style="{ height: m.height + '%' }" />
          <div class="bar-label">{{ m.label }}</div>
        </div>
      </div>
    </div>
    
    <div v-if="expenses.length === 0" class="empty">
      No expenses to analyze yet.
    </div>
  </div>
</template>

<style scoped>
.charts-section {
  background: var(--color-bg-secondary);
  border-radius: 16px;
  padding: 20px;
  margin-top: 16px;
}

.charts-section h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 16px 0;
}

.summary-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.summary-stat {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 800;
}

.chart-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart-card h4 {
  font-size: 0.8125rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--color-text-secondary);
}

/* Category bars */
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

.cat-emoji {
  font-size: 1rem;
}

.cat-name {
  font-size: 0.75rem;
  font-weight: 600;
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
  font-weight: 600;
  text-align: right;
}

/* Bar chart */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 120px;
  gap: 4px;
  padding-top: 20px;
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
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  white-space: nowrap;
}

.bar-label {
  margin-top: 8px;
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
}

.empty {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
</style>
