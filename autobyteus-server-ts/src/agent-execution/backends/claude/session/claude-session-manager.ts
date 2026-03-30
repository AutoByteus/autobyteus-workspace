import type { WorkspaceManager } from "../../../../workspaces/workspace-manager.js";
import { getWorkspaceManager } from "../../../../workspaces/workspace-manager.js";
import {
  asString,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { normalizeSessionMessages } from "../claude-runtime-message-normalizers.js";
import { ClaudeSessionMessageCache } from "./claude-session-message-cache.js";
import { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import { ClaudeSession } from "./claude-session.js";
import { ClaudeSessionCleanup } from "./claude-session-cleanup.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import { ClaudeWorkspaceResolver } from "../claude-workspace-resolver.js";
import {
  ClaudeSdkClient,
  getClaudeSdkClient,
  type ClaudeSdkQueryLike,
} from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
export type { ClaudeSessionEvent } from "../claude-runtime-shared.js";
export { ClaudeSession } from "./claude-session.js";

export class ClaudeSessionManager {
  private static readonly TERMINATION_SETTLE_TIMEOUT_MS = 2_000;

  private workspaceManager: WorkspaceManager;
  private readonly sessions = new Map<string, ClaudeSession>();
  private readonly sessionMessageCache = new ClaudeSessionMessageCache();
  private readonly activeQueriesByRunId = new Map<string, ClaudeSdkQueryLike>();
  private readonly sdkClient: ClaudeSdkClient;
  private readonly toolingCoordinator = new ClaudeSessionToolUseCoordinator(
    new Map(),
    new Map(),
    (runContext, event) => this.requireRunSession(runContext.runId).emitRuntimeEvent(event),
  );
  private readonly sessionCleanup: ClaudeSessionCleanup;

  constructor(
    workspaceManager: WorkspaceManager = getWorkspaceManager(),
    sdkClient: ClaudeSdkClient = getClaudeSdkClient(),
  ) {
    this.workspaceManager = workspaceManager;
    this.sdkClient = sdkClient;
    this.sessionCleanup = new ClaudeSessionCleanup(this.toolingCoordinator);
  }

  async createRunSession(
    runContext: ClaudeRunContext,
  ): Promise<ClaudeSession> {
    await this.closeRunSession(runContext.runId);
    runContext.runtimeContext.sessionId = runContext.runId;
    runContext.runtimeContext.hasCompletedTurn = false;
    runContext.runtimeContext.activeTurnId = null;
    const session = new ClaudeSession({
      runContext,
      dependencies: this.buildSessionDependencies(runContext.runId),
    });
    this.sessions.set(runContext.runId, session);
    this.sessionMessageCache.ensureSession(session.sessionId);
    return session;
  }

  async restoreRunSession(
    runContext: ClaudeRunContext,
    sessionId: string,
  ): Promise<ClaudeSession> {
    await this.closeRunSession(runContext.runId);
    const resolvedSessionId = asString(sessionId) ?? runContext.runId;
    runContext.runtimeContext.sessionId = resolvedSessionId;
    runContext.runtimeContext.hasCompletedTurn = resolvedSessionId !== runContext.runId;
    runContext.runtimeContext.activeTurnId = null;
    const session = new ClaudeSession({
      runContext,
      dependencies: this.buildSessionDependencies(runContext.runId),
    });
    this.sessions.set(runContext.runId, session);
    this.sessionMessageCache.ensureSession(resolvedSessionId);
    return session;
  }

  hasRunSession(runId: string): boolean {
    return this.sessions.has(runId);
  }

  async terminateRun(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    if (state.activeTurnId) {
      state.activeAbortController?.abort();
      this.toolingCoordinator.clearPendingToolApprovals(
        runId,
        "Tool approval cancelled because run was closed.",
      );
      await this.waitForActiveTurnToSettle(state);
    }
    state.emitRuntimeEvent({
      method: ClaudeSessionEventName.SESSION_TERMINATED,
      params: {
        runId,
      },
    });
    await this.closeRunSession(runId);
  }

  async closeRunSession(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    this.sessions.delete(runId);
    await this.sessionCleanup.cleanupSessionResources({
      runId,
      session: state,
      activeQueriesByRunId: this.activeQueriesByRunId,
    });
  }

  async getSessionMessages(
    sessionId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const normalizedSessionId = asString(sessionId);
    if (!normalizedSessionId) {
      return [];
    }
    const cachedMessages = this.sessionMessageCache.getCachedMessages(normalizedSessionId);
    const raw = await this.sdkClient.getSessionMessages(normalizedSessionId);
    const normalized = normalizeSessionMessages(raw);
    if (normalized.length > 0) {
      return this.sessionMessageCache.getMergedMessages(normalizedSessionId, normalized);
    }

    return cachedMessages;
  }

  async listModels() {
    return this.sdkClient.listModels();
  }

  async resolveWorkingDirectory(workspaceId?: string | null): Promise<string> {
    return new ClaudeWorkspaceResolver(this.workspaceManager).resolveWorkingDirectory(workspaceId);
  }

  requireRunSession(runId: string): ClaudeSession {
    const session = this.sessions.get(runId);
    if (!session) {
      throw new Error(`Claude runtime session '${runId}' is not available.`);
    }
    return session;
  }

  private buildSessionDependencies(runId: string) {
    return {
      sessionMessageCache: this.sessionMessageCache,
      sdkClient: this.sdkClient,
      activeQueriesByRunId: this.activeQueriesByRunId,
      toolingCoordinator: this.toolingCoordinator,
      isRunSessionActive: () => this.sessions.has(runId),
      terminateRunSession: () => this.terminateRun(runId),
    };
  }

  private async waitForActiveTurnToSettle(session: ClaudeSession): Promise<void> {
    const deadline = Date.now() + ClaudeSessionManager.TERMINATION_SETTLE_TIMEOUT_MS;
    while (session.activeTurnId && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

let cachedClaudeSessionManager: ClaudeSessionManager | null = null;

export const getClaudeSessionManager = (): ClaudeSessionManager => {
  if (!cachedClaudeSessionManager) {
    cachedClaudeSessionManager = new ClaudeSessionManager();
  }
  return cachedClaudeSessionManager;
};
