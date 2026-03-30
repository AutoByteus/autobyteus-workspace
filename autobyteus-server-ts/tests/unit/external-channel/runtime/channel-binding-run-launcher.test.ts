import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
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
  getPlatformAgentRunId: vi.fn().mockReturnValue(`session-${runId}`),
});

const createLauncher = (overrides: {
  bindingService?: Record<string, unknown>;
  agentRunManager?: Record<string, unknown>;
  agentRunService?: Record<string, unknown>;
  agentRunMetadataService?: Record<string, unknown>;
  agentRunHistoryIndexService?: Record<string, unknown>;
  bindingRunRegistry?: InMemoryChannelBindingLiveRunRegistry;
  workspaceManager?: Record<string, unknown>;
  teamRunHistoryService?: Record<string, unknown>;
  teamRunService?: Record<string, unknown>;
} = {}) =>
  new ChannelBindingRunLauncher({
    bindingService: {
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      ...overrides.bindingService,
    } as any,
    agentRunManager: {
      createAgentRun: vi.fn(),
      getActiveRun: vi.fn().mockReturnValue(null),
      ...overrides.agentRunManager,
    } as any,
    agentRunService: {
      restoreAgentRun: vi.fn(),
      ...overrides.agentRunService,
    } as any,
    agentRunMetadataService: {
      writeMetadata: vi.fn(),
      ...overrides.agentRunMetadataService,
    } as any,
    agentRunHistoryIndexService: {
      recordRunCreated: vi.fn(),
      ...overrides.agentRunHistoryIndexService,
    } as any,
    bindingRunRegistry:
      overrides.bindingRunRegistry ?? new InMemoryChannelBindingLiveRunRegistry(),
    workspaceManager: {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
        workspaceId: "workspace-1",
      }),
      ...overrides.workspaceManager,
    } as any,
    teamRunHistoryService: {
      getTeamRunResumeConfig: vi.fn(),
      ...overrides.teamRunHistoryService,
    } as any,
    teamRunService: {
      buildMemberConfigsFromLaunchPreset: vi.fn(),
      createTeamRun: vi.fn(),
      ...overrides.teamRunService,
    } as any,
  });

describe("ChannelBindingRunLauncher", () => {
  it("reuses a cached active agent run only when the binding owns it in this process", async () => {
    const binding = createBinding();
    const getActiveRun = vi.fn().mockReturnValue(createActiveRun("agent-run-1"));
    const writeMetadata = vi.fn();
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimAgentRun(binding.id, "agent-run-1");
    const launcher = createLauncher({
      bindingRunRegistry,
      agentRunManager: { getActiveRun },
      agentRunMetadataService: { writeMetadata },
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-1");
    expect(getActiveRun).toHaveBeenCalledWith("agent-run-1");
    expect(writeMetadata).not.toHaveBeenCalled();
  });

  it("creates a fresh agent run through AgentRunManager and records metadata plus history index", async () => {
    const binding = createBinding();
    const upsertBindingAgentRunId = vi.fn();
    const activeRun = createActiveRun("agent-run-fresh");
    const createAgentRun = vi.fn().mockResolvedValue(activeRun);
    const getActiveRun = vi.fn().mockImplementation((runId: string) =>
      runId === "agent-run-fresh" ? activeRun : null,
    );
    const writeMetadata = vi.fn().mockResolvedValue(undefined);
    const recordRunCreated = vi.fn().mockResolvedValue(undefined);
    const ensureWorkspaceByRootPath = vi.fn().mockResolvedValue({
      workspaceId: "workspace-1",
    });
    const launcher = createLauncher({
      bindingService: { upsertBindingAgentRunId },
      agentRunManager: { createAgentRun, getActiveRun },
      agentRunMetadataService: { writeMetadata },
      agentRunHistoryIndexService: { recordRunCreated },
      workspaceManager: { ensureWorkspaceByRootPath },
    });

    const runId = await launcher.resolveOrStartAgentRun(binding, {
      initialSummary: "First external message",
    });

    expect(runId).toBe("agent-run-fresh");
    expect(ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace");
    const createInput = createAgentRun.mock.calls[0]?.[0];
    expect(createInput).toBeInstanceOf(AgentRunConfig);
    expect(createInput).toMatchObject({
      runtimeKind: "AUTOBYTEUS",
      agentDefinitionId: "agent-definition-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY",
    });
    expect(writeMetadata).toHaveBeenCalledWith("agent-run-fresh", {
      runId: "agent-run-fresh",
      agentDefinitionId: "agent-definition-1",
      workspaceRootPath: "/tmp/workspace",
      llmModelIdentifier: "gpt-test",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY",
      runtimeKind: "AUTOBYTEUS",
      platformAgentRunId: "session-agent-run-fresh",
      lastKnownStatus: "ACTIVE",
    });
    expect(recordRunCreated).toHaveBeenCalledWith({
      runId: "agent-run-fresh",
      metadata: {
        runId: "agent-run-fresh",
        agentDefinitionId: "agent-definition-1",
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "gpt-test",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: "PRELOADED_ONLY",
        runtimeKind: "AUTOBYTEUS",
        platformAgentRunId: "session-agent-run-fresh",
        lastKnownStatus: "ACTIVE",
      },
      summary: "First external message",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: expect.any(String),
    });
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
    const writeMetadata = vi.fn();
    const launcher = createLauncher({
      bindingService: { upsertBindingAgentRunId },
      agentRunManager: { createAgentRun },
      agentRunService: { restoreAgentRun },
      agentRunMetadataService: { writeMetadata },
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-1");
    expect(restoreAgentRun).toHaveBeenCalledWith("agent-run-1");
    expect(createAgentRun).not.toHaveBeenCalled();
    expect(writeMetadata).not.toHaveBeenCalled();
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

  it("reuses a cached team run only when the binding owns it and team history says it is active", async () => {
    const binding = createTeamBinding();
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-run-1",
      isActive: true,
    });
    const buildMemberConfigsFromLaunchPreset = vi.fn();
    const createTeamRun = vi.fn();
    const upsertBindingTeamRunId = vi.fn();
    const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
    bindingRunRegistry.claimTeamRun(binding.id, "team-run-1");
    const launcher = createLauncher({
      bindingService: { upsertBindingTeamRunId },
      bindingRunRegistry,
      teamRunHistoryService: { getTeamRunResumeConfig },
      teamRunService: {
        buildMemberConfigsFromLaunchPreset,
        createTeamRun,
      },
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding);

    expect(teamRunId).toBe("team-run-1");
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith("team-run-1");
    expect(buildMemberConfigsFromLaunchPreset).not.toHaveBeenCalled();
    expect(createTeamRun).not.toHaveBeenCalled();
    expect(upsertBindingTeamRunId).not.toHaveBeenCalled();
  });

  it("creates a fresh team run when the cached run is unowned or missing", async () => {
    const binding = createTeamBinding();
    const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
      { memberName: "Coordinator" },
    ]);
    const createTeamRun = vi.fn().mockResolvedValue({
      runId: "team-run-fresh",
    });
    const upsertBindingTeamRunId = vi.fn();
    const launcher = createLauncher({
      bindingService: { upsertBindingTeamRunId },
      teamRunService: {
        buildMemberConfigsFromLaunchPreset,
        createTeamRun,
      },
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding, {
      initialSummary: "fresh run after restart",
    });

    expect(teamRunId).toBe("team-run-fresh");
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      launchPreset: binding.teamLaunchPreset,
    });
    expect(createTeamRun).toHaveBeenCalledWith({
      teamDefinitionId: "team-definition-1",
      memberConfigs: [{ memberName: "Coordinator" }],
    });
    expect(upsertBindingTeamRunId).toHaveBeenCalledWith("binding-1", "team-run-fresh");
  });

  it("replaces a stale cached team run when team history is gone", async () => {
    const binding = createTeamBinding();
    const getTeamRunResumeConfig = vi.fn().mockRejectedValue(
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
      teamRunHistoryService: { getTeamRunResumeConfig },
      teamRunService: {
        buildMemberConfigsFromLaunchPreset,
        createTeamRun,
      },
    });

    const teamRunId = await launcher.resolveOrStartTeamRun(binding, {
      initialSummary: "Recover after stale team run",
    });

    expect(teamRunId).toBe("team-run-fresh");
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith("team-run-1");
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
