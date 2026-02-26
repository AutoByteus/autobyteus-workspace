<template>
  <div class="flex items-center space-x-2" :title="`Agent Status: ${visuals.text}`">
    <div :class="['w-3 h-3 rounded-full transition-colors duration-300', visuals.colorClass]"></div>
    <span class="text-sm text-gray-600 font-medium">{{ visuals.text }}</span>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { useStatusVisuals } from '~/composables/useStatusVisuals';

const props = defineProps<{  status: string;
}>();

const { status } = toRefs(props);
const { visuals } = useStatusVisuals(status);
</script>
