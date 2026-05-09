export type ToolApprovalInputMessage = {
  kind: 'tool_approval';
  invocationId: string;
  turnId?: string;
  approved: boolean;
  reason?: string | null;
  requestedBy?: string;
};

export type PostToolApprovalResult =
  | { accepted: true; code: 'posted'; turnId: string; invocationId: string }
  | { accepted: false; code: 'no_active_turn'; invocationId: string; message: string }
  | { accepted: false; code: 'stale_turn'; invocationId: string; turnId?: string; activeTurnId?: string; message: string }
  | { accepted: false; code: 'no_pending_invocation'; invocationId: string; turnId: string; message: string }
  | { accepted: false; code: 'interrupted_turn'; invocationId: string; turnId: string; message: string }
  | { accepted: false; code: 'runtime_stopped'; invocationId: string; message: string };

export const normalizeToolApprovalInvocationId = (invocationId: unknown): string | null => {
  if (typeof invocationId !== 'string') {
    return null;
  }
  const trimmed = invocationId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeToolApprovalTurnId = (turnId: unknown): string | undefined => {
  if (typeof turnId !== 'string') {
    return undefined;
  }
  const trimmed = turnId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
