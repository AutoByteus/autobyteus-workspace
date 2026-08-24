<template>
  <span
    class="h-2 w-2 flex-shrink-0 rounded-full"
    :class="props.isActive ? 'bg-blue-500' : 'bg-gray-400'"
    role="img"
    :aria-label="props.label"
    :title="props.label"
    data-test="team-activity-dot"
    :data-active="String(props.isActive)"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  isActive: boolean;
  label: string;
}>();
</script>
