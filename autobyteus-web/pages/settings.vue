<template>
  <div
    class="flex h-full min-w-0 flex-col bg-white md:flex-row"
    data-testid="settings-page-layout"
  >
    <SettingsNavigation
      ref="settingsNavigationRef"
      :model="navigationModel"
      :is-desktop-collapsed="isSettingsNavigationCollapsed"
      @back="goBackToWorkspace"
      @collapse="collapseNavigation"
      @select-section="handleSectionSelection"
      @select-server-mode="selectServerSettings"
    />

    <div
      class="min-h-0 min-w-0 flex-1 overflow-auto bg-white p-2 sm:p-3 md:py-4 md:pr-4"
      :class="isSettingsNavigationCollapsed ? 'md:pl-4' : 'md:pl-0'"
      data-testid="settings-page-content"
    >
      <div class="flex h-full w-full flex-col">
        <SettingsCollapsedHeader
          v-if="isSettingsNavigationCollapsed"
          key="collapsed-header"
          ref="collapsedHeaderRef"
          :context="navigationModel.activeContext"
          class="mb-3 flex-shrink-0"
          @expand="expandNavigation"
        />

        <div key="settings-manager-container" class="min-h-0 flex-1">
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import SettingsCollapsedHeader from '~/components/settings/SettingsCollapsedHeader.vue';
import SettingsNavigation from '~/components/settings/SettingsNavigation.vue';
import {
  normalizeServerSettingsMode,
  normalizeSettingsSection,
  resolveSettingsNavigation,
  type ServerSettingsMode,
  type SettingsSection,
  type SettingsToggleFocusHandle,
} from '~/components/settings/settingsNavigation';
import ToolsManagementWorkspace from '~/components/tools/ToolsManagementWorkspace.vue';

definePageMeta({
  layout: 'settings',
});

interface SelectSectionOptions {
  transferFocus?: boolean;
}

const route = useRoute();
const router = useRouter();
const serverStore = useServerStore();
const windowNodeContextStore = useWindowNodeContextStore();
const activeSection = ref<SettingsSection>('api-keys');
const serverSettingsMode = ref<ServerSettingsMode>('quick');
const isSettingsNavigationCollapsed = ref(false);
const settingsNavigationRef = ref<SettingsToggleFocusHandle | null>(null);
const collapsedHeaderRef = ref<SettingsToggleFocusHandle | null>(null);
const isEmbeddedWindow = computed(() => windowNodeContextStore.isEmbeddedWindow);
const navigationModel = computed(() => resolveSettingsNavigation(
  activeSection.value,
  serverSettingsMode.value,
));

const selectSection = async (
  section: SettingsSection,
  options: SelectSectionOptions = {},
): Promise<void> => {
  activeSection.value = section;
  isSettingsNavigationCollapsed.value = section === 'token-usage';

  if (options.transferFocus && section === 'token-usage') {
    await nextTick();
    collapsedHeaderRef.value?.focusToggle();
  }
};

const selectServerSettings = (mode: ServerSettingsMode = 'quick'): void => {
  activeSection.value = 'server-settings';
  serverSettingsMode.value = mode;
  isSettingsNavigationCollapsed.value = false;
};

const handleSectionSelection = (section: SettingsSection): void => {
  if (section === 'server-settings') {
    selectServerSettings();
    return;
  }

  void selectSection(section, { transferFocus: true });
};

const collapseNavigation = async (): Promise<void> => {
  isSettingsNavigationCollapsed.value = true;
  await nextTick();
  collapsedHeaderRef.value?.focusToggle();
};

const expandNavigation = async (): Promise<void> => {
  isSettingsNavigationCollapsed.value = false;
  await nextTick();
  settingsNavigationRef.value?.focusToggle();
};

const goBackToWorkspace = async (): Promise<void> => {
  try {
    await router.push('/workspace');
  } catch (error) {
    console.error('settings page back navigation error:', error);
  }
};

onMounted(() => {
  const sectionParam = route.query.section;
  if (sectionParam === 'server-status') {
    selectServerSettings('advanced');
  } else {
    const normalizedSection = normalizeSettingsSection(sectionParam);
    if (normalizedSection === 'server-settings') {
      selectServerSettings(normalizeServerSettingsMode(route.query.mode));
    } else if (normalizedSection) {
      void selectSection(normalizedSection);
    }
  }

  if (isEmbeddedWindow.value && serverStore.status !== 'running') {
    selectServerSettings(serverSettingsMode.value);
  }
});
</script>
