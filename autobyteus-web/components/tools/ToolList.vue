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
          {{ addButtonText }}
        </button>
        <button v-if="showBackButton" @click="$emit('back')" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          Back
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="text-center py-8">
      <Icon icon="heroicons:arrow-path-20-solid" class="w-8 h-8 text-gray-400 mx-auto animate-spin" />
      <p class="text-gray-500 mt-2">{{ $t('tools.components.tools.ToolList.loading_tools') }}</p>
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
      <p class="text-gray-500">{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
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
  emptyMessage?: string;
}

withDefaults(defineProps<Props>(), {
  showBackButton: false,
  showAddButton: false,
  addButtonText: 'Add',
  emptyMessage: 'No tools found.',
});

defineEmits(['details', 'add', 'back']);
</script>
