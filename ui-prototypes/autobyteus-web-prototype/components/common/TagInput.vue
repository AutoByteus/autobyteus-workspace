<template>
  <div class="relative">
    <div 
      class="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-text focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-base"
      @click="openAndFocus"
    >
      <div class="flex flex-wrap gap-2 items-center">
        <span
          v-for="tag in selectedTags"
          :key="tag"
          class="inline-flex items-center py-1 pl-3 pr-2 text-sm font-medium rounded-full"
          :class="isKnownTag(tag) ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
        >
          {{ tag }}
          <button
            type="button"
            @click.stop="removeTag(tag)"
            class="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
          >
            <span class="sr-only">Remove {{ tag }}</span>
            <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
              <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
            </svg>
          </button>
        </span>
        <input
          ref="customInput"
          type="text"
          v-model="customTag"
          @focus="isOpen = true"
          @blur="handleBlur"
          @keydown.enter.prevent="addCustomTag"
          @keydown.,.prevent="addCustomTag"
          @keydown.delete="handleBackspace"
          :placeholder="selectedTags.length > 0 ? '' : placeholder"
          class="flex-grow p-0 border-none focus:ring-0 text-base"
        />
      </div>
    </div>

    <div v-if="isOpen && filteredAvailableTags.length > 0" class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
      <ul>
        <li
          v-for="tag in filteredAvailableTags"
          :key="tag"
          @mousedown.prevent="addTag(tag)"
          class="cursor-pointer select-none relative py-2 pl-4 pr-9 hover:bg-indigo-600 hover:text-white"
        >
          <span class="font-normal block truncate">{{ tag }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps<{  modelValue: string[];
  availableTags: string[];
  placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const customTag = ref('');
const selectedTags = ref<string[]>([...props.modelValue]);
const customInput = ref<HTMLInputElement | null>(null);

watch(() => props.modelValue, (newValue) => {
  selectedTags.value = [...newValue];
});

const isKnownTag = (tag: string) => props.availableTags.includes(tag);

const filteredAvailableTags = computed(() => {
  return props.availableTags.filter(tag => 
    !selectedTags.value.includes(tag) &&
    tag.toLowerCase().includes(customTag.value.toLowerCase())
  );
});

function openAndFocus() {
  isOpen.value = true;
  nextTick(() => {
    customInput.value?.focus();
  });
}

function handleBlur() {
  // Use a timeout to allow click events on the dropdown to fire before closing
  setTimeout(() => {
    addCustomTag();
    isOpen.value = false;
  }, 200);
}

function addTag(tag: string) {
  if (tag && !selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag);
    emit('update:modelValue', selectedTags.value);
  }
  customTag.value = '';
}

function removeTag(tag: string) {
  selectedTags.value = selectedTags.value.filter(t => t !== tag);
  emit('update:modelValue', selectedTags.value);
}

function addCustomTag() {
  const trimmedTag = customTag.value.trim();
  if (trimmedTag) {
    addTag(trimmedTag);
  }
}

function handleBackspace() {
  if (customTag.value === '' && selectedTags.value.length > 0) {
    removeTag(selectedTags.value[selectedTags.value.length - 1]);
  }
}
</script>

<style scoped>
/* Ensure the input inside the tag container doesn't have a background or weird padding */
input {
  background-color: transparent;
  padding-left: 0.25rem;
}
</style>
