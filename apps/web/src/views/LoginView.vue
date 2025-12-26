<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Logo from '@/components/ui/Logo.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const name = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const isVisible = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  isLoading.value = true
  
  try {
    if (isSignUp.value) {
      await authStore.signup(email.value, password.value, name.value)
    } else {
      await authStore.login(email.value, password.value)
    }
    
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
  } catch (e: any) {
    errorMessage.value = e.message || 'An error occurred'
  } finally {
    isLoading.value = false
  }
}

async function handleGoogleLogin() {
  errorMessage.value = ''
  try {
    await authStore.loginWithGoogle()
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to sign in with Google'
  }
}

function toggleMode() {
  isSignUp.value = !isSignUp.value
  errorMessage.value = ''
}

onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAuthenticated) {
    router.push('/')
  }
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})
</script>

<template>
  <div class="login-page">
    <!-- Global background is handled in App.vue -->


    <div class="login-container" :class="{ visible: isVisible }">
      <!-- Logo -->
      <router-link to="/" class="logo">
        <Logo size="32" />
      </router-link>

      <!-- Card -->
      <div class="login-card">
        <div class="card-header">
          <h1 class="card-title">{{ isSignUp ? 'Create your account' : 'Welcome back' }}</h1>
          <p class="card-desc">
            {{ isSignUp ? 'Start splitting expenses in seconds' : 'Sign in to continue to Settlr' }}
          </p>
        </div>
        
        <!-- Error message -->
        <Transition name="slide-up">
          <div v-if="errorMessage" class="error-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ errorMessage }}
          </div>
        </Transition>
        
        <!-- Form -->
        <form class="login-form" @submit.prevent="handleSubmit">
          <Transition name="slide-up">
            <div v-if="isSignUp" class="form-group">
              <label for="name" class="form-label">Full name</label>
              <input 
                v-model="name"
                type="text" 
                id="name"
                class="input"
                placeholder="John Doe"
                autocomplete="name"
                required
              />
            </div>
          </Transition>
          
          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <input 
              v-model="email"
              type="email" 
              id="email"
              class="input"
              placeholder="you@example.com"
              autocomplete="email"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input 
              v-model="password"
              type="password" 
              id="password"
              class="input"
              placeholder="••••••••"
              autocomplete="current-password"
              minlength="6"
              required
            />
          </div>
          
          <button 
            type="submit" 
            class="btn btn-primary btn-lg btn-full" 
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="btn-spinner"></span>
            {{ isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In') }}
          </button>
        </form>
        
        <div class="divider">
          <span>or continue with</span>
        </div>
        
        <button 
          class="btn btn-secondary btn-lg btn-full social-btn" 
          @click="handleGoogleLogin" 
          :disabled="isLoading"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <p class="switch-mode">
          {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
          <button type="button" class="switch-btn" @click="toggleMode">
            {{ isSignUp ? 'Sign in' : 'Create one' }}
          </button>
        </p>
      </div>

      <p class="terms">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: transparent;
  position: relative;
  overflow: hidden;
}

/* Background decoration */
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-gradient {
  position: absolute;
  top: -30%;
  right: -20%;
  width: 80%;
  height: 80%;
  background: radial-gradient(ellipse, var(--color-primary-50), transparent 70%);
  opacity: 0.6;
}

.bg-circles {
  position: absolute;
  inset: 0;
}

.circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--color-border-light);
}

.circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
  animation: float 10s ease-in-out infinite;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
  animation: float 12s ease-in-out infinite reverse;
}

.circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  left: 10%;
  animation: float 8s ease-in-out infinite;
}

/* Container */
.login-container {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(20px);
  transition: all 600ms var(--ease-out-expo);
}

.login-container.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
  text-decoration: none;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text {
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Card */
.login-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-xl);
}

.card-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--space-xs);
}

.card-desc {
  color: var(--color-text-secondary);
}

/* Error banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-danger-light);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-lg);
  color: var(--color-danger);
  font-size: 0.875rem;
  margin-bottom: var(--space-lg);
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

/* Button spinner */
.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: var(--space-sm);
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin: var(--space-lg) 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.divider span {
  color: var(--color-text-dimmed);
  font-size: 0.8125rem;
}

/* Social button */
.social-btn {
  gap: var(--space-md);
}

/* Switch mode */
.switch-mode {
  text-align: center;
  margin-top: var(--space-lg);
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
}

.switch-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  margin-left: var(--space-xs);
}

.switch-btn:hover {
  text-decoration: underline;
}

/* Terms */
.terms {
  text-align: center;
  margin-top: var(--space-lg);
  font-size: 0.8125rem;
  color: var(--color-text-dimmed);
}
</style>
