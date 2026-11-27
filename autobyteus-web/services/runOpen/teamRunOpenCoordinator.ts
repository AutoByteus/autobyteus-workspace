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
  commitTeamRunHydration,
  markCommittedTeamRunHydrationAuthority,
} from '~/services/runHydration/teamRunHydrationCommit';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { ensureAuthoritativeTeamMemberProjection } from '~/services/runHydration/teamMemberProjectionHydrationService';
import { useRunHistoryStore } from '~/stores/runHistoryStore';

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
  commitTeamRunHydration(hydrated);
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
  // The open Team's view has its stream whether the Team runs or not (autobyteus-461 SR-045); it never starts the Team.
  runStore.connectToTeamStream(input.teamRunId);
  return result;
}

type TeamStreamRecovery = Readonly<{ context: AgentTeamContext; resumeConfig: TeamRunResumeConfigPayload }>;
/** At most one recovery per Team (autobyteus-541 D-A3): the automatic one and a user's reselect share it. */
const recoveriesByTeamRunId = new Map<string, Promise<TeamStreamRecovery>>();

const recoverTeamStream = (input: OpenTeamRunWithCoordinatorInput): Promise<TeamStreamRecovery> => {
  const running = recoveriesByTeamRunId.get(input.teamRunId);
  if (running) return running;
  const recovery = runTeamStreamRecovery(input).finally(() => {
    if (recoveriesByTeamRunId.get(input.teamRunId) === recovery) recoveriesByTeamRunId.delete(input.teamRunId);
  });
  recoveriesByTeamRunId.set(input.teamRunId, recovery);
  return recovery;
};

/** Reads the Team again and replaces its failed stream with the verified one; no selection (that is its caller's). */
const runTeamStreamRecovery = async (input: OpenTeamRunWithCoordinatorInput): Promise<TeamStreamRecovery> => {
  const current = useAgentTeamContextsStore().getTeamContextById(input.teamRunId);
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
  const hydrated = await hydrateTeamRunContextForStreamRecovery({ ...input, agentRunId: preferredAgentRunId });
  const context = hydrated.hydratedContext;
  const focus = context.view.focusAgentForInspection(preferredAgentRunId);
  if (focus.disposition === 'rejected') throw new Error(focus.message);
  // The member the user moved to while the read ran (any focus path: a link, a mounted Team's inspection), read at the
  // commit from the context being replaced (autobyteus-541 CR-001).
  let focusedAtCommit: string | null = null;
  await runStore.replaceFailedTeamStream({
    rootTeamRunId: input.teamRunId,
    candidateContext: context,
    expectedBaseChangeSequence: hydrated.expectedBaseChangeSequence,
    beforeContextCommit: () => {
      focusedAtCommit = useAgentTeamContextsStore().getTeamContextById(input.teamRunId)?.view.getFocusedAgentRunId() ?? null;
      commitTeamRunHydration(hydrated);
    },
  });
  markCommittedTeamRunHydrationAuthority(hydrated);
  await keepFocusAcrossRecovery(input.teamRunId, context, preferredAgentRunId, focusedAtCommit);
  return { context, resumeConfig: hydrated.resumeConfig };
};

/**
 * After the commit, the recovered context shows the member the replaced one showed at the commit: loaded first, as a
 * mounted Team's member is, then focused. Nothing when that member left the tree, or when the focus moved again since.
 */
const keepFocusAcrossRecovery = async (
  teamRunId: string,
  context: AgentTeamContext,
  candidateFocus: string,
  focusedAtCommit: string | null,
): Promise<void> => {
  if (!focusedAtCommit || focusedAtCommit === candidateFocus || !context.view.hasAgentRun(focusedAtCommit)) return;
  try {
    await ensureAuthoritativeTeamMemberProjection({ team: context, agentRunId: focusedAtCommit });
  } catch (error) {
    console.warn(`Team '${teamRunId}' recovered; its member '${focusedAtCommit}' could not be loaded.`, error);
    return;
  }
  if (useAgentTeamContextsStore().getTeamContextById(teamRunId) !== context
    || context.view.getFocusedAgentRunId() !== candidateFocus) return;
  if (context.view.focusAgentForInspection(focusedAtCommit).disposition === 'rejected') return;
  // The run tree's rows show the focus from the navigation projection, which the commit built with the read's member.
  useRunHistoryStore().refreshRunNavigationTopology('team-stream-recovery-focus');
};

/**
 * Recovers a Team whose stream failed. A call while a recovery runs joins it; when that one failed, it runs its own.
 * The stream is replaced whatever the selection does meanwhile; the selection (intent rules as for an open) follows.
 */
export function reopenTeamRunAfterStreamLoss(input: OpenTeamRunWithCoordinatorInput & { selectRun: false }): Promise<OpenTeamRunWithCoordinatorResult>;
export function reopenTeamRunAfterStreamLoss(input: OpenTeamRunWithCoordinatorInput): Promise<OpenTeamRunWithCoordinatorResult | SupersededSelection>;
export async function reopenTeamRunAfterStreamLoss(input: OpenTeamRunWithCoordinatorInput): Promise<OpenTeamRunWithCoordinatorResult | SupersededSelection> {
  const intent = input.selectRun === false ? undefined
    : input.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  let recovered: TeamStreamRecovery | null = null;
  try {
    const running = recoveriesByTeamRunId.get(input.teamRunId);
    if (running) recovered = await running.catch(() => null);
    if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
    recovered ??= await recoverTeamStream(input);
    // A joined recovery focused its own member: the reselect's member loads, then is focused (as a mounted Team's).
    const requested = input.agentRunId?.trim();
    if (requested && recovered.context.view.getFocusedAgentRunId() !== requested) {
      await ensureAuthoritativeTeamMemberProjection({ team: recovered.context, agentRunId: requested, selectionIntent: intent });
      if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
      const focus = recovered.context.view.focusAgentForInspection(requested);
      if (focus.disposition === 'rejected') throw new Error(focus.message);
    }
  } catch (error) {
    if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
    throw error;
  }
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  const { context } = recovered;
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
    focusedAgentRunId: context.view.getFocusedAgentRunId(),
    focusedMemberAddress: context.view.getFocusedMemberAddress(),
    resumeConfig: recovered.resumeConfig,
  };
  input.onCommitted?.(result);
  return result;
}
