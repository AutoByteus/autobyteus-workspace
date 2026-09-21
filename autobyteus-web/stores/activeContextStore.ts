import type { CollaborationTasksContextView } from '~/types/workspace/collaborationTasksContextView';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAgentSelectionStore } from './agentSelectionStore';
import { useAgentContextsStore } from './agentContextsStore';
import { useAgentTeamContextsStore } from './agentTeamContextsStore';
import { useAgentRunStore } from './agentRunStore';
import { useAgentTeamRunStore } from './agentTeamRunStore';
import { useContextFileUploadStore } from './contextFileUploadStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { ContextFilePath } from '~/types/conversation';
import type { ToolApprovalTarget } from '~/types/segments';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { resolveAgentPrimaryAction } from '~/services/runSubmission/agentPrimaryAction';
import { useAgentOrgContextsStore } from './agentOrgContextsStore';
import type {
  ActiveAgentWorkspaceTarget,
  TeamWorkspaceContextView,
} from '~/types/workspace/activeAgentWorkspaceTarget';
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { projectTeamCommunicationPerspective, projectTeamCommunicationMemberIdentity } from '~/utils/teamCommunication/teamCommunicationPerspective';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';
import { isTeamMemberProjectionAuthoritative } from '~/services/runHydration/teamMemberProjectionHydrationService';

/**
 * @store useActiveContextStore
 * @description Facade for interacting with the currently active agent context
 * (single agent or focused team member) based on selection.
 */
export const useActiveContextStore = defineStore('activeContext', () => {
  const selectionStore = useAgentSelectionStore();
  const agentContextsStore = useAgentContextsStore();
  const agentTeamContextsStore = useAgentTeamContextsStore();
  const agentRunStore = useAgentRunStore();
  const agentTeamRunStore = useAgentTeamRunStore();
  const contextFileUploadStore = useContextFileUploadStore();
  const agentOrgContextsStore = useAgentOrgContextsStore();
  const route = useRoute();

  const standaloneTeamView = (team: AgentTeamContext): TeamWorkspaceContextView => {
    const view = team.view;
    const tree = view.getExecutionTree();
    const focusedContext = view.getFocusedAgentContext();
    if (!focusedContext) throw new Error('Standalone Team has no focused Agent context.');
    const entries = view.listAgentContextEntries();
    return Object.freeze({
      rootKind: 'agent_team', rootRunId: view.getRootTeamRunId(),
      teamRunId: view.getRootTeamRunId(), teamAddress: parseAgentTeamAddress('/'),
      teamDefinitionName: view.getTeamDefinitionName(),
      coordinatorAddress: parseAgentTeamAddress(tree.root_team.coordinator_address),
      focusedMemberAddress: view.getFocusedMemberAddress(),
      focusedAgentRunId: view.getFocusedAgentRunId(), focusedAgentContext: focusedContext,
      focusedTaskPresentation: () => view.getFocusedNavigationRow()?.task ?? null,
      isFocusedProjectionAuthoritative: () =>
        isTeamMemberProjectionAuthoritative(team, view.getFocusedAgentRunId()),
      listMembers: () => Object.freeze(entries.map((entry) => Object.freeze({
        address: entry.memberAddress, agentRunId: entry.agentRunId,
        context: entry.agentContext, coordinator: entry.memberAddress === tree.root_team.coordinator_address,
      }))),

    });
  };

  const standaloneTeamTasksView = (team: AgentTeamContext): CollaborationTasksContextView => {
    const view = team.view;
    return Object.freeze({ rootKind: 'agent_team', rootRunId: view.getRootTeamRunId(),
      focusedAgentRunId: view.getFocusedAgentRunId(),
      listDelegatedTaskEntries: () => Object.freeze(deriveDelegatedTaskEntries(
        team,
        view.getFocusedAgentRunId(),
      )),
      taskReferenceContentPath: (taskId: string, referenceId: string) =>
        `team-runs/${encodeURIComponent(view.getRootTeamRunId())}/task-delegations/${encodeURIComponent(taskId)}/references/${encodeURIComponent(referenceId)}/content`,
    });
  };

  const standaloneTeamMessagesView = (team: AgentTeamContext): CollaborationMessagesContextView => {
    const view = team.view;
    const entries = view.listAgentContextEntries();
    return Object.freeze({
      rootKind: 'agent_team',
      rootRunId: view.getRootTeamRunId(),
      focusedAgentRunId: view.getFocusedAgentRunId(),
      focusedMemberAddress: view.getFocusedMemberAddress(),
      memberIdentityByAgentRunId: () => Object.freeze(Object.fromEntries(entries.map((entry) => [
        entry.agentRunId,
        projectTeamCommunicationMemberIdentity(view, entry.agentRunId),
      ]))),
      listMessages: () => Object.freeze(projectTeamCommunicationPerspective({
        view,
        messages: view.listCommunicationMessages(),
        focusedAgentRunId: view.getFocusedAgentRunId(),
      }).messages),
      referenceContentPath: (messageId: string, referenceId: string) =>
        `team-runs/${encodeURIComponent(view.getRootTeamRunId())}/team-communication/messages/${encodeURIComponent(messageId)}/references/${encodeURIComponent(referenceId)}/content`,
    });
  };

  const activeWorkspaceTarget = computed<ActiveAgentWorkspaceTarget | null>(() => {
    if (route?.query.rootSubjectKind === 'agent_org' && (route.query.mode === 'active' || route.query.mode === 'history')) {
      const orgRunId = String(route.query.orgRunId || '');
      return agentOrgContextsStore.activeTargetFor(orgRunId);
    }
    if (selectionStore.selectedType === 'agent') {
      const context = agentContextsStore.activeRun || null;
      if (!context) return null;
      return Object.freeze({
        kind: 'standalone_agent', access: 'live', context,
        interaction: Object.freeze({
          send: async () => { await agentRunStore.sendUserInputAndSubscribe(); },
          interrupt: async () => { await agentRunStore.interruptGeneration(context.state.runId); },
          decideTool: async (invocationId: string, approved: boolean, reason: string | null) => {
            await agentRunStore.postToolExecutionApproval(context.state.runId, invocationId, approved, reason);
          },
        }),
        browse: Object.freeze({ kind: 'run', runId: context.state.runId }),
      });
    }
    if (selectionStore.selectedType === 'team') {
      const team = agentTeamContextsStore.activeTeamContext;
      const context = team?.view.getFocusedAgentContext() ?? null;
      if (!team || !context) return null;
      const teamView = standaloneTeamView(team);
      const target = {
        kind: 'standalone_team_member' as const, context, team: teamView,
        collaborationMessages: standaloneTeamMessagesView(team),
        collaborationTasks: standaloneTeamTasksView(team),
        browse: Object.freeze({
          kind: 'teamMember' as const, teamRunId: team.view.getRootTeamRunId(),
          memberAddress: team.view.getFocusedMemberAddress(), agentRunId: context.state.runId,
        }),
      };
      return team.view.getFocusedAgentAccess() === 'read_only'
        ? Object.freeze({ ...target, access: 'read_only' })
        : Object.freeze({ ...target, access: 'live',
          interaction: Object.freeze({
            send: async (content: string, paths: readonly ContextFilePath[]) => {
              await agentTeamRunStore.sendMessageToFocusedMember(content, [...paths]);
            },
            interrupt: async () => { await agentTeamRunStore.interruptFocusedMemberGeneration({
              teamRunId: team.view.getRootTeamRunId(), agentRunId: context.state.runId,
            }); },
            decideTool: async (
              invocationId: string,
              approved: boolean,
              reason: string | null,
              target?: ToolApprovalTarget | null,
            ) => {
              await agentTeamRunStore.postToolExecutionApproval(invocationId, approved, reason, target);
            },
          }),
        });
    }
    return null;
  });

  const activeAgentContext = computed<AgentContext | null>(() => {
    return activeWorkspaceTarget.value?.context ?? null;
  });

  const inspectAgentOrg = (orgRunId: string) => agentOrgContextsStore.openForInspection(orgRunId);
  const selectAgentOrg = agentOrgContextsStore.select;
  const disconnectAgentOrg = (orgRunId: string): void => agentOrgContextsStore.disconnect(orgRunId);
  const agentOrgContextFor = (orgRunId: string) => agentOrgContextsStore.contextFor(orgRunId);
  const agentOrgErrorFor = (orgRunId: string): string | null => agentOrgContextsStore.errorFor(orgRunId);

  const submissionPending = computed<boolean>(() => activeAgentContext.value?.submissionPending ?? false);
  const currentStatus = computed<AgentStatus>(
    () => activeAgentContext.value?.state.currentStatus ?? AgentStatus.Offline,
  );
  const currentRequirement = computed<string>(() => activeAgentContext.value?.requirement ?? '');
  const currentContextPaths = computed<ContextFilePath[]>(() => activeAgentContext.value?.contextFilePaths ?? []);
  const activeConfig = computed<AgentRunConfig | null>(() => activeAgentContext.value?.config ?? null);

  function _assertContext(context: AgentContext | null): asserts context is AgentContext {
    if (!context) {
      throw new Error('Operation failed: No active agent context.');
    }
  }

  const updateRequirementForContext = (context: AgentContext | null, text: string) => {
    if (context) {
      context.requirement = text;
    }
  };

  const updateRequirement = (text: string) => {
    updateRequirementForContext(activeAgentContext.value, text);
  };

  const addContextFilePathForContext = (context: AgentContext | null, filePath: ContextFilePath) => {
    if (context) {
      context.contextFilePaths.push(filePath);
    }
  };

  const addContextFilePath = (filePath: ContextFilePath) => {
    addContextFilePathForContext(activeAgentContext.value, filePath);
  };

  const removeContextFilePathForContext = (context: AgentContext | null, index: number) => {
    if (context && index >= 0) {
      context.contextFilePaths.splice(index, 1);
    }
  };

  const removeContextFilePath = (index: number) => {
    removeContextFilePathForContext(activeAgentContext.value, index);
  };

  const clearContextFilePathsForContext = (context: AgentContext | null) => {
    if (context) {
      context.contextFilePaths = [];
    }
  };

  const clearContextFilePaths = () => {
    clearContextFilePathsForContext(activeAgentContext.value);
  };

  const postToolExecutionApproval = async (
    invocationId: string,
    isApproved: boolean,
    reason: string | null = null,
    approvalTarget: ToolApprovalTarget | null = null,
  ) => {
    const target = activeWorkspaceTarget.value;
    if (!target || target.access !== 'live') throw new Error('Cannot approve tool: No active workspace target.');
    await target.interaction.decideTool(invocationId, isApproved, reason, approvalTarget);
  };

  const send = async () => {
    const context = activeAgentContext.value;
    _assertContext(context);

    const action = resolveAgentPrimaryAction({
      hasContext: true,
      status: context.state.currentStatus,
      submissionPending: context.submissionPending,
      isUploading: contextFileUploadStore.isUploading,
      hasDraft: Boolean(context.requirement.trim()),
    });
    if (action.kind !== 'send') {
      console.warn(`Send action aborted: Primary action is '${action.kind}'.`);
      return;
    }

    try {
      const target = activeWorkspaceTarget.value;
      if (!target || target.access === 'read_only') throw new Error('Cannot send: No active workspace target.');
      const port = target.access === 'continuable' ? target.continuation : target.interaction;
      await port.send(context.requirement, context.contextFilePaths);
    } catch (error) {
      console.error('Failed to send message via activeContextStore:', error);
      throw error;
    }
  };

  const interruptGeneration = () => {
    const context = activeAgentContext.value;
    _assertContext(context);

    const action = resolveAgentPrimaryAction({
      hasContext: true,
      status: context.state.currentStatus,
      submissionPending: context.submissionPending,
      isUploading: contextFileUploadStore.isUploading,
      hasDraft: Boolean(context.requirement.trim()),
    });
    if (action.kind !== 'interrupt') {
      console.warn(`Interrupt action aborted: Primary action is '${action.kind}'.`);
      return;
    }

    const target = activeWorkspaceTarget.value;
    if (!target || target.access !== 'live' || target.context !== context) {
      throw new Error('Cannot interrupt generation: Active workspace target is stale.');
    }
    return target.interaction.interrupt();
  };

  return {
    activeAgentContext,
    activeWorkspaceTarget,
    submissionPending,
    currentStatus,
    currentRequirement,
    currentContextPaths,
    activeConfig,
    inspectAgentOrg,
    selectAgentOrg,
    disconnectAgentOrg,
    agentOrgContextFor,
    agentOrgErrorFor,
    updateRequirementForContext,
    updateRequirement,
    addContextFilePathForContext,
    addContextFilePath,
    removeContextFilePathForContext,
    removeContextFilePath,
    clearContextFilePathsForContext,
    clearContextFilePaths,
    postToolExecutionApproval,
    send,
    interruptGeneration,
  };
});
