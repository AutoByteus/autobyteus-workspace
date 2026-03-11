import { describe, expect, it, vi } from "vitest";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import {
  ChannelBindingRuntimeLauncher,
  InMemoryChannelBindingLiveRunRegistry,
} from "../../../../src/external-channel/runtime/channel-binding-runtime-launcher.js";

const createBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: "WHATSAPP" as any,
  transport: "BUSINESS_API" as any,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  targetType: "AGENT",
  agentDefinitionId: "agent-definition-1",
  launchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS",
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  agentRunId: "agent-run-1",
  teamDefinitionId: null,
  teamLaunchPreset: null,
  teamRunId: null,
  targetNodeName: null,
  allowTransportFallback: false,
  createdAt: new Date("2026-03-09T00:00:00.000Z"),
  updatedAt: new Date("2026-03-09T00:00:00.000Z"),
});

const createTeamBinding = (): ChannelBinding => ({
  ...createBinding(),
  targetType: "TEAM",
  agentDefinitionId: null,
  launchPreset: null,
  agentRunId: null,
  teamDefinitionId: "team-definition-1",
  teamLaunchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS",
    autoExecuteTools: false,
    llmConfig: null,
  },
  teamRunId: "team-run-1",
  targetNodeName: "coordinator",
});

describe("ChannelBindingRuntimeLauncher", () => {
  it("reuses a cached active run when the runtime session is still alive", async () => {
    const binding = createBinding();
    const bootstrapNewRun = vi.fn();
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimAgentRun(binding.id, "agent-run-1");
    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
      },
      bindingRunRegistry,
      runtimeCompositionService: {
        getRunSession: vi.fn().mockReturnValue({
          runId: "agent-run-1",
          runtimeKind: "AUTOBYTEUS",
          mode: "agent",
          runtimeReference: { runtimeKind: "AUTOBYTEUS", sessionId: "session-1", threadId: null, metadata: null },
        }),
        createAgentRun: vi.fn(),
      } as any,
      runtimeCommandIngressService: {
        bindRunSession: vi.fn(),
      } as any,
      runtimeAdapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          isRunActive: vi.fn().mockReturnValue(true),
        }),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun,
      } as any,
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-1");
    expect(bootstrapNewRun).not.toHaveBeenCalled();
  });

  it("creates a fresh agent run when a cached run is active but not owned by the binding in this process", async () => {
    const binding = createBinding();
    const upsertBindingAgentRunId = vi.fn().mockResolvedValue({
      ...binding,
      agentRunId: "agent-run-fresh",
    });
    const createAgentRun = vi.fn().mockResolvedValue({
      runId: "agent-run-fresh",
      runtimeKind: "AUTOBYTEUS",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "AUTOBYTEUS",
        sessionId: "session-fresh",
        threadId: null,
        metadata: null,
      },
    });
    const bindRunSession = vi.fn();
    const bootstrapNewRun = vi.fn().mockResolvedValue(undefined);
    const ensureWorkspaceByRootPath = vi.fn().mockResolvedValue({
      workspaceId: "workspace-1",
    });

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: { upsertBindingAgentRunId },
      bindingRunRegistry: new InMemoryChannelBindingLiveRunRegistry(),
      runtimeCompositionService: {
        getRunSession: vi.fn().mockReturnValue({
          runId: "agent-run-1",
          runtimeKind: "AUTOBYTEUS",
          mode: "agent",
          runtimeReference: {
            runtimeKind: "AUTOBYTEUS",
            sessionId: "session-old",
            threadId: null,
            metadata: null,
          },
        }),
        createAgentRun,
      } as any,
      runtimeCommandIngressService: {
        bindRunSession,
      } as any,
      runtimeAdapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          isRunActive: vi.fn().mockReturnValue(true),
        }),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath,
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun,
      } as any,
    });

    const runId = await launcher.resolveOrStartAgentRun(binding, {
      initialSummary: "fresh run after restart",
    });

    expect(runId).toBe("agent-run-fresh");
    expect(createAgentRun).toHaveBeenCalledOnce();
    expect(bindRunSession).toHaveBeenCalledOnce();
    expect(bootstrapNewRun).toHaveBeenCalledOnce();
    expect(upsertBindingAgentRunId).toHaveBeenCalledWith("binding-1", "agent-run-fresh");
  });

  it("creates a new run, binds it, and persists the cached run id when no active run exists", async () => {
    const binding = createBinding();
    const upsertBindingAgentRunId = vi.fn().mockResolvedValue({
      ...binding,
      agentRunId: "agent-run-2",
    });
    const createAgentRun = vi.fn().mockResolvedValue({
      runId: "agent-run-2",
      runtimeKind: "AUTOBYTEUS",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "AUTOBYTEUS",
        sessionId: "session-2",
        threadId: null,
        metadata: null,
      },
    });
    const bindRunSession = vi.fn();
    const bootstrapNewRun = vi.fn().mockResolvedValue(undefined);
    const ensureWorkspaceByRootPath = vi.fn().mockResolvedValue({
      workspaceId: "workspace-1",
    });

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: { upsertBindingAgentRunId },
      runtimeCompositionService: {
        getRunSession: vi.fn().mockReturnValue(null),
        createAgentRun,
      } as any,
      runtimeCommandIngressService: {
        bindRunSession,
      } as any,
      runtimeAdapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          isRunActive: vi.fn().mockReturnValue(false),
        }),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath,
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun,
      } as any,
    });

    const runId = await launcher.resolveOrStartAgentRun(binding, {
      initialSummary: "First external message",
    });

    expect(runId).toBe("agent-run-2");
    expect(ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace");
    expect(createAgentRun).toHaveBeenCalledWith({
      runtimeKind: "AUTOBYTEUS",
      agentDefinitionId: "agent-definition-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY",
    });
    expect(bindRunSession).toHaveBeenCalledOnce();
    expect(bootstrapNewRun).toHaveBeenCalledWith({
      agentDefinitionId: "agent-definition-1",
      launchPreset: binding.launchPreset,
      session: {
        runId: "agent-run-2",
        runtimeKind: "AUTOBYTEUS",
        mode: "agent",
        runtimeReference: {
          runtimeKind: "AUTOBYTEUS",
          sessionId: "session-2",
          threadId: null,
          metadata: null,
        },
      },
      initialSummary: "First external message",
    });
    expect(upsertBindingAgentRunId).toHaveBeenCalledWith("binding-1", "agent-run-2");
  });

  it("rejects bindings that do not carry an AGENT launch target", async () => {
    const binding = createBinding();
    binding.targetType = "TEAM";

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
      },
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
      runHistoryBootstrapper: {
        bootstrapNewRun: vi.fn(),
      } as any,
    });

    await expect(launcher.resolveOrStartAgentRun(binding)).rejects.toThrow(
      "Only AGENT bindings can auto-start runtimes.",
    );
  });

  it("reuses a cached team run only when the binding already points at an active run", async () => {
    const binding = createTeamBinding();
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-run-1",
      isActive: true,
    });
    const buildMemberConfigsFromLaunchPreset = vi.fn();
    const ensureTeamRun = vi.fn();
    const upsertBindingTeamRunId = vi.fn();
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimTeamRun(binding.id, "team-run-1");

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
        upsertBindingTeamRunId,
      },
      bindingRunRegistry,
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      teamRunLaunchService: {
        buildMemberConfigsFromLaunchPreset,
        ensureTeamRun,
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun: vi.fn(),
      } as any,
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding);

    expect(teamRunId).toBe("team-run-1");
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith("team-run-1");
    expect(buildMemberConfigsFromLaunchPreset).not.toHaveBeenCalled();
    expect(ensureTeamRun).not.toHaveBeenCalled();
    expect(upsertBindingTeamRunId).not.toHaveBeenCalled();
  });

  it("creates a fresh team run when a cached team run is active but not owned by the binding in this process", async () => {
    const binding = createTeamBinding();
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-run-1",
      isActive: true,
    });
    const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
      { memberName: "Coordinator" },
    ]);
    const ensureTeamRun = vi.fn().mockResolvedValue({
      teamRunId: "team-run-fresh",
    });
    const upsertBindingTeamRunId = vi.fn().mockResolvedValue({
      ...binding,
      teamRunId: "team-run-fresh",
    });

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
        upsertBindingTeamRunId,
      },
      bindingRunRegistry: new InMemoryChannelBindingLiveRunRegistry(),
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      teamRunLaunchService: {
        buildMemberConfigsFromLaunchPreset,
        ensureTeamRun,
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun: vi.fn(),
      } as any,
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding, {
      initialSummary: "fresh run after restart",
    });

    expect(teamRunId).toBe("team-run-fresh");
    expect(getTeamRunResumeConfig).not.toHaveBeenCalled();
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledOnce();
    expect(ensureTeamRun).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      memberConfigs: [{ memberName: "Coordinator" }],
      initialSummary: "fresh run after restart",
    });
    expect(upsertBindingTeamRunId).toHaveBeenCalledWith("binding-1", "team-run-fresh");
  });

  it("creates a fresh team run after restart without probing an unowned cached team run", async () => {
    const binding = createTeamBinding();
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-run-1",
      isActive: false,
    });
    const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
      { memberName: "Coordinator" },
    ]);
    const ensureTeamRun = vi.fn().mockResolvedValue({
      teamRunId: "team-run-fresh",
    });
    const upsertBindingTeamRunId = vi.fn().mockResolvedValue({
      ...binding,
      teamRunId: "team-run-fresh",
    });

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
        upsertBindingTeamRunId,
      },
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      teamRunLaunchService: {
        buildMemberConfigsFromLaunchPreset,
        ensureTeamRun,
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun: vi.fn(),
      } as any,
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding, {
      initialSummary: "Fresh run after restart",
    });

    expect(teamRunId).toBe("team-run-fresh");
    expect(getTeamRunResumeConfig).not.toHaveBeenCalled();
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledOnce();
    expect(ensureTeamRun).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      memberConfigs: [{ memberName: "Coordinator" }],
      initialSummary: "Fresh run after restart",
    });
    expect(upsertBindingTeamRunId).toHaveBeenCalledWith("binding-1", "team-run-fresh");
  });

  it("lazy-creates a team run and persists it when no cached team run exists", async () => {
    const binding = createTeamBinding();
    binding.teamRunId = null;
    const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
      { memberName: "Coordinator" },
    ]);
    const ensureTeamRun = vi.fn().mockResolvedValue({
      teamRunId: "team-run-2",
    });
    const upsertBindingTeamRunId = vi.fn().mockResolvedValue({
      ...binding,
      teamRunId: "team-run-2",
    });

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
        upsertBindingTeamRunId,
      },
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig: vi.fn(),
      } as any,
      teamRunLaunchService: {
        buildMemberConfigsFromLaunchPreset,
        ensureTeamRun,
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun: vi.fn(),
      } as any,
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding, {
      initialSummary: "First external team message",
    });

    expect(teamRunId).toBe("team-run-2");
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      launchPreset: binding.teamLaunchPreset,
    });
    expect(ensureTeamRun).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      memberConfigs: [{ memberName: "Coordinator" }],
      initialSummary: "First external team message",
    });
    expect(upsertBindingTeamRunId).toHaveBeenCalledWith("binding-1", "team-run-2");
  });

  it("replaces a stale cached team run when the previous team history no longer exists", async () => {
    const binding = createTeamBinding();
    const getTeamRunResumeConfig = vi.fn().mockRejectedValue(
      new Error("missing team run history"),
    );
    const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
      { memberName: "Coordinator" },
    ]);
    const ensureTeamRun = vi.fn().mockResolvedValue({
      teamRunId: "team-run-fresh",
    });
    const upsertBindingTeamRunId = vi.fn().mockResolvedValue({
      ...binding,
      teamRunId: "team-run-fresh",
    });
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimTeamRun(binding.id, "team-run-1");

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
        upsertBindingTeamRunId,
      },
      bindingRunRegistry,
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      teamRunLaunchService: {
        buildMemberConfigsFromLaunchPreset,
        ensureTeamRun,
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun: vi.fn(),
      } as any,
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding, {
      initialSummary: "Recover after stale team run",
    });

    expect(teamRunId).toBe("team-run-fresh");
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith("team-run-1");
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledOnce();
    expect(ensureTeamRun).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      memberConfigs: [{ memberName: "Coordinator" }],
      initialSummary: "Recover after stale team run",
    });
    expect(upsertBindingTeamRunId).toHaveBeenCalledWith("binding-1", "team-run-fresh");
  });

  it("rejects bindings that do not carry a TEAM launch target", async () => {
    const binding = createBinding();

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
        upsertBindingTeamRunId: vi.fn(),
      },
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig: vi.fn(),
      } as any,
      teamRunLaunchService: {
        buildMemberConfigsFromLaunchPreset: vi.fn(),
        ensureTeamRun: vi.fn(),
      } as any,
      runHistoryBootstrapper: {
        bootstrapNewRun: vi.fn(),
      } as any,
    });

    await expect(launcher.resolveOrStartTeamRun(binding)).rejects.toThrow(
      "Only TEAM bindings can resolve or start team runs.",
    );
  });
});
