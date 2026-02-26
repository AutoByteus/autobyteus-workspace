import type {
  ToolApprovalRequestedPayload,
  ToolApprovedPayload,
  ToolDeniedPayload,
  ToolExecutionFailedPayload,
  ToolExecutionStartedPayload,
  ToolExecutionSucceededPayload,
  ToolLogPayload,
} from '../protocol/messageTypes';

export interface ParsedToolLifecycleBase {
  invocationId: string;
  toolName: string;
  turnId: string | null;
}

export interface ParsedToolApprovalRequestedPayload extends ParsedToolLifecycleBase {
  arguments: Record<string, any>;
}

export interface ParsedToolApprovedPayload extends ParsedToolLifecycleBase {
  reason: string | null;
}

export interface ParsedToolDeniedPayload extends ParsedToolLifecycleBase {
  reason: string | null;
  error: string | null;
}

export interface ParsedToolExecutionStartedPayload extends ParsedToolLifecycleBase {
  arguments: Record<string, any>;
}

export interface ParsedToolExecutionSucceededPayload extends ParsedToolLifecycleBase {
  result: any;
}

export interface ParsedToolExecutionFailedPayload extends ParsedToolLifecycleBase {
  error: string;
}

export interface ParsedToolLogPayload {
  invocationId: string;
  toolName: string;
  logEntry: string;
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizeString(value);
};

const normalizeArguments = (value: unknown): Record<string, any> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
};

const parseBase = (
  payload: { invocation_id?: unknown; tool_name?: unknown; turn_id?: unknown },
): ParsedToolLifecycleBase | null => {
  const invocationId = normalizeString(payload.invocation_id);
  const toolName = normalizeString(payload.tool_name);

  if (!invocationId || !toolName) {
    return null;
  }

  return {
    invocationId,
    toolName,
    turnId: normalizeOptionalString(payload.turn_id),
  };
};

export const parseToolApprovalRequestedPayload = (
  payload: ToolApprovalRequestedPayload,
): ParsedToolApprovalRequestedPayload | null => {
  const base = parseBase(payload);
  if (!base) {
    return null;
  }
  return {
    ...base,
    arguments: normalizeArguments(payload.arguments),
  };
};

export const parseToolApprovedPayload = (
  payload: ToolApprovedPayload,
): ParsedToolApprovedPayload | null => {
  const base = parseBase(payload);
  if (!base) {
    return null;
  }
  return {
    ...base,
    reason: normalizeOptionalString(payload.reason),
  };
};

export const parseToolDeniedPayload = (
  payload: ToolDeniedPayload,
): ParsedToolDeniedPayload | null => {
  const base = parseBase(payload);
  if (!base) {
    return null;
  }

  const reason = normalizeOptionalString(payload.reason);
  const error = normalizeOptionalString(payload.error);
  if (!reason && !error) {
    return null;
  }

  return {
    ...base,
    reason,
    error,
  };
};

export const parseToolExecutionStartedPayload = (
  payload: ToolExecutionStartedPayload,
): ParsedToolExecutionStartedPayload | null => {
  const base = parseBase(payload);
  if (!base) {
    return null;
  }
  return {
    ...base,
    arguments: normalizeArguments(payload.arguments),
  };
};

export const parseToolExecutionSucceededPayload = (
  payload: ToolExecutionSucceededPayload,
): ParsedToolExecutionSucceededPayload | null => {
  const base = parseBase(payload);
  if (!base) {
    return null;
  }
  return {
    ...base,
    result: payload.result ?? null,
  };
};

export const parseToolExecutionFailedPayload = (
  payload: ToolExecutionFailedPayload,
): ParsedToolExecutionFailedPayload | null => {
  const base = parseBase(payload);
  if (!base) {
    return null;
  }

  const error = normalizeString(payload.error);
  if (!error) {
    return null;
  }

  return {
    ...base,
    error,
  };
};

export const parseToolLogPayload = (payload: ToolLogPayload): ParsedToolLogPayload | null => {
  const invocationId = normalizeString(payload.tool_invocation_id);
  const toolName = normalizeString(payload.tool_name);
  const logEntry = normalizeString(payload.log_entry);

  if (!invocationId || !toolName || !logEntry) {
    return null;
  }

  return {
    invocationId,
    toolName,
    logEntry,
  };
};
