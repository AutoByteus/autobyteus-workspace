import type { RuntimeSessionRecord } from "./runtime-adapter-port.js";

export class RuntimeSessionStore {
  private sessions = new Map<string, RuntimeSessionRecord>();

  upsertSession(session: RuntimeSessionRecord): void {
    this.sessions.set(session.runId, session);
  }

  getSession(runId: string): RuntimeSessionRecord | null {
    return this.sessions.get(runId) ?? null;
  }

  removeSession(runId: string): void {
    this.sessions.delete(runId);
  }

  clear(): void {
    this.sessions.clear();
  }

  listSessions(): RuntimeSessionRecord[] {
    return Array.from(this.sessions.values());
  }
}

let cachedRuntimeSessionStore: RuntimeSessionStore | null = null;

export const getRuntimeSessionStore = (): RuntimeSessionStore => {
  if (!cachedRuntimeSessionStore) {
    cachedRuntimeSessionStore = new RuntimeSessionStore();
  }
  return cachedRuntimeSessionStore;
};
