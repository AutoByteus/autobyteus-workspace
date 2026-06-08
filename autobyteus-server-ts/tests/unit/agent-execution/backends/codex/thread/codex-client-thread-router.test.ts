import { describe, expect, it, vi } from "vitest";
import { CodexClientThreadRouter } from "../../../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import type { CodexNotificationMessage, CodexServerRequestMessage } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client-types.js";
import type { CodexAppServerClient } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import type { CodexThread } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread.js";

class FakeCodexClient {
  private notificationListeners = new Set<(message: CodexNotificationMessage) => void>();
  private serverRequestListeners = new Set<(message: CodexServerRequestMessage) => void>();
  private closeListeners = new Set<(error: Error | null) => void>();
  readonly respondError = vi.fn();

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

  emitServerRequest(message: CodexServerRequestMessage): void {
    for (const listener of this.serverRequestListeners) {
      listener(message);
    }
  }
}

type CodexThreadDouble = CodexThread & {
  currentStatus: string;
  handleAppServerNotification: ReturnType<typeof vi.fn>;
  handleAppServerRequest: ReturnType<typeof vi.fn>;
  emitRuntimeError: ReturnType<typeof vi.fn>;
};

const createThreadDouble = (input: {
  runId: string;
  threadId: string;
  activeTurnId?: string | null;
}): CodexThreadDouble =>
  ({
    runId: input.runId,
    threadId: input.threadId,
    activeTurnId: input.activeTurnId ?? null,
    currentStatus: "IDLE",
    handleAppServerNotification: vi.fn(),
    handleAppServerRequest: vi.fn(),
    emitRuntimeError: vi.fn(),
    handleClientClosed: vi.fn(),
  }) as unknown as CodexThreadDouble;

describe("CodexClientThreadRouter", () => {
  it("skips known client-global notifications before routing or runtime-error emission", () => {
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

    for (const method of [
      "account/rateLimits/updated",
      "mcpServer/startupStatus/updated",
      "mcp/startupComplete",
    ]) {
      client.emitNotification({
        method,
        params: {},
      });
    }

    expect(firstThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(secondThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(firstThread.emitRuntimeError).not.toHaveBeenCalled();
    expect(secondThread.emitRuntimeError).not.toHaveBeenCalled();

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

  it("keeps missing-identity notification diagnostics server-side for multi-thread routes", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
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
      method: "item/agentMessage/delta",
      params: { item: { id: "msg-no-route" }, delta: "hello" },
    });

    expect(firstThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(secondThread.handleAppServerNotification).not.toHaveBeenCalled();
    expect(firstThread.emitRuntimeError).not.toHaveBeenCalled();
    expect(secondThread.emitRuntimeError).not.toHaveBeenCalled();
    expect(firstThread.currentStatus).toBe("IDLE");
    expect(secondThread.currentStatus).toBe("IDLE");
    expect(warnSpy).toHaveBeenCalledWith(
      "[CodexClientThreadRouter] app-server message was not routed",
      expect.objectContaining({
        kind: "notification",
        method: "item/agentMessage/delta",
        threadCount: 2,
      }),
    );

    unregisterFirst();
    unregisterSecond();
    warnSpy.mockRestore();
  });

  it("responds to unrouteable server requests without per-thread runtime errors", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
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

    client.emitServerRequest({
      id: "request-no-route",
      method: "approval/request",
      params: { prompt: "approve?" },
    });

    expect(firstThread.handleAppServerRequest).not.toHaveBeenCalled();
    expect(secondThread.handleAppServerRequest).not.toHaveBeenCalled();
    expect(firstThread.emitRuntimeError).not.toHaveBeenCalled();
    expect(secondThread.emitRuntimeError).not.toHaveBeenCalled();
    expect(client.respondError).toHaveBeenCalledTimes(1);
    expect(client.respondError).toHaveBeenCalledWith(
      "request-no-route",
      -32000,
      "Codex app server request 'approval/request' could not be routed to a single active thread.",
      expect.objectContaining({
        method: "approval/request",
        threadCount: 2,
      }),
    );

    unregisterFirst();
    unregisterSecond();
    warnSpy.mockRestore();
  });

});
