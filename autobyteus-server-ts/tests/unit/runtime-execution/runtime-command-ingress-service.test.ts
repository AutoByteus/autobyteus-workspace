import { AgentInputUserMessage } from "autobyteus-ts";
import { describe, expect, it, vi } from "vitest";
import { RuntimeAdapterRegistry } from "../../../src/runtime-execution/runtime-adapter-registry.js";
import { RuntimeCommandIngressService } from "../../../src/runtime-execution/runtime-command-ingress-service.js";
import { RuntimeSessionStore } from "../../../src/runtime-execution/runtime-session-store.js";
import type { RuntimeAdapter } from "../../../src/runtime-execution/runtime-adapter-port.js";

describe("RuntimeCommandIngressService", () => {
  it("returns rejected result when no run session exists and run is not active", async () => {
    const sendTurn = vi.fn().mockResolvedValue({ accepted: true });
    const adapter: RuntimeAdapter = {
      runtimeKind: "autobyteus",
      sendTurn,
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const codexAdapter: RuntimeAdapter = {
      runtimeKind: "codex_app_server",
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([adapter, codexAdapter]),
    );

    const result = await service.sendTurn({
      runId: "run-1",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUN_SESSION_NOT_FOUND");
    expect(result.runtimeKind).toBe("autobyteus");
    expect(sessionStore.getSession("run-1")).toBeNull();
    expect(sendTurn).toHaveBeenCalledTimes(0);
  });

  it("evicts stale runtime sessions when adapter reports inactive run", async () => {
    const codexAdapter: RuntimeAdapter = {
      runtimeKind: "codex_app_server",
      isRunActive: vi.fn().mockReturnValue(false),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: "stale-run",
      runtimeKind: "codex_app_server",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "stale-run",
        threadId: "thread-1",
        metadata: null,
      },
    });

    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([codexAdapter]),
    );
    const result = await service.sendTurn({
      runId: "stale-run",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUN_SESSION_NOT_FOUND");
    expect(sessionStore.getSession("stale-run")).toBeNull();
  });

  it("rejects commands when session binding is missing, even with one configured runtime", async () => {
    const sendTurn = vi.fn().mockResolvedValue({ accepted: true });
    const adapter: RuntimeAdapter = {
      runtimeKind: "autobyteus",
      sendTurn,
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };

    const sessionStore = new RuntimeSessionStore();
    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([adapter]),
    );

    const result = await service.sendTurn({
      runId: "run-active",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUN_SESSION_NOT_FOUND");
    expect(sessionStore.getSession("run-active")).toBeNull();
    expect(sendTurn).not.toHaveBeenCalled();
  });

  it("returns rejected result when adapter throws", async () => {
    const adapter: RuntimeAdapter = {
      runtimeKind: "autobyteus",
      sendTurn: vi.fn().mockRejectedValue(new Error("boom")),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: "run-2",
      runtimeKind: "autobyteus",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: "run-2",
        threadId: null,
        metadata: null,
      },
    });
    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([adapter]),
    );

    const result = await service.sendTurn({
      runId: "run-2",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("boom");
  });

  it("routes interrupt commands through runtime adapter", async () => {
    const interruptRun = vi.fn().mockResolvedValue({ accepted: true });
    const adapter: RuntimeAdapter = {
      runtimeKind: "autobyteus",
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun,
    };
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: "run-3",
      runtimeKind: "autobyteus",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: "run-3",
        threadId: null,
        metadata: null,
      },
    });
    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([adapter]),
    );

    const result = await service.interruptRun({
      runId: "run-3",
      mode: "agent",
      turnId: null,
    });

    expect(result.accepted).toBe(true);
    expect(result.runtimeKind).toBe("autobyteus");
    expect(interruptRun).toHaveBeenCalledWith({
      runId: "run-3",
      mode: "agent",
      turnId: null,
    });
  });

  it("routes inter-agent relay when runtime adapter supports it", async () => {
    const relayInterAgentMessage = vi.fn().mockResolvedValue({ accepted: true });
    const adapter: RuntimeAdapter = {
      runtimeKind: "codex_app_server",
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      relayInterAgentMessage,
      interruptRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: "run-relay",
      runtimeKind: "codex_app_server",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "run-relay",
        threadId: null,
        metadata: null,
      },
    });

    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([adapter]),
    );

    const result = await service.relayInterAgentMessage({
      runId: "run-relay",
      envelope: {
        senderAgentRunId: "member-a",
        recipientName: "member-b",
        messageType: "agent_message",
        content: "hello",
      },
    });

    expect(result.accepted).toBe(true);
    expect(relayInterAgentMessage).toHaveBeenCalledTimes(1);
  });

  it("returns deterministic unsupported code when relay is unavailable on adapter", async () => {
    const adapter: RuntimeAdapter = {
      runtimeKind: "autobyteus",
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: "run-relay-unsupported",
      runtimeKind: "autobyteus",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: "run-relay-unsupported",
        threadId: null,
        metadata: null,
      },
    });

    const service = new RuntimeCommandIngressService(sessionStore, new RuntimeAdapterRegistry([adapter]));
    const result = await service.relayInterAgentMessage({
      runId: "run-relay-unsupported",
      envelope: {
        senderAgentRunId: "member-a",
        recipientName: "member-b",
        messageType: "agent_message",
        content: "hello",
      },
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("INTER_AGENT_RELAY_UNSUPPORTED");
  });

  it("fails fast for send operations when runtime capability is unavailable", async () => {
    const codexSend = vi.fn().mockResolvedValue({ accepted: true });
    const codexAdapter: RuntimeAdapter = {
      runtimeKind: "codex_app_server",
      sendTurn: codexSend,
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: "run-codex",
      runtimeKind: "codex_app_server",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "run-codex",
        threadId: "thread-1",
        metadata: null,
      },
    });

    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([codexAdapter]),
      {
        getRuntimeCapability: vi.fn().mockReturnValue({
          runtimeKind: "codex_app_server",
          enabled: false,
          reason: "Codex CLI is not available on PATH.",
        }),
      } as any,
    );

    const result = await service.sendTurn({
      runId: "run-codex",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUNTIME_UNAVAILABLE");
    expect(codexSend).not.toHaveBeenCalled();
  });

  it("keeps terminate available under runtime degradation policy", async () => {
    const terminateRun = vi.fn().mockResolvedValue({ accepted: true });
    const codexAdapter: RuntimeAdapter = {
      runtimeKind: "codex_app_server",
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun,
    };
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: "run-codex-terminate",
      runtimeKind: "codex_app_server",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "run-codex-terminate",
        threadId: "thread-2",
        metadata: null,
      },
    });

    const service = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([codexAdapter]),
      {
        getRuntimeCapability: vi.fn().mockReturnValue({
          runtimeKind: "codex_app_server",
          enabled: false,
          reason: "Codex CLI is not available on PATH.",
        }),
      } as any,
    );

    const result = await service.terminateRun({
      runId: "run-codex-terminate",
      mode: "agent",
    });

    expect(result.accepted).toBe(true);
    expect(terminateRun).toHaveBeenCalledTimes(1);
  });
});
