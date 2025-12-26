<script setup lang="ts">
import { useQuery, useMutation } from '@vue/apollo-composable'
import { MY_INVITES_QUERY, RESPOND_TO_INVITE_MUTATION, DASHBOARD_QUERY } from '@/graphql/operations'
import { computed } from 'vue'

const { result, loading, refetch } = useQuery(MY_INVITES_QUERY)
const { mutate: respondToInvite, loading: responding } = useMutation(RESPOND_TO_INVITE_MUTATION)

const invites = computed(() => result.value?.myInvites || [])
const pendingInvites = computed(() => invites.value.filter((i: any) => i.status === 'PENDING'))

const emit = defineEmits(['responded'])

async function handleRespond(inviteId: string, accept: boolean) {
  try {
    await respondToInvite({
      inviteId,
      accept
    })
    // Refetch invites to remove the processed one
    refetch()
    emit('responded')
  } catch (e) {
    console.error('Failed to respond to invite:', e)
  }
}
</script>

<template>
  <div v-if="pendingInvites.length > 0 && !loading" class="pending-invites">
    <h3 class="section-title">Pending Invites</h3>
    
    <div class="invites-grid">
      <div 
        v-for="invite in pendingInvites" 
        :key="invite.id" 
        class="invite-card"
      >
        <div class="invite-header">
          <div class="group-icon">{{ invite.group.icon || '👥' }}</div>
          <div class="invite-info">
            <h4 class="group-name">{{ invite.group.name }}</h4>
            <div class="inviter-name">Invited by {{ invite.inviter.name }}</div>
          </div>
        </div>
        
        <div class="invite-actions">
          <button 
            class="action-btn decline" 
            @click="handleRespond(invite.id, false)"
            :disabled="responding"
          >
            Decline
          </button>
          <button 
            class="action-btn accept" 
            @click="handleRespond(invite.id, true)"
            :disabled="responding"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pending-invites {
  margin-bottom: var(--space-xl);
  animation: slide-up 0.5s var(--ease-out-expo) backwards;
  /* animation-delay: 100ms; */
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: var(--space-md);
}

.invites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}

.invite-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.invite-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-20);
}

.invite-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.group-icon {
  width: 48px;
  height: 48px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.invite-info {
  flex: 1;
}

.group-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
}

.inviter-name {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.invite-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.action-btn {
  padding: var(--space-md);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn.decline {
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
}

.action-btn.decline:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-danger);
}

.action-btn.accept {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.action-btn.accept:hover {
  opacity: 0.9;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
