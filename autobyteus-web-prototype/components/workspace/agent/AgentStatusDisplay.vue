<template>
  <div :class="containerClasses" :title="`Agent Status: ${visuals.text}`">
    <div :class="dotClasses"></div>
    <span :class="textClasses">{{ visuals.text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';
import { useStatusVisuals } from '~/composables/useStatusVisuals';

const props = withDefaults(defineProps<{
  status: string;
  variant?: 'default' | 'compact';
}>(), {
  variant: 'default',
});

const { status, variant } = toRefs(props);
const { visuals } = useStatusVisuals(status);

const containerClasses = computed(() => {
  return variant.value === 'compact'
    ? 'flex items-center gap-1.5'
    : 'flex items-center space-x-2';
});

const dotClasses = computed(() => {
  return [
    variant.value === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3',
    'rounded-full transition-colors duration-300',
    visuals.value.colorClass,
  ];
});

const textClasses = computed(() => {
  return variant.value === 'compact'
    ? 'text-xs text-gray-500 font-medium'
    : 'text-sm text-gray-600 font-medium';
});
</script>
