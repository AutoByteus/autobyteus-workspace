import { describe, expect, it, vi } from "vitest";
import { CodexClientThreadRouter } from "../../../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import type { CodexNotificationMessage, CodexServerRequestMessage } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client-types.js";
import type { CodexAppServerClient } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import type { CodexThread } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread.js";

class FakeCodexClient {
  private notificationListeners = new Set<(message: CodexNotificationMessage) => void>();
  private serverRequestListeners = new Set<(message: CodexServerRequestMessage) => void>();
  private closeListeners = new Set<(error: Error | null) => void>();

  onNotification(listener: (message: CodexNotificationMessage) => void): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  onServerRequest(listener: (message: CodexServerRequestMessage) => void): () => void {
    this.serverRequestListeners.add(listener);
    return () => {
      this.serverRequestListeners.delete(listener);
    };
  }

  onClose(listener: (error: Error | null) => void): () => void {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  emitNotification(message: CodexNotificationMessage): void {
    for (const listener of this.notificationListeners) {
      listener(message);
    }
  }
}

const createThreadDouble = (input: {
  runId: string;
  threadId: string;
  activeTurnId?: string | null;
}) =>
  ({
    runId: input.runId,
    threadId: input.threadId,
    activeTurnId: input.activeTurnId ?? null,
    handleAppServerNotification: vi.fn(),
    handleAppServerApprovalRequest: vi.fn(),
    handleClientClosed: vi.fn(),
  }) as unknown as CodexThread;

describe("CodexClientThreadRouter", () => {
  it("does not broadcast client-global startup notifications to every thread sharing a client", () => {
    const client = new FakeCodexClient();
    const router = new CodexClientThreadRouter();
    const firstThread = createThreadDouble({
      runId: "run-1",
      threadId: "thread-1",
    });
    const secondThread = createThreadDouble({
      runId: "run-2",
      threadId: "thread-2",
    });

    const unregisterFirst = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: firstThread,
    });
    const unregisterSecond = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: secondThread,
    });

    client.emitNotification({
      method: "mcp/startupComplete",
      params: {},
    });

    expect(firstThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(secondThread.handleAppServerNotification).not.toHaveBeenCalled();

    unregisterFirst();
    unregisterSecond();
  });

  it("routes snake_case turn-scoped notifications to the matching active thread", () => {
    const client = new FakeCodexClient();
    const router = new CodexClientThreadRouter();
    const firstThread = createThreadDouble({
      runId: "run-1",
      threadId: "thread-1",
      activeTurnId: "turn-1",
    });
    const secondThread = createThreadDouble({
      runId: "run-2",
      threadId: "thread-2",
      activeTurnId: "turn-2",
    });

    const unregisterFirst = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: firstThread,
    });
    const unregisterSecond = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: secondThread,
    });

    client.emitNotification({
      method: "item/agentMessage/delta",
      params: { turn_id: "turn-2", item: { id: "msg-1" }, delta: "hello" },
    });

    expect(firstThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(secondThread.handleAppServerNotification).toHaveBeenCalledTimes(1);

    unregisterFirst();
    unregisterSecond();
  });

  it("routes snake_case thread-scoped notifications to the matching thread", () => {
    const client = new FakeCodexClient();
    const router = new CodexClientThreadRouter();
    const firstThread = createThreadDouble({
      runId: "run-1",
      threadId: "thread-1",
    });
    const secondThread = createThreadDouble({
      runId: "run-2",
      threadId: "thread-2",
    });

    const unregisterFirst = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: firstThread,
    });
    const unregisterSecond = router.registerThread({
      client: client as unknown as CodexAppServerClient,
      thread: secondThread,
    });

    client.emitNotification({
      method: "thread/tokenUsage/updated",
      params: { thread_id: "thread-1", turn_id: "turn-1" },
    });

    expect(firstThread.handleAppServerNotification).toHaveBeenCalledTimes(1);
    expect(secondThread.handleAppServerNotification).not.toHaveBeenCalled();

    unregisterFirst();
    unregisterSecond();
  });

});
