import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import {
  parseDirectAgentRunEvent,
  parseTeamAgentRunEvent,
} from "./channel-reply-bridge-support.js";
export type RuntimeEventSubscription = (
  listener: (event: unknown) => void,
) => () => void;

export type TeamDispatchTurnCapture = {
  turnId: string;
  memberName: string | null;
  memberRunId: string | null;
};

export const startDirectDispatchTurnCapture = (
  subscribeToEvents: RuntimeEventSubscription,
): {
  promise: Promise<string | null>;
  dispose: () => void;
} =>
  createScopedCapture(subscribeToEvents, (event) => {
    const parsed = parseDirectAgentRunEvent(event);
    if (!parsed || !parsed.turnId || parsed.eventType !== AgentRunEventType.TURN_STARTED) {
      return null;
    }
    return parsed.turnId;
  });

export const startTeamDispatchTurnCapture = (
  subscribeToEvents: RuntimeEventSubscription,
  targetMemberName: string | null,
): {
  promise: Promise<TeamDispatchTurnCapture | null>;
  dispose: () => void;
} => {
  const normalizedTargetMemberName = normalizeOptionalString(targetMemberName);
  return createScopedCapture(subscribeToEvents, (event) => {
    const parsed = parseTeamAgentRunEvent(event);
    if (!parsed || !parsed.turnId || parsed.eventType !== AgentRunEventType.TURN_STARTED) {
      return null;
    }
    const memberName = normalizeOptionalString(parsed.memberName);
    if (normalizedTargetMemberName) {
      if (!memberName || memberName !== normalizedTargetMemberName) {
        return null;
      }
    }
    return {
      turnId: parsed.turnId,
      memberName,
      memberRunId: normalizeOptionalString(parsed.memberRunId),
    };
  });
};

const createScopedCapture = <T>(
  subscribeToEvents: RuntimeEventSubscription,
  pickValue: (event: unknown) => T | null,
): {
  promise: Promise<T | null>;
  dispose: () => void;
} => {
  let settled = false;
  let unsubscribe: (() => void) | null = null;
  let resolvePromise: ((value: T | null) => void) | null = null;

  const settle = (value: T | null): void => {
    if (settled) {
      return;
    }
    settled = true;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    resolvePromise?.(value);
    resolvePromise = null;
  };

  const promise = new Promise<T | null>((resolve) => {
    resolvePromise = resolve;
    unsubscribe = subscribeToEvents((event) => {
      const value = pickValue(event);
      if (value !== null) {
        settle(value);
      }
    });
  });

  return {
    promise,
    dispose: () => settle(null),
  };
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
