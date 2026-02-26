<template>
  <div>
    <!-- Selected Tags & Custom Input -->
    <div class="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-text" @click="focusInput">
      <div class="flex flex-wrap gap-2 items-center">
        <span v-for="tag in modelValue" :key="tag" class="inline-flex items-center py-1 pl-3 pr-2 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800">
          {{ tag }}
          <button type="button" @click.stop="removeTag(tag)" class="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none">
            <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" /></svg>
          </button>
        </span>
      <input
          ref="inputRef"
          type="text"
          v-model="customTag"
          @keydown.enter.prevent="addCustomTag"
          @keydown.delete="handleBackspace"
          :placeholder="modelValue.length > 0 ? '' : placeholder"
          class="flex-grow p-0 border-none focus:ring-0 text-base"
        />
        <button
          v-if="canClearAll"
          type="button"
          @click.stop="clearAll"
          class="flex-shrink-0 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 ml-auto"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Available Tags List -->
    <div class="mt-1 border border-gray-200 rounded-md bg-gray-50 max-h-96 overflow-y-auto">
      <div class="p-2 sticky top-0 bg-gray-50/95 z-10 backdrop-blur-sm">
        <div class="flex items-center gap-2">
          <input type="text" v-model="searchTerm" placeholder="Search available items..." class="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
      </div>

      <div v-if="loading" class="p-4 text-center text-gray-500">Loading...</div>
      
      <!-- Grouped Layout -->
      <div v-else-if="source.type === 'grouped'">
        <details v-for="group in filteredGroups" :key="group.name" class="border-t">
          <summary class="px-4 py-2 cursor-pointer font-medium text-gray-700 hover:bg-gray-100 flex justify-between items-center">
            <span>{{ group.name }}</span>
            <button v-if="group.allowAll" @click.stop.prevent="emitAddAll(group.name)" class="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200">
              Add All
            </button>
          </summary>
          <ul class="px-4 pb-2">
            <li v-for="tag in group.tags" :key="tag" @click="toggleTag(tag)" class="flex justify-between items-center p-2 rounded-md hover:bg-indigo-50 cursor-pointer">
              <span class="text-sm flex items-center">
                {{ tag }}
              </span>
              <span v-if="isSelected(tag)" class="text-xs font-semibold text-red-600">Remove</span>
              <span v-else class="text-xs font-semibold text-green-600">Add</span>
            </li>
          </ul>
        </details>
      </div>

      <!-- Flat Layout -->
      <div v-else-if="source.type === 'flat'">
         <ul class="px-2 pb-2">
            <li v-for="tag in filteredFlatTags" :key="tag" @click="toggleTag(tag)" class="flex justify-between items-center p-2 rounded-md hover:bg-indigo-50 cursor-pointer">
              <span class="text-sm flex items-center">
                {{ tag }}
              </span>
              <span v-if="isSelected(tag)" class="text-xs font-semibold text-red-600">Remove</span>
              <span v-else class="text-xs font-semibold text-green-600">Add</span>
            </li>
            <li v-if="filteredFlatTags.length === 0" class="text-sm text-gray-500 p-2 text-center">No matching items.</li>
          </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface GroupedSource {
  type: 'grouped';
  groups: {
    name: string;
    tags: string[];
    allowAll?: boolean;
  }[];
}

export interface FlatSource {
  type: 'flat';
  tags: string[];
}

const props = defineProps<{
  modelValue: string[];
  source: GroupedSource | FlatSource;
  placeholder?: string;
  loading?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'add-all']);

const customTag = ref('');
const searchTerm = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const isSelected = (tagName: string) => props.modelValue.includes(tagName);

const filteredGroups = computed(() => {
  if (props.source.type !== 'grouped') return [];
  const searchLower = searchTerm.value.toLowerCase();
  
  return props.source.groups
    .map(group => ({
      ...group,
      tags: group.tags.filter(tag => tag.toLowerCase().includes(searchLower))
    }))
    .filter(group => group.tags.length > 0);
});

const filteredFlatTags = computed(() => {
  if (props.source.type !== 'flat') return [];
  const searchLower = searchTerm.value.toLowerCase();
  return props.source.tags.filter(tag => tag.toLowerCase().includes(searchLower));
});

const canClearAll = computed(() => props.modelValue.length > 0);

function toggleTag(tagName: string) {
  const newSelection = [...props.modelValue];
  const index = newSelection.indexOf(tagName);
  if (index > -1) {
    newSelection.splice(index, 1);
  } else {
    newSelection.push(tagName);
  }
  emit('update:modelValue', newSelection);
}

function removeTag(tagName: string) {
  const newSelection = props.modelValue.filter(t => t !== tagName);
  emit('update:modelValue', newSelection);
}

function addCustomTag() {
  const trimmedTag = customTag.value.trim();
  if (trimmedTag && !isSelected(trimmedTag)) {
    emit('update:modelValue', [...props.modelValue, trimmedTag]);
    customTag.value = '';
    searchTerm.value = '';
  }
}

function handleBackspace() {
  if (customTag.value === '' && props.modelValue.length > 0) {
    const lastTag = props.modelValue[props.modelValue.length - 1];
    removeTag(lastTag);
  }
}

function emitAddAll(groupName: string) {
  emit('add-all', groupName);
}

function focusInput() {
  inputRef.value?.focus();
}

function clearAll() {
  emit('update:modelValue', []);
}
</script>
