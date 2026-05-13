import type {
  ToolApprovalRequestedPayload,
  ToolApprovedPayload,
  ToolDeniedPayload,
  ToolExecutionFailedPayload,
  ToolExecutionStartedPayload,
  ToolExecutionSucceededPayload,
  ToolLogPayload,
} from '../protocol/messageTypes';
import type { ToolApprovalTarget } from '~/types/segments';

export interface ParsedToolLifecycleBase {
  invocationId: string;
  toolName: string;
  turnId: string | null;
}

export interface ParsedToolApprovalRequestedPayload extends ParsedToolLifecycleBase {
  arguments: Record<string, any>;
  approvalTarget: ToolApprovalTarget | null;
}

export interface ParsedToolApprovedPayload extends ParsedToolLifecycleBase {
  reason: string | null;
}

export interface ParsedToolDeniedPayload extends ParsedToolLifecycleBase {
  arguments: Record<string, any>;
  reason: string | null;
  error: string | null;
}

export interface ParsedToolExecutionStartedPayload extends ParsedToolLifecycleBase {
  arguments: Record<string, any>;
}

export interface ParsedToolExecutionSucceededPayload extends ParsedToolLifecycleBase {
  arguments: Record<string, any>;
  result: any;
}

export interface ParsedToolExecutionFailedPayload extends ParsedToolLifecycleBase {
  arguments: Record<string, any>;
  error: string;
}

export interface ParsedToolLogPayload {
  invocationId: string;
  toolName: string;
  turnId: string | null;
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
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      return {};
    }
  }
  return {};
};

const normalizePathSegments = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const path = value
    .map((segment) => normalizeString(segment))
    .filter((segment): segment is string => Boolean(segment));
  return path.length > 0 ? path : null;
};

const routeKeyFromPath = (path: string[] | null): string | null =>
  path && path.length > 0 ? path.join('/') : null;

export const parseToolApprovalTarget = (payload: {
  member_route_key?: unknown;
  member_path?: unknown;
  source_route_key?: unknown;
  source_path?: unknown;
}): ToolApprovalTarget | null => {
  const memberPath = normalizePathSegments(payload.member_path);
  const sourcePath = normalizePathSegments(payload.source_path);
  const memberRouteKey = normalizeOptionalString(payload.member_route_key) ?? routeKeyFromPath(memberPath);
  const sourceRouteKey = normalizeOptionalString(payload.source_route_key) ?? routeKeyFromPath(sourcePath);

  if (!memberRouteKey && !sourceRouteKey && !memberPath && !sourcePath) {
    return null;
  }

  return {
    memberRouteKey,
    memberPath,
    sourceRouteKey,
    sourcePath,
  };
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
    approvalTarget: parseToolApprovalTarget(payload),
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
    arguments: normalizeArguments(payload.arguments),
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
    arguments: normalizeArguments(payload.arguments),
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
    arguments: normalizeArguments(payload.arguments),
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
    turnId: normalizeOptionalString(payload.turn_id),
    logEntry,
  };
};
