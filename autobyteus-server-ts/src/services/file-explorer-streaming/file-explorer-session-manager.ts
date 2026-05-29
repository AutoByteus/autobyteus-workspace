import { FileExplorerSession } from "./file-explorer-session.js";
import type { WatcherLease } from "../../file-explorer/file-explorer.js";
import type { WorkspaceFileExplorerLease } from "../../workspaces/filesystem-workspace.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
};

type SessionConstructor = new (
  sessionId: string,
  workspaceId: string,
  eventStreamFactory: () => AsyncGenerator<string, void, void>,
  watcherLease?: WatcherLease | null,
  fileExplorerLease?: WorkspaceFileExplorerLease | null,
) => FileExplorerSession;

export class FileExplorerSessionManager {
  private sessionClass: SessionConstructor;
  private sessions = new Map<string, FileExplorerSession>();

  constructor(sessionClass: SessionConstructor = FileExplorerSession) {
    this.sessionClass = sessionClass;
    logger.debug("FileExplorerSessionManager initialized");
  }

  async createSession(
    sessionId: string,
    workspaceId: string,
    eventStreamFactory: () => AsyncGenerator<string, void, void>,
    watcherLease: WatcherLease | null = null,
    fileExplorerLease: WorkspaceFileExplorerLease | null = null,
  ): Promise<FileExplorerSession> {
    const session = new this.sessionClass(
      sessionId,
      workspaceId,
      eventStreamFactory,
      watcherLease,
      fileExplorerLease,
    );
    this.sessions.set(sessionId, session);
    await session.start();

    logger.info(
      `Created file explorer session ${sessionId} for workspace ${workspaceId}. ` +
        `Active sessions: ${this.sessions.size}`,
    );

    return session;
  }

  getSession(sessionId: string): FileExplorerSession | undefined {
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.sessions.delete(sessionId);
    await session.close();

    logger.info(
      `Closed file explorer session ${sessionId}. Active sessions: ${this.sessions.size}`,
    );
  }

  async closeAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.closeSession(sessionId);
    }

    logger.info("Closed all file explorer sessions");
  }

  get activeSessionCount(): number {
    return this.sessions.size;
  }
}
