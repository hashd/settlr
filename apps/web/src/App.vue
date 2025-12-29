<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'
import GlobalBackground from '@/components/GlobalBackground.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import NetworkStatus from '@/components/ui/NetworkStatus.vue'

const route = useRoute()
const authStore = useAuthStore()

// Pages that shouldn't show the header
const noHeaderPages = ['login', 'auth-callback']
const showHeader = () => !noHeaderPages.includes(route.name as string)

onMounted(async () => {
  await authStore.initialize()
})
</script>

<template>
  <div id="app">
    <NetworkStatus />
    <GlobalBackground />
    <AppHeader v-if="showHeader()" />
    <RouterView />
    <ToastContainer />
  </div>
</template>


<style>
#app {
  min-height: 100vh;
}
</style>
