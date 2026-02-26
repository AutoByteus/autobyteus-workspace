import type {
  SessionSupervisor,
  SessionSupervisorStatus,
} from "./session-supervisor.js";

export type SessionSupervisorRegistryEntry = Pick<
  SessionSupervisor,
  "start" | "stop" | "markDisconnected" | "getStatus"
>;

export class SessionSupervisorRegistry {
  private readonly supervisors = new Map<string, SessionSupervisorRegistryEntry>();

  register(providerKey: string, supervisor: SessionSupervisorRegistryEntry): void {
    const key = normalizeProviderKey(providerKey);
    if (this.supervisors.has(key)) {
      throw new Error(`Session supervisor is already registered for provider '${key}'.`);
    }
    this.supervisors.set(key, supervisor);
  }

  async startAll(): Promise<void> {
    for (const supervisor of this.supervisors.values()) {
      await supervisor.start();
    }
  }

  async stopAll(): Promise<void> {
    for (const supervisor of this.supervisors.values()) {
      await supervisor.stop();
    }
  }

  markDisconnected(providerKey: string, reason: string): void {
    const key = normalizeProviderKey(providerKey);
    const supervisor = this.supervisors.get(key);
    if (!supervisor) {
      return;
    }
    supervisor.markDisconnected(reason);
  }

  getStatusByProvider(): Record<string, SessionSupervisorStatus> {
    const result: Record<string, SessionSupervisorStatus> = {};
    for (const [provider, supervisor] of this.supervisors.entries()) {
      result[provider] = supervisor.getStatus();
    }
    return result;
  }
}

const normalizeProviderKey = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0) {
    throw new Error("providerKey must be a non-empty string.");
  }
  return normalized;
};
