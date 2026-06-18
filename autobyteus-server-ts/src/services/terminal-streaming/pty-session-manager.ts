import { getDefaultSessionFactory } from "autobyteus-ts";
import type { TerminalSession, TerminalSessionFactory } from "autobyteus-ts";
export type { TerminalSession, TerminalSessionFactory };

type TerminalSessionRecord = {
  session: TerminalSession;
  targetKey: string;
};

export class TerminalSessionStartupAbortedError extends Error {
  constructor(sessionId: string) {
    super(`Terminal session '${sessionId}' was closed during startup`);
    this.name = "TerminalSessionStartupAbortedError";
  }
}

type CreateSessionOptions = {
  signal?: AbortSignal;
};

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class PtySessionManager {
  private sessions: Map<string, TerminalSessionRecord> = new Map();
  private sessionFactory: TerminalSessionFactory;

  constructor(sessionFactory?: TerminalSessionFactory) {
    this.sessionFactory = sessionFactory ?? getDefaultSessionFactory();
  }

  get backendName(): string {
    return this.sessionFactory.name || "UnknownSessionBackend";
  }

  async createSession(
    sessionId: string,
    targetKey: string,
    cwd: string,
    options: CreateSessionOptions = {},
  ): Promise<TerminalSession> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session '${sessionId}' already exists`);
    }
    if (options.signal?.aborted) {
      throw new TerminalSessionStartupAbortedError(sessionId);
    }

    const session = new this.sessionFactory(sessionId);
    this.sessions.set(sessionId, { session, targetKey });

    const abortListener = (): void => {
      void this.closeSession(sessionId).catch((closeError) => {
        logger.error(
          `Failed to close aborted PTY session ${sessionId}: ${String(closeError)}`,
        );
      });
    };
    options.signal?.addEventListener("abort", abortListener, { once: true });

    try {
      await session.start(cwd);
      if (
        options.signal?.aborted ||
        this.sessions.get(sessionId)?.session !== session
      ) {
        await session.close().catch((closeError) => {
          logger.error(
            `Failed to close aborted PTY session ${sessionId}: ${String(closeError)}`,
          );
        });
        throw new TerminalSessionStartupAbortedError(sessionId);
      }
    } catch (error) {
      const wasAborted =
        options.signal?.aborted ||
        this.sessions.get(sessionId)?.session !== session;
      if (this.sessions.get(sessionId)?.session === session) {
        this.sessions.delete(sessionId);
      }
      await session.close().catch((closeError) => {
        logger.error(
          `Failed to close partial PTY session ${sessionId}: ${String(closeError)}`,
        );
      });
      if (wasAborted) {
        throw new TerminalSessionStartupAbortedError(sessionId);
      }
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abortListener);
    }

    logger.info(
      `Created terminal session ${sessionId} using backend ${this.backendName} for target ${targetKey}`,
    );
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

  async closeAllForTargetKey(targetKey: string): Promise<number> {
    const sessionsToClose = Array.from(this.sessions.entries())
      .filter(([, record]) => record.targetKey === targetKey)
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
      entries[sessionId] = record.targetKey;
    }
    return entries;
  }

  get sessionCount(): number {
    return this.sessions.size;
  }
}
