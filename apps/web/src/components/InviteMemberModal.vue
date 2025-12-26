<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@vue/apollo-composable'
import { INVITE_TO_GROUP_MUTATION, CREATE_PSEUDO_USER_MUTATION } from '@/graphql/operations'

const props = defineProps<{
  open: boolean
  groupId: string
}>()

const emit = defineEmits<{
  close: []
  invited: []
}>()

// Tab state
const activeTab = ref<'email' | 'placeholder'>('email')

// Email invite form
const inviteEmail = ref('')
const { mutate: inviteToGroup, loading: inviting } = useMutation(INVITE_TO_GROUP_MUTATION)

// Placeholder form
const placeholderName = ref('')
const { mutate: createPseudoUser, loading: creatingPseudo } = useMutation(CREATE_PSEUDO_USER_MUTATION)

const errorMessage = ref('')
const successMessage = ref('')

async function handleInviteByEmail() {
  if (!inviteEmail.value.trim()) return
  
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    await inviteToGroup({
      groupId: props.groupId,
      email: inviteEmail.value,
    })
    successMessage.value = `Invitation sent to ${inviteEmail.value}`
    inviteEmail.value = ''
    emit('invited')
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to send invitation'
  }
}

async function handleCreatePlaceholder() {
  if (!placeholderName.value.trim()) return
  
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    await createPseudoUser({
      groupId: props.groupId,
      name: placeholderName.value,
    })
    successMessage.value = `${placeholderName.value} added to group`
    placeholderName.value = ''
    emit('invited')
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to create placeholder'
  }
}

function handleClose() {
  inviteEmail.value = ''
  placeholderName.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="handleClose">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">Add Member</h2>
            <button class="modal-close" @click="handleClose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <!-- Tabs -->
          <div class="tabs">
            <button 
              :class="['tab', { active: activeTab === 'email' }]"
              @click="activeTab = 'email'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Invite by Email
            </button>
            <button 
              :class="['tab', { active: activeTab === 'placeholder' }]"
              @click="activeTab = 'placeholder'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Add Placeholder
            </button>
          </div>
          
          <!-- Content -->
          <div class="modal-content">
            <!-- Messages -->
            <Transition name="slide-up">
              <div v-if="errorMessage" class="message error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {{ errorMessage }}
              </div>
            </Transition>
            
            <Transition name="slide-up">
              <div v-if="successMessage" class="message success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                {{ successMessage }}
              </div>
            </Transition>

            <!-- Email Tab -->
            <div v-if="activeTab === 'email'" class="tab-content">
              <div class="tab-description">
                <p>Send an invitation email. They'll need to accept to join the group.</p>
              </div>
              
              <form @submit.prevent="handleInviteByEmail">
                <div class="form-group">
                  <label class="form-label">Email address</label>
                  <input 
                    v-model="inviteEmail"
                    type="email"
                    class="input"
                    placeholder="friend@example.com"
                    required
                  />
                </div>
                
                <button type="submit" class="btn btn-primary btn-full" :disabled="inviting || !inviteEmail.trim()">
                  <span v-if="inviting" class="btn-spinner"></span>
                  {{ inviting ? 'Sending...' : 'Send Invitation' }}
                </button>
              </form>
            </div>
            
            <!-- Placeholder Tab -->
            <div v-if="activeTab === 'placeholder'" class="tab-content">
              <div class="tab-description">
                <p>Add someone without an email. You can link their account later when they sign up.</p>
              </div>
              
              <form @submit.prevent="handleCreatePlaceholder">
                <div class="form-group">
                  <label class="form-label">Name</label>
                  <input 
                    v-model="placeholderName"
                    type="text"
                    class="input"
                    placeholder="e.g., Mom, Dad, Roommate"
                    required
                  />
                </div>
                
                <button type="submit" class="btn btn-primary btn-full" :disabled="creatingPseudo || !placeholderName.trim()">
                  <span v-if="creatingPseudo" class="btn-spinner"></span>
                  {{ creatingPseudo ? 'Adding...' : 'Add to Group' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  z-index: 100;
}

.modal {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 440px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

/* Tabs */
.tabs {
  display: flex;
  padding: 0 var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-md);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--color-text-secondary);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Content */
.modal-content {
  padding: var(--space-lg);
}

.tab-content {
  animation: fade-in 200ms ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.tab-description {
  margin-bottom: var(--space-lg);
}

.tab-description p {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

/* Messages */
.message {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  margin-bottom: var(--space-lg);
}

.message.error {
  background: var(--color-danger-light);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.message.success {
  background: var(--color-success-light);
  border: 1px solid var(--color-success);
  color: var(--color-success);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: var(--space-sm);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
