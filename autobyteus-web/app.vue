<template>
  <div id="app">
    <AppLocalizationGate>
      <!-- Conditionally display server status overlays in Electron environment -->
      <template v-if="isEmbeddedWindow">
        <ServerLoading />
        <ServerShutdown />
      </template>

      <NotificationCenter v-if="showsNotifications" />
      <UiErrorPanel v-if="config.public.showDebugErrorPanel" />
      <ToastContainer />
      <SkillNameConflictDialog />

      <NuxtLayout v-if="isAppReady">
        <NuxtPage />
      </NuxtLayout>
    </AppLocalizationGate>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useServerStore } from '~/stores/serverStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import ServerLoading from '~/components/server/ServerLoading.vue'
import ServerShutdown from '~/components/server/ServerShutdown.vue'
import AppLocalizationGate from '~/components/app/AppLocalizationGate.vue'
import NotificationCenter from '~/components/notifications/NotificationCenter.vue'
import UiErrorPanel from '~/components/ui/UiErrorPanel.vue'
import ToastContainer from '~/components/common/ToastContainer.vue'
import SkillNameConflictDialog from '~/components/skills/SkillNameConflictDialog.vue'
import { ServerStatus } from '~/types/serverStatus'
import { useAgentPackageDefinitionChangeFeed } from '~/composables/agentPackages/useAgentPackageDefinitionChangeFeed'
import { useUpdateNotificationChangeFeed } from '~/composables/notifications/useUpdateNotificationChangeFeed'
import { isFeatureAvailableInRuntime } from '~/utils/mobileFeatureGates'
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime'
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore'

const config = useRuntimeConfig()
const serverStore = useServerStore()
const windowNodeContextStore = useWindowNodeContextStore()
const isEmbeddedWindow = computed(() => windowNodeContextStore.isEmbeddedWindow)
const isAppReady = computed(() =>
  !isEmbeddedWindow.value || serverStore.status === ServerStatus.RUNNING
)
// Agents, Teams, Orgs, packages and the `@` menus follow agent package definition changes without a page reload.
// The phone opens the feed only while it has a paired session (to the paired node, with its credential).
const mobileNodeSession = useMobileNodeSessionStore()
const definitionFeedEnabled = computed(() =>
  isAppReady.value && (!isMobileRemoteAccessRuntime() || mobileNodeSession.isPaired)
)
useAgentPackageDefinitionChangeFeed(definitionFeedEnabled)
// Update notifications live where Settings does (desktop and browser windows, not the mobile client).
const showsNotifications = computed(() => isFeatureAvailableInRuntime('desktopSettings'))
useUpdateNotificationChangeFeed(computed(() => isAppReady.value && showsNotifications.value))
</script>

<style lang="css">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  #app {
    @apply min-h-screen font-sans;
  }
  /* autobyteus-358 DS-007: a block with a very long unbroken run (base64, minified text) is shaped without kerning
     and ligatures, which made each layout of it cost seconds; wrapping, copy and search are unchanged. */
  .long-unbroken-text {
    font-kerning: none;
    font-variant-ligatures: none;
    font-feature-settings: normal;
    text-rendering: optimizeSpeed;
  }
</style>
