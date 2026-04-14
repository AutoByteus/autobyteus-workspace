<template>
  <div class="flex h-full w-full flex-col bg-gray-50 text-gray-800">
    <div
      ref="panelSectionsContainerRef"
      data-test="app-left-panel-sections"
      class="min-h-0 flex flex-1 flex-col"
    >
      <section
        ref="primaryNavSectionRef"
        data-test="app-left-panel-primary-nav"
        class="flex-shrink-0 overflow-y-auto bg-white px-2 py-3"
        :style="primaryNavSectionStyle"
      >
        <nav :aria-label="$t('shell.components.AppLeftPanel.primary_navigation')">
          <ul class="space-y-1">
            <li v-for="item in primaryNavItems" :key="item.key" class="relative">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
                :class="[
                  item.key === 'agents' ? 'pr-12' : '',
                  isPrimaryNavActive(item.key)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100',
                ]"
                @click="navigateToPrimary(item.key)"
              >
                <Icon :icon="item.icon" class="h-4 w-4 flex-shrink-0" />
                <span class="truncate">{{ t(item.labelKey) }}</span>
              </button>

              <button
                v-if="item.key === 'agents'"
                type="button"
                class="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-md p-2 transition-colors md:inline-flex"
                :title="$t('shell.components.AppLeftPanel.collapse_left_panel')"
                :class="isPrimaryNavActive(item.key)
                  ? 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'"
                @click.stop="toggleLeftPanel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                </svg>
              </button>
            </li>
          </ul>
        </nav>
      </section>

      <div
        data-test="app-left-panel-section-resize-handle"
        class="left-panel-section-resize-handle"
        @mousedown="initPrimarySectionResize"
      ></div>

      <section class="min-h-0 flex-1 border-b border-gray-200 bg-white">
        <div class="h-full overflow-y-auto">
          <WorkspaceAgentRunsTreePanel
            @run-selected="onRunningRunSelected"
            @run-created="onRunningRunCreated"
          />
        </div>
      </section>
    </div>

    <footer class="flex-shrink-0 bg-white p-2">
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
        :class="isSettingsActive
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-700 hover:bg-gray-100'"
        @click="navigateToSettings"
      >
        <Icon icon="heroicons:cog-6-tooth" class="h-4 w-4 flex-shrink-0" />
        <span class="truncate">{{ $t('shell.navigation.settings') }}</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import WorkspaceAgentRunsTreePanel from '~/components/workspace/history/WorkspaceAgentRunsTreePanel.vue';
import { useAppLeftPanelSectionResize } from '~/composables/useAppLeftPanelSectionResize';
import { useLeftPanel } from '~/composables/useLeftPanel';
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore';

type PrimaryNavKey =
  | 'agents'
  | 'agentTeams'
  | 'applications'
  | 'skills'
  | 'memory'
  | 'media';

const { t } = useLocalization();
const applicationsCapabilityStore = useApplicationsCapabilityStore()

const allPrimaryNavItems: Array<{ key: PrimaryNavKey; labelKey: string; icon: string }> = [
  { key: 'agents', labelKey: 'shell.navigation.agents', icon: 'heroicons:users' },
  { key: 'agentTeams', labelKey: 'shell.navigation.agentTeams', icon: 'heroicons:user-group' },
  { key: 'applications', labelKey: 'shell.navigation.applications', icon: 'heroicons:squares-2x2' },
  { key: 'skills', labelKey: 'shell.navigation.skills', icon: 'heroicons:sparkles' },
  { key: 'memory', labelKey: 'shell.navigation.memory', icon: 'ph:brain' },
  { key: 'media', labelKey: 'shell.navigation.media', icon: 'heroicons:photo' },
];

const primaryNavItems = computed(() => {
  return allPrimaryNavItems.filter((item) => {
    if (item.key === 'applications') {
      return applicationsCapabilityStore.isEnabled
    }
    return true;
  });
});

const route = useRoute();
const router = useRouter();
const { toggleLeftPanel } = useLeftPanel();
const {
  panelSectionsContainerRef,
  primaryNavSectionRef,
  primaryNavSectionStyle,
  initPrimarySectionResize,
} = useAppLeftPanelSectionResize();

const isSettingsActive = computed(() => route.path.startsWith('/settings'));

const resolvePrimaryRoute = (key: PrimaryNavKey): RouteLocationRaw => {
  switch (key) {
    case 'agents':
      return { path: '/agents', query: { view: 'list' } };
    case 'agentTeams':
      return { path: '/agent-teams', query: { view: 'team-list' } };
    case 'applications':
      return '/applications';
    case 'skills':
      return '/skills';
    case 'memory':
      return '/memory';
    case 'media':
      return '/media';
  }
};

const isPrimaryNavActive = (key: PrimaryNavKey): boolean => {
  switch (key) {
    case 'agents':
      return route.path.startsWith('/agents');
    case 'agentTeams':
      return route.path.startsWith('/agent-teams');
    case 'applications':
      return route.path.startsWith('/applications');
    case 'skills':
      return route.path.startsWith('/skills');
    case 'memory':
      return route.path.startsWith('/memory');
    case 'media':
      return route.path.startsWith('/media');
  }
};

const pushRoute = async (target: RouteLocationRaw): Promise<void> => {
  try {
    await router.push(target);
  } catch (error) {
    console.error('AppLeftPanel navigation error:', error);
  }
};

const navigateToPrimary = async (key: PrimaryNavKey): Promise<void> => {
  await pushRoute(resolvePrimaryRoute(key));
};

const navigateToSettings = async (): Promise<void> => {
  await pushRoute('/settings');
};

const onRunningRunSelected = async (): Promise<void> => {
  if (route.path === '/workspace') return;
  await pushRoute('/workspace');
};

const onRunningRunCreated = async (): Promise<void> => {
  if (route.path === '/workspace') return;
  await pushRoute('/workspace');
};

onMounted(() => {
  void applicationsCapabilityStore.ensureResolved().catch(() => undefined)
})
</script>

<style scoped>
.left-panel-section-resize-handle {
  height: 1px;
  padding: 5px 0;
  margin: -5px 0;
  cursor: row-resize;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  background: transparent;
}

.left-panel-section-resize-handle::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  transform: translateY(-50%);
  background-color: #d1d5db;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.left-panel-section-resize-handle:hover::after {
  background-color: #9ca3af;
}

.left-panel-section-resize-handle:active::after {
  background-color: #9ca3af;
}
</style>
