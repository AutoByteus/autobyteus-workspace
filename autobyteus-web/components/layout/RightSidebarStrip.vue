<template>
  <div class="flex flex-col items-center py-4 bg-white border-l border-gray-200 h-full w-[50px] z-20">
    <div class="flex flex-col space-y-4">
      <button
        v-for="tab in visibleTabs"
        :key="tab.name"
        @click="selectTab(tab.name)"
        class="p-2 rounded-md hover:bg-gray-100 transition-colors relative group"
        :class="{ 'text-blue-600 bg-blue-50': activeTab === tab.name }" 
        :title="tab.label"
      >
        <!-- Icons mapping -->
        <Icon :icon="getIcon(tab.name)" class="w-5 h-5" :class="activeTab === tab.name ? 'text-gray-900' : 'text-gray-500'" />
        
        <!-- Tooltip -->
        <div class="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {{ tab.label }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRightSideTabs, type TabName } from '~/composables/useRightSideTabs';
import { useRightPanel } from '~/composables/useRightPanel';
import { Icon } from '@iconify/vue';

const { visibleTabs, activeTab, setActiveTab } = useRightSideTabs();
const { toggleRightPanel } = useRightPanel();

const selectTab = (tabName: TabName) => {
  setActiveTab(tabName);
  toggleRightPanel(); // Re-open the panel
};

const getIcon = (name: TabName): string => {
  switch (name) {
    case 'files': return 'heroicons:document-text';
    case 'teamMembers': return 'heroicons:user-group';
    case 'terminal': return 'heroicons:command-line';
    case 'vnc': return 'heroicons:computer-desktop';
    case 'progress': return 'heroicons:clock';
    case 'artifacts': return 'heroicons:cube';
    default: return 'heroicons:document-text';
  }
};
</script>

