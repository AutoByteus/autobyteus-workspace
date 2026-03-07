<template>
  <div class="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
      :class="mode === option.value
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'"
      @click="$emit('update:mode', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { TeamWorkspaceViewMode } from '~/stores/teamWorkspaceViewStore';

defineProps<{
  mode: TeamWorkspaceViewMode;
}>();

defineEmits<{
  (e: 'update:mode', mode: TeamWorkspaceViewMode): void;
}>();

const options: { value: TeamWorkspaceViewMode; label: string }[] = [
  { value: 'focus', label: 'Focus' },
  { value: 'grid', label: 'Grid' },
  { value: 'spotlight', label: 'Spotlight' },
];
</script>
