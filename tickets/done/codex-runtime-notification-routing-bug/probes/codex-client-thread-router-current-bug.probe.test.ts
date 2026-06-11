import { describe, expect, it, vi } from "vitest";
import { CodexClientThreadRouter } from "../../../autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import type { CodexNotificationMessage, CodexServerRequestMessage } from "../../../autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-types.js";
import type { CodexAppServerClient } from "../../../autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.js";
import type { CodexThread } from "../../../autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.js";

class FakeCodexClient {
  private notificationListeners = new Set<(message: CodexNotificationMessage) => void>();
  private serverRequestListeners = new Set<(message: CodexServerRequestMessage) => void>();
  private closeListeners = new Set<(error: Error | null) => void>();

  onNotification(listener: (message: CodexNotificationMessage) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  onServerRequest(listener: (message: CodexServerRequestMessage) => void): () => void {
    this.serverRequestListeners.add(listener);
    return () => this.serverRequestListeners.delete(listener);
  }

  onClose(listener: (error: Error | null) => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  emitNotification(message: CodexNotificationMessage): void {
    for (const listener of this.notificationListeners) {
      listener(message);
    }
  }
}

const createThreadDouble = (input: { runId: string; threadId: string }) =>
  ({
    runId: input.runId,
    threadId: input.threadId,
    activeTurnId: null,
    handleAppServerNotification: vi.fn(),
    handleAppServerRequest: vi.fn(),
    handleClientClosed: vi.fn(),
    emitRuntimeError: vi.fn(),
  }) as unknown as CodexThread & { emitRuntimeError: ReturnType<typeof vi.fn> };

describe("CodexClientThreadRouter current bug probe", () => {
  it("currently emits user-visible runtime errors for unscoped global notifications when two team threads share one client", () => {
    const client = new FakeCodexClient();
    const router = new CodexClientThreadRouter();
    const firstThread = createThreadDouble({ runId: "run-1", threadId: "thread-1" });
    const secondThread = createThreadDouble({ runId: "run-2", threadId: "thread-2" });

    const unregisterFirst = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: firstThread,
    });
    const unregisterSecond = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: secondThread,
    });

    client.emitNotification({
      method: "mcpServer/startupStatus/updated",
      params: { name: "codex_apps", status: "ready", error: null },
    });

    expect(firstThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(secondThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(firstThread.emitRuntimeError).toHaveBeenCalledWith(
      "CODEX_AMBIGUOUS_TEAM_THREAD_EVENT",
      expect.stringContaining("mcpServer/startupStatus/updated"),
    );
    expect(secondThread.emitRuntimeError).toHaveBeenCalledWith(
      "CODEX_AMBIGUOUS_TEAM_THREAD_EVENT",
      expect.stringContaining("mcpServer/startupStatus/updated"),
    );

    unregisterFirst();
    unregisterSecond();
  });
});
