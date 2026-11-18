import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useWorkspaceStore } from '~/stores/workspace';

export type MobileAgentRunDraft = Readonly<{ agentDefinitionId: string; workspaceId: string }>;

/**
 * Creates the phone's agent run (DS-006) from the agent launch configuration the New run screen edited: the run is
 * created and selected for the phone (no shell navigation); its first message is sent from its conversation.
 */
export function useMobileRunLaunchCoordinator() {
  const agentContextsStore = useAgentContextsStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const agentRunConfigStore = useAgentRunConfigStore();
  const selectionStore = useAgentSelectionStore();
  const teamRunConfigStore = useTeamRunConfigStore();
  const workspaceStore = useWorkspaceStore();

  const workspaceMetadataForId = (workspaceId: string) => {
    const workspace = workspaceStore.workspaces[workspaceId] || null;
    return workspaceStore.workspaceMetadataById[workspaceId]
      || (workspace ? workspaceStore.registerWorkspaceInfoMetadata(workspace) : null)
      || null;
  };

  function assertConfigMatchesDraft(draft: MobileAgentRunDraft): void {
    const config = agentRunConfigStore.config;
    if (!config) throw new Error('Agent launch configuration is not ready. Re-select the agent and choose a model.');
    if (config.agentDefinitionId !== draft.agentDefinitionId) throw new Error('Agent launch configuration is stale. Re-select the agent before creating the run.');
    if (config.workspaceId !== draft.workspaceId) throw new Error('Agent launch workspace is stale. Re-select the workspace before creating the run.');
    if (!agentRunConfigStore.isConfigured) throw new Error('Choose a model before creating the run.');
  }

  /** Creates the run and answers its id (the temporary id until its first message gives it the permanent one). */
  async function createAgentRun(draft: MobileAgentRunDraft): Promise<string> {
    if (!draft.workspaceId.trim()) throw new Error('Choose a workspace before creating the run.');
    await Promise.all([agentDefinitionStore.fetchAllAgentDefinitions(), workspaceStore.fetchAllWorkspaces()]);
    const definition = agentDefinitionStore.getAgentDefinitionById(draft.agentDefinitionId);
    if (!definition) throw new Error('Choose an agent before creating the run.');
    if (!agentRunConfigStore.config) {
      agentRunConfigStore.setTemplate(definition);
      agentRunConfigStore.updateAgentConfig({ workspaceId: draft.workspaceId, workspaceMetadata: workspaceMetadataForId(draft.workspaceId) });
    }
    assertConfigMatchesDraft(draft);
    teamRunConfigStore.clearConfig();

    const temporaryRunId = agentContextsStore.createRunFromTemplate({ selectionMode: 'mobile' });
    const runId = selectionStore.selectedType === 'agent' && selectionStore.selectedRunId ? selectionStore.selectedRunId : temporaryRunId;
    agentRunConfigStore.clearConfig();
    return runId;
  }

  return { createAgentRun };
}
