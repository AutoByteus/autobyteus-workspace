import { describe, expect, it, vi } from "vitest";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import {
  ChannelBindingRunLauncher,
  InMemoryChannelBindingLiveRunRegistry,
} from "../../../../src/external-channel/runtime/channel-binding-run-launcher.js";

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
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  teamRunId: "team-run-1",
  targetNodeName: "coordinator",
});

const createActiveRun = (runId: string, runtimeKind = "AUTOBYTEUS") => ({
  runId,
  runtimeKind,
  config: {
    memoryDir: undefined,
  },
  getPlatformAgentRunId: vi.fn().mockReturnValue(`session-${runId}`),
});

const createLauncher = (overrides: {
  bindingService?: Record<string, unknown>;
  agentRunService?: Record<string, unknown>;
  bindingRunRegistry?: InMemoryChannelBindingLiveRunRegistry;
  teamRunService?: Record<string, unknown>;
} = {}) =>
  new ChannelBindingRunLauncher({
    bindingService: {
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      ...overrides.bindingService,
    } as any,
    agentRunService: {
      getAgentRun: vi.fn().mockReturnValue(null),
      restoreAgentRun: vi.fn(),
      createAgentRun: vi.fn(),
      ...overrides.agentRunService,
    } as any,
    bindingRunRegistry:
      overrides.bindingRunRegistry ?? new InMemoryChannelBindingLiveRunRegistry(),
    teamRunService: {
      getTeamRun: vi.fn().mockReturnValue(null),
      restoreTeamRun: vi.fn(),
      buildMemberConfigsFromLaunchPreset: vi.fn(),
      createTeamRun: vi.fn(),
      ...overrides.teamRunService,
    } as any,
  });

describe("ChannelBindingRunLauncher", () => {
  it("reuses a cached active agent run only when the binding owns it in this process", async () => {
    const binding = createBinding();
    const getAgentRun = vi.fn().mockReturnValue(createActiveRun("agent-run-1"));
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimAgentRun(binding.id, "agent-run-1");
    const launcher = createLauncher({
      bindingRunRegistry,
      agentRunService: { getAgentRun },
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-1");
    expect(getAgentRun).toHaveBeenCalledWith("agent-run-1");
  });

  it("creates a fresh agent run through AgentRunService and persists the binding run id", async () => {
    const binding = createBinding();
    const upsertBindingAgentRunId = vi.fn();
    const createAgentRun = vi.fn().mockResolvedValue({
      runId: "agent-run-fresh",
    });
    const launcher = createLauncher({
      bindingService: { upsertBindingAgentRunId },
      agentRunService: { createAgentRun },
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-fresh");
    expect(createAgentRun).toHaveBeenCalledWith(
      {
        runtimeKind: "AUTOBYTEUS",
        agentDefinitionId: "agent-definition-1",
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "gpt-test",
        autoExecuteTools: false,
        llmConfig: null,
        skillAccessMode: "PRELOADED_ONLY",
      },
    );
    expect(upsertBindingAgentRunId).toHaveBeenCalledWith("binding-1", "agent-run-fresh");
  });

  it("restores a cached agent run before falling back to creating a new one", async () => {
    const binding = createBinding();
    const upsertBindingAgentRunId = vi.fn();
    const restoreAgentRun = vi.fn().mockResolvedValue({
      run: createActiveRun("agent-run-1"),
      metadata: {},
    });
    const createAgentRun = vi.fn();
    const launcher = createLauncher({
      bindingService: { upsertBindingAgentRunId },
      agentRunService: { restoreAgentRun, createAgentRun },
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-1");
    expect(restoreAgentRun).toHaveBeenCalledWith("agent-run-1");
    expect(createAgentRun).not.toHaveBeenCalled();
    expect(upsertBindingAgentRunId).toHaveBeenCalledWith("binding-1", "agent-run-1");
  });

  it("rejects bindings that do not carry an AGENT launch target", async () => {
    const binding = createBinding();
    binding.targetType = "TEAM";
    const launcher = createLauncher();

    await expect(launcher.resolveOrStartAgentRun(binding)).rejects.toThrow(
      "Only AGENT bindings can auto-start runtimes.",
    );
  });

  it("reuses a cached active team run only when the binding owns it in this process", async () => {
    const binding = createTeamBinding();
    const getTeamRun = vi.fn().mockReturnValue({
      runId: "team-run-1",
    });
    const buildMemberConfigsFromLaunchPreset = vi.fn();
    const createTeamRun = vi.fn();
    const upsertBindingTeamRunId = vi.fn();
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimTeamRun(binding.id, "team-run-1");
    const launcher = createLauncher({
      bindingService: { upsertBindingTeamRunId },
      bindingRunRegistry,
      teamRunService: {
        getTeamRun,
        buildMemberConfigsFromLaunchPreset,
        createTeamRun,
      },
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding);

    expect(teamRunId).toBe("team-run-1");
    expect(getTeamRun).toHaveBeenCalledWith("team-run-1");
    expect(buildMemberConfigsFromLaunchPreset).not.toHaveBeenCalled();
    expect(createTeamRun).not.toHaveBeenCalled();
    expect(upsertBindingTeamRunId).not.toHaveBeenCalled();
  });

  it("restores a cached team run from persisted binding state before creating a new one", async () => {
    const binding = createTeamBinding();
    const restoreTeamRun = vi.fn().mockResolvedValue({
      runId: "team-run-1",
    });
    const upsertBindingTeamRunId = vi.fn();
    const launcher = createLauncher({
      bindingService: { upsertBindingTeamRunId },
      teamRunService: {
        restoreTeamRun,
        createTeamRun: vi.fn(),
        buildMemberConfigsFromLaunchPreset: vi.fn(),
      },
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding);

    expect(teamRunId).toBe("team-run-1");
    expect(restoreTeamRun).toHaveBeenCalledWith("team-run-1");
    expect(upsertBindingTeamRunId).toHaveBeenCalledWith("binding-1", "team-run-1");
  });

  it("creates a fresh team run when cached restore fails", async () => {
    const binding = createTeamBinding();
    const restoreTeamRun = vi.fn().mockRejectedValue(
      new Error("missing team run history"),
    );
    const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
      { memberName: "Coordinator" },
    ]);
    const createTeamRun = vi.fn().mockResolvedValue({
      runId: "team-run-fresh",
    });
    const upsertBindingTeamRunId = vi.fn();
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimTeamRun(binding.id, "team-run-1");
    const launcher = createLauncher({
      bindingService: { upsertBindingTeamRunId },
      bindingRunRegistry,
      teamRunService: {
        restoreTeamRun,
        buildMemberConfigsFromLaunchPreset,
        createTeamRun,
      },
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding);

    expect(teamRunId).toBe("team-run-fresh");
    expect(restoreTeamRun).toHaveBeenCalledWith("team-run-1");
    expect(createTeamRun).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      memberConfigs: [{ memberName: "Coordinator" }],
    });
    expect(upsertBindingTeamRunId).toHaveBeenCalledWith("binding-1", "team-run-fresh");
  });

  it("rejects bindings that do not carry a TEAM launch target", async () => {
    const binding = createBinding();
    const launcher = createLauncher();

    await expect(launcher.resolveOrStartTeamRun(binding)).rejects.toThrow(
      "Only TEAM bindings can resolve or start team runs.",
    );
  });
});
