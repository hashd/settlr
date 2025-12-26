<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Logo from '@/components/ui/Logo.vue'

const router = useRouter()
const authStore = useAuthStore()
const showDropdown = ref(false)
const isScrolled = ref(false)

async function handleLogout() {
  showDropdown.value = false
  await authStore.logout()
  router.push('/')
}

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

function closeDropdown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.user-dropdown')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <header class="header-wrapper" :class="{ 'is-scrolled': isScrolled }">
    <div class="header-island glass">
      <!-- Logo Section -->
      <router-link to="/" class="header-logo">
        <Logo size="20" />
      </router-link>

      <!-- Navigation Central -->
      <nav class="header-nav" v-if="authStore.isAuthenticated">
        <router-link to="/groups" class="nav-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <span>Groups</span>
        </router-link>
      </nav>

      <!-- Action Section -->
      <div class="header-actions">
        <template v-if="authStore.isAuthenticated">
          <div class="user-dropdown">
            <button 
              class="profile-trigger" 
              @click.stop="showDropdown = !showDropdown"
              :class="{ active: showDropdown }"
            >
              <div class="profile-avatar">
                {{ (authStore.user?.user_metadata?.name || authStore.user?.email || 'U')[0].toUpperCase() }}
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="chevron">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            <Transition name="slide-up">
              <div v-if="showDropdown" class="dropdown-content glass">
                <div class="user-info">
                  <p class="user-name">{{ authStore.user?.user_metadata?.name || 'User' }}</p>
                  <p class="user-email">{{ authStore.user?.email }}</p>
                </div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-btn logout" @click="handleLogout">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="login-link">Sign In</router-link>
          <router-link to="/login" class="signup-button">Get Started</router-link>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 12px 24px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  transition: all 0.4s var(--ease-out-expo);
}

.is-scrolled {
  padding: 8px 24px;
}

.header-island {
  pointer-events: auto;
  width: 100%;
  max-width: 1100px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-radius: 27px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 10px 40px -10px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  transition: all 0.4s var(--ease-out-expo);
}

.is-scrolled .header-island {
  max-width: 900px;
  height: 48px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.8);
}


.header-logo {
  text-decoration: none;
  transition: transform 0.3s var(--ease-out-back);
}

.header-logo:hover {
  transform: scale(1.02);
}

.header-nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9375rem;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: rgba(99, 102, 241, 0.06);
  color: var(--color-primary);
}

.nav-link.router-link-active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: color 0.2s ease;
}

.login-link:hover {
  color: var(--color-primary);
}

.signup-button {
  background: var(--color-text);
  color: white;
  padding: 10px 24px;
  border-radius: 24px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.9375rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.signup-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  background: var(--color-primary);
}

/* User Dropdown */
.user-dropdown {
  position: relative;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px;
  padding-right: 12px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-trigger:hover, .profile-trigger.active {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.1);
}

.profile-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8125rem;
}

.chevron {
  color: var(--color-text-muted);
  transition: transform 0.3s ease;
}

.profile-trigger.active .chevron {
  transform: rotate(180deg);
}

.dropdown-content {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 240px;
  padding: 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: var(--shadow-xl);
}

.user-info {
  padding: 8px 12px;
}

.user-name {
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.user-email {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.dropdown-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.05);
  margin: 12px 0;
}

.dropdown-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-btn:hover {
  background: rgba(0, 0, 0, 0.03);
  color: var(--color-text);
}

.dropdown-btn.logout:hover {
  background: rgba(239, 68, 68, 0.06);
  color: #ef4444;
}

.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

/* Transitions */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 640px) {
  .header-wrapper {
    padding: 12px;
  }
  
  .is-scrolled {
    padding: 8px;
  }

  .nav-link span {
    display: none;
  }
  
  .nav-link {
    padding: 8px;
  }
  
  .header-actions .login-link {
    display: none;
  }
}
</style>
