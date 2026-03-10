export type ManagedRuntimeReliabilityStatus = {
  state: string;
  updatedAt: string | null;
  inboundForwarderRunning: boolean;
  outboundSenderRunning: boolean;
  inboxLockHeld: boolean;
  outboxLockHeld: boolean;
  inboxLockLost: boolean;
  outboxLockLost: boolean;
  inboxLastHeartbeatAt: string | null;
  outboxLastHeartbeatAt: string | null;
};

export type ManagedRuntimeHealthEvaluation =
  | {
      healthy: true;
    }
  | {
      healthy: false;
      reason: string;
      lastError: string;
    };

const MANAGED_GATEWAY_SUPERVISION_INTERVAL_MS = 5_000;
const MANAGED_GATEWAY_HEARTBEAT_STALE_AFTER_MS = 20_000;
const MANAGED_GATEWAY_RESTART_BASE_DELAY_MS = 1_000;
const MANAGED_GATEWAY_RESTART_MAX_DELAY_MS = 30_000;
const MANAGED_GATEWAY_RESTART_MAX_ATTEMPTS = 6;

export const getManagedGatewaySupervisionIntervalMs = (): number =>
  readPositiveIntegerEnv(
    "MANAGED_MESSAGING_GATEWAY_SUPERVISION_INTERVAL_MS",
    MANAGED_GATEWAY_SUPERVISION_INTERVAL_MS,
  );

export const getManagedGatewayHeartbeatStaleAfterMs = (): number =>
  readPositiveIntegerEnv(
    "MANAGED_MESSAGING_GATEWAY_HEARTBEAT_STALE_AFTER_MS",
    MANAGED_GATEWAY_HEARTBEAT_STALE_AFTER_MS,
  );

export const getManagedGatewayRestartMaxAttempts = (): number =>
  readPositiveIntegerEnv(
    "MANAGED_MESSAGING_GATEWAY_RESTART_MAX_ATTEMPTS",
    MANAGED_GATEWAY_RESTART_MAX_ATTEMPTS,
  );

export const getManagedGatewayRestartBaseDelayMs = (): number =>
  readPositiveIntegerEnv(
    "MANAGED_MESSAGING_GATEWAY_RESTART_BASE_DELAY_MS",
    MANAGED_GATEWAY_RESTART_BASE_DELAY_MS,
  );

export const getManagedGatewayRestartMaxDelayMs = (): number =>
  readPositiveIntegerEnv(
    "MANAGED_MESSAGING_GATEWAY_RESTART_MAX_DELAY_MS",
    MANAGED_GATEWAY_RESTART_MAX_DELAY_MS,
  );

export const computeManagedGatewayRestartDelayMs = (attempt: number): number => {
  const value =
    getManagedGatewayRestartBaseDelayMs() * 2 ** Math.max(0, attempt - 1);
  return Math.min(getManagedGatewayRestartMaxDelayMs(), value);
};

export const isHeartbeatStale = (
  timestamp: string | null,
  nowEpoch: number,
  staleAfterMs: number,
): boolean => {
  if (!timestamp) {
    return true;
  }
  const epoch = Date.parse(timestamp);
  if (!Number.isFinite(epoch)) {
    return true;
  }
  return nowEpoch - epoch > staleAfterMs;
};

export const readManagedRuntimeReliabilityStatus = (
  payload: Record<string, unknown>,
): ManagedRuntimeReliabilityStatus | null => {
  const runtime = asRecord(payload.runtime);
  const workers = asRecord(runtime?.workers);
  const locks = asRecord(runtime?.locks);
  const inbox = asRecord(locks?.inbox);
  const outbox = asRecord(locks?.outbox);
  const inboundForwarder = asRecord(workers?.inboundForwarder);
  const outboundSender = asRecord(workers?.outboundSender);
  const state = asNonEmptyString(runtime?.state);

  if (!runtime || !workers || !locks || !inbox || !outbox || !state) {
    return null;
  }

  return {
    state,
    updatedAt: asNullableString(runtime.updatedAt),
    inboundForwarderRunning: inboundForwarder?.running === true,
    outboundSenderRunning: outboundSender?.running === true,
    inboxLockHeld: inbox.held === true,
    outboxLockHeld: outbox.held === true,
    inboxLockLost: inbox.lost === true,
    outboxLockLost: outbox.lost === true,
    inboxLastHeartbeatAt: asNullableString(inbox.lastHeartbeatAt),
    outboxLastHeartbeatAt: asNullableString(outbox.lastHeartbeatAt),
  };
};

const readPositiveIntegerEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asNullableString = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return asNonEmptyString(value);
};
