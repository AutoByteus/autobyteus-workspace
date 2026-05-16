export type AgentInterruptStatus =
  | 'accepted'
  | 'no_active_turn'
  | 'turn_mismatch'
  | 'already_interrupted'
  | 'already_settled'
  | 'settlement_timeout';

export type AgentInterruptOptions = {
  turnId?: string | null;
  reason?: string | null;
  requestedBy?: string | null;
  timeoutMs?: number | null;
};

export type AgentInterruptResult = {
  accepted: boolean;
  status: AgentInterruptStatus;
  turnId: string | null;
  reason?: string | null;
  message?: string;
};

export type AgentInterruptionContext = {
  turnId: string;
  reason: string;
  operationId?: string | null;
  operationKind?: string | null;
};

export class AgentInterruptionError extends Error {
  readonly turnId: string;
  readonly reason: string;
  readonly operationId: string | null;
  readonly operationKind: string | null;

  constructor(context: AgentInterruptionContext) {
    super(`Agent turn '${context.turnId}' was interrupted: ${context.reason}`);
    this.name = 'AgentInterruptionError';
    this.turnId = context.turnId;
    this.reason = context.reason;
    this.operationId = context.operationId ?? null;
    this.operationKind = context.operationKind ?? null;
  }
}

export const isAgentInterruptionError = (value: unknown): value is AgentInterruptionError =>
  value instanceof AgentInterruptionError ||
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { name?: unknown }).name === 'AgentInterruptionError'
  );

export const isAbortLikeError = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';
  const code = typeof record.code === 'string' ? record.code.toLowerCase() : '';
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';
  return (
    name.includes('abort') ||
    code.includes('abort') ||
    message.includes('aborted') ||
    message.includes('aborterror') ||
    message.includes('cancelled') ||
    message.includes('canceled')
  );
};

export const normalizeInterruptReason = (reason?: string | null): string => {
  const normalized = typeof reason === 'string' ? reason.trim() : '';
  return normalized.length > 0 ? normalized : 'user_interrupt';
};
