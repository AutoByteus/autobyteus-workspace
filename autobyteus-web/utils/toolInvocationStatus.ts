import type { ToolInvocationStatus } from '~/types/segments';

const STATUS_RANK: Record<ToolInvocationStatus, number> = {
  parsing: 0,
  parsed: 1,
  'awaiting-approval': 2,
  approved: 3,
  executing: 4,
  success: 99,
  error: 99,
  denied: 99,
};

export const isTerminalToolInvocationStatus = (
  status: ToolInvocationStatus,
): boolean => status === 'success' || status === 'error' || status === 'denied';

export const canTransitionToolInvocationStatus = (
  currentStatus: ToolInvocationStatus,
  nextStatus: ToolInvocationStatus,
): boolean => {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (isTerminalToolInvocationStatus(currentStatus)) {
    return false;
  }

  if (isTerminalToolInvocationStatus(nextStatus)) {
    return true;
  }

  return STATUS_RANK[nextStatus] >= STATUS_RANK[currentStatus];
};
