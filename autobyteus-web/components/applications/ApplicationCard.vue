<template>
  <div
    @click="$emit('launch', application)"
    class="block bg-white rounded-lg border border-gray-200 p-5 transition-all duration-200 hover:shadow-md hover:border-blue-400 cursor-pointer"
  >
    <div>
      <div class="flex items-center mb-2">
        <span class="p-2 bg-blue-100 rounded-md mr-3">
          <span class="i-heroicons-squares-plus-20-solid w-5 h-5 text-blue-600"></span>
        </span>
        <h3 class="font-semibold text-base text-gray-800">{{ application.name }}</h3>
      </div>
      <p class="text-sm text-gray-600 mt-1 h-10 line-clamp-2">{{ application.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ListApplicationsQuery } from '~/generated/graphql';

type Application = ListApplicationsQuery['listApplications'][0];

defineProps<{
  application: Application;
}>();

defineEmits<{
  (e: 'launch', app: Application): void;
}>();
</script>
