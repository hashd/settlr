<script setup lang="ts">
interface Props {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const initials = props.name
  .split(' ')
  .map(n => n[0])
  .slice(0, 2)
  .join('')
  .toUpperCase()

const colors = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635',
  '#34d399', '#22d3d8', '#60a5fa', '#a78bfa',
  '#f472b6', '#fb7185'
]

const colorIndex = props.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
const bgColor = colors[colorIndex]
</script>

<template>
  <div :class="['avatar', `avatar-${size}`]">
    <img 
      v-if="src" 
      :src="src" 
      :alt="name" 
      class="avatar-img"
    />
    <span 
      v-else 
      class="avatar-initials"
      :style="{ backgroundColor: bgColor }"
    >
      {{ initials }}
    </span>
  </div>
</template>

<style scoped>
.avatar {
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-sm {
  width: 28px;
  height: 28px;
  font-size: 0.625rem;
}

.avatar-md {
  width: 36px;
  height: 36px;
  font-size: 0.75rem;
}

.avatar-lg {
  width: 48px;
  height: 48px;
  font-size: 0.875rem;
}

.avatar-xl {
  width: 64px;
  height: 64px;
  font-size: 1.125rem;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
</style>
