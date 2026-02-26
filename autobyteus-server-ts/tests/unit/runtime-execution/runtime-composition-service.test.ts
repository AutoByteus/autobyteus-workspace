import { describe, expect, it, vi } from "vitest";
import { RuntimeAdapterRegistry } from "../../../src/runtime-execution/runtime-adapter-registry.js";
import { RuntimeCompositionService } from "../../../src/runtime-execution/runtime-composition-service.js";
import { RuntimeSessionStore } from "../../../src/runtime-execution/runtime-session-store.js";
import type { RuntimeAdapter } from "../../../src/runtime-execution/runtime-adapter-port.js";

describe("RuntimeCompositionService", () => {
  it("creates a run and binds runtime session metadata", async () => {
    const adapter: RuntimeAdapter = {
      runtimeKind: "autobyteus",
      createAgentRun: vi.fn().mockResolvedValue({
        runId: "run-1",
        runtimeReference: {
          runtimeKind: "autobyteus",
          sessionId: "run-1",
          threadId: null,
          metadata: null,
        },
      }),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    const service = new RuntimeCompositionService(
      sessionStore,
      new RuntimeAdapterRegistry([adapter]),
    );

    const session = await service.createAgentRun({
      runtimeKind: "autobyteus",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
      skillAccessMode: null,
    });

    expect(session.runId).toBe("run-1");
    expect(session.runtimeKind).toBe("autobyteus");
    expect(sessionStore.getSession("run-1")?.mode).toBe("agent");
    expect(adapter.createAgentRun).toHaveBeenCalledTimes(1);
  });

  it("restores a run and persists session state", async () => {
    const adapter: RuntimeAdapter = {
      runtimeKind: "autobyteus",
      restoreAgentRun: vi.fn().mockResolvedValue({
        runId: "run-2",
        runtimeReference: {
          runtimeKind: "autobyteus",
          sessionId: "run-2",
          threadId: "thread-1",
          metadata: { source: "restore" },
        },
      }),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const sessionStore = new RuntimeSessionStore();
    const service = new RuntimeCompositionService(
      sessionStore,
      new RuntimeAdapterRegistry([adapter]),
    );

    const session = await service.restoreAgentRun({
      runId: "run-2",
      runtimeKind: "autobyteus",
      agentDefinitionId: "agent-def-2",
      llmModelIdentifier: "model-2",
      autoExecuteTools: true,
      workspaceId: null,
      llmConfig: null,
      skillAccessMode: null,
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: "run-2",
        threadId: "thread-1",
        metadata: { source: "manifest" },
      },
    });

    expect(session.runId).toBe("run-2");
    expect(sessionStore.getSession("run-2")?.runtimeKind).toBe("autobyteus");
    expect(adapter.restoreAgentRun).toHaveBeenCalledTimes(1);
  });

  it("fails fast when runtime capability is unavailable for create", async () => {
    const createAgentRun = vi.fn();
    const codexAdapter: RuntimeAdapter = {
      runtimeKind: "codex_app_server",
      createAgentRun,
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
    };
    const service = new RuntimeCompositionService(
      new RuntimeSessionStore(),
      new RuntimeAdapterRegistry([codexAdapter]),
      {
        getRuntimeCapability: vi.fn().mockReturnValue({
          runtimeKind: "codex_app_server",
          enabled: false,
          reason: "Codex CLI is not available on PATH.",
        }),
      } as any,
    );

    await expect(
      service.createAgentRun({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-3",
        llmModelIdentifier: "gpt-5.3-codex",
        autoExecuteTools: false,
        workspaceId: null,
        llmConfig: null,
        skillAccessMode: null,
      }),
    ).rejects.toThrow("Runtime 'codex_app_server' is unavailable");

    expect(createAgentRun).not.toHaveBeenCalled();
  });
});
