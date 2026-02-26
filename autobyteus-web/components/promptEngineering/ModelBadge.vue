<template>
  <span 
    class="inline-flex items-center px-2 py-1 rounded-full text-xs"
    :class="[size === 'small' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1', 
             modelColor]"
  >
    {{ model }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{  model: string;
  size?: 'small' | 'medium';
}>();

// Default to medium size if not specified
const size = computed(() => props.size || 'medium');

// Assign different colors based on model type for better visual distinction
const modelColor = computed(() => {
  const model = props.model.toLowerCase();
  
  if (model === 'default') {
    return 'bg-gray-100 text-gray-800'; // Style for default
  }
  if (model.includes('gpt-4')) {
    return 'bg-green-50 text-green-700'; // GPT-4 models
  } else if (model.includes('gpt')) {
    return 'bg-emerald-50 text-emerald-700'; // Other GPT models
  } else if (model.includes('claude')) {
    return 'bg-purple-50 text-purple-700'; // Claude models
  } else if (model.includes('llama')) {
    return 'bg-orange-50 text-orange-700'; // Llama models
  } else if (model.includes('mistral')) {
    return 'bg-indigo-50 text-indigo-700'; // Mistral models
  } else if (model.includes('o4') || model.includes('o3')) {
    return 'bg-red-50 text-red-700'; // O4/O3 models
  } else {
    return 'bg-blue-50 text-blue-700'; // Default for others
  }
});
</script>
