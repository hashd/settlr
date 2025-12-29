<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMutation, useQuery } from '@vue/apollo-composable'
import { useRouter } from 'vue-router'
import { 
  UPDATE_GROUP_MUTATION, 
  DELETE_GROUP_MUTATION,
  LEAVE_GROUP_MUTATION,
  REMOVE_MEMBER_MUTATION,
  EXPORT_GROUP_DATA_QUERY,
  ARCHIVE_GROUP_MUTATION
} from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

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
const { mutate: archiveGroup, loading: archiving } = useMutation(ARCHIVE_GROUP_MUTATION)

// Queries
const { refetch: fetchExport, loading: exporting } = useQuery(
  EXPORT_GROUP_DATA_QUERY, 
  () => ({ groupId: props.group.id }),
  { enabled: false, fetchPolicy: 'network-only' }
)

// Form state
const name = ref('')
const confirmState = ref({
  open: false,
  title: '',
  message: '',
  onConfirm: () => {}
})
const icon = ref('')
const category = ref('OTHER')
const simplifyDebts = ref(true)

// UI state
const showConfirm = ref<'leave' | 'delete' | 'archive' | null>(null)
const showIconPicker = ref(false)

const icons = ['👥', '🏠', '✈️', '💑', '🍕', '🎉', '💼', '🎮', '⚽', '🍔', '🍺', '🛍️']
const categories = [
  { value: 'FRIENDS', label: 'Friends' },
  { value: 'HOME', label: 'Home' },
  { value: 'TRIP', label: 'Trip' },
  { value: 'COUPLE', label: 'Couple' },
  { value: 'WORK', label: 'Work' },
  { value: 'OTHER', label: 'Other' },
]

// Computed
const isAdmin = computed(() => {
  const member = props.group?.members?.find((m: any) => m.user.id === props.currentUserId)
  return member?.role === 'ADMIN'
})

const hasChanges = computed(() => {
  if (!props.group) return false
  return name.value !== props.group.name ||
         icon.value !== props.group.icon ||
         category.value !== (props.group.category || 'OTHER') ||
         simplifyDebts.value !== (props.group.simplifyDebts !== false)
})

// Initialize form
watch(() => props.open, (isOpen) => {
  if (isOpen && props.group) {
    name.value = props.group.name
    icon.value = props.group.icon
    category.value = props.group.category || 'OTHER'
    simplifyDebts.value = props.group.simplifyDebts !== false
    showConfirm.value = null
    showIconPicker.value = false
  }
})

function selectIcon(ic: string) {
  if (!isAdmin.value) return
  icon.value = ic
  showIconPicker.value = false
}

async function handleSave() {
  try {
    await updateGroup({
      id: props.group.id,
      name: name.value,
      icon: icon.value,
      category: category.value,
      simplifyDebts: simplifyDebts.value
    })
    emit('updated')
    emit('close')
    toast.success('Settings saved')
  } catch (e: any) {
    toast.error(e.message || 'Failed to save')
  }
}

async function handleDelete() {
  try {
    await deleteGroup({ id: props.group.id })
    toast.success('Group deleted')
    router.push('/groups')
  } catch (e: any) {
    toast.error(e.message || 'Failed to delete')
  }
}

async function handleLeave() {
  try {
    await leaveGroup({ groupId: props.group.id })
    toast.success('Left group')
    router.push('/groups')
  } catch (e: any) {
    toast.error(e.message || 'Failed to leave')
  }
}

async function handleArchive() {
  try {
    await archiveGroup({ groupId: props.group.id })
    toast.success('Group archived!')
    emit('updated')
    emit('close')
  } catch (e: any) {
    toast.error(e.message || 'Failed to archive')
  }
}

function handleRemoveMember(userId: string, userName: string) {
  confirmState.value = {
    open: true,
    title: 'Remove Member',
    message: `Are you sure you want to remove ${userName} from this group?`,
    onConfirm: async () => {
      try {
        await removeMember({ groupId: props.group.id, userId })
        toast.success('Member removed')
        emit('updated')
      } catch (e: any) {
        toast.error(e.message || 'Failed to remove')
      }
    }
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
    a.download = `settlr-${props.group.name}-${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Exported!')
  } catch (e: any) {
    toast.error(e.message || 'Export failed')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" @click.self="emit('close')">
        <div class="sheet">
          <!-- Header -->
          <div class="sheet-header">
            <button class="close-btn" @click="emit('close')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <h2>Settings</h2>
            <button 
              v-if="isAdmin && hasChanges"
              class="save-btn" 
              @click="handleSave"
              :disabled="updating"
            >
              {{ updating ? '...' : 'Save' }}
            </button>
            <div v-else class="save-placeholder"></div>
          </div>

          <!-- Content -->
          <div class="sheet-body">
            
            <!-- Group Identity -->
            <section class="section">
              <div class="identity-row">
                <div class="icon-dropdown">
                  <button 
                    class="icon-trigger"
                    @click="isAdmin && (showIconPicker = !showIconPicker)"
                    :disabled="!isAdmin"
                  >
                    <span class="selected-icon">{{ icon }}</span>
                    <svg class="chevron" :class="{ open: showIconPicker }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                  <Transition name="dropdown">
                    <div v-if="showIconPicker" class="icon-menu">
                      <button 
                        v-for="ic in icons" :key="ic"
                        :class="['icon-opt', { active: icon === ic }]"
                        @click="selectIcon(ic)"
                      >{{ ic }}</button>
                    </div>
                  </Transition>
                </div>
                <input 
                  v-model="name"
                  type="text" 
                  class="name-input"
                  placeholder="Group name"
                  :disabled="!isAdmin"
                  @focus="showIconPicker = false"
                />
              </div>
            </section>

            <!-- Category -->
            <section class="section">
              <label class="section-label">Type</label>
              <div class="cat-chips">
                <button 
                  v-for="c in categories" :key="c.value"
                  :class="['cat-chip', { active: category === c.value }]"
                  @click="isAdmin && (category = c.value)"
                  :disabled="!isAdmin"
                >{{ c.label }}</button>
              </div>
            </section>

            <!-- Settings -->
            <section class="section">
              <label class="section-label">Preferences</label>
              <div class="setting-card" @click="isAdmin && (simplifyDebts = !simplifyDebts)">
                <div class="setting-info">
                  <span class="setting-name">Simplify debts</span>
                  <span class="setting-desc">Minimize number of payments</span>
                </div>
                <div :class="['toggle', { on: simplifyDebts }]">
                  <span class="toggle-knob"></span>
                </div>
              </div>
            </section>

            <!-- Members -->
            <section class="section">
              <label class="section-label">Members · {{ group?.members?.length }}</label>
              <div class="members-card">
                <div 
                  v-for="m in group?.members" :key="m.user.id"
                  class="member-row"
                >
                  <div class="member-avatar">{{ m.user.name[0] }}</div>
                  <div class="member-info">
                    <span class="member-name">
                      {{ m.user.name }}
                      <span v-if="m.user.id === currentUserId" class="you-tag">you</span>
                    </span>
                    <span class="member-role">{{ m.role.toLowerCase() }}</span>
                  </div>
                  <button 
                    v-if="isAdmin && m.user.id !== currentUserId"
                    class="remove-btn"
                    @click.stop="handleRemoveMember(m.user.id, m.user.name)"
                    :disabled="removing"
                  >✕</button>
                </div>
              </div>
            </section>

            <!-- Actions -->
            <section class="section actions-section">
              <button class="action-btn" @click="handleExport" :disabled="exporting">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                {{ exporting ? 'Exporting...' : 'Export CSV' }}
              </button>
              
              <!-- Archive Button (only for admins, only if not archived) -->
              <button v-if="isAdmin && !group?.isArchived" class="action-btn" @click="showConfirm = 'archive'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 8v13H3V8M1 3h22v5H1V3zM10 12h4"/>
                </svg>
                Archive Group
              </button>
              
              <button class="action-btn warn" @click="showConfirm = 'leave'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Leave Group
              </button>
              <button v-if="isAdmin" class="action-btn danger" @click="showConfirm = 'delete'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                Delete Group
              </button>
            </section>

          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirm Dialog -->
    <Transition name="fade">
      <div v-if="showConfirm" class="confirm-overlay" @click.self="showConfirm = null">
        <div class="confirm-dialog">
          <h3>{{ 
            showConfirm === 'delete' ? 'Delete group?' : 
            showConfirm === 'archive' ? 'Archive group?' : 
            'Leave group?' 
          }}</h3>
          <p v-if="showConfirm === 'delete'">
            This will permanently delete <strong>{{ group?.name }}</strong> and all its data.
          </p>
          <p v-else-if="showConfirm === 'archive'">
            <strong>{{ group?.name }}</strong> will be archived. No new expenses can be added until it's unarchived.
            <br><br>
            <em style="color: #92400e;">Note: All balances must be settled before archiving.</em>
          </p>
          <p v-else>
            You'll lose access to <strong>{{ group?.name }}</strong> and its history.
          </p>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="showConfirm = null">Cancel</button>
            <button 
              :class="['btn-confirm', showConfirm === 'delete' ? 'danger' : showConfirm === 'archive' ? '' : 'warn']"
              @click="showConfirm === 'delete' ? handleDelete() : showConfirm === 'archive' ? handleArchive() : handleLeave()"
              :disabled="deleting || leaving || archiving"
            >
              {{ deleting || leaving || archiving ? '...' : (showConfirm === 'delete' ? 'Delete' : showConfirm === 'archive' ? 'Archive' : 'Leave') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </Teleport>
  <ConfirmModal
    :open="confirmState.open"
    :title="confirmState.title"
    :message="confirmState.message"
    danger
    @close="confirmState.open = false"
    @confirm="() => { confirmState.onConfirm(); confirmState.open = false }"
  />
</template>

<style scoped>
/* Overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* Sheet */
.sheet {
  background: white;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.sheet-header h2 {
  font-size: 1.125rem;
  font-weight: 700;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dimmed);
  transition: all 0.15s;
}

.close-btn:hover {
  background: #fef2f2;
  color: #ef4444;
}

.save-btn {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.save-placeholder {
  width: 60px;
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Sections */
.section {
  margin-bottom: 24px;
}

.section-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dimmed);
  margin-bottom: 10px;
}

/* Identity Row */
.identity-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Icon Dropdown */
.icon-dropdown {
  position: relative;
  flex-shrink: 0;
}

.icon-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-trigger:hover:not(:disabled) {
  background: white;
  border-color: var(--color-border);
}

.icon-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selected-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.chevron {
  color: var(--color-text-dimmed);
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(180deg);
}

.icon-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: white;
  border-radius: 16px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  border: 1px solid rgba(0,0,0,0.05);
  z-index: 10;
}

.icon-opt {
  width: 44px;
  height: 44px;
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 1.375rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-opt:hover {
  background: white;
  border-color: var(--color-border);
}

.icon-opt.active {
  background: white;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.name-input {
  flex: 1;
  padding: 14px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: 14px;
  font-size: 1.125rem;
  font-weight: 600;
  min-width: 0;
}

.name-input:focus {
  outline: none;
  background: white;
  border-color: var(--color-primary);
}

/* Category Chips */
.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cat-chip {
  padding: 8px 14px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 100px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-chip:hover:not(:disabled) {
  background: #e5e7eb;
}

.cat-chip.active {
  background: #1a1a2e;
  color: white;
}

.cat-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Setting Card */
.setting-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--color-bg-secondary);
  border-radius: 14px;
  cursor: pointer;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-name {
  font-size: 0.9375rem;
  font-weight: 600;
}

.setting-desc {
  font-size: 0.75rem;
  color: var(--color-text-dimmed);
}

/* Toggle */
.toggle {
  width: 48px;
  height: 28px;
  background: #d1d5db;
  border-radius: 14px;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle.on {
  background: #10b981;
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}

.toggle.on .toggle-knob {
  transform: translateX(20px);
}

/* Members */
.members-card {
  background: var(--color-bg-secondary);
  border-radius: 14px;
  overflow: hidden;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}

.member-row:not(:last-child) {
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.member-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.you-tag {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.member-role {
  font-size: 0.6875rem;
  color: var(--color-text-dimmed);
  text-transform: capitalize;
}

.remove-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--color-text-dimmed);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s;
}

.remove-btn:hover {
  background: #fef2f2;
  color: #ef4444;
}

/* Actions */
.actions-section {
  border-top: 1px solid rgba(0,0,0,0.05);
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--color-text);
}

.action-btn:hover {
  background: #e5e7eb;
}

.action-btn.warn {
  color: #f59e0b;
}

.action-btn.warn:hover {
  background: #fef3c7;
}

.action-btn.danger {
  color: #ef4444;
}

.action-btn.danger:hover {
  background: #fef2f2;
}

/* Confirm Dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.confirm-dialog {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.confirm-dialog h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.confirm-dialog p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background: var(--color-bg-secondary);
}

.btn-confirm {
  color: white;
}

.btn-confirm.warn {
  background: #f59e0b;
}

.btn-confirm.danger {
  background: #ef4444;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .sheet,
.modal-leave-active .sheet {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .sheet {
  transform: translateY(100%);
}

.modal-leave-to .sheet {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Desktop */
@media (min-width: 641px) {
  .overlay {
    align-items: center;
    padding: 24px;
  }
  
  .sheet {
    border-radius: 20px;
    max-height: 80vh;
  }
  
  .modal-enter-from .sheet,
  .modal-leave-to .sheet {
    transform: translateY(20px) scale(0.98);
  }
}
</style>
