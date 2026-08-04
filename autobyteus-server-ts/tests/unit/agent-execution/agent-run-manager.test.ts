import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import {
  getAgentToolMcpSessionRegistry,
  resetAgentToolMcpSessionRegistryForTests,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import {
  resetAgentToolMcpSessionServiceForTests,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildConfiguredAgentToolExposure } from "../../../src/agent-execution/shared/configured-agent-tool-exposure.js";

describe("AgentRunManager", () => {
  beforeEach(() => {
    resetAgentToolMcpSessionServiceForTests();
    resetAgentToolMcpSessionRegistryForTests();
  });

  afterEach(() => {
    resetAgentToolMcpSessionServiceForTests();
    resetAgentToolMcpSessionRegistryForTests();
  });

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
      getLifecycleSnapshot: () => ({
        availability: "active" as const,
        phase: "running" as const,
        currentTurn: { kind: "ANONYMOUS" as const },
      }),
      subscribeToSourceEventBatches: () => () => undefined,
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
      "run-codex",
    );

    expect(run.runId).toBe("run-codex");
    expect(run.runtimeKind).toBe("codex_app_server");
    expect(codexBackendFactory.createBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-1",
        workspaceId: "workspace-1",
      }),
      "run-codex",
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

  it("removes stale inactive registry entries before restoring a run", async () => {
    let runActive = true;
    const config = new AgentRunConfig({
      runtimeKind: "codex_app_server",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: { reasoning_effort: "medium" },
      skillAccessMode: null,
    });
    const createManagedBackend = () => ({
      ...createBackend({
        runId: "run-codex",
        runtimeKind: "codex_app_server",
      }),
      isActive: () => runActive,
    });
    const codexBackendFactory = {
      createBackend: vi.fn().mockResolvedValue(createManagedBackend()),
      restoreBackend: vi.fn().mockImplementation(() => {
        runActive = true;
        return Promise.resolve(createManagedBackend());
      }),
    };
    const manager = new AgentRunManager({
      codexBackendFactory: codexBackendFactory as any,
    });

    const originalRun = await manager.createAgentRun(config, "run-codex");
    runActive = false;

    const restoredRun = await manager.restoreAgentRun(
      new AgentRunContext({
        runId: "run-codex",
        runtimeContext: null,
        config,
      }),
    );

    expect(restoredRun).not.toBe(originalRun);
    expect(manager.getActiveRun("run-codex")).toBe(restoredRun);
    expect(codexBackendFactory.restoreBackend).toHaveBeenCalledTimes(1);
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
      "run-claude",
    );

    expect(run.runId).toBe("run-claude");
    expect(run.runtimeKind).toBe("claude_agent_sdk");
    expect(claudeBackendFactory.createBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKind: "claude_agent_sdk",
        agentDefinitionId: "agent-def-1",
      }),
      "run-claude",
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
      "run-native",
    );

    expect(run.runId).toBe("run-native");
    const activeRun = manager.getActiveRun("run-native");

    expect(activeRun).not.toBeNull();
    expect(activeRun?.runId).toBe("run-native");
    expect(activeRun?.runtimeKind).toBe("codex_app_server");
    expect(activeRun?.getStatusSnapshot()).toEqual({
      status: "running",
      agent_id: "run-native",
    });

    const postResult = await activeRun?.postUserMessage({ text: "hello" } as any);
    expect(postResult).toMatchObject({ accepted: true });
    expect(
      (autoByteusBackendFactory.createBackend.mock.results[0]?.value as Promise<any>),
    ).toBeTruthy();
  });

  it("rejects duplicate active creation without replacing the original run or sidecars", async () => {
    const unsubscribeRunFileChanges = vi.fn();
    const unsubscribePublishedArtifacts = vi.fn();
    const unsubscribeMemory = vi.fn();
    const codexBackendFactory = {
      createBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-duplicate",
          runtimeKind: "codex_app_server",
        }),
      ),
      restoreBackend: vi.fn(),
    };
    const manager = new AgentRunManager({
      codexBackendFactory: codexBackendFactory as any,
      runFileChangeService: {
        attachToRun: vi.fn().mockReturnValue(unsubscribeRunFileChanges),
      } as any,
      publishedArtifactRelayService: {
        attachToRun: vi.fn().mockReturnValue(unsubscribePublishedArtifacts),
      } as any,
      memoryRecorder: {
        attachToRun: vi.fn().mockReturnValue(unsubscribeMemory),
        onUserMessageAccepted: vi.fn(),
      } as any,
    });
    const config = new AgentRunConfig({
      runtimeKind: "codex_app_server",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
      skillAccessMode: null,
    });

    const firstRun = await manager.createAgentRun(config, "run-duplicate");
    await expect(manager.createAgentRun(config, "run-duplicate")).rejects.toThrow(
      "Agent run 'run-duplicate' is already active.",
    );

    expect(codexBackendFactory.createBackend).toHaveBeenCalledTimes(1);
    expect(manager.getActiveRun("run-duplicate")).toBe(firstRun);
    expect(unsubscribeRunFileChanges).not.toHaveBeenCalled();
    expect(unsubscribePublishedArtifacts).not.toHaveBeenCalled();
    expect(unsubscribeMemory).not.toHaveBeenCalled();
  });

  it("attaches and detaches always-on sidecars with the active run lifecycle", async () => {
    const unsubscribe = vi.fn();
    const unsubscribeMemory = vi.fn();
    const codexBackendFactory = {
      createBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-codex",
          runtimeKind: "codex_app_server",
        }),
      ),
      restoreBackend: vi.fn(),
    };
    const runFileChangeService = {
      attachToRun: vi.fn().mockReturnValue(unsubscribe),
    };
    const memoryRecorder = {
      attachToRun: vi.fn().mockReturnValue(unsubscribeMemory),
      onUserMessageAccepted: vi.fn(),
    };
    const manager = new AgentRunManager({
      codexBackendFactory: codexBackendFactory as any,
      runFileChangeService: runFileChangeService as any,
      memoryRecorder: memoryRecorder as any,
    });

    await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-5.3-codex",
        autoExecuteTools: false,
        workspaceId: "workspace-1",
        llmConfig: null,
        skillAccessMode: null,
      }),
      "run-codex",
    );

    expect(runFileChangeService.attachToRun).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "run-codex" }),
    );
    expect(memoryRecorder.attachToRun).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "run-codex" }),
    );

    await manager.terminateAgentRun("run-codex");

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribeMemory).toHaveBeenCalledTimes(1);
  });

  it("revokes run-scoped Agent Tools MCP sessions when accepted manager termination unregisters the run", async () => {
    const codexBackendFactory = {
      createBackend: vi.fn().mockResolvedValue(
        createBackend({
          runId: "run-with-mcp",
          runtimeKind: "codex_app_server",
        }),
      ),
      restoreBackend: vi.fn(),
    };
    const manager = new AgentRunManager({
      codexBackendFactory: codexBackendFactory as any,
    });
    const registry = getAgentToolMcpSessionRegistry();
    const sender = buildAgentRunMessageSenderContext({
      senderRunId: "run-with-mcp",
      senderName: "agent",
      runtimeKind: "codex_app_server",
    });
    const matching = registry.createSession({
      owner: { runId: "run-with-mcp" },
      sender,
      configuredExposure: buildConfiguredAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });
    const nonMatching = registry.createSession({
      owner: { runId: "other-run" },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "other-run",
        senderName: "other",
        runtimeKind: "codex_app_server",
      }),
      configuredExposure: buildConfiguredAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });

    await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-5.3-codex",
        autoExecuteTools: false,
        workspaceId: "workspace-1",
        llmConfig: null,
        skillAccessMode: null,
      }),
      "run-with-mcp",
    );

    await expect(manager.terminateAgentRun("run-with-mcp")).resolves.toBe(true);

    expect(registry.resolveSession({
      sessionId: matching.session.sessionId,
      bearerToken: matching.capabilityToken,
    })).toMatchObject({ ok: false, reason: "revoked" });
    expect(registry.resolveSession({
      sessionId: nonMatching.session.sessionId,
      bearerToken: nonMatching.capabilityToken,
    }).ok).toBe(true);
  });
});
