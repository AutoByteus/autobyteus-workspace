<template>
  <span
    class="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
    :class="{
      'bg-green-50 text-green-700 ring-1 ring-green-200': state === 'done',
      'bg-blue-600 text-white': state === 'active',
      'bg-slate-100 text-slate-500': state === 'upcoming',
    }"
    aria-hidden="true"
  >
    <Icon v-if="state === 'done'" icon="heroicons:check" class="h-4 w-4" />
    <template v-else>{{ number }}</template>
  </span>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{ number: number; state: 'done' | 'active' | 'upcoming' }>()
</script>
