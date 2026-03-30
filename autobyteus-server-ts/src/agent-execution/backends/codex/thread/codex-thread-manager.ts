import {
  getCodexAppServerClientManager,
  type CodexAppServerClientManager,
} from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexAppServerClient } from "../../../../runtime-management/codex/client/codex-app-server-client.js";
import type { CodexRunContext } from "../backend/codex-agent-run-context.js";
import {
  getCodexClientThreadRouter,
  type CodexClientThreadRouter,
} from "./codex-client-thread-router.js";
import {
  getCodexThreadCleanup,
  type CodexThreadCleanup,
} from "../backend/codex-thread-cleanup.js";
import { resolveThreadId } from "./codex-thread-id-resolver.js";
import { createCodexThreadStartupGate } from "./codex-thread-startup-gate.js";
import { CodexThread } from "./codex-thread.js";
import type { CodexThreadConfig } from "./codex-thread-config.js";

export class CodexThreadManager {
  private readonly runContexts = new Map<string, CodexRunContext>();
  private readonly threads = new Map<string, CodexThread>();
  private readonly clientManager: CodexAppServerClientManager;
  private readonly threadCleanup: CodexThreadCleanup;
  private readonly clientThreadRouter: CodexClientThreadRouter;

  constructor(
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
    threadCleanup: CodexThreadCleanup = getCodexThreadCleanup(),
    clientThreadRouter: CodexClientThreadRouter = getCodexClientThreadRouter(),
  ) {
    this.clientManager = clientManager;
    this.threadCleanup = threadCleanup;
    this.clientThreadRouter = clientThreadRouter;
  }

  async createThread(
    runContext: CodexRunContext,
  ): Promise<CodexThread> {
    await this.closeThread(runContext.runId);
    const thread = await this.startThread(runContext, null);
    this.runContexts.set(runContext.runId, runContext);
    this.threads.set(runContext.runId, thread);
    return thread;
  }

  async restoreThread(
    runContext: CodexRunContext,
  ): Promise<CodexThread> {
    await this.closeThread(runContext.runId);
    const thread = await this.startThread(runContext, runContext.runtimeContext.threadId);
    this.runContexts.set(runContext.runId, runContext);
    this.threads.set(runContext.runId, thread);
    return thread;
  }

  hasThread(runId: string): boolean {
    return this.threads.has(runId);
  }

  getThread(runId: string): CodexThread | null {
    return this.threads.get(runId) ?? null;
  }

  getRunContext(runId: string): CodexRunContext | null {
    return this.runContexts.get(runId) ?? null;
  }

  async terminateThread(runId: string): Promise<void> {
    await this.closeThread(runId);
  }

  private async closeThread(runId: string): Promise<void> {
    const runContext = this.runContexts.get(runId);
    if (!runContext) {
      return;
    }
    this.runContexts.delete(runId);
    const thread = this.threads.get(runId) ?? null;
    this.threads.delete(runId);
      if (thread) {
        thread.rejectStartupReady(
          new Error(`Codex thread '${runId}' was closed before startup completed.`),
        );
        thread.clearListeners();
        thread.clearApprovalRecords();
        thread.clearPendingMcpToolCalls();
        thread.unbindAll();
      }
    runContext.runtimeContext.activeTurnId = null;
    await this.threadCleanup.cleanupThreadResources(runContext.runtimeContext.toCleanupTarget());
  }

  private async startThread(
    runContext: CodexRunContext,
    resumeThreadId: string | null,
  ): Promise<CodexThread> {
    const config = runContext.runtimeContext.codexThreadConfig;
    const client = await this.clientManager.acquireClient(config.workingDirectory);
    const thread = new CodexThread({
      runContext,
      client,
      startup: createCodexThreadStartupGate(),
    });
    const unbind = this.clientThreadRouter.registerThread({
      client: thread.client,
      thread,
      onThreadClientClosed: (closedThread) => {
        this.handleUnexpectedThreadClosure(closedThread);
      },
    });
    thread.addUnbindHandler(unbind);
    try {
      const threadId = resumeThreadId
        ? await this.resumeRemoteThread(
            client,
            resumeThreadId,
            config,
          )
        : await this.startRemoteThread(
            client,
            config,
          );
      if (!threadId) {
        throw new Error("Codex thread id was not returned by app server.");
      }
      runContext.runtimeContext.threadId = threadId;
      runContext.runtimeContext.activeTurnId = null;
      thread.markStartupReady();
      return thread;
    } catch (error) {
      thread.rejectStartupReady(
        error instanceof Error ? error : new Error(String(error)),
      );
      thread.clearListeners();
      thread.clearApprovalRecords();
      thread.clearPendingMcpToolCalls();
      thread.unbindAll();
      await this.clientManager.releaseClient(config.workingDirectory).catch(() => {});
      throw error;
    }
  }

  private async startRemoteThread(
    client: CodexAppServerClient,
    config: CodexThreadConfig,
  ): Promise<string | null> {
    const response = await client.request<unknown>("thread/start", {
      model: config.model,
      modelProvider: null,
      cwd: config.workingDirectory,
      approvalPolicy: config.approvalPolicy,
      sandbox: config.sandbox,
      config: null,
      baseInstructions: config.baseInstructions,
      developerInstructions: config.developerInstructions,
      personality: null,
      ephemeral: false,
      dynamicTools: config.dynamicTools,
      experimentalRawEvents: true,
      persistExtendedHistory: true,
    });
    return resolveThreadId(response);
  }

  private async resumeRemoteThread(
    client: CodexAppServerClient,
    threadId: string,
    config: CodexThreadConfig,
  ): Promise<string | null> {
    try {
      const response = await client.request<unknown>("thread/resume", {
        threadId,
        history: null,
        path: null,
        model: config.model,
        modelProvider: null,
        cwd: config.workingDirectory,
        approvalPolicy: config.approvalPolicy,
        sandbox: config.sandbox,
        config: null,
        baseInstructions: config.baseInstructions,
        developerInstructions: config.developerInstructions,
        personality: null,
        dynamicTools: config.dynamicTools,
        experimentalRawEvents: true,
        persistExtendedHistory: true,
      });
      return resolveThreadId(response);
    } catch (error) {
      console.warn(
        `Failed to resume Codex thread '${threadId}', starting a new thread: ${String(error)}`,
      );
      return this.startRemoteThread(client, config);
    }
  }

  private handleUnexpectedThreadClosure(thread: CodexThread): void {
    const runContext = this.runContexts.get(thread.runId);
    if (this.threads.get(thread.runId) !== thread) {
      return;
    }
    this.runContexts.delete(thread.runId);
    this.threads.delete(thread.runId);
    if (runContext) {
      runContext.runtimeContext.activeTurnId = null;
    }
    thread.clearListeners();
    thread.clearApprovalRecords();
    thread.clearPendingMcpToolCalls();
    void this.threadCleanup
      .cleanupThreadResources(
        runContext?.runtimeContext.toCleanupTarget() ?? {
          workingDirectory: thread.workingDirectory,
          materializedConfiguredSkills: [],
        },
      )
      .catch(() => {});
  }
}

let cachedCodexThreadManager: CodexThreadManager | null = null;

export const getCodexThreadManager = (): CodexThreadManager => {
  if (!cachedCodexThreadManager) {
    cachedCodexThreadManager = new CodexThreadManager();
  }
  return cachedCodexThreadManager;
};
