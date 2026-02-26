import { getDefaultSessionFactory } from "autobyteus-ts";

export type TerminalSession = {
  start: (cwd: string) => Promise<void>;
  write: (data: Buffer | string) => Promise<void>;
  read: (timeout?: number) => Promise<Buffer | null>;
  resize: (rows: number, cols: number) => void;
  close: () => Promise<void>;
  isAlive?: boolean;
};

type TerminalSessionFactory = new (sessionId: string) => TerminalSession;

type TerminalSessionRecord = {
  session: TerminalSession;
  workspaceId: string;
};

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class PtySessionManager {
  private sessions: Map<string, TerminalSessionRecord> = new Map();
  private sessionFactory: TerminalSessionFactory;

  constructor(sessionFactory?: TerminalSessionFactory) {
    this.sessionFactory = sessionFactory ?? (getDefaultSessionFactory() as TerminalSessionFactory);
  }

  async createSession(sessionId: string, workspaceId: string, cwd: string): Promise<TerminalSession> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session '${sessionId}' already exists`);
    }

    const session = new this.sessionFactory(sessionId);
    await session.start(cwd);
    this.sessions.set(sessionId, { session, workspaceId });

    logger.info(`Created PTY session ${sessionId} for workspace ${workspaceId}`);
    return session;
  }

  getSession(sessionId: string): TerminalSession | null {
    return this.sessions.get(sessionId)?.session ?? null;
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const record = this.sessions.get(sessionId);
    if (!record) {
      return false;
    }

    this.sessions.delete(sessionId);
    await record.session.close();
    logger.info(`Closed PTY session ${sessionId}`);
    return true;
  }

  async closeAllForWorkspace(workspaceId: string): Promise<number> {
    const sessionsToClose = Array.from(this.sessions.entries())
      .filter(([, record]) => record.workspaceId === workspaceId)
      .map(([id]) => id);

    for (const sessionId of sessionsToClose) {
      await this.closeSession(sessionId);
    }

    return sessionsToClose.length;
  }

  async closeAll(): Promise<number> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.closeSession(sessionId);
    }

    return sessionIds.length;
  }

  listSessions(): Record<string, string> {
    const entries: Record<string, string> = {};
    for (const [sessionId, record] of this.sessions.entries()) {
      entries[sessionId] = record.workspaceId;
    }
    return entries;
  }

  get sessionCount(): number {
    return this.sessions.size;
  }
}
