<template>
  <div class="flex items-end border-b border-gray-200 bg-white px-1 overflow-x-auto no-scrollbar">
    <Tab 
      v-for="tab in tabs" 
      :key="tab.name" 
      :name="tab.name" 
      :selected="selectedTab === tab.name" 
      @select="selectTab"
    >
      {{ tab.label || tab.name }}
    </Tab>
  </div>
</template>

<script setup lang="ts">
import Tab from "./Tab.vue";

// Define more specific types for props for better type safety and clarity
interface TabInfo {
  name: string;
  label?: string;
}

const props = defineProps<{  tabs: TabInfo[];
  selectedTab: string;
}>();

const emit = defineEmits(["select"]);

const selectTab = (tabName: string) => {
  emit('select', tabName);
};
</script>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}
</style>
