<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Colors
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, Colors)

const props = defineProps<{
  expenses: any[]
  members: any[]
}>()

// --- Utilities ---
const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#FF6384',
  TRANSPORT: '#36A2EB',
  ACCOMMODATION: '#FFCE56',
  ENTERTAINMENT: '#4BC0C0',
  SHOPPING: '#9966FF',
  UTILITIES: '#FF9F40',
  GROCERIES: '#C9CBCF',
  OTHER: '#808080'
}

// --- Data Preparation ---

// 1. Category Breakdown
const categoryData = computed(() => {
  const totals: Record<string, number> = {}
  props.expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount
  })

  // Sort by value desc
  const labels = Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  
  return {
    labels: labels.map(l => l.charAt(0) + l.slice(1).toLowerCase()),
    datasets: [{
      backgroundColor: labels.map(l => CATEGORY_COLORS[l] || '#808080'),
      data: labels.map(l => totals[l] / 100) // Convert to unit
    }]
  }
})

// 2. Member Breakdown (Share Cost)
const memberCostData = computed(() => {
  const totals: Record<string, number> = {}
  
  // Init with 0
  props.members.forEach(m => totals[m.user.id] = 0)
  
  props.expenses.forEach(e => {
    e.shares.forEach((s: any) => {
      totals[s.user.id] = (totals[s.user.id] || 0) + s.amount
    })
  })

  const labels = props.members.map(m => m.user.name)
  const data = props.members.map(m => (totals[m.user.id] || 0) / 100)

  return {
    labels,
    datasets: [{
      label: 'Total Cost',
      backgroundColor: '#72C9A1', // Primary color
      data
    }]
  }
})

// --- Options ---
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: '#8899A6' // text-secondary
      }
    }
  },
  scales: {
      x: { 
          ticks: { color: '#8899A6' },
          grid: { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
          ticks: { color: '#8899A6' },
          grid: { color: 'rgba(255,255,255,0.05)' }
      }
  }
}

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: '#8899A6'
      }
    }
  }
}
</script>

<template>
  <div class="analysis-container">
    <div class="chart-card">
      <h3>Spending by Category</h3>
      <div class="chart-wrapper pie">
          <Doughnut :data="categoryData" :options="pieOptions" />
      </div>
    </div>
    
    <div class="chart-card">
      <h3>Cost Distribution (Who spent what)</h3>
      <div class="chart-wrapper">
          <Bar :data="memberCostData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

.chart-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--color-border);
}

h3 {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  text-align: center;
  color: var(--color-text-primary);
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

.chart-wrapper.pie {
    height: 250px;
}
</style>
