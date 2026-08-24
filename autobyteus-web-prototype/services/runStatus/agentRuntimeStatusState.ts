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
  const nextStatus = normalizeAgentRuntimeStatus(payload.status);
  const changed = context.state.currentStatus !== nextStatus || context.submissionPending;
  context.state.currentStatus = nextStatus;
  context.submissionPending = false;
  return changed;
};

export const applyActiveRuntimePlaceholder = (
  context: AgentContext,
  options: { preserveExistingLive?: boolean; streamConnected?: boolean } = {},
): void => {
  if (options.preserveExistingLive === true && options.streamConnected === true) {
    return;
  }
  context.state.currentStatus = AgentStatus.Initializing;
};

export const applyMemberOrHistoryStatusSnapshot = (
  target: RuntimeStatusTarget,
  status: string | AgentStatus | null | undefined,
  options: { preserveCurrentStatus?: boolean } = {},
): void => {
  if (options.preserveCurrentStatus === true) {
    return;
  }
  resolveState(target).currentStatus = normalizeAgentRuntimeStatus(status);
};

export const applyOfflineOrTerminalCleanup = (
  target: RuntimeStatusTarget,
  status: string | AgentStatus | null | undefined = AgentStatus.Offline,
): void => {
  resolveState(target).currentStatus = normalizeAgentRuntimeStatus(status, AgentStatus.Offline);
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
