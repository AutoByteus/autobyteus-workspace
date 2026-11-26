<template>
  <div class="relative" :class="$attrs.class">
    <label class="sr-only" :for="id">{{ label }}</label>
    <select
      :id="id"
      v-bind="selectAttrs"
      class="w-full appearance-none truncate rounded-md border border-gray-200 bg-white pl-2.5 pr-8 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      :class="size === 'xs' ? 'py-1 text-xs text-gray-700' : 'py-1.5 text-sm text-gray-800'"
    >
      <slot />
    </select>
    <Icon icon="heroicons:chevron-down-20-solid" class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { Icon } from '@iconify/vue';

/**
 * The Memory page's one picker style (autobyteus-608 DC-009): a bordered box with one down arrow, its label for screen
 * readers only. A native select: its options are the slot, and its value, events and data attributes pass through.
 * `sm` (14 px) for a file; `xs` (12 px) for Jump to day. The class given to the picker sizes its box.
 */
defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ id: string; label: string; size?: 'sm' | 'xs' }>(), { size: 'sm' });

const attrs = useAttrs();
const selectAttrs = computed(() => {
  const { class: _wrapperClass, ...rest } = attrs;
  return rest;
});
</script>
