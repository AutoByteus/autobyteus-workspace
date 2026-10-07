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
            <li v-for="(item, itemIndex) in primaryNavItems" :key="item.key">
              <div class="relative">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
                  :class="[
                    item.key === 'chat' ? 'pr-20' : itemIndex === 0 ? 'pr-12' : '',
                    isNavRowActive(item.key)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100',
                  ]"
                  :data-test="item.key === 'chat' ? 'app-left-panel-chat' : undefined"
                  @click="navigateToPrimary(item.key)"
                >
                  <svg
                    v-if="item.icon === SHELL_NODES_NETWORK_ICON"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                    data-testid="nodes-network-icon"
                  >
                    <rect x="9" y="3" width="6" height="6" rx="1.5" />
                    <rect x="4" y="15" width="6" height="6" rx="1.5" />
                    <rect x="14" y="15" width="6" height="6" rx="1.5" />
                    <path d="M12 9v3" />
                    <path d="M7 15v-1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
                  </svg>
                  <Icon v-else :icon="item.icon" class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ t(item.labelKey) }}</span>
                </button>

                <button
                  v-if="item.key === 'chat'"
                  type="button"
                  data-test="app-left-panel-new-chat"
                  class="absolute right-10 top-1/2 inline-flex -translate-y-1/2 rounded-md p-2 transition-colors"
                  :title="$t('shell.components.AppLeftPanel.new_chat')"
                  :aria-label="$t('shell.components.AppLeftPanel.new_chat')"
                  :class="isNavRowActive(item.key)
                    ? 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'"
                  @click.stop="startNewChat"
                >
                  <Icon icon="heroicons:pencil-square" class="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
                </button>

                <button
                  v-if="itemIndex === 0"
                  type="button"
                  class="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-md p-2 transition-colors md:inline-flex"
                  :title="$t('shell.components.AppLeftPanel.collapse_left_panel')"
                  :class="isNavRowActive(item.key)
                    ? 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'"
                  @click.stop="toggleLeftPanel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M9 3v18"/>
                  </svg>
                </button>
              </div>

              <!-- Kept New chats with typed text, directly under the Chat row (REQ-002). -->
              <ChatDraftRows v-if="item.key === 'chat'" @open="openChatDraft" />
            </li>
          </ul>
        </nav>
      </section>

      <div
        data-test="app-left-panel-section-resize-handle"
        class="left-panel-section-resize-handle"
        @mousedown="initPrimarySectionResize"
      ></div>

      <section
        data-test="app-left-panel-run-history"
        tabindex="-1"
        class="min-h-0 flex-1 border-b border-gray-200 bg-white outline-none"
      >
        <div class="h-full">
          <WorkspaceAgentRunsTreePanel @run-selected="onRunningRunSelected" />
        </div>
      </section>
    </div>

    <footer class="flex-shrink-0 bg-white p-2">
      <button
        v-if="showSettingsNavigation"
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
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { computed, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import WorkspaceAgentRunsTreePanel from '~/components/workspace/history/WorkspaceAgentRunsTreePanel.vue';
import { useAppLeftPanelSectionResize } from '~/composables/useAppLeftPanelSectionResize';
import { useLeftPanel } from '~/composables/useLeftPanel';
import {
  SHELL_NODES_NETWORK_ICON,
  useShellPrimaryNavigation,
  type ShellPrimaryNavKey,
} from '~/composables/useShellPrimaryNavigation';
import { isFeatureAvailableInRuntime } from '~/utils/mobileFeatureGates';
import { useRunStart } from '~/composables/runSettings/useRunStart';
import { useChatDraftRows } from '~/composables/chat/useChatDraftRows';
import ChatDraftRows from '~/components/chat/ChatDraftRows.vue';
import { useAppLayoutStore } from '~/stores/appLayoutStore';
import { resolveSelectionRoute, type RunSelectionRouteInput } from '~/services/workspace/workspaceNavigationService';

const { t } = useLocalization();
const {
  primaryNavItems,
  resolvePrimaryRoute,
  isPrimaryNavActive,
  ensurePrimaryNavigationReady,
} = useShellPrimaryNavigation();

const route = useRoute();
const router = useRouter();
const { toggleLeftPanel } = useLeftPanel();
const {
  panelSectionsContainerRef,
  primaryNavSectionRef,
  primaryNavSectionStyle,
  initPrimarySectionResize,
} = useAppLeftPanelSectionResize();

const runStart = useRunStart();
const { rowSelected } = useChatDraftRows();

// While a Draft row is selected, it (not the Chat row) is the selected row (REQ-003).
const isNavRowActive = (key: ShellPrimaryNavKey): boolean =>
  isPrimaryNavActive(key) && !(key === 'chat' && rowSelected.value);

const isSettingsActive = computed(() => route.path.startsWith('/settings'));
const showSettingsNavigation = computed(() => isFeatureAvailableInRuntime('desktopSettings'));

const pushRoute = async (target: RouteLocationRaw): Promise<void> => {
  try {
    await router.push(target);
  } catch (error) {
    console.error('AppLeftPanel navigation error:', error);
  }
};

// New chat starts only through the start intent (DI-001): a fresh draft, then /chat.
const openNewChat = async (): Promise<void> => {
  try {
    await runStart.newChat();
  } catch (error) {
    console.error('AppLeftPanel navigation error:', error);
  }
};

const navigateToPrimary = async (key: ShellPrimaryNavKey): Promise<void> => {
  useAgentSelectionStore().beginSelectionIntent();
  // Chat always opens a fresh New chat; drafts with typed text stay listed (REQ-004).
  if (key === 'chat') {
    await openNewChat();
    return;
  }
  await pushRoute(resolvePrimaryRoute(key));
};

// The pencil on the Chat item always opens a fresh New chat.
const startNewChat = async (): Promise<void> => {
  useAgentSelectionStore().beginSelectionIntent();
  await openNewChat();
};

// A Draft row re-enters its draft (REQ-003). Already on /chat there is no route change to close
// the narrow drawer, so it is closed here.
const openChatDraft = async (draftId: string): Promise<void> => {
  useAgentSelectionStore().beginSelectionIntent();
  try {
    await runStart.openChatDraft(draftId);
  } catch (error) {
    console.error('AppLeftPanel navigation error:', error);
  }
  useAppLayoutStore().closeMobileMenu();
};

const navigateToSettings = async (): Promise<void> => {
  useAgentSelectionStore().beginSelectionIntent();
  await pushRoute('/settings');
};

const isCurrentRoute = (target: RouteLocationRaw): boolean => {
  if (typeof target === 'string') return route.path === target && Object.keys(route.query).length === 0;
  const location = target as { path?: string; query?: Record<string, unknown> };
  const query = location.query ?? {};
  return route.path === location.path
    && Object.keys(route.query).length === Object.keys(query).length
    && Object.entries(query).every(([key, value]) => route.query[key] === value);
};

// Standalone agent runs open in the chat view; team runs in the workspace Team view.
const onRunningRunSelected = async (selection: RunSelectionRouteInput): Promise<void> => {
  const target = resolveSelectionRoute(selection);
  if (isCurrentRoute(target)) return;
  await pushRoute(target);
};

onMounted(() => {
  void ensurePrimaryNavigationReady().catch(() => undefined);
});
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
