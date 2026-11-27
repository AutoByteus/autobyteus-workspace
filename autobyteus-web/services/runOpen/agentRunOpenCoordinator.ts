import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore, type WorkspaceSelectionIntent, type SupersededSelection } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { RunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { decideRunOpenStrategy } from './runOpenStrategyPolicy';
import { loadRunContextHydrationCandidate } from '~/services/runHydration/runContextHydrationService';
import {
  hydrateRunFileChanges,
  mergeHydratedRunFileChanges,
} from '~/services/runHydration/runFileChangeHydrationService';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { primeRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunStatusStore } from '~/stores/runStatusStore';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import type { AgentContext } from '~/types/agent/AgentContext';

export type RunOpenSelectionMode = 'desktop' | 'mobile';

export interface OpenRunWithCoordinatorInput {
  runId: string;
  fallbackAgentName: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
  selectionIntent?: WorkspaceSelectionIntent;
  selectionMode?: RunOpenSelectionMode;
}

export interface OpenRunWithCoordinatorResult {
  disposition: 'committed';
  runId: string;
  resumeConfig: RunResumeConfigPayload;
}

/** The stored run is archived and stopped, so it is not projected into a loaded context. */
export class ArchivedAgentRunOpenError extends Error {
  readonly runId: string;

  constructor(runId: string) {
    super(`Agent run '${runId}' is archived.`);
    this.name = 'ArchivedAgentRunOpenError';
    this.runId = runId;
  }
}

const isArchivedAndStopped = (resumeConfig: RunResumeConfigPayload): boolean =>
  resumeConfig.modelConfigEditability?.reason === 'RUN_ARCHIVED' && !resumeConfig.isActive;

type RunOpenRead = Readonly<{ resumeConfig: RunResumeConfigPayload; isActive: boolean; streamConnected: boolean }>;

/**
 * One read of the run, committed unless another builder (a history refresh, a delegated run, a navigation) committed
 * this run's context since `expectedContext` was read: then `changed`, and nothing is patched.
 */
const readAndCommitRun = async (
  input: OpenRunWithCoordinatorInput,
  intent: WorkspaceSelectionIntent | undefined,
  expectedContext: AgentContext | null,
): Promise<RunOpenRead & { outcome: 'committed' | 'changed'; currentContext: AgentContext | null } | SupersededSelection> => {
  const agentContextsStore = useAgentContextsStore();
  let candidate: Awaited<ReturnType<typeof loadRunContextHydrationCandidate>>;
  try {
    candidate = await loadRunContextHydrationCandidate(input);
  } catch (error) {
    if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
    throw error;
  }
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  const { resumeConfig, config, conversation, activities, fileChanges } = candidate;
  if (isArchivedAndStopped(resumeConfig)) throw new ArchivedAgentRunOpenError(input.runId);

  const currentContext = agentContextsStore.getRun(input.runId) ?? null;
  const streamConnected = useAgentRunStore().isAgentStreamReady(input.runId);
  const isActive = resumeConfig.isActive;
  const read = { resumeConfig, isActive, streamConnected, currentContext };
  const strategy = decideRunOpenStrategy({
    isRunActive: isActive,
    hasExistingContext: Boolean(currentContext),
    isExistingContextSubscribed: streamConnected,
  });
  config.isLocked = isActive;

  if (strategy === 'KEEP_LIVE_CONTEXT') {
    agentContextsStore.patchConfigOnly(input.runId, {
      ...config,
      isLocked: true,
    });
    mergeHydratedRunFileChanges(input.runId, fileChanges);
    if (currentContext) primeRecentEventMonitorBaseline(currentContext);
    return { ...read, outcome: 'committed' };
  }
  if (currentContext !== expectedContext) return { ...read, outcome: 'changed' };
  const activityResult = useAgentActivityStore().replaceProjectionActivitiesIfRevisions([{
    runId: input.runId,
    expectedRevision: candidate.expectedActivityRevision,
    activities,
  }]);
  if (activityResult === 'conflict') return { ...read, outcome: 'changed' };
  const context = agentContextsStore.upsertProjectionContext({
    runId: input.runId,
    config,
    conversation,
    // The run's own status as the page knows it (the Runs row's), else Initializing until its stream says (D-B1).
    status: isActive
      ? normalizeAgentRuntimeStatus(useRunStatusStore().statusOf(input.runId), AgentStatus.Initializing)
      : AgentStatus.Offline,
    hasEarlierActiveTraceEvents: candidate.hasEarlierActiveTraceEvents,
    preserveCurrentStatus: streamConnected,
  });
  primeRecentEventMonitorBaseline(context);
  hydrateRunFileChanges(input.runId, fileChanges);
  return { ...read, outcome: 'committed' };
};

export function openAgentRun(input: OpenRunWithCoordinatorInput & { selectRun: false }): Promise<OpenRunWithCoordinatorResult>;
export function openAgentRun(input: OpenRunWithCoordinatorInput): Promise<OpenRunWithCoordinatorResult | SupersededSelection>;
export async function openAgentRun(input: OpenRunWithCoordinatorInput): Promise<OpenRunWithCoordinatorResult | SupersededSelection> {
  const intent = input.selectRun === false ? undefined
    : input.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (intent && !intent.isCurrent()) return { disposition: 'superseded' };
  // A context committed meanwhile is read once more; when it changed again, the one the page holds is newer than this
  // read and is shown as it is (autobyteus-541 D-B2). Only a failed read throws.
  let read = await readAndCommitRun(input, intent, useAgentContextsStore().getRun(input.runId) ?? null);
  if ('disposition' in read) return read;
  if (read.outcome === 'changed') {
    read = await readAndCommitRun(input, intent, read.currentContext);
    if ('disposition' in read) return read;
  }
  const { resumeConfig, isActive, streamConnected } = read;

  if (input.selectRun !== false) {
    const selectionStore = useAgentSelectionStore();
    if (input.selectionMode === 'mobile') {
      selectionStore.selectRunWithoutShellNavigation(input.runId, 'agent');
    } else {
      selectionStore.selectRun(input.runId, 'agent');
    }
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();
  }

  if (isActive) {
    // Its stream starts with the run's own snapshot (SR-087), which catches up what the open's read missed.
    useAgentRunStore().connectToAgentStream(input.runId);
  } else if (streamConnected) {
    useAgentRunStore().disconnectAgentStream(input.runId);
  }

  return {
    disposition: 'committed',
    runId: input.runId,
    resumeConfig,
  };
}
