<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Top Section: Background Tasks -->
    <div 
      class="flex flex-col transition-all duration-300 ease-in-out border-b border-gray-200"
      :class="[ expandedSection === 'backgroundTasks' ? 'flex-1 min-h-0' : 'flex-none' ]"
    >
      <BackgroundTaskPanel 
        :collapsed="expandedSection !== 'backgroundTasks'"
        @toggle="toggleSection('backgroundTasks')"
        class="h-full" 
      />
    </div>

    <!-- Bottom Section: Activity Feed (Actions) -->
    <div 
      class="flex flex-col transition-all duration-300 ease-in-out"
      :class="[ expandedSection === 'activity' ? 'flex-1 min-h-0' : 'flex-none' ]"
    >
      <ActivityFeed 
        :collapsed="expandedSection !== 'activity'"
        @toggle="toggleSection('activity')"
        class="h-full"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BackgroundTaskPanel from '~/components/progress/BackgroundTaskPanel.vue';
import ActivityFeed from '~/components/progress/ActivityFeed.vue';

type ProgressSection = 'backgroundTasks' | 'activity';

const expandedSection = ref<ProgressSection | null>('activity');

const toggleSection = (section: ProgressSection) => {
  if (expandedSection.value === section) {
    expandedSection.value = null;
  } else {
    expandedSection.value = section;
  }
};
</script>

<style scoped>
/* No specific scrollbar styles needed here as they are inside the panels */
</style>
