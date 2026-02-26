import { AgentSession } from "./agent-session.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
};

type SessionConstructor = new (sessionId: string, runId: string) => AgentSession;

export class AgentSessionManager {
  private sessionClass: SessionConstructor;
  private sessions = new Map<string, AgentSession>();

  constructor(sessionClass: SessionConstructor = AgentSession) {
    this.sessionClass = sessionClass;
  }

  createSession(sessionId: string, runId: string): AgentSession {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session '${sessionId}' already exists`);
    }

    const session = new this.sessionClass(sessionId, runId);
    this.sessions.set(sessionId, session);
    logger.info(`Created agent session ${sessionId} for run ${runId}`);
    return session;
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionsForRun(runId: string): AgentSession[] {
    return Array.from(this.sessions.values()).filter((session) => session.runId === runId);
  }

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    session.close();
    logger.info(`Closed agent session ${sessionId}`);
    return true;
  }

  closeAllForRun(runId: string): number {
    const sessionIds = Array.from(this.sessions.entries())
      .filter(([, session]) => session.runId === runId)
      .map(([id]) => id);

    for (const sessionId of sessionIds) {
      this.closeSession(sessionId);
    }

    return sessionIds.length;
  }

  closeAll(): number {
    const count = this.sessions.size;
    for (const sessionId of Array.from(this.sessions.keys())) {
      this.closeSession(sessionId);
    }
    return count;
  }

  listSessions(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [sessionId, session] of this.sessions.entries()) {
      result[sessionId] = session.runId;
    }
    return result;
  }

  get sessionCount(): number {
    return this.sessions.size;
  }
}
