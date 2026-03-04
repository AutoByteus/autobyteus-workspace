<template>
  <div class="flex h-full w-[50px] flex-col items-center border-r border-gray-200 bg-white py-4 text-gray-500">
    <div class="flex flex-col space-y-2">
      <button
        v-for="item in primaryNavItems"
        :key="item.key"
        type="button"
        class="group relative rounded-md p-2 transition-colors hover:bg-gray-100"
        :class="isPrimaryNavActive(item.key) ? 'bg-gray-100 text-gray-900' : ''"
        :title="item.label"
        @click="handlePrimaryClick(item.key)"
      >
        <Icon :icon="item.icon" class="h-5 w-5" />

        <div class="absolute left-full ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible z-50">
          {{ item.label }}
        </div>
      </button>
    </div>

    <div class="mt-auto">
      <button
        type="button"
        class="group relative rounded-md p-2 transition-colors hover:bg-gray-100"
        :class="isSettingsActive ? 'bg-gray-100 text-gray-900' : ''"
        title="Settings"
        @click="handleSettingsClick"
      >
        <Icon icon="heroicons:cog-6-tooth" class="h-5 w-5" />

        <div class="absolute left-full ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible z-50">
          Settings
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import { useLeftPanel } from '~/composables/useLeftPanel';

const config = useRuntimeConfig();

type PrimaryNavKey =
  | 'agents'
  | 'agentTeams'
  | 'promptEngineering'
  | 'applications'
  | 'skills'
  | 'memory'
  | 'media';

const allPrimaryNavItems: Array<{ key: PrimaryNavKey; label: string; icon: string }> = [
  { key: 'agents', label: 'Agents', icon: 'heroicons:users' },
  { key: 'agentTeams', label: 'Agent Teams', icon: 'heroicons:user-group' },
  { key: 'promptEngineering', label: 'Prompts', icon: 'heroicons:chat-bubble-left-right' },
  { key: 'applications', label: 'Applications', icon: 'heroicons:squares-2x2' },
  { key: 'skills', label: 'Skills', icon: 'heroicons:sparkles' },
  { key: 'memory', label: 'Memory', icon: 'ph:brain' },
  { key: 'media', label: 'Media', icon: 'heroicons:photo' },
];

const primaryNavItems = computed(() => {
  return allPrimaryNavItems.filter((item) => {
    if (item.key === 'applications') {
      return config.public.enableApplications;
    }
    return true;
  });
});

const route = useRoute();
const router = useRouter();
const { isLeftPanelVisible, toggleLeftPanel } = useLeftPanel();

const isSettingsActive = computed(() => route.path.startsWith('/settings'));

const resolvePrimaryRoute = (key: PrimaryNavKey): RouteLocationRaw => {
  switch (key) {
    case 'agents':
      return { path: '/agents', query: { view: 'list' } };
    case 'agentTeams':
      return { path: '/agent-teams', query: { view: 'team-list' } };
    case 'promptEngineering':
      return '/prompt-engineering';
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
    case 'promptEngineering':
      return route.path.startsWith('/prompt-engineering');
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

const openLeftPanelIfCollapsed = (): void => {
  if (!isLeftPanelVisible.value) {
    toggleLeftPanel();
  }
};

const pushRoute = async (target: RouteLocationRaw): Promise<void> => {
  try {
    await router.push(target);
  } catch (error) {
    console.error('LeftSidebarStrip navigation error:', error);
  }
};

const handlePrimaryClick = async (key: PrimaryNavKey): Promise<void> => {
  openLeftPanelIfCollapsed();
  await pushRoute(resolvePrimaryRoute(key));
};

const handleSettingsClick = async (): Promise<void> => {
  openLeftPanelIfCollapsed();
  await pushRoute('/settings');
};
</script>
