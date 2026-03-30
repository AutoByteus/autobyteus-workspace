import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";

describe("AgentRunManager", () => {
  const createBackend = (options: {
    runId: string;
    runtimeKind: "codex_app_server" | "claude_agent_sdk";
  }) => ({
    runId: options.runId,
    runtimeKind: options.runtimeKind,
    isActive: () => true,
    getRuntimeReference: () => null,
    getStatus: () => "ACTIVE",
    postUserMessage: vi.fn(),
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
  });

  const createManager = (overrides: Record<string, unknown> = {}) =>
    new AgentRunManager({
      agentFactory: {
        createAgent: vi.fn(),
        restoreAgent: vi.fn(),
        getAgent: vi.fn(),
        listActiveAgentIds: vi.fn().mockReturnValue([]),
        removeAgent: vi.fn(),
      } as any,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({
          id: "agent-def-1",
          name: "Test Agent",
          role: "Worker",
          description: "A test agent",
          toolNames: [],
        }),
      } as any,
      llmFactory: {
        createLLM: vi.fn().mockResolvedValue({}),
      } as any,
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue(null),
        getOrCreateTempWorkspace: vi.fn().mockResolvedValue({
          workspaceId: "temp_ws",
          getBasePath: () => "/tmp",
        }),
      } as any,
      skillService: {
        getSkill: vi.fn(),
      } as any,
      waitForIdle: vi.fn(),
      runtimeManagedRunFactories: [],
      ...overrides,
    });

  it("delegates Codex create to a runtime-managed run factory", async () => {
    const activeRun = new AgentRun({
      backend: createBackend({
        runId: "run-codex",
        runtimeKind: "codex_app_server",
      }),
    });
    const runtimeManagedRunFactory = {
      runtimeKind: "codex_app_server",
      createAgentRun: vi.fn().mockResolvedValue(activeRun),
      restoreAgentRun: vi.fn(),
    };
    const manager = createManager({
      runtimeManagedRunFactories: [runtimeManagedRunFactory],
    });

    const runId = await manager.createAgentRun(
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

    expect(runId).toBe("run-codex");
    expect(runtimeManagedRunFactory.createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-1",
        workspaceId: "workspace-1",
      }),
    );
  });

  it("delegates Codex restore to a runtime-managed run factory", async () => {
    const activeRun = new AgentRun({
      backend: createBackend({
        runId: "run-codex",
        runtimeKind: "codex_app_server",
      }),
    });
    const runtimeManagedRunFactory = {
      runtimeKind: "codex_app_server",
      createAgentRun: vi.fn(),
      restoreAgentRun: vi.fn().mockResolvedValue(activeRun),
    };
    const manager = createManager({
      runtimeManagedRunFactories: [runtimeManagedRunFactory],
    });

    const runId = await manager.restoreAgentRun({
      runId: "run-codex",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "run-codex",
        threadId: "thread-old",
        metadata: { model: "gpt-5.3-codex" },
      },
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

    expect(runId).toBe("run-codex");
    expect(runtimeManagedRunFactory.restoreAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-codex",
        restoreState: expect.objectContaining({
          config: expect.objectContaining({
            runtimeKind: "codex_app_server",
            agentDefinitionId: "agent-def-1",
            workspaceId: "workspace-1",
          }),
          platformRunId: "thread-old",
          platformMetadata: { model: "gpt-5.3-codex" },
        }),
      }),
    );
  });

  it("delegates Claude create to a runtime-managed run factory", async () => {
    const activeRun = new AgentRun({
      backend: createBackend({
        runId: "run-claude",
        runtimeKind: "claude_agent_sdk",
      }),
    });
    const runtimeManagedRunFactory = {
      runtimeKind: "claude_agent_sdk",
      createAgentRun: vi.fn().mockResolvedValue(activeRun),
      restoreAgentRun: vi.fn(),
    };
    const manager = createManager({
      runtimeManagedRunFactories: [runtimeManagedRunFactory],
    });

    const runId = await manager.createAgentRun(
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

    expect(runId).toBe("run-claude");
    expect(runtimeManagedRunFactory.createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKind: "claude_agent_sdk",
        agentDefinitionId: "agent-def-1",
      }),
    );
  });

  it("delegates Claude restore to a runtime-managed run factory", async () => {
    const activeRun = new AgentRun({
      backend: createBackend({
        runId: "run-claude",
        runtimeKind: "claude_agent_sdk",
      }),
    });
    const runtimeManagedRunFactory = {
      runtimeKind: "claude_agent_sdk",
      createAgentRun: vi.fn(),
      restoreAgentRun: vi.fn().mockResolvedValue(activeRun),
    };
    const manager = createManager({
      runtimeManagedRunFactories: [runtimeManagedRunFactory],
    });

    const runId = await manager.restoreAgentRun({
      runId: "run-claude",
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "claude-session-old",
        threadId: "claude-session-old",
        metadata: { restored: true },
      },
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

    expect(runId).toBe("run-claude");
    expect(runtimeManagedRunFactory.restoreAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-claude",
        restoreState: expect.objectContaining({
          config: expect.objectContaining({
            runtimeKind: "claude_agent_sdk",
            agentDefinitionId: "agent-def-1",
            workspaceId: "workspace-1",
          }),
          platformRunId: "claude-session-old",
          platformMetadata: { restored: true },
        }),
      }),
    );
  });

  it("creates native AgentRun instances and keeps them in the unified active-run registry", async () => {
    const nativeAgent = {
      agentId: "run-native",
      currentStatus: "ACTIVE",
      postUserMessage: vi.fn().mockResolvedValue(undefined),
      postToolExecutionApproval: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      context: {
        config: {
          name: "Test Agent",
          role: "Worker",
        },
      },
    };
    const manager = createManager({
      agentFactory: {
        createAgent: vi.fn().mockReturnValue(nativeAgent),
        restoreAgent: vi.fn(),
        getAgent: vi.fn().mockReturnValue(nativeAgent),
        listActiveAgentIds: vi.fn().mockReturnValue(["run-native"]),
        removeAgent: vi.fn().mockResolvedValue(true),
      } as any,
    });

    const runId = await manager.createAgentRun(
      new AgentRunConfig({
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-5.3",
        autoExecuteTools: false,
        workspaceId: null,
        llmConfig: null,
        skillAccessMode: null,
      }),
    );

    expect(runId).toBe("run-native");
    const activeRun = manager.getActiveRun("run-native");

    expect(activeRun).not.toBeNull();
    expect(activeRun?.runId).toBe("run-native");
    expect(activeRun?.runtimeKind).toBe("autobyteus");
    expect(activeRun?.getStatus()).toBe("ACTIVE");

    const postResult = await activeRun?.postUserMessage({ text: "hello" } as any);
    expect(postResult).toMatchObject({ accepted: true });
    expect(nativeAgent.postUserMessage).toHaveBeenCalledWith({ text: "hello" });
  });
});
