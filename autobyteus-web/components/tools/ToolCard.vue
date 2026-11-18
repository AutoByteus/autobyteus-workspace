<template>
  <div 
    class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
    @click="$emit('details', tool)"
  >
    <div class="p-4">
      <h3 class="mb-3 font-medium text-gray-900">{{ tool.name }}</h3>
      <p class="text-sm text-gray-500 mb-4 line-clamp-2">{{ tool.description }}</p>
      <!-- The redundant source badge has been removed from here. -->
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tool } from '~/stores/toolManagementStore';

defineProps<{
  tool: Tool;
  source: string;
}>();

defineEmits(['details']);
</script>
