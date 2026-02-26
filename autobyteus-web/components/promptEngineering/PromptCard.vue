<template>
  <div 
    class="prompt-card bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 group relative flex flex-col h-full"
    :class="{ 'ring-2 ring-blue-500 border-transparent': isSelected }"
  >
    <!-- Hover delete button -->
    <button 
      v-if="showDeleteButton && !isSelectionMode"
      @click.stop="$emit('delete', prompt.id)"
      class="absolute top-3 right-3 p-1.5 rounded-md bg-white/90 backdrop-blur border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 z-10"
      title="Delete prompt"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>

    <div 
      class="p-5 cursor-pointer flex flex-col h-full" 
      @click="$emit('select', prompt.id)"
    >
      <!-- Header Row -->
      <div class="flex items-start gap-3 mb-3">
        <!-- Checkbox for comparison selection -->
        <div v-if="isSelectionMode" class="pt-1">
          <input 
            type="checkbox" 
            :id="`compare-select-${prompt.id}`"
            :checked="isPromptSelectedForCompare"
            @click.stop
            @change.stop="$emit('toggle-compare-selection')"
            class="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        </div>

        <!-- Title and badges in one row -->
        <h3 class="text-lg font-semibold text-gray-900 flex-grow truncate min-w-0">{{ prompt.name }}</h3>
        <span class="flex-shrink-0 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
          v{{ prompt.version }}
        </span>
        <span 
          class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap border"
          :class="prompt.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'"
        >
          {{ prompt.isActive ? 'Active' : 'Inactive' }}
        </span>
      </div>

      <!-- Content Body -->
      <div class="flex-grow mb-4">
        <p v-if="prompt.description" class="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
          {{ prompt.description }}
        </p>
        <!-- Code Preview -->
        <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p class="text-sm text-gray-600 font-mono line-clamp-4 leading-relaxed">{{ prompt.promptContent }}</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="pt-3 mt-auto border-t border-gray-100 flex flex-col gap-3">
        <!-- Model compatibility text instead of bulky badges if too many -->
        <div v-if="prompt.suitableForModels" class="flex flex-wrap gap-1.5">
           <ModelBadge
              v-for="model in modelList"
              :key="model"
              :model="model"
              size="small"
              class="opacity-90 hover:opacity-100 transition-opacity"
            />
        </div>
        
        <div class="flex justify-between items-center text-xs text-gray-400">
          <span class="flex items-center">
             <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
             {{ formatDate(prompt.createdAt) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ModelBadge from '~/components/promptEngineering/ModelBadge.vue';

interface Prompt {
  id: string;
  name: string;
  category: string;
  promptContent: string;
  description?: string | null;
  suitableForModels?: string | null;
  version: number;
  createdAt: string;
  parentPromptId?: string | null;
  isActive: boolean;
}

const props = defineProps<{
  prompt: Prompt;
  isSelected: boolean;
  showDeleteButton?: boolean;
  isSelectionMode?: boolean;
  isPromptSelectedForCompare?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'toggle-compare-selection'): void;
}>();

// Parse models into a list for display
const modelList = computed(() => {
  if (!props.prompt.suitableForModels) return [];
  return props.prompt.suitableForModels.split(',').map(model => model.trim());
});

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
