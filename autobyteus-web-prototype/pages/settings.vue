<template>
  <div
    class="flex h-full min-w-0 flex-col bg-white md:flex-row"
    data-testid="settings-page-layout"
    :style="navigationWidthStyle"
  >
    <!-- Sidebar -->
    <div
      ref="navigationRef"
      class="settings-page-navigation-resizable max-h-[38dvh] w-full shrink-0 overflow-y-auto border-b border-gray-200 bg-white md:max-h-none md:border-b-0"
      data-testid="settings-page-navigation"
      :inert="isNavigationInteractionHidden || undefined"
      :aria-hidden="isNavigationInteractionHidden ? 'true' : undefined"
    >
      <div class="px-2 py-3 sm:px-4 sm:py-4 md:py-5">
        <nav class="w-full">
          <ul class="w-full space-y-2">
            <li class="w-full border-b border-gray-100 pb-2">
              <button
                ref="narrowFocusFallbackRef"
                type="button"
                :aria-label="$t('settings.page.backAriaLabel')"
                data-testid="settings-nav-back"
                class="flex w-full items-center justify-start rounded-md px-4 py-2 text-gray-600 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800"
                @click="goBackToWorkspace"
              >
                <Icon icon="heroicons:arrow-left-20-solid" class="h-5 w-5 flex-shrink-0" />
                <span class="ml-2 text-sm font-medium">{{ $t('settings.page.backLabel') }}</span>
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
                <span class="text-left">{{ $t('settings.page.sections.apiKeys') }}</span>
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
                <span class="text-left">{{ $t('settings.page.sections.tokenUsage') }}</span>
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
                <span class="text-left">{{ $t('settings.page.sections.messaging') }}</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'display'"
                data-testid="settings-nav-display"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'display' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-computer-desktop-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">{{ $t('settings.page.sections.display') }}</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'language'"
                data-testid="settings-nav-language"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'language' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-language-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">{{ $t('settings.page.sections.language') }}</span>
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
                <span class="text-left">{{ $t('settings.page.sections.localTools') }}</span>
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
                <span class="text-left">{{ $t('settings.page.sections.mcpServers') }}</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'application-packages'"
                data-testid="settings-nav-application-packages"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'application-packages' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-squares-plus-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">{{ $t('settings.page.sections.applicationPackages') }}</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'agent-packages'"
                data-testid="settings-nav-agent-packages"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'agent-packages' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-folder-open-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">{{ $t('settings.page.sections.agentPackages') }}</span>
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
                <span class="text-left">{{ $t('settings.page.sections.serverSettings') }}</span>
              </button>
              <div v-if="activeSection === 'server-settings'" class="ml-10 mt-1 pl-3 space-y-1">
                <button
                  type="button"
                  data-testid="settings-nav-server-settings-quick"
                  class="w-full text-left px-3 py-1.5 text-base rounded-md transition-colors duration-200"
                  :class="serverSettingsMode === 'quick' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                  @click="selectServerSettings('quick')"
                >
                  {{ $t('settings.page.serverSettings.quick') }}
                </button>
                <button
                  type="button"
                  data-testid="settings-nav-server-settings-advanced"
                  class="w-full text-left px-3 py-1.5 text-base rounded-md transition-colors duration-200"
                  :class="serverSettingsMode === 'advanced' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                  @click="selectServerSettings('advanced')"
                >
                  {{ $t('settings.page.serverSettings.advanced') }}
                </button>
                <button
                  type="button"
                  data-testid="settings-nav-server-settings-migrations"
                  class="w-full text-left px-3 py-1.5 text-base rounded-md transition-colors duration-200"
                  :class="serverSettingsMode === 'migrations' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
                  @click="selectServerSettings('migrations')"
                >
                  {{ $t('settings.page.serverSettings.migrations') }}
                </button>
              </div>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'extensions'"
                data-testid="settings-nav-extensions"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'extensions' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-squares-2x2-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">{{ $t('settings.page.sections.extensions') }}</span>
              </button>
            </li>
            <li class="w-full">
              <button
                @click="activeSection = 'updates'"
                data-testid="settings-nav-updates"
                class="flex w-full items-center justify-start px-4 py-2 rounded-md transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 group"
                :class="{ 'bg-gray-100 text-gray-900': activeSection === 'updates' }"
              >
                <div class="flex items-center min-w-[20px] mr-3">
                  <span class="i-heroicons-arrow-path-20-solid w-5 h-5"></span>
                </div>
                <span class="text-left">{{ $t('settings.page.sections.updates') }}</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <div
      class="settings-navigation-separator-anchor relative z-20 hidden w-0 shrink-0 self-stretch overflow-visible md:block"
      data-testid="settings-navigation-separator-anchor"
    >
      <div
        class="settings-navigation-separator-edge pointer-events-none absolute inset-y-0 w-px"
        :style="separatorLineStyle"
        aria-hidden="true"
        data-testid="settings-navigation-separator-line"
      ></div>
      <div
        class="settings-navigation-separator-feedback pointer-events-none absolute inset-y-0 z-10 w-1 bg-transparent"
        :class="{ 'is-resizing': isResizing }"
        :style="separatorFeedbackStyle"
        aria-hidden="true"
        data-testid="settings-navigation-separator-feedback"
      ></div>
      <div
        ref="separatorRef"
        class="settings-navigation-resize-target absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none bg-transparent"
        :style="separatorTargetStyle"
        role="separator"
        aria-orientation="vertical"
        :aria-label="$t('settings.page.resizeNavigationLabel')"
        :aria-valuemin="SETTINGS_NAVIGATION_MIN_WIDTH"
        :aria-valuemax="SETTINGS_NAVIGATION_MAX_WIDTH"
        :aria-valuenow="navigationWidth"
        tabindex="0"
        data-testid="settings-navigation-resize-handle"
        @pointerdown="startResize"
        @keydown="handleSeparatorKeydown"
      ></div>
    </div>

    <!-- Content section -->
    <div
      class="min-h-0 min-w-0 flex-1 overflow-auto bg-white p-2 sm:p-3 md:py-4 md:pl-0 md:pr-4"
      data-testid="settings-page-content"
    >
      <div class="h-full w-full flex flex-col">
        <ProviderAPIKeyManager v-if="activeSection === 'api-keys'" />
        <TokenUsageStatistics v-if="activeSection === 'token-usage'" />
        <MessagingSetupManager v-if="activeSection === 'messaging'" />
        <DisplaySettingsManager v-if="activeSection === 'display'" />
        <LanguageSettingsManager v-if="activeSection === 'language'" />
        <ExtensionsManager v-if="activeSection === 'extensions'" />
        <AboutSettingsManager v-if="activeSection === 'updates'" />
        <ToolsManagementWorkspace
          v-if="activeSection === 'local-tools'"
          initial-root-section="local-tools"
        />
        <ToolsManagementWorkspace
          v-if="activeSection === 'mcp-servers'"
          initial-root-section="mcp-servers"
        />
        <ApplicationPackagesManager v-if="activeSection === 'application-packages'" />
        <AgentPackagesManager v-if="activeSection === 'agent-packages'" />
        <div
          v-if="activeSection === 'server-settings'"
          class="flex h-full min-h-0 flex-col"
        >
          <div class="min-h-0 flex-1">
            <ServerSettingsManager :section-mode="serverSettingsMode" />
          </div>
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
import ServerSettingsManager from '~/components/settings/ServerSettingsManager.vue';
import MessagingSetupManager from '~/components/settings/MessagingSetupManager.vue';
import ExtensionsManager from '~/components/settings/ExtensionsManager.vue';
import AboutSettingsManager from '~/components/settings/AboutSettingsManager.vue';
import AgentPackagesManager from '~/components/settings/AgentPackagesManager.vue';
import ApplicationPackagesManager from '~/components/settings/ApplicationPackagesManager.vue';
import DisplaySettingsManager from '~/components/settings/DisplaySettingsManager.vue';
import LanguageSettingsManager from '~/components/settings/LanguageSettingsManager.vue';
import ToolsManagementWorkspace from '~/components/tools/ToolsManagementWorkspace.vue';
import {
  SETTINGS_NAVIGATION_MAX_WIDTH,
  SETTINGS_NAVIGATION_MIN_WIDTH,
  useSettingsNavigationResize,
} from '~/composables/useSettingsNavigationResize';

definePageMeta({
  layout: 'settings',
});

type SettingsSection =
  | 'api-keys'
  | 'token-usage'
  | 'messaging'
  | 'display'
  | 'language'
  | 'extensions'
  | 'updates'
  | 'local-tools'
  | 'mcp-servers'
  | 'application-packages'
  | 'agent-packages'
  | 'server-settings';
type ServerSettingsMode = 'quick' | 'advanced' | 'migrations';

const route = useRoute();
const router = useRouter();
const serverStore = useServerStore();
const windowNodeContextStore = useWindowNodeContextStore();
const activeSection = ref<SettingsSection>('api-keys');
const serverSettingsMode = ref<ServerSettingsMode>('quick');
const isEmbeddedWindow = computed(() => windowNodeContextStore.isEmbeddedWindow);
const {
  navigationWidth,
  isResizing,
  isNavigationInteractionHidden,
  navigationRef,
  separatorRef,
  narrowFocusFallbackRef,
  navigationWidthStyle,
  separatorLineStyle,
  separatorFeedbackStyle,
  separatorTargetStyle,
  startResize,
  handleSeparatorKeydown,
} = useSettingsNavigationResize();
const validSections = new Set<SettingsSection>([
  'api-keys',
  'token-usage',
  'messaging',
  'display',
  'language',
  'extensions',
  'updates',
  'local-tools',
  'mcp-servers',
  'application-packages',
  'agent-packages',
  'server-settings',
]);

const normalizeSection = (section: string | undefined): SettingsSection | null => {
  if (!section) {
    return null;
  }

  const normalized = section === 'about' ? 'updates' : section;
  return validSections.has(normalized as SettingsSection) ? normalized as SettingsSection : null;
};

const normalizeServerSettingsMode = (mode: string | undefined): ServerSettingsMode =>
  mode === 'advanced' || mode === 'migrations' ? mode : 'quick';

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

<style scoped>
@media (min-width: 768px) {
  .settings-page-navigation-resizable {
    width: var(--settings-navigation-width);
    overflow-x: hidden;
  }
}

.settings-navigation-separator-edge {
  background: #e5e7eb;
  box-shadow: 1px 0 3px rgb(0 0 0 / 10%);
}

.settings-navigation-separator-feedback {
  background-color: transparent;
  transition: background-color 0.2s ease;
}

.settings-navigation-separator-anchor:hover .settings-navigation-separator-feedback,
.settings-navigation-separator-anchor:focus-within .settings-navigation-separator-feedback {
  background-color: #9ca3af;
}

.settings-navigation-separator-anchor .settings-navigation-separator-feedback.is-resizing {
  background-color: #6b7280;
}

.settings-navigation-resize-target:focus-visible {
  outline: 2px solid #6b7280;
  outline-offset: -2px;
}
</style>
