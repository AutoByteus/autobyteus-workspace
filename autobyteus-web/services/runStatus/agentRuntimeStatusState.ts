import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentStatusPayload } from '~/services/agentStreaming/protocol/messageTypes';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';

type RuntimeStatusTarget = AgentContext | AgentRunState;

const isAgentContext = (target: RuntimeStatusTarget): target is AgentContext =>
  typeof target === 'object' && target !== null && 'state' in target;

const resolveState = (target: RuntimeStatusTarget): AgentRunState =>
  isAgentContext(target) ? target.state : target;

/** A status's running background task count: a positive safe integer, else 0 (autobyteus-448). */
const backgroundTasksRunningOf = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0;

export const isCanonicalAgentStatus = (status: unknown): status is AgentStatus =>
  status === AgentStatus.Offline ||
  status === AgentStatus.Initializing ||
  status === AgentStatus.Idle ||
  status === AgentStatus.Running ||
  status === AgentStatus.Error;

export const preserveCanonicalAgentStatus = (status: unknown): AgentStatus =>
  isCanonicalAgentStatus(status) ? status : AgentStatus.Offline;

export const applyLiveAgentStatusEvent = (
  context: AgentContext,
  payload: AgentStatusPayload,
): boolean => {
  const block = context.state.inputProjection ? context.state.recoverableBlock : payload.recoverableBlock ?? null;
  const nextStatus = block && block.state !== 'recovering' ? AgentStatus.Error : normalizeAgentRuntimeStatus(payload.status);
  const backgroundTasksRunning = backgroundTasksRunningOf(payload.background_tasks_running);
  const changed = context.state.currentStatus !== nextStatus || context.submissionPending
    || context.state.backgroundTasksRunning !== backgroundTasksRunning;
  context.state.recoverableBlock = block;
  context.state.currentStatus = nextStatus;
  context.state.backgroundTasksRunning = backgroundTasksRunning;
  context.submissionPending = false;
  return changed;
};

export const applyMemberOrHistoryStatusSnapshot = (
  target: RuntimeStatusTarget,
  status: string | AgentStatus | null | undefined,
  options: { preserveCurrentStatus?: boolean } = {},
): void => {
  if (options.preserveCurrentStatus === true) {
    return;
  }
  const next = normalizeAgentRuntimeStatus(status);
  resolveState(target).currentStatus = next;
  // A history status carries no count: a live run's comes with its stream's status; an offline run has none.
  if (next === AgentStatus.Offline) resolveState(target).backgroundTasksRunning = 0;
};

export const applyOfflineOrTerminalCleanup = (
  target: RuntimeStatusTarget,
  status: string | AgentStatus | null | undefined = AgentStatus.Offline,
): void => {
  resolveState(target).currentStatus = normalizeAgentRuntimeStatus(status, AgentStatus.Offline);
  resolveState(target).backgroundTasksRunning = 0;
  resolveState(target).recoverableBlock = null;
  resolveState(target).inputProjection = null;
  for (const message of resolveState(target).conversation.messages) if (message.type === "user") delete message.pendingInput;
  if (isAgentContext(target)) {
    target.submissionPending = false;
  }
};

export const initializeRuntimeStatusState = (
  state: AgentRunState,
  status: string | AgentStatus | null | undefined = AgentStatus.Offline,
): void => {
  state.currentStatus = normalizeAgentRuntimeStatus(status, AgentStatus.Offline);
};
