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
): void => {
  const status = normalizeAgentRuntimeStatus(payload.status);
  context.state.currentStatus = status;
  context.state.canInterrupt = status === AgentStatus.Running && payload.can_interrupt === true;

  if (status !== AgentStatus.Running && status !== AgentStatus.Initializing) {
    context.isSending = false;
  }
};

export const applyLiveRuntimeActivityProjectionRepair = (context: AgentContext): void => {
  const status = normalizeAgentRuntimeStatus(context.state.currentStatus);
  if (status !== AgentStatus.Error) {
    return;
  }

  context.state.currentStatus = AgentStatus.Running;
  context.state.canInterrupt = false;
  context.isSending = true;
};

export const applyActiveRuntimePlaceholder = (
  context: AgentContext,
  options: { preserveExistingLive?: boolean } = {},
): void => {
  if (options.preserveExistingLive === true && context.isSubscribed) {
    return;
  }

  context.state.currentStatus = AgentStatus.Running;
  context.state.canInterrupt = false;
};

export const applyMemberOrHistoryStatusSnapshot = (
  target: RuntimeStatusTarget,
  status: string | AgentStatus | null | undefined,
  options: {
    preserveLiveInterrupt?: boolean;
    preserveCurrentStatus?: boolean;
  } = {},
): void => {
  const state = resolveState(target);
  const normalizedStatus = normalizeAgentRuntimeStatus(status);
  if (options.preserveCurrentStatus !== true) {
    state.currentStatus = normalizedStatus;
  }

  const isTerminalProjection =
    normalizedStatus === AgentStatus.Offline ||
    normalizedStatus === AgentStatus.Initializing ||
    normalizedStatus === AgentStatus.Error;
  if (isTerminalProjection || options.preserveLiveInterrupt !== true) {
    state.canInterrupt = false;
  }
};

export const applyOfflineOrTerminalCleanup = (
  target: RuntimeStatusTarget,
  status: string | AgentStatus | null | undefined = AgentStatus.Offline,
): void => {
  const state = resolveState(target);
  state.currentStatus = normalizeAgentRuntimeStatus(status, AgentStatus.Offline);
  state.canInterrupt = false;

  if (isAgentContext(target)) {
    target.isSending = false;
  }
};

export const initializeRuntimeStatusState = (
  state: AgentRunState,
  status: string | AgentStatus | null | undefined = AgentStatus.Offline,
): void => {
  state.currentStatus = normalizeAgentRuntimeStatus(status, AgentStatus.Offline);
  state.canInterrupt = false;
};
