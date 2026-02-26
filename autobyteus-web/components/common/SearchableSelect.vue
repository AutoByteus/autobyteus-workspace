<template>
  <div>
    <div class="relative" ref="wrapperRef">
      <!-- Display Button -->
      <button
        @click="toggleDropdown"
        :disabled="disabled || loading"
        type="button"
        class="px-3 py-2.5 text-sm text-left border border-gray-300 rounded-md bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200 flex items-center justify-between w-full"
        :class="{ 'cursor-not-allowed opacity-50 bg-gray-100': disabled || loading }"
      >
        <div v-if="loading" class="flex items-center text-gray-500">
          <span class="i-heroicons-arrow-path-20-solid w-4 h-4 animate-spin mr-2"></span>
          Loading...
        </div>
        <div v-else-if="selectedItem" class="flex items-center min-w-0 flex-1">
          <span class="i-heroicons-folder-20-solid w-5 h-5 text-blue-500 mr-2 flex-shrink-0"></span>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-gray-900 truncate">{{ selectedItem.name }}</div>
            <div v-if="selectedItem.description" class="text-xs text-gray-500 truncate">{{ selectedItem.description }}</div>
          </div>
        </div>
        <span v-else class="text-gray-500">{{ placeholder }}</span>
        
        <svg class="w-4 h-4 ml-2 text-gray-400 flex-shrink-0 transform transition-transform" 
            :class="{ 'rotate-180': isOpen }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
    </div>

    <!-- Dropdown Popover (Teleported) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverRef"
        :style="popoverStyle"
        class="bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col"
      >
        <!-- Search Input -->
        <div class="p-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
          <div class="relative">
            <span class="i-heroicons-magnifying-glass-20-solid w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"></span>
            <input
              ref="searchInputRef"
              v-model="searchTerm"
              type="text"
              :placeholder="searchPlaceholder"
              class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>
        </div>

        <!-- Options List -->
        <div class="flex-grow overflow-y-auto">
          <!-- Empty State -->
          <div v-if="filteredOptions.length === 0" class="p-6 text-center">
            <span class="i-heroicons-folder-open-20-solid w-10 h-10 text-gray-300 mx-auto mb-2"></span>
            <p class="text-sm text-gray-500">{{ emptyMessage }}</p>
          </div>

          <!-- Options -->
          <ul v-else class="py-1">
            <li
              v-for="item in filteredOptions"
              :key="item.id"
              @click="selectItem(item.id)"
              class="px-3 py-2.5 cursor-pointer transition-colors duration-150 flex items-center hover:bg-blue-50"
              :class="{ 'bg-blue-50 border-l-2 border-l-blue-500': modelValue === item.id }"
            >
              <span class="i-heroicons-folder-20-solid w-5 h-5 mr-3 flex-shrink-0"
                    :class="modelValue === item.id ? 'text-blue-600' : 'text-gray-400'"></span>
              <div class="min-w-0 flex-1">
                <div class="font-medium text-sm truncate"
                     :class="modelValue === item.id ? 'text-blue-700' : 'text-gray-900'">
                  {{ item.name }}
                </div>
                <div v-if="item.description" class="text-xs text-gray-500 truncate mt-0.5">
                  {{ item.description }}
                </div>
              </div>
              <svg v-if="modelValue === item.id" 
                   class="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, reactive } from 'vue';

export interface SelectOption {
  id: string;
  name: string;
  description?: string;
}

const props = withDefaults(defineProps<{
  modelValue: string | null;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
}>(), {
  placeholder: 'Select an option',
  searchPlaceholder: 'Search...',
  loading: false,
  disabled: false,
  emptyMessage: 'No options found.',
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const searchTerm = ref('');
const wrapperRef = ref<HTMLDivElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const popoverRef = ref<HTMLDivElement | null>(null);

const popoverStyle = reactive({
  position: 'fixed' as const,
  top: 'auto',
  bottom: 'auto',
  left: '0px',
  width: 'auto',
  zIndex: 9999,
});

const updatePopoverPosition = () => {
  if (!isOpen.value || !wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();

  const popoverMaxHeight = 320;
  const popoverHeight = Math.min(popoverRef.value?.scrollHeight || popoverMaxHeight, popoverMaxHeight);

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  popoverStyle.left = `${rect.left}px`;
  popoverStyle.width = `${rect.width}px`;
  
  popoverStyle.top = 'auto';
  popoverStyle.bottom = 'auto';

  if (spaceBelow < popoverHeight + 8 && spaceAbove > spaceBelow) {
    popoverStyle.bottom = `${window.innerHeight - rect.top + 4}px`;
  } else {
    popoverStyle.top = `${rect.bottom + 4}px`;
  }
};

const filteredOptions = computed(() => {
  if (!searchTerm.value) {
    return props.options;
  }
  const searchLower = searchTerm.value.toLowerCase();
  return props.options.filter(item => 
    item.name.toLowerCase().includes(searchLower) ||
    item.id.toLowerCase().includes(searchLower) ||
    (item.description?.toLowerCase().includes(searchLower))
  );
});

const selectedItem = computed(() => {
  if (!props.modelValue) return null;
  return props.options.find(item => item.id === props.modelValue) || null;
});

const toggleDropdown = () => {
  if (props.disabled || props.loading) return;
  isOpen.value = !isOpen.value;
};

const selectItem = (itemId: string) => {
  emit('update:modelValue', itemId);
  isOpen.value = false;
  searchTerm.value = '';
};

const handleClickOutside = (event: MouseEvent) => {
  if (
    isOpen.value &&
    wrapperRef.value && !wrapperRef.value.contains(event.target as Node) &&
    popoverRef.value && !popoverRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false;
  }
};

watch(isOpen, (newValue) => {
  if (newValue) {
    nextTick(() => {
      updatePopoverPosition();
      searchInputRef.value?.focus();
      window.addEventListener('scroll', updatePopoverPosition, true);
      window.addEventListener('resize', updatePopoverPosition);
    });
  } else {
    searchTerm.value = '';
    window.removeEventListener('scroll', updatePopoverPosition, true);
    window.removeEventListener('resize', updatePopoverPosition);
  }
});

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('scroll', updatePopoverPosition, true);
  window.removeEventListener('resize', updatePopoverPosition);
});
</script>
