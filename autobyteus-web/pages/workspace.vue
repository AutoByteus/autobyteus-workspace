<template>
  <div class="flex flex-col h-full bg-gray-100 font-sans text-gray-800">
    <WorkspaceDesktopLayout v-if="isDesktop" :show-file-content="showFileContent" />
    <WorkspaceMobileLayout v-else :show-file-content="showFileContent" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useServerSettingsStore } from '~/stores/serverSettings';
import { useWorkspaceStore } from '~/stores/workspace';
import WorkspaceDesktopLayout from '~/components/layout/WorkspaceDesktopLayout.vue';
import WorkspaceMobileLayout from '~/components/layout/WorkspaceMobileLayout.vue';

const fileExplorerStore = useFileExplorerStore();
const serverSettingsStore = useServerSettingsStore();
const workspaceStore = useWorkspaceStore();
const isDesktop = ref(true);
let mediaQuery: MediaQueryList | null = null;

// RESTORED: This is the original, correct implementation for this computed property.
// RESTORED: This is the original, correct implementation for this computed property.
const showFileContent = computed(() => {
    const wsId = workspaceStore.activeWorkspace?.workspaceId;
    return wsId ? fileExplorerStore.getOpenFiles(wsId).length > 0 : false;
});

const handleMediaChange = (event: MediaQueryList | MediaQueryListEvent) => {
  isDesktop.value = event.matches;
};

onMounted(() => {
  console.log('Workspace.vue: Mounted. Fetching server settings and loading profiles...');

  if (typeof window !== 'undefined') {
    mediaQuery = window.matchMedia('(min-width: 640px)');
    handleMediaChange(mediaQuery);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }
  }
  
  serverSettingsStore.fetchServerSettings().catch(error => {
    console.error('Workspace.vue: Failed to fetch server settings on mount:', error);
  });
  
  // No launch profiles in the new UX.
});

onBeforeUnmount(() => {
  if (!mediaQuery) return;
  if (mediaQuery.removeEventListener) {
    mediaQuery.removeEventListener('change', handleMediaChange);
  } else {
    mediaQuery.removeListener(handleMediaChange);
  }
});
</script>
