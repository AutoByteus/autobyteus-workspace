<template>
  <button
    type="button"
    @click="$emit('activate')"
    :disabled="disabled"
    :title="label"
    :aria-label="label"
    :aria-busy="busy ? 'true' : undefined"
    class="flex items-center justify-center text-white rounded-full focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      kind === 'interrupt'
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50'
        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50',
      compact ? 'h-8 w-8' : 'p-2',
    ]"
  >
    <Icon v-if="busy" icon="heroicons:arrow-path-solid" :class="[iconSizeClass, 'animate-spin']" />
    <Icon v-else-if="kind === 'interrupt'" icon="heroicons:stop-solid" :class="iconSizeClass" />
    <Icon v-else icon="heroicons:paper-airplane-solid" :class="iconSizeClass" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  kind: 'send' | 'interrupt';
  disabled: boolean;
  /** Overrides the default "Send message" / "Stop generation" title, e.g. a blocking reason. */
  title?: string | null;
  /** Shows a spinner in place of the icon (e.g. while a chat is starting). */
  busy?: boolean;
  /** 32px circle (Chat footer) instead of the run-view 36px button. */
  compact?: boolean;
}>();

defineEmits<{ (event: 'activate'): void }>();

const label = computed(() => props.title
  || (props.kind === 'interrupt' ? 'Stop generation' : 'Send message'));
const iconSizeClass = computed(() => (props.compact ? 'h-4 w-4' : 'h-5 w-5'));
</script>
