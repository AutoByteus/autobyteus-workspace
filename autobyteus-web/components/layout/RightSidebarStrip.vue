<template>
  <div class="flex h-full w-[50px] flex-col items-center border-l border-gray-200 bg-white py-4 z-20">
    <div class="flex flex-col space-y-4">
      <button
        v-for="tab in visibleTabs"
        :key="tab.name"
        type="button"
        @click="selectTab(tab.name)"
        class="p-2 rounded-md hover:bg-gray-100 transition-colors relative group"
        :class="{ 'text-blue-600 bg-blue-50': activeTab === tab.name }"
        :title="tab.label"
      >
        <Icon :icon="getIcon(tab.name)" class="w-5 h-5" :class="activeTab === tab.name ? 'text-gray-900' : 'text-gray-500'" />

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

const props = withDefaults(defineProps<{
  openAsDrawer?: boolean
}>(), {
  openAsDrawer: false,
});

const emit = defineEmits<{
  (event: 'request-open'): void
}>();

const { visibleTabs, activeTab, setActiveTab } = useRightSideTabs();
const { toggleRightPanel, setRightPanelVisible } = useRightPanel();

const selectTab = (tabName: TabName) => {
  setActiveTab(tabName);

  if (props.openAsDrawer) {
    setRightPanelVisible(true);
    emit('request-open');
    return;
  }

  toggleRightPanel();
};

const getIcon = (name: TabName): string => {
  switch (name) {
    case 'files': return 'heroicons:document-text';
    case 'teamMembers': return 'heroicons:user-group';
    case 'terminal': return 'heroicons:command-line';
    case 'vnc': return 'heroicons:computer-desktop';
    case 'progress': return 'heroicons:clock';
    case 'artifacts': return 'heroicons:cube';
    case 'browser': return 'heroicons:globe-alt';
    default: return 'heroicons:document-text';
  }
};
</script>
