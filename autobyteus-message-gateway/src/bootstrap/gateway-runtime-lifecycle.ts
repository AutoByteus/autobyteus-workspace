import type { InboundForwarderWorker } from "../application/services/inbound-forwarder-worker.js";
import type { OutboundSenderWorker } from "../application/services/outbound-sender-worker.js";
import type { ReliabilityStatusService } from "../application/services/reliability-status-service.js";
import type { SessionSupervisorRegistry } from "../infrastructure/adapters/session/session-supervisor-registry.js";
import {
  QueueOwnerLockLostError,
  type FileQueueOwnerLock,
} from "../infrastructure/queue/file-queue-owner-lock.js";

export type GatewayStartupRestoreTask = {
  restore: () => Promise<void>;
  onRestoreFailure: (error: unknown) => void;
};

export type GatewayRuntimeLifecycleDeps = {
  inboxOwnerLock: Pick<FileQueueOwnerLock, "acquire" | "release" | "heartbeat" | "getOwnerId">;
  outboxOwnerLock: Pick<FileQueueOwnerLock, "acquire" | "release" | "heartbeat" | "getOwnerId">;
  inboundForwarderWorker: Pick<InboundForwarderWorker, "start" | "stop">;
  outboundSenderWorker: Pick<OutboundSenderWorker, "start" | "stop">;
  reliabilityStatusService: Pick<
    ReliabilityStatusService,
    | "setWorkerRunning"
    | "setWorkerError"
    | "setLockHeld"
    | "setLockHeartbeat"
    | "setLockReleased"
    | "markLockLost"
  >;
  sessionSupervisorRegistry: Pick<SessionSupervisorRegistry, "startAll" | "stopAll">;
  startupRestoreTasks?: GatewayStartupRestoreTask[];
  lockHeartbeatIntervalMs?: number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

export type GatewayRuntimeLifecycle = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

const DEFAULT_LOCK_HEARTBEAT_INTERVAL_MS = 5_000;

export const createGatewayRuntimeLifecycle = (
  deps: GatewayRuntimeLifecycleDeps,
): GatewayRuntimeLifecycle => {
  const setIntervalFn = deps.setIntervalFn ?? setInterval;
  const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
  const lockHeartbeatIntervalMs =
    deps.lockHeartbeatIntervalMs ?? DEFAULT_LOCK_HEARTBEAT_INTERVAL_MS;

  let queueLocksHeld = false;
  let workersRunning = false;
  let supervisorsManaged = false;
  let lockHeartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const clearLockHeartbeatTimer = (): void => {
    if (!lockHeartbeatTimer) {
      return;
    }
    clearIntervalFn(lockHeartbeatTimer);
    lockHeartbeatTimer = null;
  };

  const acquireQueueLockPair = async (): Promise<void> => {
    await deps.inboxOwnerLock.acquire();
    try {
      await deps.outboxOwnerLock.acquire();
    } catch (error) {
      await deps.inboxOwnerLock.release().catch(() => undefined);
      throw error;
    }
  };

  const releaseQueueLocks = async (): Promise<void> => {
    if (!queueLocksHeld) {
      return;
    }
    queueLocksHeld = false;
    await deps.inboxOwnerLock.release();
    await deps.outboxOwnerLock.release();
    deps.reliabilityStatusService.setLockReleased("inbox");
    deps.reliabilityStatusService.setLockReleased("outbox");
  };

  const stopWorkers = async (): Promise<void> => {
    if (!workersRunning) {
      return;
    }
    workersRunning = false;
    await deps.inboundForwarderWorker.stop();
    await deps.outboundSenderWorker.stop();
    deps.reliabilityStatusService.setWorkerRunning("inboundForwarder", false);
    deps.reliabilityStatusService.setWorkerRunning("outboundSender", false);
  };

  const stopSupervisors = async (): Promise<void> => {
    if (!supervisorsManaged) {
      return;
    }
    supervisorsManaged = false;
    await deps.sessionSupervisorRegistry.stopAll();
  };

  const rollbackStartup = async (): Promise<void> => {
    clearLockHeartbeatTimer();
    await stopSupervisors().catch(() => undefined);
    await stopWorkers().catch(() => undefined);
    await releaseQueueLocks().catch(() => undefined);
  };

  const runStartupRestoreTasks = async (): Promise<void> => {
    for (const task of deps.startupRestoreTasks ?? []) {
      try {
        await task.restore();
      } catch (error) {
        task.onRestoreFailure(error);
      }
    }
  };

  const handleHeartbeatFailure = async (
    lock: "inbox" | "outbox",
    worker: "inboundForwarder" | "outboundSender",
    fallbackMessage: string,
    error: unknown,
  ): Promise<void> => {
    console.error(`[gateway] ${lock} lock heartbeat failed`, { error });
    await stopWorkers();
    if (error instanceof QueueOwnerLockLostError) {
      console.error("[gateway] queue lock ownership lost; workers stopped");
      deps.reliabilityStatusService.markLockLost(lock, error.message);
      return;
    }
    deps.reliabilityStatusService.setWorkerError(
      worker,
      error instanceof Error ? error.message : fallbackMessage,
    );
  };

  const startLockHeartbeat = (): void => {
    clearLockHeartbeatTimer();
    lockHeartbeatTimer = setIntervalFn(() => {
      void deps.inboxOwnerLock
        .heartbeat()
        .then(() => {
          deps.reliabilityStatusService.setLockHeartbeat("inbox");
        })
        .catch((error: unknown) =>
          handleHeartbeatFailure("inbox", "inboundForwarder", "Inbox heartbeat error.", error),
        );
      void deps.outboxOwnerLock
        .heartbeat()
        .then(() => {
          deps.reliabilityStatusService.setLockHeartbeat("outbox");
        })
        .catch((error: unknown) =>
          handleHeartbeatFailure("outbox", "outboundSender", "Outbox heartbeat error.", error),
        );
    }, lockHeartbeatIntervalMs);
  };

  return {
    async start(): Promise<void> {
      await acquireQueueLockPair();
      queueLocksHeld = true;
      deps.reliabilityStatusService.setLockHeld("inbox", deps.inboxOwnerLock.getOwnerId());
      deps.reliabilityStatusService.setLockHeld("outbox", deps.outboxOwnerLock.getOwnerId());

      try {
        await runStartupRestoreTasks();
        deps.inboundForwarderWorker.start();
        deps.outboundSenderWorker.start();
        workersRunning = true;
        deps.reliabilityStatusService.setWorkerRunning("inboundForwarder", true);
        deps.reliabilityStatusService.setWorkerRunning("outboundSender", true);
        supervisorsManaged = true;
        await deps.sessionSupervisorRegistry.startAll();
        startLockHeartbeat();
      } catch (error) {
        await rollbackStartup();
        throw error;
      }
    },
    async stop(): Promise<void> {
      clearLockHeartbeatTimer();
      await stopSupervisors();
      await stopWorkers();
      await releaseQueueLocks();
    },
  };
};
