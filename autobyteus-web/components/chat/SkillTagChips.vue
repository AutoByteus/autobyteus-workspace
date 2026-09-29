<template>
  <span
    v-for="name in names"
    :key="name"
    class="inline-flex max-w-full items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 py-0.5 pl-1.5 pr-1 text-xs font-medium text-indigo-700"
    :data-test="`chat-skill-chip-${name}`"
  >
    <Icon icon="heroicons:sparkles" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
    <span class="truncate">/{{ name }}</span>
    <button
      type="button"
      class="rounded p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      :aria-label="$t('chat.composer.removeSkill', { name })"
      @click="emit('remove', name)"
    >
      <Icon icon="heroicons:x-mark" class="h-3 w-3" aria-hidden="true" />
    </button>
  </span>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

/** Removable `/skill` chips for the skill tags on a context (the Chat box and the run-view box). */
defineProps<{ names: readonly string[] }>()
const emit = defineEmits<{ (event: 'remove', name: string): void }>()
</script>
