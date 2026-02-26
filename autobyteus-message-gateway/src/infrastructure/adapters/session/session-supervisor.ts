export type SessionSupervisorState = "STOPPED" | "CONNECTING" | "READY" | "DEGRADED";

export type SessionSupervisorStatus = {
  state: SessionSupervisorState;
  reconnectAttempt: number;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastError: string | null;
};

export type SessionSupervisorDeps = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number | null;
  nowIso?: () => string;
  sleep?: (delayMs: number) => Promise<void>;
  onStatusChange?: (status: SessionSupervisorStatus) => void;
};

const DEFAULT_BASE_DELAY_MS = 1_000;
const DEFAULT_MAX_DELAY_MS = 30_000;

export class SessionSupervisor {
  private readonly connect: () => Promise<void>;
  private readonly disconnect: () => Promise<void>;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly maxAttempts: number | null;
  private readonly nowIso: () => string;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly onStatusChange?: (status: SessionSupervisorStatus) => void;
  private running = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private status: SessionSupervisorStatus = {
    state: "STOPPED",
    reconnectAttempt: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    lastError: null,
  };

  constructor(deps: SessionSupervisorDeps) {
    this.connect = deps.connect;
    this.disconnect = deps.disconnect;
    this.baseDelayMs = deps.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = deps.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.maxAttempts = deps.maxAttempts ?? null;
    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
    this.sleep = deps.sleep ?? defaultSleep;
    this.onStatusChange = deps.onStatusChange;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    this.updateStatus({
      state: "CONNECTING",
      lastError: null,
      lastDisconnectedAt: null,
    });
    await this.tryConnect();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.clearReconnectTimer();
    await this.disconnect();
    this.updateStatus({
      state: "STOPPED",
    });
  }

  markDisconnected(reason: string): void {
    if (!this.running) {
      return;
    }
    this.updateStatus({
      state: "DEGRADED",
      lastDisconnectedAt: this.nowIso(),
      lastError: reason,
    });
    this.scheduleReconnect();
  }

  getStatus(): SessionSupervisorStatus {
    return structuredClone(this.status);
  }

  private async tryConnect(): Promise<void> {
    if (!this.running) {
      return;
    }
    try {
      await this.connect();
      this.updateStatus({
        state: "READY",
        reconnectAttempt: 0,
        lastConnectedAt: this.nowIso(),
        lastError: null,
      });
    } catch (error) {
      this.updateStatus({
        state: "DEGRADED",
        lastError: toErrorMessage(error),
      });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.running) {
      return;
    }
    if (this.reconnectTimer) {
      return;
    }
    if (this.maxAttempts !== null && this.status.reconnectAttempt >= this.maxAttempts) {
      return;
    }

    const nextAttempt = this.status.reconnectAttempt + 1;
    const delayMs = Math.min(
      this.maxDelayMs,
      Math.round(this.baseDelayMs * 2 ** Math.max(0, nextAttempt - 1)),
    );

    this.updateStatus({
      reconnectAttempt: nextAttempt,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.tryReconnect();
    }, delayMs);
  }

  private async tryReconnect(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.updateStatus({
      state: "CONNECTING",
    });

    await this.sleep(0);
    await this.tryConnect();
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private updateStatus(next: Partial<SessionSupervisorStatus>): void {
    this.status = {
      ...this.status,
      ...next,
    };
    this.onStatusChange?.(this.getStatus());
  }
}

const defaultSleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const toErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Session connection failed.";
