import type { CodexAppServerClientLease } from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
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
import type { JsonObject } from "../codex-app-server-json.js";
import {
  getSystemInstructionCaptureService,
  type SystemInstructionCaptureService,
} from "../../../../agent-memory/services/system-instruction-capture-service.js";

export class CodexThreadManager {
  private readonly runContexts = new Map<string, CodexRunContext>();
  private readonly preparations = new Map<string, ThreadPreparation>();
  private readonly releasedThreads = new WeakSet<CodexThread>();
  private readonly released = new WeakSet<CodexRunContext>();
  private readonly threads = new Map<string, CodexThread>();
  private readonly clientManager: CodexAppServerClientManager;
  private readonly threadCleanup: CodexThreadCleanup;
  private readonly clientThreadRouter: CodexClientThreadRouter;
  private readonly systemInstructionCaptureService: SystemInstructionCaptureService;

  constructor(
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
    threadCleanup: CodexThreadCleanup = getCodexThreadCleanup(),
    clientThreadRouter: CodexClientThreadRouter = getCodexClientThreadRouter(),
    systemInstructionCaptureService: SystemInstructionCaptureService = getSystemInstructionCaptureService(),
  ) {
    this.clientManager = clientManager;
    this.threadCleanup = threadCleanup;
    this.clientThreadRouter = clientThreadRouter;
    this.systemInstructionCaptureService = systemInstructionCaptureService;
  }

  createThread(runContext: CodexRunContext, assertAccepting: () => void): Promise<CodexThread> {
    return this.startThread(runContext, null, assertAccepting);
  }

  restoreThread(runContext: CodexRunContext, assertAccepting: () => void): Promise<CodexThread> {
    return this.startThread(runContext, runContext.runtimeContext.threadId, assertAccepting);
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

  /**
   * Reopens the run's thread with a new app-server config (its Agent Tools MCP server with a new
   * tool list), on the run's existing preparation: the same client, lease, skills and thread
   * object. Only with no active turn.
   *
   * - With a conversation: `thread/unsubscribe`, then `thread/resume` of the same thread ID; the
   *   router binding and listeners are kept.
   * - Without one (no rollout to resume): `thread/unsubscribe`, then `thread/start`; the run takes
   *   the new thread ID, which the router reads from the run context.
   */
  async reopenThread(runContext: CodexRunContext, appServerConfig: JsonObject): Promise<void> {
    const owner = this.preparations.get(runContext.runId);
    const thread = owner?.thread;
    if (!owner || owner.context !== runContext || !thread || owner.cancelled || owner.releaseAttempt) {
      throw new Error("Codex thread is not open for this run.");
    }
    const runtimeContext = runContext.runtimeContext;
    if (runtimeContext.activeTurnId) throw new Error("Codex thread cannot be reopened during a turn.");
    const threadId = runtimeContext.threadId;
    if (!threadId) throw new Error("Codex thread has no thread ID to reopen.");
    const config = runtimeContext.codexThreadConfig;
    config.appServerConfig = appServerConfig;
    await thread.client.request<unknown>("thread/unsubscribe", { threadId });
    if (runtimeContext.hasConversationHistory) {
      const resumedThreadId = await this.resumeRemoteThread(thread.client, threadId, config);
      if (resumedThreadId !== threadId) {
        throw new Error(`Codex resumed thread '${String(resumedThreadId)}' instead of '${threadId}'.`);
      }
      return;
    }
    const startedThreadId = await this.startRemoteThread(thread.client, config);
    if (!startedThreadId) throw new Error("Codex thread id was not returned by app server.");
    runtimeContext.threadId = startedThreadId;
  }

  async terminateThread(runId: string, expectedThread: CodexThread): Promise<void> {
    const owner = this.preparations.get(runId);
    if (!owner) {
      if (this.releasedThreads.has(expectedThread)) return;
      throw new Error("Codex exact thread release authority unavailable.");
    }
    if (owner.thread !== expectedThread) throw new Error("Codex thread release generation mismatch.");
    await this.releasePreparation(owner.context);
  }

  releasePreparation(context: CodexRunContext): Promise<void> {
    if (this.released.has(context)) return Promise.resolve();
    const owner = this.preparations.get(context.runId);
    if (!owner) return Promise.resolve(); // identity plan/bootstrap has not started a thread
    if (owner.context !== context) return Promise.reject(new Error("Codex preparation generation mismatch."));
    owner.cancelled = true;
    owner.thread?.cancelRuntimeInput();
    if (owner.releaseAttempt) return owner.releaseAttempt;
    const attempt = (async () => {
      const errors: unknown[] = [];
      const thread = owner.thread;
      if (thread) {
        try {
          await thread.releaseRuntimeInput();
          thread.rejectStartupReady(new Error("Codex preparation was closed."));
          thread.flushSegmentTurnRejectionSummaries();
          thread.clearListeners(); thread.clearApprovalRecords(); thread.clearPendingMcpToolCalls(); thread.unbindAll();
        } catch (error) { errors.push(error); }
      }
      try { await this.threadCleanup.cleanupPreparedWorkspaceSkills(context.runtimeContext.materializedConfiguredSkills); }
      catch (error) { errors.push(error); }
      if (!errors.length) {
        try { await owner.lease.release(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, "Codex exact thread cleanup failed.");
      if (!owner.settled) throw new Error("Codex thread startup continuation still pending.");
      this.preparations.delete(context.runId);
      this.runContexts.delete(context.runId);
      this.threads.delete(context.runId);
      this.released.add(context);
      if (thread) this.releasedThreads.add(thread);
    })();
    owner.releaseAttempt = attempt;
    void attempt.finally(() => { if (owner.releaseAttempt === attempt) owner.releaseAttempt = null; }).catch(() => undefined);
    return attempt;
  }

  private async startThread(
    runContext: CodexRunContext,
    resumeThreadId: string | null,
    assertAccepting: () => void,
  ): Promise<CodexThread> {
    assertAccepting();
    if (this.preparations.has(runContext.runId)) throw new Error("Codex thread still owns preparation/cleanup.");
    const config = runContext.runtimeContext.codexThreadConfig;
    const owner: ThreadPreparation = {
      context: runContext, lease: this.clientManager.beginAcquire(config.workingDirectory),
      thread: null, cancelled: false, settled: false, releaseAttempt: null,
    };
    this.preparations.set(runContext.runId, owner);
    this.runContexts.set(runContext.runId, runContext);
    const assertCurrent = () => {
      assertAccepting();
      if (owner.cancelled) throw new Error("Codex thread preparation cancelled.");
    };
    try {
    const client = await owner.lease.acquire();
    assertCurrent();
    const thread = new CodexThread({ runContext, client, startup: createCodexThreadStartupGate() });
    owner.thread = thread;
    this.threads.set(runContext.runId, thread);
    const unbind = this.clientThreadRouter.registerThread({
      client: thread.client,
      thread,
      onThreadClientClosed: (closedThread) => {
        this.handleUnexpectedThreadClosure(closedThread);
      },
    });
    thread.addUnbindHandler(unbind);
      const suppliedAt = Date.now() / 1000;
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
      assertCurrent();
      if (!threadId) {
        throw new Error("Codex thread id was not returned by app server.");
      }
      runContext.runtimeContext.threadId = threadId;
      runContext.runtimeContext.activeTurnId = null;
      if (typeof config.baseInstructions === "string") {
        const capture = this.systemInstructionCaptureService.capture({
          memoryDir: runContext.config.memoryDir ?? "",
          content: config.baseInstructions,
          suppliedAt,
        });
        if (capture.created) {
          thread.setPendingSystemInstructionCapture(capture.trace);
        }
      }
      thread.markStartupReady();
      return thread;
    } finally {
      owner.settled = true;
      if (owner.cancelled) void this.releasePreparation(runContext).catch((error) => console.warn("CODEX_PREPARATION_RELEASE_FAILED", error));
    }
  }

  private async startRemoteThread(
    client: CodexAppServerClient,
    config: CodexThreadConfig,
  ): Promise<string | null> {
    const response = await client.request<unknown>("thread/start", {
      model: config.model,
      modelProvider: null,
      serviceTier: config.serviceTier,
      cwd: config.workingDirectory,
      approvalPolicy: config.approvalPolicy,
      sandbox: config.sandbox,
      config: config.appServerConfig ?? null,
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
    const response = await client.request<unknown>("thread/resume", {
      threadId,
      history: null,
      path: null,
      model: config.model,
      modelProvider: null,
      serviceTier: config.serviceTier,
      cwd: config.workingDirectory,
      approvalPolicy: config.approvalPolicy,
      sandbox: config.sandbox,
      config: config.appServerConfig ?? null,
      baseInstructions: config.baseInstructions,
      developerInstructions: config.developerInstructions,
      personality: null,
      dynamicTools: config.dynamicTools,
      experimentalRawEvents: true,
      persistExtendedHistory: true,
    });
    return resolveThreadId(response);
  }

  private handleUnexpectedThreadClosure(thread: CodexThread): void {
    const owner = this.preparations.get(thread.runId);
    if (owner?.thread !== thread) return;
    void this.releasePreparation(owner.context).catch((error) => console.warn("CODEX_THREAD_RELEASE_FAILED", error));
  }

}

let cachedCodexThreadManager: CodexThreadManager | null = null;

export const getCodexThreadManager = (): CodexThreadManager => {
  if (!cachedCodexThreadManager) {
    cachedCodexThreadManager = new CodexThreadManager();
  }
  return cachedCodexThreadManager;
};

type ThreadPreparation = {
  context: CodexRunContext; lease: CodexAppServerClientLease; thread: CodexThread | null;
  cancelled: boolean; settled: boolean; releaseAttempt: Promise<void> | null;
};
