<template>
  <div>
    <button
      @click="toggle"
      class="flex items-center justify-between w-full p-2 text-left text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <span>{{ title }}</span>
      <svg
        class="w-5 h-5 transform transition-transform duration-200"
        :class="{ 'rotate-90': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    </button>
    <div v-if="isOpen" class="mt-2 pl-2 pr-1 space-y-2">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{  title: string;
}>();

const isOpen = ref(true);

function toggle() {
  isOpen.value = !isOpen.value;
}
</script>
