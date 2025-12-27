<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@vue/apollo-composable'
import { CREATE_COMMENT_MUTATION, DELETE_COMMENT_MUTATION } from '@/graphql/operations'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const props = defineProps<{
  expenseId: string
  comments: any[]
}>()

const emit = defineEmits(['refresh'])

const toast = useToastStore()
const auth = useAuthStore()

const newComment = ref('')

const confirmState = ref({
  open: false,
  title: '',
  message: '',
  onConfirm: () => {}
})

const { mutate: createComment, loading: isCreating } = useMutation(CREATE_COMMENT_MUTATION)
const { mutate: deleteComment } = useMutation(DELETE_COMMENT_MUTATION)

async function handleSubmit() {
  if (!newComment.value.trim()) return

  try {
    await createComment({
      expenseId: props.expenseId,
      text: newComment.value
    })
    newComment.value = ''
    emit('refresh')
  } catch (e: any) {
    toast.error(e.message || 'Failed to post comment')
  }
}

function handleDelete(id: string) {
  confirmState.value = {
    open: true,
    title: 'Delete Comment',
    message: 'Are you sure you want to delete this comment?',
    onConfirm: async () => {
      try {
        await deleteComment({ id })
        toast.success('Comment deleted')
        emit('refresh')
      } catch (e: any) {
        toast.error(e.message || 'Failed to delete comment')
      }
    }
  }
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="comment-section">
    <h4>Comments ({{ comments.length }})</h4>
    
    <div class="comments-list" v-if="comments.length > 0">
      <div v-for="comment in comments" :key="comment.id" class="comment-item">
        <div class="comment-header">
          <span class="comment-author">{{ comment.user.name }}</span>
          <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
          <button 
            v-if="comment.user.id === auth.user?.id" 
            class="delete-btn"
            @click="handleDelete(comment.id)"
          >&times;</button>
        </div>
        <div class="comment-body">{{ comment.text }}</div>
      </div>
    </div>
    <div v-else class="no-comments">
        No comments yet.
    </div>

    <form @submit.prevent="handleSubmit" class="comment-form">
      <input 
        v-model="newComment" 
        placeholder="Add a comment..." 
        :disabled="isCreating"
      />
      <button type="submit" :disabled="isCreating || !newComment.trim()">
        Post
      </button>
    </form>
  </div>
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
.comment-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

h4 {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.comment-item {
  background: var(--color-bg-secondary);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.comment-author {
  font-weight: 600;
  color: var(--color-text-primary);
}

.comment-date {
  color: var(--color-text-tertiary);
}

.delete-btn {
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 0.2rem;
}
.delete-btn:hover {
    color: var(--color-danger);
}

.comment-body {
    color: var(--color-text-secondary);
    word-break: break-word;
}

.no-comments {
    color: var(--color-text-tertiary);
    font-style: italic;
    font-size: 0.9rem;
    margin-bottom: 1rem;
}

.comment-form {
  display: flex;
  gap: 0.5rem;
}

.comment-form input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.comment-form button {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
}

.comment-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
