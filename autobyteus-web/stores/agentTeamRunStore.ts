import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { CreateAgentTeamRun, RestoreAgentTeamRun, TerminateAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { ConnectionState, TeamStreamingService } from '~/services/agentStreaming';
import type { TeamStreamRecoveryNotice } from '~/services/agentStreaming/TeamStreamingService';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { ContextAttachment } from '~/types/conversation';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ToolApprovalTarget } from '~/types/segments';
import { planContextAttachmentSubmission } from '~/utils/contextFiles/contextAttachmentSend';
import { buildTeamMemberDraftContextFileOwner, buildTeamMemberFinalContextFileOwner } from '~/utils/contextFiles/contextFileOwner';
import { buildTeamMemberTreeFromDefinition, flattenLeafAgentMemberNodes } from '~/utils/teamDefinitionMembers';
import { projectTeamRunLaunchRecords } from '~/utils/teamRunLaunchHierarchy';
import { applyOfflineOrTerminalCleanup } from '~/services/runStatus/agentRuntimeStatusState';
import {
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
  type LocalUserSubmissionHandle,
} from '~/services/runSubmission/localUserSubmission';
import { buildClientInterruptCommandId, buildClientMessageId, showInterruptCommandResult, showInterruptTransportFailure } from '~/services/agentStreaming/teamRunCommandPresentation';
import { hydrateLiveTeamRunContext } from '~/services/runHydration/teamRunContextHydrationService';
import { ensureRunHistoryWorkspaceByRootPath, resolveRunHistoryWorkspaceMetadataByRootPath } from '~/stores/runHistoryLoadActions';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { TeamLaunchRepairRequiredError, type TeamLaunchDraft } from '~/types/agent/TeamLaunchDraft';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { findConfiguredAgentByAddress } from '~/services/teamExecution/teamExecutionTreeSelectors';
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata';
import { useRightSideTabs } from '~/composables/useRightSideTabs';

const teamStreamingServices = new Map<string, TeamStreamingService>();
const inputDedupeKey = (rootTeamRunId: string, agentRunId: string, messageId: string) =>
  `member_input:${rootTeamRunId}:${agentRunId}:${messageId}`;
type CreatePayload = { createAgentTeamRun?: { success?: boolean; message?: string; teamRunId?: string | null } | null };
type RestorePayload = { restoreAgentTeamRun?: { success?: boolean; message?: string; teamRunId?: string | null } | null };
type TerminatePayload = { terminateAgentTeamRun?: { success?: boolean; message?: string } | null };
export interface FocusedTeamMemberInterruptTarget { teamRunId: string; agentRunId: string }

const cloneContextAttachment = (attachment: ContextAttachment): ContextAttachment => ({ ...attachment });

const transferDraftPendingInputs = (
  draft: TeamLaunchDraft,
  context: AgentTeamContext,
): void => {
  const transfers = Object.entries(draft.pendingInputsByMemberAddress).map(([memberAddress, input]) => {
    const execution = findConfiguredAgentByAddress(context.view.getExecutionTree(), memberAddress);
    const memberContext = execution ? context.view.getAgentContext(execution.agent_run_id) : null;
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
  state: () => ({
    stopPendingTeamIds: {} as Record<string, boolean>,
    streamRecoveryNoticesByRootTeamRunId: {} as Record<string, TeamStreamRecoveryNotice>,
  }),
  getters: {
    hasDraftLaunchInFlight: (): boolean => useTeamRunConfigStore().hasInFlightLaunch,
    isDraftLaunchPending: () => (draftId: TeamLaunchDraft['draftId'] | null): boolean => (
      useTeamRunConfigStore().isDraftLaunchInFlight(draftId)
    ),
    getTeamStreamRecoveryNotice: (state) => (rootTeamRunId: string): TeamStreamRecoveryNotice | null =>
      state.streamRecoveryNoticesByRootTeamRunId[rootTeamRunId] ?? null,
  },
  actions: {
    connectToTeamStream(rootTeamRunId: string): TeamStreamingService | null {
      const context = useAgentTeamContextsStore().getTeamContextById(rootTeamRunId);
      if (!context || context.view.getRootTeamRunId() !== rootTeamRunId) return null;
      const existing = teamStreamingServices.get(rootTeamRunId);
      if (existing) {
        if (existing.isReopenRequired) return existing;
        existing.attachContext(context);
        if (existing.connectionState === ConnectionState.DISCONNECTED) existing.connect(rootTeamRunId, context);
        return existing;
      }
      const wsEndpoint = useWindowNodeContextStore().getBoundEndpoints().teamWs;
      const service = new TeamStreamingService(wsEndpoint, {
        onInterruptCommandResult: showInterruptCommandResult,
        onInterruptCommandTransportFailure: showInterruptTransportFailure,
        onStreamRecoveryRequired: (notice) => {
          this.streamRecoveryNoticesByRootTeamRunId = {
            ...this.streamRecoveryNoticesByRootTeamRunId,
            [notice.rootTeamRunId]: notice,
          };
        },
      });
      teamStreamingServices.set(rootTeamRunId, service);
      service.connect(rootTeamRunId, context);
      return service;
    },
    isTeamStreamReady(rootTeamRunId: string): boolean { return teamStreamingServices.get(rootTeamRunId)?.isReady ?? false; },
    isTeamStreamReopenRequired(rootTeamRunId: string): boolean {
      return teamStreamingServices.get(rootTeamRunId)?.isReopenRequired ?? false;
    },
    async ensureTeamStreamConnected(rootTeamRunId: string): Promise<TeamStreamingService> {
      const service = this.connectToTeamStream(rootTeamRunId);
      if (!service) throw new Error(`Unable to connect Team stream for '${rootTeamRunId}'.`);
      if (service.isReopenRequired) {
        throw new Error('TEAM_STREAM_REOPEN_REQUIRED: Select this Team member again to reload the complete conversation.');
      }
      const timeoutAt = Date.now() + 10_000;
      while (Date.now() < timeoutAt) {
        if (service.connectionState === ConnectionState.CONNECTED && service.isReady) return service;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`Timed out waiting for Team stream handshake for '${rootTeamRunId}'.`);
    },
    async replaceFailedTeamStream(input: {
      rootTeamRunId: string;
      candidateContext: AgentTeamContext;
      expectedBaseChangeSequence: number;
    }): Promise<TeamStreamingService> {
      const previousService = teamStreamingServices.get(input.rootTeamRunId);
      const contexts = useAgentTeamContextsStore();
      const previousContext = contexts.getTeamContextById(input.rootTeamRunId);
      if (!previousService?.isReopenRequired || !previousContext) {
        throw new Error(`Team stream '${input.rootTeamRunId}' is not awaiting recovery.`);
      }
      if (input.candidateContext.view.getRootTeamRunId() !== input.rootTeamRunId) {
        throw new Error('Candidate Team context root identity mismatch.');
      }
      const wsEndpoint = useWindowNodeContextStore().getBoundEndpoints().teamWs;
      const candidate = new TeamStreamingService(wsEndpoint, {
        onInterruptCommandResult: showInterruptCommandResult,
        onInterruptCommandTransportFailure: showInterruptTransportFailure,
        onStreamRecoveryRequired: (notice) => {
          this.streamRecoveryNoticesByRootTeamRunId = {
            ...this.streamRecoveryNoticesByRootTeamRunId,
            [notice.rootTeamRunId]: notice,
          };
        },
      });
      let timeout: ReturnType<typeof setTimeout> | null = null;
      try {
        await Promise.race([
          candidate.connectCandidate(
            input.rootTeamRunId,
            input.candidateContext,
            input.expectedBaseChangeSequence,
          ),
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => reject(new Error(`Timed out waiting for recovery snapshot for '${input.rootTeamRunId}'.`)), 10_000);
          }),
        ]);
        if (teamStreamingServices.get(input.rootTeamRunId) !== previousService
          || contexts.getTeamContextById(input.rootTeamRunId) !== previousContext
          || !previousService.isReopenRequired) {
          throw new Error(`Team stream '${input.rootTeamRunId}' changed before recovery commit.`);
        }
        contexts.replaceTeamContext(input.rootTeamRunId, previousContext, input.candidateContext);
        teamStreamingServices.set(input.rootTeamRunId, candidate);
        const notices = { ...this.streamRecoveryNoticesByRootTeamRunId };
        delete notices[input.rootTeamRunId];
        this.streamRecoveryNoticesByRootTeamRunId = notices;
        previousService.disconnect();
        return candidate;
      } catch (error) {
        candidate.disconnect();
        throw error;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    },
    disconnectTeamStream(rootTeamRunId: string): void {
      const service = teamStreamingServices.get(rootTeamRunId);
      if (!service) return;
      service.disconnect(); teamStreamingServices.delete(rootTeamRunId);
      const notices = { ...this.streamRecoveryNoticesByRootTeamRunId };
      delete notices[rootTeamRunId];
      this.streamRecoveryNoticesByRootTeamRunId = notices;
    },
    async terminateTeamRun(rootTeamRunId: string): Promise<boolean> {
      const team = useAgentTeamContextsStore().getTeamContextById(rootTeamRunId);
      if (!rootTeamRunId.trim() || this.stopPendingTeamIds[rootTeamRunId] || (team && !team.view.isRootTeamActive())) return false;
      this.stopPendingTeamIds = { ...this.stopPendingTeamIds, [rootTeamRunId]: true };
      try {
        const { data, errors } = await getApolloClient().mutate<TerminatePayload>({ mutation: TerminateAgentTeamRun, variables: { teamRunId: rootTeamRunId } });
        if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        if (!data?.terminateAgentTeamRun?.success) throw new Error(data?.terminateAgentTeamRun?.message || 'Team termination failed.');
        this.disconnectTeamStream(rootTeamRunId);
        team?.view.setRootTeamActive(false);
        team?.view.listAgentContextEntries().forEach(({ agentContext }) => {
          applyOfflineOrTerminalCleanup(agentContext); useAgentActivityStore().clearActivities(agentContext.state.runId);
        });
        const history = useRunHistoryStore();
        history.markTeamAsInactive(rootTeamRunId);
        await history.refreshTeamResumeConfig(rootTeamRunId).catch((refreshError) => {
          console.warn(`Team '${rootTeamRunId}' stopped, but its editable configuration could not be refreshed.`, refreshError);
        });
        void history.refreshTreeQuietly();
        return true;
      } catch (error) { console.error(`Error terminating Team '${rootTeamRunId}':`, error); return false; }
      finally { const next = { ...this.stopPendingTeamIds }; delete next[rootTeamRunId]; this.stopPendingTeamIds = next; }
    },
    async terminateActiveTeam() {
      const team = useAgentTeamContextsStore().activeTeamContext;
      if (team) await this.terminateTeamRun(team.view.getRootTeamRunId());
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
      let rootTeamRunId: string | null = team?.view.getRootTeamRunId() ?? null;
      let targetAgentRunId = team?.view.getFocusedAgentRunId() ?? null;
      let localSubmission: LocalUserSubmissionHandle | null = null;
      let draftOwnerId = draft?.draftId ?? rootTeamRunId;
      try {
        if (draft) {
          const launched = await this.launchDraft(draft);
          rootTeamRunId = launched.rootTeamRunId;
          targetAgentRunId = launched.agentRunId;
          team = launched.context;
          draftOwnerId = draft.draftId;
        } else if (team && rootTeamRunId && !team.view.isRootTeamActive()) {
          const { data, errors } = await getApolloClient().mutate<RestorePayload>({ mutation: RestoreAgentTeamRun, variables: { teamRunId: rootTeamRunId } });
          if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
          if (!data?.restoreAgentTeamRun?.success) throw new Error(data?.restoreAgentTeamRun?.message || 'Team restore failed.');
          const hydrated = await this.hydrateRun(rootTeamRunId, { agentRunId: targetAgentRunId });
          contexts.addTeamContext(hydrated);
          team = hydrated; targetAgentRunId = hydrated.view.getFocusedAgentRunId();
        }
        if (!team || !targetAgentRunId || !rootTeamRunId || !draftOwnerId) throw new Error('Canonical Team execution was not created.');
        team.view.setRootTeamActive(true);
        const member = team.view.getAgentContext(targetAgentRunId);
        const memberAddress = team.view.getMemberAddress(targetAgentRunId);
        if (!member || !memberAddress) throw new Error(`Focused Team AgentRun '${targetAgentRunId}' is not available.`);
        localSubmission = beginLocalUserSubmission(member, {
          text, attachments: contextAttachments,
          navigationTarget: { kind: 'team_member', teamRunId: rootTeamRunId, agentRunId: targetAgentRunId },
        });
        const draftOwner = buildTeamMemberDraftContextFileOwner(draftOwnerId, memberAddress);
        const finalized = await useContextFileUploadStore().finalizeDraftAttachments({
          draftOwner,
          finalOwner: buildTeamMemberFinalContextFileOwner(rootTeamRunId, memberAddress),
          attachments: contextAttachments,
        });
        const plan = planContextAttachmentSubmission(finalized);
        const messageId = buildClientMessageId();
        const dedupeKey = inputDedupeKey(rootTeamRunId, targetAgentRunId, messageId);
        localSubmission.message.messageId = messageId;
        localSubmission.message.dedupeKey = dedupeKey;
        finalizeLocalSubmissionAttachments(localSubmission, plan.retainedMessageAttachments);
        useRunHistoryStore().markTeamAsActive(rootTeamRunId);
        void useRunHistoryStore().refreshTreeQuietly();
        const service = await this.ensureTeamStreamConnected(rootTeamRunId);
        service.sendMessage(text, targetAgentRunId, plan.executable.contextFilePaths, plan.executable.imageUrls, { messageId, dedupeKey });
      } catch (error) {
        if (localSubmission) { failLocalSubmission(localSubmission, error); applyOfflineOrTerminalCleanup(localSubmission.context, AgentStatus.Error); return; }
        throw error;
      }
    },
    async postToolExecutionApproval(invocationId: string, isApproved: boolean, reason: string | null = null, target: ToolApprovalTarget | null = null) {
      const team = useAgentTeamContextsStore().activeTeamContext;
      if (!team) return;
      const service = teamStreamingServices.get(team.view.getRootTeamRunId());
      if (!service) return;
      isApproved ? service.approveTool(invocationId, target, reason || undefined) : service.denyTool(invocationId, target, reason || undefined);
    },
    interruptFocusedMemberGeneration(target: FocusedTeamMemberInterruptTarget): boolean {
      const team = useAgentTeamContextsStore().getTeamContextById(target.teamRunId);
      if (!team?.view.hasAgentRun(target.agentRunId)) return false;
      return teamStreamingServices.get(target.teamRunId)?.interruptGeneration(
        buildClientInterruptCommandId(),
        { agentRunId: target.agentRunId },
      ) ?? false;
    },
    async hydrateRun(rootTeamRunId: string, target: { agentRunId?: string | null; memberAddress?: string | null } = {}) {
      const payload = await hydrateLiveTeamRunContext({
        teamRunId: rootTeamRunId,
        agentRunId: target.agentRunId,
        memberAddress: target.memberAddress,
        resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
        ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
      });
      return payload.hydratedContext;
    },
    async launchDraft(draft: TeamLaunchDraft) {
      const drafts = useTeamRunConfigStore();
      const definitions = useAgentTeamDefinitionStore();
      const resolveMemberTree = () => {
        const definition = definitions.getAgentTeamDefinitionById(draft.config.teamDefinitionId);
        if (!definition) throw new Error(`Team definition '${draft.config.teamDefinitionId}' was not found.`);
        return buildTeamMemberTreeFromDefinition(definition, {
          getTeamDefinitionById: (id) => definitions.getAgentTeamDefinitionById(id),
        });
      };
      const preparation = drafts.reconcileAndPlanSelectedDraftLaunch(draft, resolveMemberTree());
      if (preparation.status === 'repaired') {
        throw new TeamLaunchRepairRequiredError(preparation.addresses);
      }
      if (preparation.status === 'blocked') {
        throw new Error('Enter a workspace path to run this team.');
      }
      const plan = preparation.plan;
      let admittedDraft: TeamLaunchDraft | null = null;
      try {
        const workspaceStore = useWorkspaceStore();
        for (const request of plan.requests) {
          const authorization = drafts.authorizeWorkspacePreparationRequest(
            plan,
            resolveMemberTree(),
            request.teamAddresses,
          );
          if (authorization.status === 'repaired') {
            throw new TeamLaunchRepairRequiredError(authorization.addresses, true);
          }
          try {
            const workspaceId = await workspaceStore.createWorkspace({ root_path: request.rootPath });
            const workspace = workspaceStore.workspaces[workspaceId] ?? null;
            const workspaceMetadata = workspaceStore.workspaceMetadataById[workspaceId]
              ?? (workspace ? workspaceStore.registerWorkspaceInfoMetadata(workspace) : null)
              ?? createWorkspaceMetadata({ workspaceId, workspaceRootPath: request.rootPath });
            const completion = drafts.completeWorkspacePreparation(
              plan,
              resolveMemberTree(),
              request.teamAddresses,
              { workspaceId, workspaceMetadata },
            );
            if (completion.status === 'repaired') {
              throw new TeamLaunchRepairRequiredError(completion.addresses, true);
            }
          } catch (error) {
            if (drafts.isWorkspacePreparationActive(plan)) {
              const failure = drafts.failWorkspacePreparation(
                plan,
                resolveMemberTree(),
                request.teamAddresses,
                error instanceof Error ? error.message : 'Failed to load workspace',
              );
              if (failure.status === 'repaired') {
                throw new TeamLaunchRepairRequiredError(failure.addresses, true);
              }
            }
            throw error;
          }
        }
        if (plan.requests.length) useRightSideTabs().setActiveTab('files');
        const finalized = drafts.finalizeWorkspacePreparation(plan, resolveMemberTree());
        if (finalized.status === 'repaired') {
          throw new TeamLaunchRepairRequiredError(finalized.addresses, true);
        }
        const currentDraft = finalized.draft;
        const memberTree = resolveMemberTree();
        const readiness = drafts.launchReadiness;
        if (!readiness.canLaunch) throw new Error(readiness.blockingIssues[0]?.message || 'Team configuration is not launch-ready.');
        drafts.admitPreparedDraftLaunch(plan, currentDraft);
        admittedDraft = currentDraft;
        const leafMembers = flattenLeafAgentMemberNodes(memberTree);
        if (!leafMembers.some((member) => member.address === currentDraft.focusedMemberAddress)) throw new Error(`Draft focus '${currentDraft.focusedMemberAddress}' is stale.`);
        const leafAddresses = new Set(leafMembers.map((member) => member.address));
        const stalePendingAddress = Object.keys(currentDraft.pendingInputsByMemberAddress).find((address) => !leafAddresses.has(address));
        if (stalePendingAddress) throw new Error(`Draft input target '${stalePendingAddress}' is stale.`);
        const { teamConfigs, memberConfigs } = projectTeamRunLaunchRecords(currentDraft.config, memberTree);
        const { data, errors } = await getApolloClient().mutate<CreatePayload>({
          mutation: CreateAgentTeamRun,
          variables: { input: { teamDefinitionId: currentDraft.config.teamDefinitionId, teamConfigs, memberConfigs } },
        });
        if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        const result = data?.createAgentTeamRun;
        if (!result?.success || !result.teamRunId) throw new Error(result?.message || 'Team launch failed without a real TeamRun ID.');
        const context = await this.hydrateRun(result.teamRunId, { memberAddress: currentDraft.focusedMemberAddress });
        const execution = findConfiguredAgentByAddress(context.view.getExecutionTree(), currentDraft.focusedMemberAddress);
        if (!execution || !context.view.hasAgentRun(execution.agent_run_id)) throw new Error(`Launched Team is missing '${currentDraft.focusedMemberAddress}'.`);
        const focusResult = context.view.focusAgent(execution.agent_run_id);
        if (focusResult.disposition === 'rejected') throw new Error(focusResult.message);
        transferDraftPendingInputs(currentDraft, context);
        const contexts = useAgentTeamContextsStore();
        if (contexts.getTeamContextById(result.teamRunId)) throw new Error(`TeamRun '${result.teamRunId}' is already registered.`);
        contexts.addTeamContext(context);
        useAgentSelectionStore().promoteTeamDraftLaunch(currentDraft.draftId, result.teamRunId);
        drafts.completeDraftLaunch(currentDraft);
        return { rootTeamRunId: result.teamRunId, agentRunId: execution.agent_run_id, context };
      } finally {
        drafts.cancelWorkspacePreparation(plan);
        if (admittedDraft) drafts.releaseDraftLaunch(admittedDraft);
      }
    },
  },
});
