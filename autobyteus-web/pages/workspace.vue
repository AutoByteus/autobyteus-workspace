<template>
  <!-- The Org launch page (DEC-005: the existing configuration route) is a start surface like New
       chat: outside the run views' tool strip, its tools behind one icon. Runs keep the workspace layout. -->
  <div v-if="showOrgLaunch" class="flex h-full min-h-0 min-w-0 flex-col bg-white font-sans text-gray-800" data-test="org-launch-route">
    <WorkspaceToolShell start-surface>
      <div class="flex h-full min-h-0 min-w-0">
        <OrgLaunchPage />
      </div>
    </WorkspaceToolShell>
  </div>
  <div v-else class="flex flex-col h-full bg-gray-100 font-sans text-gray-800">
    <WorkspaceAdaptiveLayout :show-file-content="showFileContent" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { buildAgentRunChatRoute } from '~/services/workspace/workspaceNavigationService';
import { useServerSettingsStore } from '~/stores/serverSettings';
import { useWorkspaceRouteSelection } from '~/composables/workspace/useWorkspaceRouteSelection';
import { useWorkspaceFileContentVisible } from '~/composables/workspace/useWorkspaceFileContentVisible';
import WorkspaceAdaptiveLayout from '~/components/layout/WorkspaceAdaptiveLayout.vue';
import WorkspaceToolShell from '~/components/layout/WorkspaceToolShell.vue';
import OrgLaunchPage from '~/components/run-settings/OrgLaunchPage.vue';
import { START_SURFACE_WORKSPACE, startSurfaceWorkspaceOf } from '~/composables/layout/useStartSurfaceTools';
import { useAgentOrgLaunchDraftStore } from '~/stores/agentOrgLaunchDraftStore';

const serverSettingsStore = useServerSettingsStore();

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

const showFileContent = useWorkspaceFileContentVisible();
const showOrgLaunch = computed(() => route.query.rootSubjectKind === 'agent_org' && route.query.mode === 'configuration');
const orgLaunchDrafts = useAgentOrgLaunchDraftStore();
// On the Org launch page, Files and Terminal use the workspace chosen on its card.
provide(START_SURFACE_WORKSPACE, computed(() => (showOrgLaunch.value ? startSurfaceWorkspaceOf(orgLaunchDrafts.draft?.root.workspace) : null)));

onMounted(() => {
  console.log('Workspace.vue: Mounted. Fetching server settings and loading profiles...');

  serverSettingsStore.fetchServerSettings().catch(error => {
    console.error('Workspace.vue: Failed to fetch server settings on mount:', error);
  });
});
</script>
