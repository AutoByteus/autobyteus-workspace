<template>
  <div
    data-test="workspace-right-tool-strip-surface"
    :data-strip-behavior="stripBehavior"
    :data-strip-activation="stripActivation"
    :class="stripClasses"
  >
    <div class="flex flex-col space-y-4">
      <button
        v-for="tab in visibleTabs"
        :key="tab.name"
        type="button"
        :data-tab-name="tab.name"
        @click="selectTab(tab.name, $event)"
        class="p-2 rounded-md hover:bg-gray-100 transition-colors relative group"
        :class="{ 'text-blue-600 bg-blue-50': activeTab === tab.name }"
        :title="tab.label"
        :aria-label="tab.label"
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
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { rememberDrawerTrigger } from '~/composables/useAccessibleDrawer';
import type { StripBehavior, StripActivation } from '~/utils/layout/responsiveLayoutPolicy';

const props = withDefaults(defineProps<{
  stripBehavior?: StripBehavior
  stripActivation: StripActivation
}>(), {
  stripBehavior: 'consuming',
});

const emit = defineEmits<{
  (event: 'request-open'): void
  (event: 'request-redock'): void
}>();

const { visibleTabs, activeTab, setActiveTab } = useRightSideTabs();

const stripClasses = computed(() =>
  'relative flex h-full w-[50px] flex-none flex-col items-center border-l border-gray-200 bg-white py-4',
);

const selectTab = (tabName: TabName, event: MouseEvent) => {
  setActiveTab(tabName);

  if (props.stripActivation === 'redock-panel') {
    emit('request-redock');
    return;
  }

  if (props.stripActivation === 'open-drawer') {
    const trigger = event.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : document.activeElement;
    rememberDrawerTrigger(trigger);
    emit('request-open');
    return;
  }
};

const getIcon = (name: TabName): string => {
  switch (name) {
    case 'files': return 'heroicons:document-text';
    case 'teamMembers': return 'heroicons:user-group';
    case 'terminal': return 'heroicons:command-line';
    case 'vnc': return 'heroicons:computer-desktop';
    case 'progress': return 'heroicons:clock';
    case 'usage': return 'heroicons:chart-bar';
    case 'artifacts': return 'heroicons:cube';
    case 'browser': return 'heroicons:globe-alt';
    default: return 'heroicons:document-text';
  }
};
</script>
