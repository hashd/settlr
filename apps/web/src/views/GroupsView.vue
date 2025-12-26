<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { GROUPS_QUERY, CREATE_GROUP_MUTATION } from '@/graphql/operations'
import Logo from '@/components/ui/Logo.vue'

interface Group {
  id: string
  name: string
  icon: string
  category: string
  members: { id: string; user: { id: string; name: string } }[]
}

const { result, loading, refetch } = useQuery<{ groups: Group[] }>(GROUPS_QUERY)
const { mutate: createGroup, loading: creating } = useMutation(CREATE_GROUP_MUTATION)

const showNewGroupModal = ref(false)
const newGroupName = ref('')
const newGroupIcon = ref('👥')
const newGroupCategory = ref('OTHER')
const isVisible = ref(false)

const icons = ['👥', '🏠', '✈️', '💑', '🍕', '🎉', '💼', '🎮', '🎵', '⚽', '🍔', '🍺', '🛍️', '🚵', '🎞️', '🧴', '🎓', '🏖️', '⛰️', '🚗', '🐱', '🐶', '💡', '💰', '📈', '🏡', '🏢', '🚕', '🍣', '🍷', '🎨', '📚', '💪', '🦷', '🍼', '🎭', '🎤', '🧗', '🏄', '🚀']
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
  { value: 'OTHER', label: 'Other', icon: '📁' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

async function handleCreateGroup() {
  if (!newGroupName.value.trim()) return
  
  try {
    await createGroup({
      name: newGroupName.value,
      icon: newGroupIcon.value,
      category: newGroupCategory.value,
    })
    
    showNewGroupModal.value = false
    newGroupName.value = ''
    newGroupIcon.value = '👥'
    newGroupCategory.value = 'OTHER'
    refetch()
  } catch (e) {
    console.error('Failed to create group:', e)
  }
}

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})
</script>

<template>
  <div class="groups-page" :class="{ visible: isVisible }">
    <!-- Header Area -->
    <header class="page-header container">
      <div class="header-content">
        <div class="header-text">
          <h1 class="page-title">Your <span class="premium-text">Circles</span></h1>
          <p class="page-desc">The high-fidelity way to share expenses.</p>
        </div>
        <button class="create-action glass" @click="showNewGroupModal = true">
          <div class="plus-orb">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
            </svg>
          </div>
          <span>New Group</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-stack container">
      <!-- Loading state -->
      <div v-if="loading" class="stack-loading">
        <div v-for="i in 4" :key="i" class="skeleton-wide-card glass">
          <div class="skeleton-top">
            <div class="skeleton-circle"></div>
            <div class="skeleton-line-long"></div>
          </div>
          <div class="skeleton-bottom">
            <div class="skeleton-line-short"></div>
            <div class="skeleton-line-short"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <Transition name="blur-fade">
        <div v-if="!loading && !result?.groups?.length" class="empty-billboard glass">
          <div class="empty-icon-wrap">
            <div class="glow-orb"></div>
            <Logo size="64" :hideText="true" />
          </div>
          <h2 class="empty-title">Pure transparency begins here</h2>
          <p class="empty-desc">Create your first group and experience the new standard of expense management.</p>
          <button class="btn btn-primary" @click="showNewGroupModal = true">
            <span>Launch Your First Circle</span>
          </button>
        </div>
      </Transition>

      <!-- Sophisticated Vertical Stack -->
      <TransitionGroup name="stack-list" tag="div" class="stack-list" v-if="result?.groups?.length">
        <router-link 
          v-for="(group, index) in result.groups" 
          :key="group.id"
          :to="`/groups/${group.id}`"
          class="premium-list-card glass-layered"
          :style="{ '--delay': `${index * 100}ms` }"
        >
          <div class="card-inner">
            <!-- Left: Visual Identity -->
            <div class="card-visual">
              <div class="group-mark">
                <span class="emoji">{{ group.icon }}</span>
                <div class="category-ring" :data-category="group.category"></div>
              </div>
            </div>

            <!-- Center: Core Info -->
            <div class="card-info">
              <div class="group-header">
                <h3 class="group-name">{{ group.name }}</h3>
                <span class="category-badge">{{ group.category.toLowerCase() }}</span>
              </div>
              <p class="group-activity">Total shared activity in this circle</p>
            </div>

            <!-- Right: Metadata & Members -->
            <div class="card-meta">
              <div class="member-pile">
                <div 
                  v-for="(member, mIdx) in group.members.slice(0, 4)" 
                  :key="member.id"
                  class="member-avatar"
                  :style="{ zIndex: 10 - mIdx, transform: `translateX(${-mIdx * 8}px)` }"
                  :title="member.user.name"
                >
                  {{ getInitials(member.user.name) }}
                </div>
                <div 
                  v-if="group.members.length > 4" 
                  class="member-avatar more"
                  :style="{ zIndex: 5, transform: `translateX(${-32}px)` }"
                >
                  +{{ group.members.length - 4 }}
                </div>
              </div>
              <div class="card-cta">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </router-link>
      </TransitionGroup>
    </main>

    <!-- Refined Modal -->
    <Transition name="modal-bounce">
      <div v-if="showNewGroupModal" class="modal-backdrop" @click.self="showNewGroupModal = false">
        <div class="premium-island glass-layered">
          <div class="modal-head">
            <h2 class="modal-title">New <span class="premium-text">Circle</span></h2>
            <button class="close-orb" @click="showNewGroupModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="handleCreateGroup" class="modal-body">
            <div class="field">
              <label>Circle Name</label>
              <input 
                v-model="newGroupName"
                type="text"
                class="glass-input"
                placeholder="Ex. European Adventure 2024"
                required
                autofocus
              />
            </div>
            
            <div class="field">
              <label>Circle Visual</label>
              <div class="icon-selector-grid">
                <button
                  v-for="icon in icons"
                  :key="icon"
                  type="button"
                  :class="['icon-orb', { active: newGroupIcon === icon }]"
                  @click="newGroupIcon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>
            
            <div class="field">
              <label>Designation</label>
              <div class="category-pill-grid">
                <button
                  v-for="cat in categories"
                  :key="cat.value"
                  type="button"
                  :class="['cat-pill-item', { active: newGroupCategory === cat.value }]"
                  @click="newGroupCategory = cat.value"
                >
                  <span class="pill-icon">{{ cat.icon }}</span>
                  <span class="pill-label">{{ cat.label }}</span>
                </button>
              </div>
            </div>
            
            <div class="modal-foot">
              <button type="submit" class="cta-launch" :disabled="creating || !newGroupName.trim()">
                <div v-if="creating" class="loader-pulse"></div>
                <span>{{ creating ? 'Creating...' : 'Initialize Circle' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.groups-page {
  min-height: 100vh;
  padding-top: 80px;
  padding-bottom: 120px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.6s var(--ease-out-expo);
}

.groups-page.visible {
  opacity: 1;
  transform: translateY(0);
}

.page-header {
  margin-bottom: 60px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 3rem;
  font-weight: 850;
  letter-spacing: -0.05em;
  margin-bottom: 4px;
}

.premium-text {
  background: linear-gradient(135deg, var(--color-primary) 0%, #f472b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-desc {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.create-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px 10px 10px;
  border-radius: 40px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-weight: 700;
  color: var(--color-text);
  transition: all 0.3s var(--ease-out-back);
}

.create-action:hover {
  transform: translateY(-4px) scale(1.02);
  background: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.plus-orb {
  width: 36px;
  height: 36px;
  background: var(--color-text);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Stack Layout */
.main-stack {
  max-width: 800px !important;
}

.stack-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.premium-list-card {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 24px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  animation: slide-up-fade 0.8s var(--ease-out-expo) backwards;
  animation-delay: var(--delay);
}

@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.premium-list-card:hover {
  transform: translateY(-6px) scale(1.015);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 
    0 20px 40px -10px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(99, 102, 241, 0.1);
}

.card-inner {
  display: flex;
  align-items: center;
  gap: 24px;
}

.card-visual {
  position: relative;
}

.group-mark {
  width: 72px;
  height: 72px;
  background: white;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.25rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  transition: all 0.5s var(--ease-out-back);
}

.premium-list-card:hover .group-mark {
  transform: rotate(-5deg) scale(1.1);
}

.category-ring {
  position: absolute;
  inset: -4px;
  border: 2px solid transparent;
  border-radius: 24px;
  opacity: 0.3;
}

.card-info {
  flex: 1;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.group-name {
  font-size: 1.5rem;
  font-weight: 850;
  letter-spacing: -0.03em;
}

.category-badge {
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.group-activity {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 32px;
}

.member-pile {
  display: flex;
  align-items: center;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--color-bg-tertiary);
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  transition: all 0.3s ease;
}

.member-avatar.more {
  background: var(--color-primary);
  color: white;
  font-size: 0.6875rem;
}

.card-cta {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dimmed);
  transition: all 0.3s ease;
  transform: translateX(-10px);
  opacity: 0;
}

.premium-list-card:hover .card-cta {
  opacity: 1;
  transform: translateX(0);
  background: var(--color-text);
  color: white;
  border-color: var(--color-text);
}

/* Empty Billboard */
.empty-billboard {
  text-align: center;
  padding: 80px 40px;
  border-radius: 40px;
  margin: 40px 0;
}

.empty-icon-wrap {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glow-orb {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, var(--color-primary-50) 0%, transparent 70%);
  animation: pulse 4s infinite;
}

.empty-title {
  font-size: 2rem;
  font-weight: 850;
  margin-bottom: 12px;
}

.empty-desc {
  font-size: 1.125rem;
  color: var(--color-text-muted);
  max-width: 400px;
  margin: 0 auto 32px;
  line-height: 1.6;
}

/* Redesign Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.premium-island {
  width: 100%;
  max-width: 520px;
  border-radius: 36px;
  padding: 40px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.modal-title {
  font-size: 2.25rem;
  font-weight: 850;
  letter-spacing: -0.04em;
}

.close-orb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-text-dimmed);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-orb:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.field {
  margin-bottom: 24px;
}

.field label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-dimmed);
  margin-bottom: 12px;
}

.glass-input {
  width: 100%;
  padding: 16px 20px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  font-size: 1.125rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

.glass-input:focus {
  background: white;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  outline: none;
}

.icon-selector-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  max-height: 180px;
  overflow-y: auto;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.icon-selector-grid::-webkit-scrollbar {
  width: 4px;
}

.icon-selector-grid::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 10px;
}

.icon-orb {
  aspect-ratio: 1;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 14px;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-orb:hover {
  background: var(--color-bg-secondary);
  transform: translateY(-2px);
  border-color: var(--color-primary-light);
}

.icon-orb.active {
  background: white;
  border-color: var(--color-primary);
  border-width: 2px;
  box-shadow: 0 8px 16px -4px rgba(99, 102, 241, 0.15);
  transform: scale(1.05);
}

.category-pill-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cat-pill-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 30px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-secondary);
}

.cat-pill-item:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-text-dimmed);
}

.cat-pill-item.active {
  background: var(--color-text);
  color: white;
  border-color: var(--color-text);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cta-launch {
  width: 100%;
  padding: 18px;
  border-radius: 20px;
  border: none;
  background: var(--color-primary);
  color: white;
  font-weight: 800;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.3s var(--ease-out-expo);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.4);
}

.cta-launch:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.15);
  box-shadow: 0 20px 45px -5px rgba(99, 102, 241, 0.5);
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.05); }
}

.loader-pulse {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Utilities */
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

.glass-layered::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 1);
  pointer-events: none;
  opacity: 0.1;
  mask-image: radial-gradient(circle at top left, black, transparent 70%);
}

.premium-island {
  position: relative;
  overflow: hidden;
}

/* Modal Inner Decor */
.premium-island::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
  z-index: 0;
  pointer-events: none;
}

.modal-head, .modal-body {
  position: relative;
  z-index: 1;
}

.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

/* Animations */
.blur-fade-enter-active, .blur-fade-leave-active {
  transition: all 0.6s var(--ease-out-expo);
}
.blur-fade-enter-from, .blur-fade-leave-to {
  opacity: 0;
  filter: blur(20px);
  transform: scale(0.95);
}

/* Modal Bounce Transition */
.modal-bounce-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.modal-bounce-leave-active {
  transition: all 0.3s var(--ease-out-expo);
}
.modal-bounce-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}
.modal-bounce-leave-to {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(10px);
}

/* Stack List Transition */
.stack-list-enter-active {
  transition: all 0.6s var(--ease-out-expo);
}
.stack-list-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
.stack-list-move {
  transition: transform 0.4s var(--ease-out-expo);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
  
  .card-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .card-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
