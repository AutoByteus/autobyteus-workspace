import { AgentSession } from "./agent-session.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
};

type SessionConstructor = new (sessionId: string, agentId: string) => AgentSession;

export class AgentSessionManager {
  private sessionClass: SessionConstructor;
  private sessions = new Map<string, AgentSession>();

  constructor(sessionClass: SessionConstructor = AgentSession) {
    this.sessionClass = sessionClass;
  }

  createSession(sessionId: string, agentId: string): AgentSession {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session '${sessionId}' already exists`);
    }

    const session = new this.sessionClass(sessionId, agentId);
    this.sessions.set(sessionId, session);
    logger.info(`Created agent session ${sessionId} for agent ${agentId}`);
    return session;
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionsForAgent(agentId: string): AgentSession[] {
    return Array.from(this.sessions.values()).filter((session) => session.agentId === agentId);
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

  closeAllForAgent(agentId: string): number {
    const sessionIds = Array.from(this.sessions.entries())
      .filter(([, session]) => session.agentId === agentId)
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
      result[sessionId] = session.agentId;
    }
    return result;
  }

  get sessionCount(): number {
    return this.sessions.size;
  }
}
