<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

defineProps<{
  modelValue?: string | null
}>()

const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const error = ref('')

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }
  
  // Max size 5MB
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image size must be less than 5MB'
    return
  }

  uploading.value = true
  error.value = ''

  try {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    emit('update:modelValue', publicUrl)
  } catch (e: any) {
    console.error('Upload failed:', e)
    error.value = e.message || 'Upload failed'
  } finally {
    uploading.value = false
    input.value = '' // Reset input
  }
}
</script>

<template>
  <div class="image-upload">
    <div v-if="modelValue" class="preview">
      <img :src="modelValue" alt="Receipt" />
      <button class="remove-btn" @click="emit('update:modelValue', null)" type="button">×</button>
    </div>
    
    <div v-else class="upload-btn-wrapper" :class="{ uploading }">
      <label class="btn-label">
        <span v-if="uploading">Uploading...</span>
        <span v-else>📷 Add Receipt</span>
        <input 
          type="file" 
          accept="image/*" 
          @change="handleFileChange"
          :disabled="uploading"
        />
      </label>
    </div>
    
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.image-upload {
  width: 100%;
}

.preview {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.upload-btn-wrapper {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  text-align: center;
  transition: all 0.2s;
  background: var(--color-bg-secondary);
}

.upload-btn-wrapper:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-50);
}

.btn-label {
  display: block;
  cursor: pointer;
  color: var(--color-text-muted);
  font-weight: 500;
}

.btn-label input {
  display: none;
}

.error {
  color: var(--color-danger);
  font-size: 0.75rem;
  margin-top: 4px;
}
</style>
