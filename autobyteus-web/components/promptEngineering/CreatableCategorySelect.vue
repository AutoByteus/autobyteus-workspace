<template>
  <div>
    <label for="prompt-category" class="block text-sm font-medium text-gray-700">Category</label>
    <div class="relative mt-1" ref="wrapperRef">
      <!-- Input field -->
      <input
        ref="inputRef"
        id="prompt-category"
        type="text"
        v-model="inputValue"
        @focus="handleFocus"
        @input="handleInput"
        @keydown.enter.prevent="handleEnter"
        @keydown.escape="closeDropdown"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        :placeholder="placeholder"
        autocomplete="off"
      />
      
      <!-- Dropdown chevron -->
      <button 
        type="button"
        @click="toggleDropdown"
        class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
      >
        <svg class="w-5 h-5 transition-transform" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown menu -->
      <transition 
        leave-active-class="transition ease-in duration-100" 
        leave-from-class="opacity-100" 
        leave-to-class="opacity-0"
      >
        <ul 
          v-if="isOpen && (filteredCategories.length > 0 || canCreateNew)"
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
        >
          <!-- Existing categories -->
          <li 
            v-for="(category, index) in filteredCategories" 
            :key="category"
            @click="selectCategory(category)"
            @mouseenter="highlightedIndex = index"
            class="relative cursor-pointer select-none py-2 pl-3 pr-9"
            :class="{
              'bg-blue-50 text-blue-900': highlightedIndex === index,
              'text-gray-900': highlightedIndex !== index
            }"
          >
            <span class="block truncate" :class="{ 'font-semibold': modelValue === category }">
              {{ category }}
            </span>
            <!-- Checkmark for selected -->
            <span 
              v-if="modelValue === category"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </span>
          </li>

          <!-- Create new option -->
          <li 
            v-if="canCreateNew"
            @click="createNewCategory"
            @mouseenter="highlightedIndex = filteredCategories.length"
            class="relative cursor-pointer select-none py-2 pl-3 pr-9 border-t border-gray-100"
            :class="{
              'bg-green-50 text-green-900': highlightedIndex === filteredCategories.length,
              'text-gray-700': highlightedIndex !== filteredCategories.length
            }"
          >
            <span class="flex items-center gap-2">
              <svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create "<strong>{{ inputValue.trim() }}</strong>"</span>
            </span>
          </li>

          <!-- No matches message -->
          <li 
            v-if="filteredCategories.length === 0 && !canCreateNew && inputValue.trim()"
            class="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-500"
          >
            No categories found
          </li>
        </ul>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAgentDefinitionOptionsStore } from '~/stores/agentDefinitionOptionsStore';
import { storeToRefs } from 'pinia';

const props = withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
}>(), {
  placeholder: 'Select or create a category...'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Store
const optionsStore = useAgentDefinitionOptionsStore();
const { promptCategories } = storeToRefs(optionsStore);

// Local state
const inputValue = ref(props.modelValue);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const wrapperRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

// Computed: Extract category names from promptCategories
const categoryNames = computed(() => {
  return promptCategories.value.map(pc => pc.category);
});

// Computed: Filter categories based on input
const filteredCategories = computed(() => {
  if (!inputValue.value.trim()) {
    return categoryNames.value;
  }
  const searchTerm = inputValue.value.toLowerCase().trim();
  return categoryNames.value.filter(cat => 
    cat.toLowerCase().includes(searchTerm)
  );
});

// Computed: Can create new category?
const canCreateNew = computed(() => {
  const trimmed = inputValue.value.trim();
  if (!trimmed) return false;
  // Only show "create" if no exact match exists (case-insensitive)
  const exactMatch = categoryNames.value.some(
    cat => cat.toLowerCase() === trimmed.toLowerCase()
  );
  return !exactMatch;
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal;
});

// Sync inputValue to modelValue
watch(inputValue, (newVal) => {
  emit('update:modelValue', newVal);
});

// Fetch categories on mount if not loaded
onMounted(() => {
  if (promptCategories.value.length === 0) {
    optionsStore.fetchAllAvailableOptions();
  }
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});

function handleClickOutside(event: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
}

function handleFocus() {
  isOpen.value = true;
  highlightedIndex.value = -1;
}

function handleInput() {
  isOpen.value = true;
  highlightedIndex.value = -1;
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    inputRef.value?.focus();
    highlightedIndex.value = -1;
  }
}

function closeDropdown() {
  isOpen.value = false;
  highlightedIndex.value = -1;
}

function selectCategory(category: string) {
  inputValue.value = category;
  closeDropdown();
}

function createNewCategory() {
  // The inputValue is already set, just close dropdown
  closeDropdown();
}

function handleEnter() {
  if (highlightedIndex.value >= 0) {
    if (highlightedIndex.value < filteredCategories.value.length) {
      selectCategory(filteredCategories.value[highlightedIndex.value]);
    } else if (canCreateNew.value) {
      createNewCategory();
    }
  } else if (canCreateNew.value) {
    createNewCategory();
  } else if (filteredCategories.value.length === 1) {
    selectCategory(filteredCategories.value[0]);
  }
}

function navigateDown() {
  const maxIndex = filteredCategories.value.length + (canCreateNew.value ? 1 : 0) - 1;
  if (highlightedIndex.value < maxIndex) {
    highlightedIndex.value++;
  }
}

function navigateUp() {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--;
  }
}
</script>
