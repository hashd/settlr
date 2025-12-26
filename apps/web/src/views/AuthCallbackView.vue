<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()

onMounted(async () => {
  // Handle the OAuth callback
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Auth callback error:', error)
    router.push('/login?error=auth_failed')
    return
  }
  
  if (session) {
    router.push('/')
  } else {
    router.push('/login')
  }
})
</script>

<template>
  <div class="callback-page">
    <div class="loader">
      <div class="spinner"></div>
      <p>Signing you in...</p>
    </div>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto var(--space-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loader p {
  color: var(--color-text-muted);
}
</style>
