<template>
  <div class="flex flex-col">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-lg font-medium text-gray-900">{{ title }}</h2>
      
      <div class="flex items-center space-x-2">
        <button
          v-if="showAddButton"
          @click="$emit('add')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <span class="i-heroicons-plus-20-solid w-4 h-4 mr-1"></span>
          {{ addButtonText }}
        </button>
        <button v-if="showBackButton" @click="$emit('back')" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <span class="i-heroicons-arrow-left-20-solid w-5 h-5 mr-2 -ml-1"></span>
          Back
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="text-center py-8">
      <span class="i-heroicons-arrow-path-20-solid w-8 h-8 text-gray-400 mx-auto animate-spin"></span>
      <p class="text-gray-500 mt-2">Loading tools...</p>
    </div>
    
    <div v-else-if="tools.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ToolCard 
        v-for="tool in tools" 
        :key="tool.name" 
        :tool="tool"
        :source="source"
        @details="$emit('details', tool)"
      />
    </div>

    <div v-else class="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200 flex-1 flex flex-col justify-center items-center">
      <span :class="emptyIcon + ' w-10 h-10 text-gray-400 mx-auto mb-3'"></span>
      <p class="text-gray-500">{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import ToolCard from './ToolCard.vue';
import type { Tool } from '~/stores/toolManagementStore';

interface Props {
  title: string;
  tools: Tool[];
  source: string;
  loading: boolean;
  showBackButton?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  emptyIcon?: string;
  emptyMessage?: string;
}

withDefaults(defineProps<Props>(), {
  showBackButton: false,
  showAddButton: false,
  addButtonText: 'Add',
  emptyIcon: 'i-heroicons-circle-stack-20-solid',
  emptyMessage: 'No tools found.',
});

defineEmits(['details', 'add', 'back']);
</script>
