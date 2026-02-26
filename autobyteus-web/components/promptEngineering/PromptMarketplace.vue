<template>
  <div class="prompt-marketplace">
    <!-- Prompt Comparison View (Modal) -->
    <PromptCompare
      v-if="comparisonMode"
      :promptIds="selectedPromptsForComparison"
      :promptCategory="comparisonCategory"
      :promptName="comparisonName"
      @close="exitComparisonMode"
    />
    
    <!-- Header with title and controls -->
    <div class="flex flex-col gap-4 mb-4">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold text-gray-900 tracking-tight">Prompts</h2>
        <div class="flex items-center gap-2">
          <button
            @click="handleReload"
            class="flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
            :class="[
              reloading ? 'opacity-75 cursor-not-allowed' : '',
            ]"
            :disabled="reloading || loading"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" :class="{'animate-spin': reloading}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ reloading ? 'Reloading...' : 'Reload' }}
          </button>
          <!-- Update: Pass 'marketplace' as origin -->
          <button
            @click="viewStore.startNewDraft('marketplace')"
            class="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Prompt
          </button>
        </div>
      </div>
      
      <!-- Filter and Group Controls -->
      <div class="flex flex-wrap items-center gap-4">
        <!-- Search Input -->
        <div class="relative flex-grow" style="min-width: 200px;">
          <label for="prompt-search" class="sr-only">Search Prompts</label>
          <div class="relative group">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg class="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
              </svg>
            </div>
            <input
              id="prompt-search"
              v-model="searchQuery"
              type="text"
              class="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              placeholder="Search name, category, content..."
            />
          </div>
        </div>
        
        <!-- Category Filter Dropdown -->
        <div class="relative min-w-[200px]">
          <label for="categoryFilter" class="sr-only">Filter by Category</label>
          <div class="relative">
            <select
              id="categoryFilter"
              v-model="selectedCategoryFilter"
              class="block w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              <option v-for="category in uniqueCategories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
               <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <!-- Prompt Name Filter Dropdown -->
        <div class="relative min-w-[200px]">
          <label for="promptNameFilter" class="sr-only">Filter by Name</label>
           <div class="relative">
             <select
              id="promptNameFilter"
              v-model="selectedPromptNameFilter"
              :disabled="!selectedCategoryFilter"
              class="block w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">All Names</option>
              <option v-for="name in promptNamesInCategory" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
               <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        
        <!-- View Toggle -->
        <div class="relative">
          <label class="sr-only">View</label>
          <div class="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button 
              @click="viewMode = 'grid'"
              class="p-1.5 rounded-md transition-all"
              :class="viewMode === 'grid' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              title="Grid View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button 
              @click="viewMode = 'compact'"
              class="p-1.5 rounded-md transition-all"
              :class="viewMode === 'compact' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              title="Compact View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Result Message -->
    <div v-if="deleteResult" class="mb-6">
      <div 
        class="p-4 rounded-lg" 
        :class="deleteResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg v-if="deleteResult.success" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium">{{ deleteResult.message }}</p>
          </div>
          <div class="ml-auto pl-3">
            <div class="-mx-1.5 -my-1.5">
              <button 
                @click="clearDeleteResult"
                class="inline-flex bg-transparent rounded-md p-1.5"
                :class="deleteResult.success ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'"
              >
                <span class="sr-only">Dismiss</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Prompt</h3>
        <p class="text-gray-700 mb-6">Are you sure you want to delete this prompt? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button 
            @click="cancelDelete" 
            class="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            @click="confirmDelete" 
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading || reloading" class="grid place-items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-red-500 text-center py-8">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="Object.keys(promptsGroupedByCategoryAndName).length === 0" class="text-center py-16">
      <div class="text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p class="text-lg font-medium mb-2">No prompts found</p>
        <p class="text-gray-400">
          {{ prompts.length === 0 ? "No prompts available yet" : "Try changing your filter settings" }}
        </p>
      </div>
    </div>
    
    <!-- Main View (Group by Category with Variant Sub-groups) -->
    <div v-else class="space-y-8">
      <div 
        v-for="(promptGroups, category) in promptsGroupedByCategoryAndName" 
        :key="category"
      >
        <h3 v-if="category !== 'Uncategorized'" class="text-xl font-semibold text-gray-800 mb-4">{{ category }}</h3>
        
        <div class="space-y-6">
          <div v-for="(variants, groupKey) in promptGroups" :key="groupKey">
            <!-- Sub-header for Prompt Name (for compact view) - only show when multiple variants -->
            <div v-if="viewMode === 'compact' && variants.length > 1" class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-medium text-gray-900">{{ variants[0]?.name }}</h4>
              <button 
                v-if="variants.length > 1"
                @click="startCompareMode(groupKey, variants)"
                class="flex items-center px-3 py-1 text-sm rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Compare Variants
              </button>
            </div>
            
            <!-- Compare Selection Bar -->
            <div v-if="isSelectingForComparison(groupKey)" class="mb-4 bg-blue-50 p-3 rounded-lg">
              <div class="flex justify-between items-center">
                <p class="text-sm text-blue-700">
                  <span class="font-medium">Select prompts to compare:</span> 
                  {{ selectedPromptsForComparison.length }} selected
                </p>
                <div class="flex gap-2">
                  <button 
                    @click="cancelComparisonSelection"
                    class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    @click="confirmComparisonSelection"
                    :disabled="selectedPromptsForComparison.length < 2"
                    class="px-3 py-1 text-sm rounded-md"
                    :class="[
                      selectedPromptsForComparison.length < 2 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    ]"
                  >
                    Compare Selected
                  </button>
                </div>
              </div>
            </div>

            <!-- Grid of variants -->
            <div :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'">
              <!-- Grid-specific header - only show when multiple variants -->
              <div 
                v-if="viewMode === 'grid' && variants.length > 1 && (!selectedPromptNameFilter || variants.length > 1)"
                class="col-span-1 md:col-span-2 flex items-center justify-between"
              >
                <h4 v-if="!selectedPromptNameFilter" class="text-lg font-medium text-gray-900">{{ variants[0]?.name }}</h4>
                <button 
                  v-if="variants.length > 1"
                  @click="startCompareMode(groupKey, variants)"
                  class="flex items-center px-3 py-1 text-sm rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  :class="{ 'ml-auto': selectedPromptNameFilter }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Compare Variants
                </button>
              </div>

              <PromptCard
                v-for="variant in variants"
                :key="variant.id"
                :prompt="variant"
                :isSelected="selectedPromptId === variant.id"
                :showDeleteButton="!isSelectingForComparison(groupKey)"
                :isSelectionMode="isSelectingForComparison(groupKey)"
                :isPromptSelectedForCompare="selectedPromptsForComparison.includes(variant.id)"
                @select="isSelectingForComparison(groupKey) ? togglePromptSelection(variant.id) : viewStore.showPromptDetails(variant.id)"
                @delete="openDeleteConfirm(variant.id)"
                @toggle-compare-selection="togglePromptSelection(variant.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, onBeforeUnmount, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePromptStore } from '~/stores/promptStore';
import { usePromptEngineeringViewStore } from '~/stores/promptEngineeringViewStore';
import PromptCard from '~/components/promptEngineering/PromptCard.vue';
import PromptCompare from '~/components/promptEngineering/PromptCompare.vue';

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

defineProps<{ selectedPromptId: string | null }>();
defineEmits<{ (e: 'select-prompt', id: string): void }>();

const promptStore = usePromptStore();
const viewStore = usePromptEngineeringViewStore();
const { prompts, loading, error, deleteResult } = storeToRefs(promptStore);

// Search and filter state - PERSISTED IN PINIA STORE
const { 
  marketplaceSearchQuery: searchQuery, 
  marketplaceCategoryFilter: selectedCategoryFilter, 
  marketplaceNameFilter: selectedPromptNameFilter, 
  marketplaceViewMode: viewMode 
} = storeToRefs(viewStore);

// Local loading state for the reload button
const reloading = ref(false);

// Base UI state
const showDeleteConfirm = ref(false);
const promptToDelete = ref<string | null>(null);

// Comparison mode state
const comparisonMode = ref(false);
const currentComparisonGroup = ref<string | null>(null);
const selectedPromptsForComparison = ref<string[]>([]);
const comparisonCategory = ref('');
const comparisonName = ref('');

// Timers for auto-dismissing notifications
let deleteNotificationTimer: number | null = null;

// When category changes, reset the prompt name filter
watch(selectedCategoryFilter, () => {
  selectedPromptNameFilter.value = '';
});

const promptNamesInCategory = computed(() => {
  if (!selectedCategoryFilter.value) {
    return [];
  }
  const names = new Set<string>();
  prompts.value
    .filter(p => (p.category || 'Uncategorized') === selectedCategoryFilter.value)
    .forEach(p => names.add(p.name));
  return Array.from(names).sort();
});

const filteredPrompts = computed(() => {
  let filtered = prompts.value;

  // 1. Filter by category
  if (selectedCategoryFilter.value) {
    if (selectedCategoryFilter.value === 'Uncategorized') {
      filtered = filtered.filter(p => !p.category);
    } else {
      filtered = filtered.filter(p => p.category === selectedCategoryFilter.value);
    }
  }

  // 2. Filter by prompt name
  if (selectedPromptNameFilter.value) {
    filtered = filtered.filter(p => p.name === selectedPromptNameFilter.value);
  }
  
  // 3. Filter by search query
  if (searchQuery.value.trim()) {
    const lowerCaseQuery = searchQuery.value.trim().toLowerCase();
    filtered = filtered.filter(prompt => 
      prompt.name.toLowerCase().includes(lowerCaseQuery) ||
      (prompt.description?.toLowerCase().includes(lowerCaseQuery) || false) ||
      prompt.promptContent.toLowerCase().includes(lowerCaseQuery) ||
      (prompt.category?.toLowerCase().includes(lowerCaseQuery) || false)
    );
  }
  
  return filtered;
});

// Grouping logic for Name & Category view
const groupedPrompts = computed(() => {
  const groups: Record<string, Prompt[]> = {};
  
  filteredPrompts.value.forEach(prompt => {
    const key = `${prompt.name}::${prompt.category || 'Uncategorized'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(prompt);
  });

  const processedGroups: Record<string, Prompt[]> = {};
  for (const key in groups) {
    const promptList = groups[key];
    
    // Group prompts by suitableForModels to handle variants
    const promptsByModels = new Map<string, Prompt[]>();
    promptList.forEach(p => {
        const modelsKey = p.suitableForModels || 'None';
        if (!promptsByModels.has(modelsKey)) {
            promptsByModels.set(modelsKey, []);
        }
        promptsByModels.get(modelsKey)!.push(p);
    });

    // For each model group, find the active prompt, or fall back to the latest version
    const variants: Prompt[] = [];
    for (const modelPrompts of promptsByModels.values()) {
        if (modelPrompts.length === 0) continue;

        let chosenPrompt = modelPrompts.find(p => p.isActive);
        if (!chosenPrompt) {
            chosenPrompt = modelPrompts.reduce((latest, current) => {
                return current.version > latest.version ? current : latest;
            });
        }
        variants.push(chosenPrompt);
    }
    
    if (variants.length > 0) {
      processedGroups[key] = variants.sort((a, b) => b.version - a.version);
    }
  }

  return processedGroups;
});

const promptsGroupedByCategoryAndName = computed(() => {
  const result: Record<string, Record<string, Prompt[]>> = {};

  for (const groupKey in groupedPrompts.value) {
    const variants = groupedPrompts.value[groupKey];
    if (variants.length > 0) {
      const category = variants[0]?.category || 'Uncategorized';
      if (!result[category]) {
        result[category] = {};
      }
      result[category][groupKey] = variants;
    }
  }
  return result;
});


const uniqueCategories = computed(() => {
  const categories = new Set<string>();
  prompts.value.forEach(p => categories.add(p.category || 'Uncategorized'));
  return Array.from(categories).sort();
});

// Functions
const handleReload = async () => {
  reloading.value = true;
  try {
    await promptStore.reloadPrompts();
  } catch(e) { console.error("Failed to reload prompts:", e); } 
  finally { reloading.value = false; }
};

const openDeleteConfirm = (id: string) => {
  promptToDelete.value = id;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  promptToDelete.value = null;
  showDeleteConfirm.value = false;
};

const confirmDelete = async () => {
  if (promptToDelete.value) {
    const result = await promptStore.deletePrompt(promptToDelete.value);
    if (result) {
      if (deleteNotificationTimer) clearTimeout(deleteNotificationTimer);
      deleteNotificationTimer = window.setTimeout(() => promptStore.clearDeleteResult(), 5000);
    }
  }
  cancelDelete();
};

const clearDeleteResult = () => {
  if (deleteNotificationTimer) clearTimeout(deleteNotificationTimer);
  promptStore.clearDeleteResult();
};

// Comparison Mode Functions
const isSelectingForComparison = (groupKey: string) => {
  return currentComparisonGroup.value === groupKey;
}

const startCompareMode = (groupKey: string, variants: Prompt[]) => {
  currentComparisonGroup.value = groupKey;
  // Pre-select the top two variants if available
  selectedPromptsForComparison.value = variants.slice(0, 2).map(p => p.id);
};

const cancelComparisonSelection = () => {
  currentComparisonGroup.value = null;
  selectedPromptsForComparison.value = [];
};

const confirmComparisonSelection = () => {
  if (selectedPromptsForComparison.value.length < 2) return;
  if (!currentComparisonGroup.value) return;
  
  const [name, category] = currentComparisonGroup.value.split('::');
  comparisonName.value = name;
  comparisonCategory.value = category === 'Uncategorized' ? '' : category;
  comparisonMode.value = true;
};

const exitComparisonMode = () => {
  comparisonMode.value = false;
  cancelComparisonSelection();
};

const togglePromptSelection = (id: string) => {
  const index = selectedPromptsForComparison.value.indexOf(id);
  if (index > -1) {
    selectedPromptsForComparison.value.splice(index, 1);
  } else {
    selectedPromptsForComparison.value.push(id);
  }
};

onMounted(() => {
  promptStore.fetchPrompts(null);
});

onBeforeUnmount(() => {
  if (deleteNotificationTimer) clearTimeout(deleteNotificationTimer);
});
</script>

<style scoped>
.prompt-marketplace {
  padding: 2rem;
}
</style>
