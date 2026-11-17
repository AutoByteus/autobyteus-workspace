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
  /** Background tasks the agent has running (autobyteus-448 DEC-004). */
  backgroundTasksRunning?: number;
  variant?: 'default' | 'compact';
}>(), {
  backgroundTasksRunning: 0,
  variant: 'default',
});

const { status, backgroundTasksRunning, variant } = toRefs(props);
const { visuals } = useStatusVisuals(status, backgroundTasksRunning);

const containerClasses = computed(() => {
  return variant.value === 'compact'
    ? 'flex flex-shrink-0 items-center gap-1.5'
    : 'flex flex-shrink-0 items-center space-x-2';
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
    ? 'whitespace-nowrap text-xs text-gray-500 font-medium'
    : 'whitespace-nowrap text-sm text-gray-600 font-medium';
});
</script>
