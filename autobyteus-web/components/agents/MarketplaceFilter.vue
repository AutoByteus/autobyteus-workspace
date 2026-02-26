<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
    <div class="flex flex-col md:flex-row gap-4">
      <!-- Search Input -->
      <div class="flex-1">
        <input
          v-model="searchQuery"
          @input="emitFilters"
          type="text"
          placeholder="Search agents by name or description..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
      </div>
      
      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <!-- Category Filter -->
        <select
          v-model="categoryFilter"
          @change="emitFilters"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
        
        <!-- Price Type Filter -->
        <select
          v-model="priceFilter"
          @change="emitFilters"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Price Types</option>
          <option value="free">Free</option>
          <option value="one-time">One-time purchase</option>
          <option value="monthly">Monthly subscription</option>
          <option value="yearly">Yearly subscription</option>
          <option value="usage-based">Usage-based pricing</option>
        </select>
        
        <!-- Execution Type Filter -->
        <select
          v-model="executionFilter"
          @change="emitFilters"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Agents</option>
          <option value="local">Locally Runnable</option>
          <option value="p2p">P2P Agents</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAgentsStore } from '~/stores/agents';

// Props
const props = defineProps({
  initialFilters: {
    type: Object,
    default: () => ({ 
      executionType: 'all', 
      searchQuery: '',
      category: 'all',
      priceType: 'all'
    })
  }
});

// Store
const agentsStore = useAgentsStore();

// State
const searchQuery = ref(props.initialFilters.searchQuery || '');
const categoryFilter = ref(props.initialFilters.category || 'all');
const priceFilter = ref(props.initialFilters.priceType || 'all');
const executionFilter = ref(props.initialFilters.executionType || 'all');

// Computed
const categories = computed(() => {
  // Extract unique categories from marketplace agents
  const allCategories = agentsStore.marketplaceAgents.map(agent => agent.category);
  return [...new Set(allCategories)].sort();
});

// Watch for prop changes
watch(() => props.initialFilters, (newFilters) => {
  searchQuery.value = newFilters.searchQuery || '';
  categoryFilter.value = newFilters.category || 'all';
  priceFilter.value = newFilters.priceType || 'all';
  executionFilter.value = newFilters.executionType || 'all';
}, { deep: true });

// Events
const emit = defineEmits(['filter-change']);

function emitFilters() {
  emit('filter-change', {
    searchQuery: searchQuery.value,
    category: categoryFilter.value,
    priceType: priceFilter.value,
    executionType: executionFilter.value
  });
}

// Initialize
onMounted(() => {
  emitFilters();
});
</script>
