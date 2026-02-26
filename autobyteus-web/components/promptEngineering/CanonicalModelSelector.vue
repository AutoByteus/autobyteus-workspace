<template>
  <div>
    <label class="block text-sm font-medium text-gray-700">Suitable for Models</label>
    
    <div class="relative mt-1" ref="selectorWrapper">
      <!-- Main component container -->
      <div 
        @click="focusInput"
        class="relative w-full cursor-text overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus-within:ring-1 focus-within:ring-blue-500 min-h-[38px] p-2 flex flex-wrap items-center gap-2"
      >
        <!-- Selected Models Badges -->
        <span v-for="model in selectedModels" :key="model" class="inline-flex items-center rounded-full bg-blue-100 py-1 pl-3 pr-2 text-sm font-medium text-blue-700">
          {{ model }}
          <button @click.stop="toggleModelSelection(model, true)" type="button" class="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-red-400 hover:bg-red-200 hover:text-red-500 focus:bg-red-500 focus:text-white focus:outline-none">
            <span class="sr-only">Remove {{ model }}</span>
            <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
              <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
            </svg>
          </button>
        </span>
        
        <!-- Search Input -->
        <input
          ref="searchInput"
          type="text"
          v-model="searchQuery"
          @focus="isModelDropdownOpen = true"
          class="flex-1 border-0 p-0 text-sm text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none bg-transparent min-w-[150px]"
          placeholder="Search or select models..."
        />

        <!-- Clear All Button -->
        <div class="absolute inset-y-0 right-0 flex items-center pr-2">
          <button
            v-if="selectedModels.length > 0"
            @click.stop="clearSelection"
            type="button"
            class="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
            title="Clear selection"
          >
            <span class="sr-only">Clear selection</span>
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"  xmlns="http://www.w3.org/2000/svg" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Dropdown Menu -->
      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isModelDropdownOpen" class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          <ul v-if="filteredModels.length > 0">
            <li v-for="model in filteredModels" :key="model" class="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-blue-50">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :value="model"
                  :checked="selectedModels.includes(model)"
                  @change="toggleModelSelection(model, false)"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-3 block truncate">{{ model }}</span>
              </label>
            </li>
          </ul>
           <div v-else class="px-3 py-2 text-gray-500">
            No models found.
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { storeToRefs } from 'pinia';

const props = defineProps<{  modelValue: string[];
}>();

const emit = defineEmits(['update:modelValue']);

const llmStore = useLLMProviderConfigStore();
const { canonicalModels } = storeToRefs(llmStore);
const isModelDropdownOpen = ref(false);
const searchQuery = ref('');
const selectorWrapper = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

const selectedModels = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const filteredModels = computed(() => {
  if (!searchQuery.value) {
    return canonicalModels.value.filter(m => !selectedModels.value.includes(m));
  }
  return canonicalModels.value.filter(model => 
    !selectedModels.value.includes(model) &&
    model.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

function toggleModelSelection(model: string, fromBadge: boolean) {
  const newSelection = [...selectedModels.value];
  const index = newSelection.indexOf(model);
  if (index > -1) {
    newSelection.splice(index, 1);
  } else {
    newSelection.push(model);
  }
  selectedModels.value = newSelection;
  
  if (!fromBadge) {
    searchQuery.value = '';
    searchInput.value?.focus();
  }
}

function clearSelection() {
  selectedModels.value = [];
  searchQuery.value = '';
  searchInput.value?.focus();
}

function focusInput() {
  searchInput.value?.focus();
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectorWrapper.value && !selectorWrapper.value.contains(event.target as Node)) {
    isModelDropdownOpen.value = false;
  }
};

onMounted(() => {
  if (llmStore.providersWithModels.length === 0) {
    llmStore.fetchProvidersWithModels();
  }
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});
</script>
