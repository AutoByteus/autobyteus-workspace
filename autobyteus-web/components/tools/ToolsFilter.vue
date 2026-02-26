<template>
  <div class="mb-6">
    <div class="flex flex-col md:flex-row gap-4">
      <!-- Search Input -->
      <div class="flex-grow">
        <label for="search" class="sr-only">Search</label>
        <div class="relative">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span class="i-heroicons-magnifying-glass-20-solid text-gray-400 w-5 h-5" aria-hidden="true" />
          </div>
          <input
            type="text"
            v-model="searchQuery"
            name="search"
            id="search"
            class="block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            placeholder="Search by name or description..."
          />
        </div>
      </div>

      <!-- Category Filter -->
      <div v-if="showCategoryFilter" class="flex-shrink-0">
        <label for="category-filter" class="sr-only">Filter by Category</label>
        <select
          id="category-filter"
          v-model="selectedCategory"
          class="block w-full md:w-auto rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        >
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const searchQuery = defineModel('searchQuery', { type: String, default: '' });
const selectedCategory = defineModel('selectedCategory', { type: String, default: 'all' });

defineProps<{  categories?: string[];
  showCategoryFilter?: boolean;
}>();
</script>
