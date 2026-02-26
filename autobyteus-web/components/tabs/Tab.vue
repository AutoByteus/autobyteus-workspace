<template>
  <button 
    class="tab-button relative px-5 py-3 font-medium text-base transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
    :class="{ 
      'text-blue-600': isActive, 
      'text-gray-600 hover:text-gray-900 hover:bg-gray-50': !isActive 
    }"
    @click="selectTab"
  >
    <slot />
    <!-- Active indicator - thicker blue underline -->
    <span 
      v-if="isActive"
      class="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 rounded-t-sm"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  name: String,
  selected: Boolean,
});

const isActive = computed(() => props.selected);

const emit = defineEmits(["select"]);

const selectTab = () => {
  emit("select", props.name);
};
</script>

<style scoped>
.tab-button {
  /* Smooth hover effect */
  background: transparent;
}

.tab-button:hover:not(.text-blue-600) {
  background: rgba(0, 0, 0, 0.04);
}
</style>

