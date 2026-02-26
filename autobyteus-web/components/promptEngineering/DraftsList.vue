<template>
  <div class="drafts-list bg-white rounded-lg border p-6 h-full flex flex-col">
    <div class="flex justify-between items-center mb-6 pb-4 border-b">
      <h1 class="text-xl font-semibold text-gray-800">Drafts</h1>
      <span class="text-sm text-gray-500">{{ viewStore.nonEmptyDrafts.length }} {{ viewStore.nonEmptyDrafts.length === 1 ? 'draft' : 'drafts' }}</span>
    </div>

    <!-- Grid Layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-auto pb-4">
      
      <!-- "Create New Draft" Card - Pass 'drafts' origin -->
      <div 
        @click="viewStore.startNewDraft('drafts')"
        class="group relative h-64 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center p-6"
      >
        <div class="h-10 w-10 rounded-full bg-gray-100 group-hover:bg-blue-100 text-gray-400 group-hover:text-blue-600 flex items-center justify-center mb-3 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 class="text-base font-medium text-gray-900 group-hover:text-blue-700">Create New Draft</h3>
      </div>

      <!-- Draft Cards -->
      <div 
        v-for="draft in viewStore.nonEmptyDrafts" 
        :key="draft.id"
        class="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer flex flex-col h-64"
        @click="viewStore.openDraft(draft.id)"
      >
        <!-- Card Header -->
        <div class="p-4 pb-2">
          <div class="flex justify-between items-start mb-2">
             <div class="flex-1 min-w-0 mr-2">
                <h3 class="text-lg font-medium text-gray-900 truncate" :title="draft.name">
                  {{ draft.name || 'Untitled Prompt' }}
                </h3>
             </div>
             <!-- Delete Button -->
             <button 
                @click.stop="viewStore.deleteDraft(draft.id)"
                class="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Draft"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
          </div>
          
          <div class="flex items-center gap-2 mb-2">
            <span 
              v-if="draft.category" 
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              {{ draft.category }}
            </span>
            <span class="text-xs text-gray-500">
              Edited {{ timeAgo(draft.updatedAt) }}
            </span>
          </div>
        </div>

        <!-- Content Preview (Matches PromptCard style) -->
        <div class="px-4 flex-grow overflow-hidden relative">
           <div class="bg-gray-50 rounded p-3 h-full overflow-hidden border border-gray-100">
             <p v-if="draft.promptContent" class="text-sm text-gray-600 font-mono line-clamp-4">
               {{ draft.promptContent }}
             </p>
             <p v-else class="text-sm text-gray-400 italic">
               (Empty content)
             </p>
           </div>
        </div>
        
        <!-- Footer -->
        <div class="p-4 pt-3 flex justify-end">
           <span class="text-sm font-medium text-blue-600 group-hover:underline flex items-center">
             Resume
           </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePromptEngineeringViewStore } from '~/stores/promptEngineeringViewStore';
import { timeAgo } from '~/utils/dateUtils';

const viewStore = usePromptEngineeringViewStore();
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
