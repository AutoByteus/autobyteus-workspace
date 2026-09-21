<template>
  <span class="inline-flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl font-semibold tracking-wide text-slate-700">
    <img v-if="url && failedUrl !== url" :key="url" :src="url" :alt="name" class="h-full w-full object-cover" @error="failedUrl = ($event.target as HTMLImageElement).getAttribute('src') || ''">
    <span v-else>{{ initials }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
const props = defineProps<{ name: string; avatarUrl?: string | null }>()
const url = computed(() => (props.avatarUrl || '').trim())
const failedUrl = ref('')
const initials = computed(() => props.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'AO')
</script>
