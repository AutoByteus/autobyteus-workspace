import type {
  EditFileSegment,
  TerminalCommandSegment,
  ToolCallSegment,
  ToolInvocationStatus,
  WriteFileSegment,
} from '~/types/segments';
import {
  canTransitionToolInvocationStatus,
  isTerminalToolInvocationStatus,
} from '~/utils/toolInvocationStatus';

export type ToolLifecycleSegment =
  | ToolCallSegment
  | WriteFileSegment
  | TerminalCommandSegment
  | EditFileSegment;

export const isTerminalStatus = (status: ToolInvocationStatus): boolean =>
  isTerminalToolInvocationStatus(status);

const canTransitionToNonTerminal = (
  currentStatus: ToolInvocationStatus,
  nextStatus: Exclude<ToolInvocationStatus, 'success' | 'error' | 'denied' | 'interrupted'>,
): boolean => {
  return canTransitionToolInvocationStatus(currentStatus, nextStatus);
};

const applyNonTerminalStatus = (
  segment: ToolLifecycleSegment,
  nextStatus: Exclude<ToolInvocationStatus, 'success' | 'error' | 'denied' | 'interrupted'>,
): boolean => {
  if (!canTransitionToNonTerminal(segment.status, nextStatus)) {
    return false;
  }
  segment.status = nextStatus;
  return true;
};

export const applyApprovalRequestedState = (segment: ToolLifecycleSegment): boolean =>
  applyNonTerminalStatus(segment, 'awaiting-approval');

export const applyApprovedState = (segment: ToolLifecycleSegment): boolean =>
  applyNonTerminalStatus(segment, 'approved');

export const applyExecutionStartedState = (segment: ToolLifecycleSegment): boolean =>
  applyNonTerminalStatus(segment, 'executing');

export const applyExecutionSucceededState = (
  segment: ToolLifecycleSegment,
  result: any,
): boolean => {
  if (segment.status === 'denied' || segment.status === 'error') {
    return false;
  }
  const changed = segment.status !== 'success' || segment.result !== result || segment.error !== null;
  if (!changed) return false;
  segment.status = 'success';
  segment.result = result;
  segment.error = null;
  return true;
};

export const applyExecutionFailedState = (
  segment: ToolLifecycleSegment,
  error: string,
): boolean => {
  if (segment.status === 'denied' || segment.status === 'success') {
    return false;
  }
  const changed = segment.status !== 'error' || segment.result !== null || segment.error !== error;
  if (!changed) return false;
  segment.status = 'error';
  segment.result = null;
  segment.error = error;
  return true;
};

export const applyDeniedState = (
  segment: ToolLifecycleSegment,
  reason: string | null,
  error: string | null,
): boolean => {
  if (segment.status === 'success' || segment.status === 'error') {
    return false;
  }
  const nextError = error ?? reason;
  const changed = segment.status !== 'denied' || segment.result !== null || segment.error !== nextError;
  if (!changed) return false;
  segment.status = 'denied';
  segment.result = null;
  segment.error = nextError;
  return true;
};

export const applyExecutionInterruptedState = (
  segment: ToolLifecycleSegment,
  reason: string,
): boolean => {
  if (segment.status === 'success' || segment.status === 'error' || segment.status === 'denied') {
    return false;
  }
  const changed = segment.status !== 'interrupted' || segment.result !== null || segment.error !== reason;
  if (!changed) return false;
  segment.status = 'interrupted';
  segment.result = null;
  segment.error = reason;
  return true;
};

export const appendLog = (segment: ToolLifecycleSegment, logEntry: string): boolean => {
  if (segment.logs.at(-1) === logEntry) return false;
  segment.logs.push(logEntry);
  return true;
};
