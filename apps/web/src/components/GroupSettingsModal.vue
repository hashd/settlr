<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { useMutation, useQuery } from '@vue/apollo-composable'
import { useRouter } from 'vue-router'
import { 
  UPDATE_GROUP_MUTATION, 
  DELETE_GROUP_MUTATION,
  LEAVE_GROUP_MUTATION,
  REMOVE_MEMBER_MUTATION,
  EXPORT_GROUP_DATA_QUERY
} from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  open: boolean
  group: any
  currentUserId: string
}>()

const emit = defineEmits(['close', 'updated', 'deleted', 'left'])
const toast = useToastStore()
const router = useRouter()

// Mutations
const { mutate: updateGroup, loading: updating } = useMutation(UPDATE_GROUP_MUTATION)
const { mutate: deleteGroup, loading: deleting } = useMutation(DELETE_GROUP_MUTATION)
const { mutate: leaveGroup, loading: leaving } = useMutation(LEAVE_GROUP_MUTATION)
const { mutate: removeMember, loading: removing } = useMutation(REMOVE_MEMBER_MUTATION)

// Queries
const { refetch: fetchExport, loading: exporting } = useQuery(
  EXPORT_GROUP_DATA_QUERY, 
  () => ({
    groupId: props.group.id
  }),
  { enabled: false, fetchPolicy: 'network-only' }
)

// Form state

const name = ref('')
const icon = ref('')
const category = ref('OTHER')
const activeTab = ref<'general' | 'members' | 'danger' | 'data'>('general')

// Modals
const showDeleteConfirm = ref(false)
const showLeaveConfirm = ref(false)

const categories = [
  { value: 'TRIP', label: 'Trip', icon: '✈️' },
  { value: 'HOME', label: 'Home', icon: '🏠' },
  { value: 'COUPLE', label: 'Couple', icon: '❤️' },
  { value: 'OTHER', label: 'Other', icon: '📄' }
]

const icons = ['✈️', '🏠', '❤️', '📄', '🍻', '🍔', '🎮', '🎬', '🏸', '🎁', '🚗', '💡']

// Computed
const isAdmin = computed(() => {
  const member = props.group.members.find((m: any) => m.user.id === props.currentUserId)
  return member?.role === 'ADMIN'
})

// Initialize form
watch(() => props.open, (isOpen) => {
  if (isOpen && props.group) {
    name.value = props.group.name
    icon.value = props.group.icon
    category.value = props.group.category || 'OTHER'
    activeTab.value = 'general'
  }
})

async function handleSave() {
  try {
    await updateGroup({
      id: props.group.id,
      name: name.value,
      icon: icon.value,
      category: category.value
    })
    emit('updated')
    emit('close')
    toast.success('Group settings updated')
  } catch (e: any) {
    toast.error(e.message || 'Failed to update group')
  }
}

async function handleDelete() {
  try {
    await deleteGroup({ id: props.group.id })
    toast.success('Group deleted')
    router.push('/groups')
  } catch (e: any) {
    toast.error(e.message || 'Failed to delete group')
  }
}

async function handleLeave() {
  try {
    await leaveGroup({ groupId: props.group.id })
    toast.success('Left group')
    router.push('/groups')
  } catch (e: any) {
    toast.error(e.message || 'Failed to leave group')
  }
}

async function handleRemoveMember(userId: string) {
  if (!confirm('Are you sure you want to remove this member?')) return
  
  try {
    await removeMember({
      groupId: props.group.id,
      userId
    })
    toast.success('Member removed')
    emit('updated')
  } catch (e: any) {
    toast.error(e.message || 'Failed to remove member')
  }
}

async function handleExport() {
  try {
    const res = await fetchExport()
    if (!res?.data?.exportGroupData) return

    const blob = new Blob([res.data.exportGroupData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `settlr-export-${props.group.name}-${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Data exported successfully')
  } catch (e: any) {
    toast.error(e.message || 'Failed to export data')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="emit('close')">
        <div class="modal">
          <div class="modal-header">
            <h2>Group Settings</h2>
            <button class="close-btn" @click="emit('close')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-tabs">
            <button 
              :class="['tab-btn', { active: activeTab === 'general' }]"
              @click="activeTab = 'general'"
            >
              General
            </button>
            <button 
              :class="['tab-btn', { active: activeTab === 'members' }]"
              @click="activeTab = 'members'"
            >
              Members
            </button>
            <button 
              :class="['tab-btn', { active: activeTab === 'data' }]"
              @click="activeTab = 'data'"
            >
              Data
            </button>
            <button 
              :class="['tab-btn danger', { active: activeTab === 'danger' }]"
              @click="activeTab = 'danger'"
            >
              Danger Zone
            </button>
          </div>

          <div class="modal-body">
            <!-- General Settings -->
            <div v-if="activeTab === 'general'" class="settings-panel">
              <form @submit.prevent="handleSave">
                <div class="field">
                  <label>Group Name</label>
                  <input 
                    v-model="name"
                    type="text"
                    class="text-input"
                    required
                    :disabled="!isAdmin"
                  />
                </div>

                <div class="field">
                  <label>Category</label>
                  <div class="category-grid">
                    <button
                      v-for="cat in categories"
                      :key="cat.value"
                      type="button"
                      :class="['category-card', { active: category === cat.value }]"
                      @click="isAdmin && (category = cat.value)"
                      :disabled="!isAdmin"
                    >
                      <span class="category-icon">{{ cat.icon }}</span>
                      <span class="category-label">{{ cat.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="field">
                  <label>Icon</label>
                  <div class="icon-scroller">
                    <button
                      v-for="i in icons"
                      :key="i"
                      type="button"
                      :class="['icon-btn', { active: icon === i }]"
                      @click="isAdmin && (icon = i)"
                      :disabled="!isAdmin"
                    >
                      {{ i }}
                    </button>
                  </div>
                </div>

                <button v-if="isAdmin" type="submit" class="submit-btn" :disabled="updating">
                  {{ updating ? 'Saving...' : 'Save Changes' }}
                </button>
                <p v-else class="info-text">Only admins can edit group details.</p>
              </form>
            </div>

            <!-- Members Management -->
            <div v-else-if="activeTab === 'members'" class="settings-panel">
              <div class="members-list">
                <div 
                  v-for="member in group.members" 
                  :key="member.user.id" 
                  class="member-row"
                >
                  <div class="member-info">
                    <div class="member-avatar">
                      {{ member.user.name[0] }}
                    </div>
                    <div>
                      <div class="member-name">
                        {{ member.user.name }}
                        <span v-if="member.user.id === currentUserId" class="you-badge">(You)</span>
                      </div>
                      <div class="member-role">{{ member.role }}</div>
                    </div>
                  </div>
                  
                  <button 
                    v-if="isAdmin && member.user.id !== currentUserId"
                    class="remove-btn"
                    @click="handleRemoveMember(member.user.id)"
                    :disabled="removing"
                    title="Remove member"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Data Management -->
            <div v-else-if="activeTab === 'data'" class="settings-panel">
               <div class="data-actions">
                  <div class="data-item">
                     <div class="data-info">
                        <h3>Export Data</h3>
                        <p>Download a CSV file of all expenses and settlements.</p>
                     </div>
                     <button 
                        class="btn-secondary" 
                        @click="handleExport"
                        :disabled="exporting"
                     >
                        {{ exporting ? 'Exporting...' : 'Export CSV' }}
                     </button>
                  </div>
               </div>
            </div>

            <!-- Danger Zone -->
            <div v-else-if="activeTab === 'danger'" class="settings-panel">
              <div class="danger-actions">
                <div class="danger-item">
                  <div class="danger-info">
                    <h3>Leave Group</h3>
                    <p>You will lose access to this group's expenses and history.</p>
                  </div>
                  <button 
                    class="btn-danger-outline" 
                    @click="showLeaveConfirm = true"
                  >
                    Leave Group
                  </button>
                </div>

                <div v-if="isAdmin" class="danger-item">
                  <div class="danger-info">
                    <h3>Delete Group</h3>
                    <p>Permanently delete this group and all its data. This cannot be undone.</p>
                  </div>
                  <button 
                    class="btn-danger-solid" 
                    @click="showDeleteConfirm = true"
                  >
                    Delete Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirm Leave Modal -->
    <Transition name="modal">
      <div v-if="showLeaveConfirm" class="modal-overlay" style="z-index: 200">
        <div class="modal compact">
          <div class="modal-header">
            <h2>Leave Group?</h2>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to leave <strong>{{ group?.name }}</strong>?</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="showLeaveConfirm = false">Cancel</button>
              <button class="submit-btn danger" :disabled="leaving" @click="handleLeave">
                {{ leaving ? 'Leaving...' : 'Leave Group' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirm Delete Modal -->
    <Transition name="modal">
      <div v-if="showDeleteConfirm" class="modal-overlay" style="z-index: 200">
        <div class="modal compact">
          <div class="modal-header">
            <h2>Delete Group?</h2>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete <strong>{{ group?.name }}</strong>? This action cannot be undone.</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="showDeleteConfirm = false">Cancel</button>
              <button class="submit-btn danger" :disabled="deleting" @click="handleDelete">
                {{ deleting ? 'Deleting...' : 'Delete Group' }}
              </button>
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
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-lg);
}

.modal {
  background: var(--color-bg);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal.compact {
  max-width: 360px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 700;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.modal-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border-light);
  padding: 0 var(--space-lg);
}

.tab-btn {
  padding: var(--space-md) var(--space-md);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-btn.danger.active {
  color: var(--color-danger);
  border-bottom-color: var(--color-danger);
}

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
}

.field {
  margin-bottom: var(--space-lg);
}

.field label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.text-input {
  width: 100%;
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 1rem;
  outline: none;
  transition: all var(--transition-fast);
}

.text-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}

/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.category-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-card:hover:not(:disabled) {
  border-color: var(--color-text-dimmed);
}

.category-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-50);
  color: var(--color-primary);
}

/* Icon Scroller */
.icon-scroller {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding-bottom: var(--space-sm);
}

.icon-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-50);
}

/* Members List */
.members-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
}

.member-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.member-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.you-badge {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: normal;
  margin-left: 4px;
}

.member-role {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-danger);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.remove-btn:hover {
  background: var(--color-danger-light);
}

/* Danger Zone */
.danger-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.danger-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  border: 1px solid var(--color-danger-light);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
}

.danger-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-danger);
  margin-bottom: 4px;
}

.danger-info p {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.btn-danger-outline {
  padding: var(--space-md);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  background: transparent;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-danger-outline:hover {
  background: var(--color-danger-light);
}

.btn-danger-solid {
  padding: var(--space-md);
  border: none;
  color: white;
  background: var(--color-danger);
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-secondary {
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-secondary:hover {
  background: var(--color-bg-secondary);
}

.btn-danger-solid:hover {
  background: #dc2626;
}

.submit-btn {
  width: 100%;
  padding: var(--space-md);
  border: none;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.submit-btn.danger {
  background: var(--color-danger);
}

.info-text {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.cancel-btn {
  flex: 1;
  padding: var(--space-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>
