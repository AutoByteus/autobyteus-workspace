<template>
  <!-- The 48px bar of a view screen (UIS-004…007) and of an opened file: ← and the title; the right slot is the screen's
       own action (Files' search). -->
  <header class="flex h-12 flex-shrink-0 items-center border-b border-slate-200 bg-white pl-1 pr-1" data-testid="mobile-screen-bar">
    <button
      type="button"
      class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :aria-label="backLabel"
      data-testid="mobile-screen-back"
      @click="$emit('back')"
    >
      <Icon :icon="closeIcon ? 'heroicons:x-mark-20-solid' : 'heroicons:arrow-left-20-solid'" class="h-6 w-6" aria-hidden="true" />
    </button>
    <slot name="title">
      <h1 class="min-w-0 flex-1 truncate px-2 text-base font-semibold text-slate-900" data-testid="mobile-screen-title">{{ title }}</h1>
    </slot>
    <slot name="actions" />
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

withDefaults(defineProps<{ title?: string; backLabel?: string; closeIcon?: boolean }>(), { title: '', backLabel: 'Back', closeIcon: false });
defineEmits<{ (event: 'back'): void }>();
</script>
