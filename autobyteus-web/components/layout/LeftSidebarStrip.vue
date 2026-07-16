<template>
  <div
    data-test="workspace-left-navigation-strip"
    role="navigation"
    :aria-label="$t('shell.workspaceSurfaces.navigationDrawerTitle')"
    :data-strip-behavior="props.stripBehavior"
    :class="stripClasses"
  >
    <button
      type="button"
      data-test="workspace-left-strip-open"
      class="group relative rounded-md p-2 transition-colors hover:bg-gray-100"
      :title="$t('shell.workspaceSurfaces.openNavigation')"
      :aria-label="$t('shell.workspaceSurfaces.openNavigation')"
      @click="openNavigationDrawer"
    >
      <Icon icon="heroicons:bars-3" class="h-5 w-5" />
      <span class="sr-only">{{ $t('shell.workspaceSurfaces.openNavigation') }}</span>
    </button>

    <div class="flex flex-col space-y-2">
      <button
        v-for="item in primaryNavItems"
        :key="item.key"
        type="button"
        class="group relative rounded-md p-2 transition-colors hover:bg-gray-100"
        :class="isPrimaryNavActive(item.key) ? 'bg-gray-100 text-gray-900' : ''"
        :title="t(item.labelKey)"
        :aria-label="t(item.labelKey)"
        @click="handlePrimaryClick(item.key)"
      >
        <Icon :icon="item.icon" class="h-5 w-5" />

        <div class="absolute left-full ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible z-50">
          {{ t(item.labelKey) }}
        </div>
      </button>
    </div>

    <div v-if="showSettingsNavigation" class="mt-auto">
      <button
        type="button"
        class="group relative rounded-md p-2 transition-colors hover:bg-gray-100"
        :class="isSettingsActive ? 'bg-gray-100 text-gray-900' : ''"
        :title="$t('shell.components.layout.LeftSidebarStrip.settings')"
        :aria-label="$t('shell.navigation.settings')"
        @click="handleSettingsClick"
      >
        <Icon icon="heroicons:cog-6-tooth" class="h-5 w-5" />

        <div class="absolute left-full ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible z-50">
          {{ $t('shell.navigation.settings') }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import { useAppLayoutStore } from '~/stores/appLayoutStore';
import { useResponsiveWorkspaceShellState } from '~/composables/layout/useResponsiveWorkspaceShell';
import { useShellPrimaryNavigation, type ShellPrimaryNavKey } from '~/composables/useShellPrimaryNavigation';
import { isFeatureAvailableInRuntime } from '~/utils/mobileFeatureGates';
import type { RightStripBehavior } from '~/utils/layout/responsiveLayoutPolicy';

const { t } = useLocalization();
const {
  primaryNavItems,
  resolvePrimaryRoute,
  isPrimaryNavActive,
  ensurePrimaryNavigationReady,
} = useShellPrimaryNavigation();

const route = useRoute();
const router = useRouter();
const appLayoutStore = useAppLayoutStore();
const responsiveWorkspaceShellState = useResponsiveWorkspaceShellState();

const props = withDefaults(defineProps<{
  stripBehavior?: RightStripBehavior
}>(), {
  stripBehavior: 'consuming',
});

const stripClasses = computed(() => props.stripBehavior === 'overlay'
  ? 'fixed inset-y-0 left-0 z-40 flex h-full w-[50px] flex-col items-center border-r border-gray-200 bg-white py-4 text-gray-500 shadow-lg'
  : 'flex h-full w-[50px] flex-col items-center border-r border-gray-200 bg-white py-4 text-gray-500');

const isSettingsActive = computed(() => route.path.startsWith('/settings'));
const showSettingsNavigation = computed(() => isFeatureAvailableInRuntime('desktopSettings'));

const openLeftPanelIfCollapsed = (): void => {
  if (responsiveWorkspaceShellState.value.canOpenLeftDrawer) {
    appLayoutStore.openMobileMenu();
  }
};
const openNavigationDrawer = (): void => {
  if (responsiveWorkspaceShellState.value.canOpenLeftDrawer) {
    appLayoutStore.openMobileMenu();
  }
};
const pushRoute = async (target: RouteLocationRaw): Promise<void> => {
  try {
    await router.push(target);
  } catch (error) {
    console.error('LeftSidebarStrip navigation error:', error);
  }
};

const handlePrimaryClick = async (key: ShellPrimaryNavKey): Promise<void> => {
  openLeftPanelIfCollapsed();
  await pushRoute(resolvePrimaryRoute(key));
};

const handleSettingsClick = async (): Promise<void> => {
  openLeftPanelIfCollapsed();
  await pushRoute('/settings');
};

onMounted(() => {
  void ensurePrimaryNavigationReady().catch(() => undefined);
});
</script>
