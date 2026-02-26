<template>
  <div class="flex h-full bg-white">
    <!-- Sidebar -->
    <div class="w-64 border-r border-gray-200 bg-white">
      <div class="px-4 py-5">
        <nav class="w-full">
          <ul class="w-full space-y-2">
            <li class="w-full border-b border-gray-100 pb-2">
              <button
                type="button"
                aria-label="Back to workspace"
                data-testid="settings-nav-back"
                class="flex w-full items-center justify-start rounded-md px-4 py-2 text-gray-600 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800"
                @click="goBackToWorkspace"
              >
                <Icon icon="heroicons:arrow-left-20-solid" class="h-5 w-5 flex-shrink-0" />
                <span class="ml-2 text-sm font-medium">Back to Workspace</span>
              </button>
            </li>
            <li class="w-full">
              <button 
                @click="activeSection = 'api-keys'"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'api-keys' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-key-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">API Keys</span>
              </button>
            </li>
            <li class="w-full">
              <button 
                @click="activeSection = 'token-usage'"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'token-usage' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-chart-bar-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">Token Usage Statistics</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'nodes'"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'nodes' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-circle-stack-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">Nodes</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'messaging'"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'messaging' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-chat-bubble-left-right-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">Messaging</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'local-tools'"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'local-tools' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-wrench-screwdriver-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">Local Tools</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'mcp-servers'"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'mcp-servers' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-puzzle-piece-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">MCP Servers</span>
              </button>
            </li>
            <li class="w-full">
              <button 
                @click="selectServerSettings()"
                data-testid="settings-nav-server-settings"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'text-gray-900 font-medium': activeSection === 'server-settings' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-server-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">Server Settings</span>
              </button>
              <div v-if="activeSection === 'server-settings'" class="ml-10 mt-1 pl-3 space-y-1">
                <button
                  type="button"
                  data-testid="settings-nav-server-settings-quick"
                  class="w-full text-left px-3 py-1.5 text-base rounded-md transition-colors duration-200"
                  :class="serverSettingsMode === 'quick' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                  @click="selectServerSettings('quick')"
                >
                  Basics
                </button>
                <button
                  type="button"
                  data-testid="settings-nav-server-settings-advanced"
                  class="w-full text-left px-3 py-1.5 text-base rounded-md transition-colors duration-200"
                  :class="serverSettingsMode === 'advanced' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                  @click="selectServerSettings('advanced')"
                >
                  Advanced
                </button>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Content section -->
    <div class="flex-1 overflow-auto bg-white pr-4 pt-4">
      <div class="h-full w-full flex flex-col">
        <ProviderAPIKeyManager v-if="activeSection === 'api-keys'" />
        <TokenUsageStatistics v-if="activeSection === 'token-usage'" />
        <NodeManager v-if="activeSection === 'nodes'" />
        <MessagingSetupManager v-if="activeSection === 'messaging'" />
        <ToolsManagementWorkspace
          v-if="activeSection === 'local-tools'"
          initial-root-section="local-tools"
        />
        <ToolsManagementWorkspace
          v-if="activeSection === 'mcp-servers'"
          initial-root-section="mcp-servers"
        />
        <ServerSettingsManager
          v-if="activeSection === 'server-settings'"
          :section-mode="serverSettingsMode"
        />
        <div v-else-if="activeSection === ''" class="flex-1 flex flex-col items-center justify-center text-gray-400">
          <span class="i-heroicons-cog-8-tooth-20-solid w-16 h-16 mb-6 opacity-20"></span>
          <h3 class="text-xl font-medium mb-2 text-gray-500">Settings</h3>
          <p class="text-gray-400">Select a category to configure settings.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useServerStore } from '~/stores/serverStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import ProviderAPIKeyManager from '~/components/settings/ProviderAPIKeyManager.vue';
import TokenUsageStatistics from '~/components/settings/TokenUsageStatistics.vue';
import NodeManager from '~/components/settings/NodeManager.vue';
import ServerSettingsManager from '~/components/settings/ServerSettingsManager.vue';
import MessagingSetupManager from '~/components/settings/MessagingSetupManager.vue';
import ToolsManagementWorkspace from '~/components/tools/ToolsManagementWorkspace.vue';

definePageMeta({
  layout: 'settings',
});

type SettingsSection =
  | 'api-keys'
  | 'token-usage'
  | 'nodes'
  | 'messaging'
  | 'local-tools'
  | 'mcp-servers'
  | 'server-settings';
type ServerSettingsMode = 'quick' | 'advanced';

const route = useRoute();
const router = useRouter();
const serverStore = useServerStore();
const windowNodeContextStore = useWindowNodeContextStore();
const activeSection = ref<SettingsSection>('api-keys');
const serverSettingsMode = ref<ServerSettingsMode>('quick');
const isEmbeddedWindow = computed(() => windowNodeContextStore.isEmbeddedWindow);
const validSections = new Set<SettingsSection>([
  'api-keys',
  'token-usage',
  'nodes',
  'messaging',
  'local-tools',
  'mcp-servers',
  'server-settings',
]);

const normalizeSection = (section: string | undefined): SettingsSection | null => {
  if (!section) {
    return null;
  }

  return validSections.has(section as SettingsSection) ? section as SettingsSection : null;
};

const normalizeServerSettingsMode = (mode: string | undefined): ServerSettingsMode =>
  mode === 'advanced' ? 'advanced' : 'quick';

const selectServerSettings = (mode: ServerSettingsMode = 'quick') => {
  activeSection.value = 'server-settings';
  serverSettingsMode.value = mode;
};

const goBackToWorkspace = async (): Promise<void> => {
  try {
    await router.push('/workspace');
  } catch (error) {
    console.error('settings page back navigation error:', error);
  }
};

onMounted(() => {
  // Check for section query parameter
  const sectionParam = route.query.section as string | undefined;
  if (sectionParam === 'server-status') {
    selectServerSettings('advanced');
  } else {
    const normalizedSection = normalizeSection(sectionParam);
    if (normalizedSection) {
      activeSection.value = normalizedSection;
      if (normalizedSection === 'server-settings') {
        serverSettingsMode.value = normalizeServerSettingsMode(route.query.mode as string | undefined);
      }
    }
  }

  // If server is not running and we are in Electron mode, default to server-settings section.
  if (isEmbeddedWindow.value && serverStore.status !== 'running') {
    selectServerSettings(serverSettingsMode.value);
  }
});
</script>
