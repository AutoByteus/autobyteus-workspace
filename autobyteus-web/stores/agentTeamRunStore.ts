import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { CreateAgentTeamRun, RestoreAgentTeamRun, TerminateAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations';
import type { TeamMemberConfigInput } from '~/generated/graphql';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { ConnectionState, TeamStreamingService } from '~/services/agentStreaming';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { ContextAttachment } from '~/types/conversation';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ToolApprovalTarget } from '~/types/segments';
import { planContextAttachmentSubmission } from '~/utils/contextFiles/contextAttachmentSend';
import { buildTeamMemberDraftContextFileOwner, buildTeamMemberFinalContextFileOwner } from '~/utils/contextFiles/contextFileOwner';
import { resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers';
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder';
import { evaluateTeamRunLaunchReadiness } from '~/utils/teamRunLaunchReadiness';
import { applyOfflineOrTerminalCleanup } from '~/services/runStatus/agentRuntimeStatusState';
import {
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
  type LocalUserSubmissionHandle,
} from '~/services/runSubmission/localUserSubmission';
import { createTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { buildClientInterruptCommandId, buildClientMessageId, showInterruptCommandResult, showInterruptTransportFailure } from '~/services/agentStreaming/teamRunCommandPresentation';
import { hydrateLiveTeamRunContext } from '~/services/runHydration/teamRunContextHydrationService';
import { ensureRunHistoryWorkspaceByRootPath, resolveRunHistoryWorkspaceMetadataByRootPath } from '~/stores/runHistoryLoadActions';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { TeamLaunchDraft } from '~/types/agent/TeamLaunchDraft';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

const teamStreamingServices = new Map<string, TeamStreamingService>();
const inputDedupeKey = (rootTeamRunId: string, executionKey: string, messageId: string) =>
  `member_input:${rootTeamRunId}:${executionKey}:${messageId}`;
const mutableConfig = (config: Readonly<TeamRunConfig>): TeamRunConfig => ({
  ...config,
  workspaceMetadata: config.workspaceMetadata ? { ...config.workspaceMetadata } : null,
  memberOverrides: Object.fromEntries(Object.entries(config.memberOverrides).map(([address, override]) => [address, { ...override }])),
});

type CreatePayload = { createAgentTeamRun?: { success?: boolean; message?: string; teamRunId?: string | null } | null };
type RestorePayload = { restoreAgentTeamRun?: { success?: boolean; message?: string; teamRunId?: string | null } | null };
type TerminatePayload = { terminateAgentTeamRun?: { success?: boolean; message?: string } | null };
export interface FocusedTeamMemberInterruptTarget { teamRunId: string; executionAddress: TeamExecutionAddress }

const cloneContextAttachment = (attachment: ContextAttachment): ContextAttachment => ({ ...attachment });

const transferDraftPendingInputs = (
  draft: TeamLaunchDraft,
  rootTeamRunId: string,
  context: AgentTeamContext,
): void => {
  const transfers = Object.entries(draft.pendingInputsByMemberAddress).map(([memberAddress, input]) => {
    const executionAddress = createTeamExecutionAddress({ rootTeamRunId, memberAddress });
    const memberContext = context.executions.getAgentContext(executionAddress);
    if (!memberContext) throw new Error(`Draft input target '${memberAddress}' is not an exact launched Agent execution.`);
    if (memberContext.requirement || memberContext.contextFilePaths.length > 0 || memberContext.submissionPending) {
      throw new Error(`Launched Agent execution '${memberAddress}' already owns composer state.`);
    }
    return {
      memberContext,
      text: input.text,
      attachments: input.attachments.map(cloneContextAttachment),
    };
  });
  transfers.forEach(({ memberContext, text, attachments }) => {
    memberContext.requirement = text;
    memberContext.contextFilePaths = attachments;
  });
};

export const useAgentTeamRunStore = defineStore('agentTeamRun', {
  state: () => ({ isLaunching: false, stopPendingTeamIds: {} as Record<string, boolean> }),
  actions: {
    connectToTeamStream(rootTeamRunId: string): TeamStreamingService | null {
      const context = useAgentTeamContextsStore().getTeamContextById(rootTeamRunId);
      if (!context || context.executions.getRootTeamRunId() !== rootTeamRunId) return null;
      const existing = teamStreamingServices.get(rootTeamRunId);
      if (existing) {
        existing.attachContext(context);
        if (existing.connectionState === ConnectionState.DISCONNECTED) existing.connect(rootTeamRunId, context);
        return existing;
      }
      const wsEndpoint = useWindowNodeContextStore().getBoundEndpoints().teamWs;
      const service = new TeamStreamingService(wsEndpoint, {
        onInterruptCommandResult: showInterruptCommandResult,
        onInterruptCommandTransportFailure: showInterruptTransportFailure,
      });
      teamStreamingServices.set(rootTeamRunId, service);
      service.connect(rootTeamRunId, context);
      return service;
    },
    isTeamStreamReady(rootTeamRunId: string): boolean { return teamStreamingServices.get(rootTeamRunId)?.isReady ?? false; },
    async ensureTeamStreamConnected(rootTeamRunId: string): Promise<TeamStreamingService> {
      const service = this.connectToTeamStream(rootTeamRunId);
      if (!service) throw new Error(`Unable to connect Team stream for '${rootTeamRunId}'.`);
      const timeoutAt = Date.now() + 10_000;
      while (Date.now() < timeoutAt) {
        if (service.connectionState === ConnectionState.CONNECTED && service.isReady) return service;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`Timed out waiting for Team stream handshake for '${rootTeamRunId}'.`);
    },
    disconnectTeamStream(rootTeamRunId: string): void {
      const service = teamStreamingServices.get(rootTeamRunId);
      if (!service) return;
      service.disconnect(); teamStreamingServices.delete(rootTeamRunId);
    },
    async terminateTeamRun(rootTeamRunId: string): Promise<boolean> {
      const team = useAgentTeamContextsStore().getTeamContextById(rootTeamRunId);
      if (!rootTeamRunId.trim() || this.stopPendingTeamIds[rootTeamRunId] || (team && !team.executions.isRootTeamActive())) return false;
      this.stopPendingTeamIds = { ...this.stopPendingTeamIds, [rootTeamRunId]: true };
      try {
        const { data, errors } = await getApolloClient().mutate<TerminatePayload>({ mutation: TerminateAgentTeamRun, variables: { teamRunId: rootTeamRunId } });
        if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        if (!data?.terminateAgentTeamRun?.success) throw new Error(data?.terminateAgentTeamRun?.message || 'Team termination failed.');
        this.disconnectTeamStream(rootTeamRunId);
        team?.executions.setRootTeamActive(false);
        team?.executions.listAgentContextEntries().forEach(({ agentContext }) => {
          applyOfflineOrTerminalCleanup(agentContext); useAgentActivityStore().clearActivities(agentContext.state.runId);
        });
        useRunHistoryStore().markTeamAsInactive(rootTeamRunId);
        void useRunHistoryStore().refreshTreeQuietly();
        return true;
      } catch (error) { console.error(`Error terminating Team '${rootTeamRunId}':`, error); return false; }
      finally { const next = { ...this.stopPendingTeamIds }; delete next[rootTeamRunId]; this.stopPendingTeamIds = next; }
    },
    async terminateActiveTeam() {
      const team = useAgentTeamContextsStore().activeTeamContext;
      if (team) await this.terminateTeamRun(team.executions.getRootTeamRunId());
    },
    async sendMessageToFocusedMember(text: string, contextAttachments: ContextAttachment[]) {
      const contexts = useAgentTeamContextsStore();
      const drafts = useTeamRunConfigStore();
      const selection = useAgentSelectionStore();
      let team = contexts.activeTeamContext;
      let draft = selection.selectedType === 'team_draft' && selection.selectedDraftId === drafts.selectedDraft?.draftId
        ? drafts.selectedDraft
        : null;
      if (!team && !draft) throw new Error('No Team run or launch draft is selected.');
      if (draft) {
        const draftId = draft.draftId;
        drafts.setPendingInput(draft.focusedMemberAddress, { text, attachments: contextAttachments });
        draft = drafts.selectedDraft;
        if (!draft || draft.draftId !== draftId) throw new Error('Selected Team launch draft changed before launch.');
      }
      let rootTeamRunId: string | null = team?.executions.getRootTeamRunId() ?? null;
      let target = team?.executions.getFocusedAddress() ?? null;
      let localSubmission: LocalUserSubmissionHandle | null = null;
      let draftOwnerId = draft?.draftId ?? rootTeamRunId;
      this.isLaunching = Boolean(draft);
      try {
        if (draft) {
          const launched = await this.launchDraft(draft);
          rootTeamRunId = launched.rootTeamRunId;
          target = launched.executionAddress;
          team = launched.context;
          draftOwnerId = draft.draftId;
        } else if (team && rootTeamRunId && !team.executions.isRootTeamActive()) {
          const { data, errors } = await getApolloClient().mutate<RestorePayload>({ mutation: RestoreAgentTeamRun, variables: { teamRunId: rootTeamRunId } });
          if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
          if (!data?.restoreAgentTeamRun?.success) throw new Error(data?.restoreAgentTeamRun?.message || 'Team restore failed.');
          const hydrated = await this.hydrateRun(rootTeamRunId, target?.memberAddress ?? null);
          contexts.addTeamContext(hydrated);
          team = hydrated; target = hydrated.executions.getFocusedAddress();
        }
        if (!team || !target || !rootTeamRunId || !draftOwnerId) throw new Error('Canonical Team execution was not created.');
        team.executions.setRootTeamActive(true);
        const member = team.executions.getAgentContext(target);
        if (!member) throw new Error(`Focused Team execution '${target.memberAddress}' is not an Agent.`);
        const executionKey = serializeTeamExecutionAddress(target);
        localSubmission = beginLocalUserSubmission(member, {
          text, attachments: contextAttachments,
          navigationTarget: { kind: 'team_member', teamRunId: rootTeamRunId, executionAddress: target },
        });
        const draftOwner = buildTeamMemberDraftContextFileOwner(draftOwnerId, target.memberAddress);
        const finalized = await useContextFileUploadStore().finalizeDraftAttachments({
          draftOwner,
          finalOwner: buildTeamMemberFinalContextFileOwner(rootTeamRunId, target.memberAddress),
          attachments: contextAttachments,
        });
        const plan = planContextAttachmentSubmission(finalized);
        const messageId = buildClientMessageId();
        const dedupeKey = inputDedupeKey(rootTeamRunId, executionKey, messageId);
        localSubmission.message.messageId = messageId;
        localSubmission.message.dedupeKey = dedupeKey;
        finalizeLocalSubmissionAttachments(localSubmission, plan.retainedMessageAttachments);
        useRunHistoryStore().markTeamAsActive(rootTeamRunId);
        void useRunHistoryStore().refreshTreeQuietly();
        const service = await this.ensureTeamStreamConnected(rootTeamRunId);
        service.sendMessage(text, target, plan.executable.contextFilePaths, plan.executable.imageUrls, { messageId, dedupeKey });
      } catch (error) {
        if (localSubmission) { failLocalSubmission(localSubmission, error); applyOfflineOrTerminalCleanup(localSubmission.context, AgentStatus.Error); return; }
        throw error;
      } finally { this.isLaunching = false; }
    },
    async postToolExecutionApproval(invocationId: string, isApproved: boolean, reason: string | null = null, target: ToolApprovalTarget | null = null) {
      const team = useAgentTeamContextsStore().activeTeamContext;
      if (!team) return;
      const service = teamStreamingServices.get(team.executions.getRootTeamRunId());
      if (!service) return;
      isApproved ? service.approveTool(invocationId, target, reason || undefined) : service.denyTool(invocationId, target, reason || undefined);
    },
    interruptFocusedMemberGeneration(target: FocusedTeamMemberInterruptTarget): boolean {
      const address = createTeamExecutionAddress(target.executionAddress);
      if (address.rootTeamRunId !== target.teamRunId.trim()) return false;
      return teamStreamingServices.get(target.teamRunId)?.interruptGeneration(buildClientInterruptCommandId(), { executionAddress: address }) ?? false;
    },
    async hydrateRun(rootTeamRunId: string, memberAddress: string | null) {
      const payload = await hydrateLiveTeamRunContext({
        teamRunId: rootTeamRunId,
        memberAddress,
        resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
        ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
      });
      return payload.hydratedContext;
    },
    async launchDraft(draft: TeamLaunchDraft) {
      const drafts = useTeamRunConfigStore();
      const registeredDraft = drafts.drafts.get(draft.draftId) ?? null;
      if (registeredDraft && (registeredDraft !== draft || drafts.selectedDraftId !== draft.draftId)) {
        throw new Error(`Team launch draft '${draft.draftId}' is not the exact selected snapshot.`);
      }
      const definitions = useAgentTeamDefinitionStore();
      const definition = definitions.getAgentTeamDefinitionById(draft.config.teamDefinitionId);
      if (!definition) throw new Error(`Team definition '${draft.config.teamDefinitionId}' was not found.`);
      const leafMembers = resolveLeafTeamMembers(definition, { getTeamDefinitionById: (id) => definitions.getAgentTeamDefinitionById(id) });
      if (!leafMembers.some((member) => member.address === draft.focusedMemberAddress)) throw new Error(`Draft focus '${draft.focusedMemberAddress}' is stale.`);
      const leafAddresses = new Set(leafMembers.map((member) => member.address));
      const stalePendingAddress = Object.keys(draft.pendingInputsByMemberAddress).find((address) => !leafAddresses.has(address));
      if (stalePendingAddress) throw new Error(`Draft input target '${stalePendingAddress}' is stale.`);
      const readiness = evaluateTeamRunLaunchReadiness(draft.config, drafts.runtimeModelCatalogs);
      if (!readiness.canLaunch) throw new Error(readiness.blockingIssues[0]?.message || 'Team configuration is not launch-ready.');
      const memberConfigs = buildTeamRunMemberConfigRecords({ config: mutableConfig(draft.config), leafMembers })
        .map(({ workspaceMetadata: _workspaceMetadata, displayName: _displayName, ...config }) => ({
          ...config,
          skillAccessMode: config.skillAccessMode as TeamMemberConfigInput['skillAccessMode'],
        }));
      const { data, errors } = await getApolloClient().mutate<CreatePayload>({
        mutation: CreateAgentTeamRun,
        variables: { input: { teamDefinitionId: draft.config.teamDefinitionId, memberConfigs } },
      });
      if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
      const result = data?.createAgentTeamRun;
      if (!result?.success || !result.teamRunId) throw new Error(result?.message || 'Team launch failed without a real TeamRun ID.');
      const context = await this.hydrateRun(result.teamRunId, draft.focusedMemberAddress);
      const executionAddress = createTeamExecutionAddress({ rootTeamRunId: result.teamRunId, memberAddress: draft.focusedMemberAddress });
      if (!context.executions.hasExecution(executionAddress)) throw new Error(`Launched Team is missing '${draft.focusedMemberAddress}'.`);
      const focusResult = context.executions.focus(executionAddress);
      if (focusResult.disposition === 'rejected') throw new Error(focusResult.message);
      if (registeredDraft && drafts.drafts.get(draft.draftId) !== draft) {
        throw new Error(`Team launch draft '${draft.draftId}' changed while launch was pending.`);
      }
      transferDraftPendingInputs(draft, result.teamRunId, context);
      const contexts = useAgentTeamContextsStore();
      if (contexts.getTeamContextById(result.teamRunId)) throw new Error(`TeamRun '${result.teamRunId}' is already registered.`);
      contexts.addTeamContext(context);
      useAgentSelectionStore().selectRunWithoutShellNavigation(result.teamRunId, 'team');
      drafts.removeDraft(draft.draftId);
      return { rootTeamRunId: result.teamRunId, executionAddress, context };
    },
  },
});
