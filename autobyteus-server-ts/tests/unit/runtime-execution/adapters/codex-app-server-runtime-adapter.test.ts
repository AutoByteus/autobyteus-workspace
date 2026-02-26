import { describe, expect, it, vi } from "vitest";
import type { CodexAppServerRuntimeService } from "../../../../src/runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import { CodexAppServerRuntimeAdapter } from "../../../../src/runtime-execution/adapters/codex-app-server-runtime-adapter.js";

describe("CodexAppServerRuntimeAdapter", () => {
  it("forwards llmConfig into createRunSession options", async () => {
    const runtimeService = {
      resolveWorkingDirectory: vi.fn().mockResolvedValue("/tmp/workspace"),
      createRunSession: vi.fn().mockResolvedValue({
        threadId: "thread-1",
        metadata: { model: "gpt-5.3-codex", reasoning_effort: "high" },
      }),
      restoreRunSession: vi.fn(),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    } as unknown as CodexAppServerRuntimeService;

    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    await adapter.createAgentRun({
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: { reasoning_effort: "high" },
      skillAccessMode: null,
    });

    expect((runtimeService.resolveWorkingDirectory as any)).toHaveBeenCalledWith("workspace-1");
    expect((runtimeService.createRunSession as any)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        modelIdentifier: "gpt-5.3-codex",
        workingDirectory: "/tmp/workspace",
        llmConfig: { reasoning_effort: "high" },
      }),
    );
  });

  it("forwards llmConfig into restoreRunSession options", async () => {
    const runtimeService = {
      resolveWorkingDirectory: vi.fn().mockResolvedValue("/tmp/workspace"),
      createRunSession: vi.fn(),
      restoreRunSession: vi.fn().mockResolvedValue({
        threadId: "thread-9",
        metadata: { model: "gpt-5.3-codex", reasoning_effort: "medium" },
      }),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    } as unknown as CodexAppServerRuntimeService;

    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    await adapter.restoreAgentRun({
      runId: "run-9",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: { reasoning_effort: "medium" },
      skillAccessMode: null,
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "run-9",
        threadId: "thread-old",
        metadata: { model: "gpt-5.3-codex" },
      },
    });

    expect((runtimeService.restoreRunSession as any)).toHaveBeenCalledWith(
      "run-9",
      expect.objectContaining({
        modelIdentifier: "gpt-5.3-codex",
        workingDirectory: "/tmp/workspace",
        llmConfig: { reasoning_effort: "medium" },
      }),
      expect.objectContaining({
        threadId: "thread-old",
      }),
    );
  });
});
