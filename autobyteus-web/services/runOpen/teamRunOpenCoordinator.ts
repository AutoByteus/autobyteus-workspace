import type { TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { useAgentSelectionStore, type WorkspaceSelectionIntent, type SupersededSelection } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import {
  hydrateLiveTeamRunContext,
  hydrateTeamRunContextForStreamRecovery,
} from '~/services/runHydration/teamRunContextHydrationService';
import {
  commitTeamRunHydrationActivities,
  markCommittedTeamRunHydrationAuthority,
} from '~/services/runHydration/teamRunHydrationCommit';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';

export type TeamRunOpenSelectionMode = 'desktop' | 'mobile';
export interface OpenTeamRunWithCoordinatorInput {
  teamRunId: string;
  agentRunId?: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
  selectionIntent?: WorkspaceSelectionIntent;
  selectionMode?: TeamRunOpenSelectionMode;
  onCommitted?: (result: OpenTeamRunWithCoordinatorResult) => void;
}
export interface OpenTeamRunWithCoordinatorResult {
  disposition: 'committed';
  teamRunId: string;
  focusedAgentRunId: string;
  focusedMemberAddress: string;
  resumeConfig: TeamRunResumeConfigPayload;
}

export function openTeamRun(input: OpenTeamRunWithCoordinatorInput & { selectRun: false }): Promise<OpenTeamRunWithCoordinatorResult>;
export function openTeamRun(input: OpenTeamRunWithCoordinatorInput): Promise<OpenTeamRunWithCoordinatorResult | SupersededSelection>;
export async function openTeamRun(input: OpenTeamRunWithCoordinatorInput): Promise<OpenTeamRunWithCoordinatorResult | SupersededSelection> {
  const intent = input.selectRun === false ? undefined
    : input.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  const contexts = useAgentTeamContextsStore();
  if (contexts.getTeamContextById(input.teamRunId)) {
    throw new Error(`Team context '${input.teamRunId}' is already mounted.`);
  }
  const preferredAgentRunId = input.agentRunId?.trim() || null;
  const runStore = useAgentTeamRunStore();
  let hydrated: Awaited<ReturnType<typeof hydrateLiveTeamRunContext>>;
  try {
    hydrated = await hydrateLiveTeamRunContext({ ...input, agentRunId: preferredAgentRunId });
  } catch (error) {
    if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
    throw error;
  }
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  const context = hydrated.hydratedContext;
  if (contexts.getTeamContextById(input.teamRunId)) {
    throw new Error(`Team context '${input.teamRunId}' became mounted while it was loading.`);
  }
  if (context.view.getRootTeamRunId() !== input.teamRunId
    || context.view.getFocusedAgentRunId() !== hydrated.focusedAgentRunId
    || hydrated.projectionByAgentRunId.get(hydrated.focusedAgentRunId) == null) {
    throw new Error(`Team '${input.teamRunId}' did not load its exact focused AgentRun.`);
  }
  commitTeamRunHydrationActivities(hydrated);
  contexts.addTeamContext(context);
  markCommittedTeamRunHydrationAuthority(hydrated);
  const focusedAgentRunId = context.view.getFocusedAgentRunId();
  const focusedMemberAddress = context.view.getFocusedMemberAddress();

  if (input.selectRun !== false) {
    const selection = useAgentSelectionStore();
    input.selectionMode === 'mobile'
      ? selection.selectRunWithoutShellNavigation(input.teamRunId, 'team')
      : selection.selectRun(input.teamRunId, 'team');
    useTeamRunConfigStore().selectDraft(null);
    useAgentRunConfigStore().clearConfig();
  }
  const result: OpenTeamRunWithCoordinatorResult = {
    disposition: 'committed',
    teamRunId: input.teamRunId,
    focusedAgentRunId,
    focusedMemberAddress,
    resumeConfig: hydrated.resumeConfig,
  };
  input.onCommitted?.(result);
  if (context.view.isRootTeamActive()) runStore.connectToTeamStream(input.teamRunId);
  else runStore.disconnectTeamStream(input.teamRunId);
  return result;
}

export function reopenTeamRunAfterStreamLoss(input: OpenTeamRunWithCoordinatorInput & { selectRun: false }): Promise<OpenTeamRunWithCoordinatorResult>;
export function reopenTeamRunAfterStreamLoss(input: OpenTeamRunWithCoordinatorInput): Promise<OpenTeamRunWithCoordinatorResult | SupersededSelection>;
export async function reopenTeamRunAfterStreamLoss(input: OpenTeamRunWithCoordinatorInput): Promise<OpenTeamRunWithCoordinatorResult | SupersededSelection> {
  const intent = input.selectRun === false ? undefined
    : input.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  const contexts = useAgentTeamContextsStore();
  const current = contexts.getTeamContextById(input.teamRunId);
  const preferredAgentRunId = input.agentRunId?.trim()
    || current?.view.getFocusedAgentRunId()
    || null;
  if (!current || !preferredAgentRunId) {
    throw new Error(`Failed Team context '${input.teamRunId}' is not available for recovery.`);
  }
  const runStore = useAgentTeamRunStore();
  if (!runStore.isTeamStreamReopenRequired(input.teamRunId)) {
    throw new Error(`Team stream '${input.teamRunId}' is not awaiting recovery.`);
  }
  let hydrated: Awaited<ReturnType<typeof hydrateTeamRunContextForStreamRecovery>>;
  try {
    hydrated = await hydrateTeamRunContextForStreamRecovery({ ...input, agentRunId: preferredAgentRunId });
  } catch (error) {
    if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
    throw error;
  }
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  const context = hydrated.hydratedContext;
  const focus = context.view.focusAgentForInspection(preferredAgentRunId);
  if (focus.disposition === 'rejected') throw new Error(focus.message);
  try {
    await runStore.replaceFailedTeamStream({
      rootTeamRunId: input.teamRunId,
      candidateContext: context,
      expectedBaseChangeSequence: hydrated.expectedBaseChangeSequence,
      beforeContextCommit: () => {
        if (intent && !intent.isCurrent()) throw new Error('Workspace selection superseded.');
        commitTeamRunHydrationActivities(hydrated);
      },
    });
  } catch (error) {
    if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
    throw error;
  }
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  markCommittedTeamRunHydrationAuthority(hydrated);
  const focusedAgentRunId = context.view.getFocusedAgentRunId();
  const focusedMemberAddress = context.view.getFocusedMemberAddress();
  if (input.selectRun !== false) {
    const selection = useAgentSelectionStore();
    input.selectionMode === 'mobile'
      ? selection.selectRunWithoutShellNavigation(input.teamRunId, 'team')
      : selection.selectRun(input.teamRunId, 'team');
    useTeamRunConfigStore().selectDraft(null);
    useAgentRunConfigStore().clearConfig();
  }
  const result: OpenTeamRunWithCoordinatorResult = {
    disposition: 'committed',
    teamRunId: input.teamRunId,
    focusedAgentRunId,
    focusedMemberAddress,
    resumeConfig: hydrated.resumeConfig,
  };
  input.onCommitted?.(result);
  return result;
}
