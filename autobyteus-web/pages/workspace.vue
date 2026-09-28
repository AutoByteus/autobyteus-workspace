<template>
  <div class="flex flex-col h-full bg-gray-100 font-sans text-gray-800">
    <WorkspaceAdaptiveLayout :show-file-content="showFileContent" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { buildAgentRunChatRoute } from '~/services/workspace/workspaceNavigationService';
import { useServerSettingsStore } from '~/stores/serverSettings';
import { useWorkspaceStore } from '~/stores/workspace';
import { useWorkspaceRouteSelection } from '~/composables/workspace/useWorkspaceRouteSelection';
import WorkspaceAdaptiveLayout from '~/components/layout/WorkspaceAdaptiveLayout.vue';

const fileExplorerStore = useFileExplorerStore();
const serverSettingsStore = useServerSettingsStore();
const workspaceStore = useWorkspaceStore();

useWorkspaceRouteSelection();

// Standalone agent runs open in the chat view (D-05). Only a committed selection change
// redirects: never a stale selection on mount, and never while an Agent Org route is shown.
const route = useRoute();
const router = useRouter();
const selectionStore = useAgentSelectionStore();
watch(
  () => (selectionStore.selectedType === 'agent' ? selectionStore.selectedRunId : null),
  (runId, previousRunId) => {
    if (!runId || runId === previousRunId) return;
    if (route.query.rootSubjectKind === 'agent_org') return;
    void router.replace(buildAgentRunChatRoute(runId));
  },
);

const showFileContent = computed(() => {
    const wsId = workspaceStore.activeWorkspace?.workspaceId || workspaceStore.activeWorkspaceMetadata?.workspaceId;
    return wsId ? fileExplorerStore.getOpenFiles(wsId).length > 0 : false;
});

onMounted(() => {
  console.log('Workspace.vue: Mounted. Fetching server settings and loading profiles...');

  serverSettingsStore.fetchServerSettings().catch(error => {
    console.error('Workspace.vue: Failed to fetch server settings on mount:', error);
  });
});
</script>
