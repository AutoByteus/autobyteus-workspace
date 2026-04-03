import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";

describe("AgentRunManager", () => {
  const createBackend = (options: {
    runId: string;
    runtimeKind: "codex_app_server" | "claude_agent_sdk";
  }) => {
    const config = new AgentRunConfig({
      runtimeKind: options.runtimeKind,
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier:
        options.runtimeKind === "claude_agent_sdk"
          ? "claude-sonnet-4-5"
          : "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
      skillAccessMode: null,
    });

    return {
      runId: options.runId,
      runtimeKind: options.runtimeKind,
      getContext: () =>
        new AgentRunContext({
          runId: options.runId,
          config,
          runtimeContext: null,
        }),
      getPlatformAgentRunId: () => `platform-${options.runId}`,
      isActive: () => true,
      getStatus: () => "ACTIVE",
      subscribeToEvents: () => () => undefined,
      postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
  };

  it("delegates Codex create to a runtime-managed run factory", async () => {
    const codexBackendFactory = {
      createBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-codex",
          runtimeKind: "codex_app_server",
        }),
      ),
      restoreBackend: vi.fn(),
    };
    const manager = new AgentRunManager({
      codexBackendFactory: codexBackendFactory as any,
    });

    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-5.3-codex",
        autoExecuteTools: false,
        workspaceId: "workspace-1",
        llmConfig: { reasoning_effort: "high" },
        skillAccessMode: null,
      }),
    );

    expect(run.runId).toBe("run-codex");
    expect(run.runtimeKind).toBe("codex_app_server");
    expect(codexBackendFactory.createBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-1",
        workspaceId: "workspace-1",
      }),
      null,
    );
  });

  it("delegates Codex restore to a runtime-managed run factory", async () => {
    const restoreContext = new AgentRunContext({
      runId: "run-codex",
      runtimeContext: null,
      config: new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-5.3-codex",
        autoExecuteTools: false,
        workspaceId: "workspace-1",
        llmConfig: { reasoning_effort: "medium" },
        skillAccessMode: null,
      }),
    });
    const codexBackendFactory = {
      createBackend: vi.fn(),
      restoreBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-codex",
          runtimeKind: "codex_app_server",
        }),
      ),
    };
    const manager = new AgentRunManager({
      codexBackendFactory: codexBackendFactory as any,
    });

    const run = await manager.restoreAgentRun(restoreContext);

    expect(run.runId).toBe("run-codex");
    expect(codexBackendFactory.restoreBackend).toHaveBeenCalledWith(restoreContext);
  });

  it("delegates Claude create to a runtime-managed run factory", async () => {
    const claudeBackendFactory = {
      createBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-claude",
          runtimeKind: "claude_agent_sdk",
        }),
      ),
      restoreBackend: vi.fn(),
    };
    const manager = new AgentRunManager({
      claudeBackendFactory: claudeBackendFactory as any,
    });

    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: "claude_agent_sdk",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "claude-sonnet-4-5",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        llmConfig: { temperature: 0.2 },
        skillAccessMode: null,
      }),
    );

    expect(run.runId).toBe("run-claude");
    expect(run.runtimeKind).toBe("claude_agent_sdk");
    expect(claudeBackendFactory.createBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKind: "claude_agent_sdk",
        agentDefinitionId: "agent-def-1",
      }),
      null,
    );
  });

  it("delegates Claude restore to a runtime-managed run factory", async () => {
    const restoreContext = new AgentRunContext({
      runId: "run-claude",
      runtimeContext: null,
      config: new AgentRunConfig({
        runtimeKind: "claude_agent_sdk",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "claude-sonnet-4-5",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        llmConfig: { temperature: 0.2 },
        skillAccessMode: null,
      }),
    });
    const claudeBackendFactory = {
      createBackend: vi.fn(),
      restoreBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-claude",
          runtimeKind: "claude_agent_sdk",
        }),
      ),
    };
    const manager = new AgentRunManager({
      claudeBackendFactory: claudeBackendFactory as any,
    });

    const run = await manager.restoreAgentRun(restoreContext);

    expect(run.runId).toBe("run-claude");
    expect(claudeBackendFactory.restoreBackend).toHaveBeenCalledWith(restoreContext);
  });

  it("creates native AgentRun instances and keeps them in the unified active-run registry", async () => {
    const autoByteusBackendFactory = {
      createBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-native",
          runtimeKind: "codex_app_server",
        }),
      ),
      restoreBackend: vi.fn(),
    };
    const manager = new AgentRunManager({
      autoByteusBackendFactory: autoByteusBackendFactory as any,
    });

    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: "autobyteus",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-5.3",
        autoExecuteTools: false,
        workspaceId: null,
        llmConfig: null,
        skillAccessMode: null,
      }),
    );

    expect(run.runId).toBe("run-native");
    const activeRun = manager.getActiveRun("run-native");

    expect(activeRun).not.toBeNull();
    expect(activeRun?.runId).toBe("run-native");
    expect(activeRun?.runtimeKind).toBe("codex_app_server");
    expect(activeRun?.getStatus()).toBe("ACTIVE");

    const postResult = await activeRun?.postUserMessage({ text: "hello" } as any);
    expect(postResult).toMatchObject({ accepted: true });
    expect(
      (autoByteusBackendFactory.createBackend.mock.results[0]?.value as Promise<any>),
    ).toBeTruthy();
  });
});
