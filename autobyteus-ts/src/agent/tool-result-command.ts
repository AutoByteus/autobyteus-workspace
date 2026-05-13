export type ToolResultInputMessage = {
  kind: 'tool_result';
  invocationId: string;
  turnId?: string;
  toolName?: string;
  result?: unknown;
  error?: string;
  toolArgs?: Record<string, unknown>;
  isDenied?: boolean;
};

export type PostToolResultResult =
  | { accepted: true; code: 'posted'; turnId: string; invocationId: string }
  | { accepted: false; code: 'no_active_turn'; invocationId: string; message: string }
  | { accepted: false; code: 'stale_turn'; invocationId: string; turnId?: string; activeTurnId?: string; message: string }
  | { accepted: false; code: 'no_pending_invocation'; invocationId: string; turnId: string; message: string }
  | { accepted: false; code: 'interrupted_turn'; invocationId: string; turnId: string; message: string }
  | { accepted: false; code: 'runtime_stopped'; invocationId: string; message: string };

export const normalizeToolResultInvocationId = (invocationId: unknown): string | null => {
  if (typeof invocationId !== 'string') {
    return null;
  }
  const trimmed = invocationId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeToolResultTurnId = (turnId: unknown): string | undefined => {
  if (typeof turnId !== 'string') {
    return undefined;
  }
  const trimmed = turnId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
