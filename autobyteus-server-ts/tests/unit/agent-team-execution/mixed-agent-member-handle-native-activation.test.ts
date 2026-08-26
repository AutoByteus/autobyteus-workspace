import { createRecordingAgentToolMcpRunSessionReleaser } from "../../fixtures/agent-tool-mcp-run-session-releaser-fixtures.js";
import { describe, expect, it, vi } from "vitest";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
  type MixedConfiguredMemberActivationMode,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { TeamAgentActivationError } from "../../../src/agent-team-execution/errors.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const nativeNode = testAgentNode("/Native", {
  agentRunId: "native-run",
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  workspaceRootPath: "/tmp/native-team-workspace",
});

const createCandidate = () => {
  const run = {
    runId: nativeNode.agentRunId,
    isActive: () => true,
    subscribeToEvents: vi.fn(() => () => undefined),
  };
  return {
    run,
    candidate: {
      runId: nativeNode.agentRunId,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: nativeNode.agentRunId,
      commitPublication: vi.fn(() => run),
      abort: vi.fn(async () => ({ kind: "aborted" as const })),
    },
  };
};

const createHandle = (input: {
  activationMode: MixedConfiguredMemberActivationMode;
  activityKind: "none" | "present";
  manager: Record<string, ReturnType<typeof vi.fn>>;
  ensureWorkspaceByRootPath?: ReturnType<typeof vi.fn>;
}) => {
  const config = testTeamRunConfig({
    rootTeamRunId: "native-team",
    coordinatorAddress: nativeNode.address,
    children: [nativeNode],
  });
  const context = new MixedAgentMemberContext({
    address: nativeNode.address,
    agentRunId: nativeNode.agentRunId,
    runtimeKind: nativeNode.runtimeKind,
    platformAgentRunId: null,
  });
  const teamContext = new TeamRunContext({
    physicalScope: createRootTeamRunPhysicalScope(config.rootTeam.teamRunId),
    teamRunId: config.rootTeam.teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [context],
      configuredMemberActivationMode: input.activationMode,
    }),
  });
  const acceptPlatformBinding = vi.fn(async () => undefined);
  const ensureWorkspaceByRootPath = input.ensureWorkspaceByRootPath ?? vi.fn(async () => ({
    workspaceId: "workspace-native",
  }));
  const activityInspector = {
    inspect: vi.fn(() => ({ kind: input.activityKind })),
  };
  const runSessions = createRecordingAgentToolMcpRunSessionReleaser();
  const handle = new MixedAgentMemberHandle({
    agentToolMcpRunSessionReleaser: runSessions.releaser,
    teamContext,
    context,
    config: nativeNode,
    activationMode: input.activationMode,
    agentRunManager: input.manager as never,
    activityInspector: activityInspector as never,
    memberTeamContextBuilder: { build: vi.fn(async () => null) } as never,
    workspaceManager: { ensureWorkspaceByRootPath } as never,
    publish: vi.fn(),
    acceptPlatformBinding,
    deliverInterAgentMessage: vi.fn(),
  });
  return {
    handle,
    context,
    activityInspector,
    acceptPlatformBinding,
    ensureWorkspaceByRootPath,
    runSessions,
  };
};

describe("MixedAgentMemberHandle native activation", () => {
  it("joins restored configured readiness, activates the workspace first, and restores local state without a team binding", async () => {
    const { run, candidate } = createCandidate();
    const order: string[] = [];
    let releaseWorkspace!: () => void;
    const ensureWorkspaceByRootPath = vi.fn(() => new Promise<{ workspaceId: string }>((resolve) => {
      order.push("workspace");
      releaseWorkspace = () => resolve({ workspaceId: "workspace-native" });
    }));
    const prepareRestoreAgentRun = vi.fn(async (context) => {
      order.push("restore");
      expect(context.runId).toBe(nativeNode.agentRunId);
      expect(context.runtimeContext).toBeNull();
      expect(context.config.workspaceId).toBe("workspace-native");
      return candidate;
    });
    const manager = {
      prepareNewAgentRun: vi.fn(),
      prepareRestoreAgentRun,
      prepareRestoreAgentRunFromPlatformState: vi.fn(),
    };
    const fixture = createHandle({
      activationMode: "restore",
      activityKind: "present",
      manager,
      ensureWorkspaceByRootPath,
    });

    const first = fixture.handle.getOrCreateAgentRun();
    const second = fixture.handle.getOrCreateAgentRun();

    expect(first).toBe(second);
    expect(prepareRestoreAgentRun).not.toHaveBeenCalled();
    releaseWorkspace();
    await expect(first).resolves.toBe(run);
    expect(order).toEqual(["workspace", "restore"]);
    expect(prepareRestoreAgentRun).toHaveBeenCalledOnce();
    expect(manager.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(manager.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
    expect(fixture.acceptPlatformBinding).not.toHaveBeenCalled();
    expect(fixture.context.getPlatformAgentRunId()).toBeNull();
    expect(candidate.commitPublication).toHaveBeenCalledOnce();
    expect(fixture.runSessions.getRevokedRunIds()).toEqual([]);
  });

  it("freshly creates a restored native member with no local activity", async () => {
    const { run, candidate } = createCandidate();
    const manager = {
      prepareNewAgentRun: vi.fn(async ({ config }) => {
        expect(config.workspaceId).toBe("workspace-native");
        return candidate;
      }),
      prepareRestoreAgentRun: vi.fn(),
      prepareRestoreAgentRunFromPlatformState: vi.fn(),
    };
    const fixture = createHandle({ activationMode: "restore", activityKind: "none", manager });

    await expect(fixture.handle.getOrCreateAgentRun()).resolves.toBe(run);

    expect(manager.prepareNewAgentRun).toHaveBeenCalledOnce();
    expect(manager.prepareRestoreAgentRun).not.toHaveBeenCalled();
    expect(fixture.acceptPlatformBinding).not.toHaveBeenCalled();
    expect(fixture.context.getPlatformAgentRunId()).toBeNull();
    expect(fixture.runSessions.getRevokedRunIds()).toEqual([]);
  });

  it("keeps a fresh direct-task native candidate binding-neutral through durability publication", async () => {
    const { candidate } = createCandidate();
    const manager = {
      prepareNewAgentRun: vi.fn(async () => candidate),
      prepareRestoreAgentRun: vi.fn(),
      prepareRestoreAgentRunFromPlatformState: vi.fn(),
    };
    const fixture = createHandle({ activationMode: "fresh", activityKind: "present", manager });

    const prepared = await fixture.handle.prepareForTaskActivation();

    expect(prepared.stagedPlatformBindings).toEqual([]);
    expect(fixture.activityInspector.inspect).not.toHaveBeenCalled();
    expect(fixture.acceptPlatformBinding).not.toHaveBeenCalled();
    expect(fixture.context.getPlatformAgentRunId()).toBeNull();
    prepared.commitAfterDurability();
    expect(candidate.commitPublication).toHaveBeenCalledOnce();
    expect(fixture.context.getPlatformAgentRunId()).toBeNull();
    expect(fixture.runSessions.getRevokedRunIds()).toEqual([]);
  });

  it("stages a fresh direct-task external binding without root adoption and publishes only after durability", async () => {
    const externalNode = testAgentNode("/Codex", {
      agentRunId: "codex-task-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      workspaceRootPath: "/tmp/codex-task-workspace",
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "external-task-team",
      coordinatorAddress: externalNode.address,
      children: [externalNode],
    });
    const context = new MixedAgentMemberContext({
      address: externalNode.address,
      agentRunId: externalNode.agentRunId,
      runtimeKind: externalNode.runtimeKind,
      platformAgentRunId: null,
    });
    const teamContext = new TeamRunContext({
      physicalScope: createRootTeamRunPhysicalScope(config.rootTeam.teamRunId),
      teamRunId: config.rootTeam.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: config.rootTeam,
      runtimeContext: new MixedTeamRunContext({ memberContexts: [context] }),
    });
    const run = {
      runId: externalNode.agentRunId,
      isActive: () => true,
      subscribeToEvents: vi.fn(() => () => undefined),
    };
    const candidate = {
      runId: externalNode.agentRunId,
      runtimeKind: externalNode.runtimeKind,
      platformAgentRunId: "thread-task-1",
      commitPublication: vi.fn(() => run),
      abort: vi.fn(async () => ({ kind: "aborted" as const })),
    };
    const acceptPlatformBinding = vi.fn(async () => undefined);
    const runSessions = createRecordingAgentToolMcpRunSessionReleaser();
    const handle = new MixedAgentMemberHandle({
      agentToolMcpRunSessionReleaser: runSessions.releaser,
      teamContext,
      context,
      config: externalNode,
      activationMode: "fresh",
      agentRunManager: {
        prepareNewAgentRun: vi.fn(async () => candidate),
      } as never,
      activityInspector: { inspect: vi.fn(() => ({ kind: "none" as const })) } as never,
      memberTeamContextBuilder: { build: vi.fn(async () => null) } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-codex-task" })),
      } as never,
      publish: vi.fn(),
      acceptPlatformBinding,
      deliverInterAgentMessage: vi.fn(),
    });

    const prepared = await handle.prepareForTaskActivation();

    expect(prepared.stagedPlatformBindings).toEqual([{
      execution: {
        rootTeamRunId: "external-task-team",
        memberAddress: externalNode.address,
        agentRunId: "codex-task-run",
      },
      platformAgentRunId: "thread-task-1",
    }]);
    expect(acceptPlatformBinding).not.toHaveBeenCalled();
    expect(candidate.commitPublication).not.toHaveBeenCalled();
    prepared.commitAfterDurability();
    expect(candidate.commitPublication).toHaveBeenCalledOnce();
    expect(runSessions.getRevokedRunIds()).toEqual([]);
  });

  it("never falls back to fresh creation when a native restore fails", async () => {
    const manager = {
      prepareNewAgentRun: vi.fn(),
      prepareRestoreAgentRun: vi.fn(async () => {
        throw new Error("snapshot unreadable");
      }),
      prepareRestoreAgentRunFromPlatformState: vi.fn(),
    };
    const fixture = createHandle({ activationMode: "restore", activityKind: "present", manager });

    await expect(fixture.handle.getOrCreateAgentRun()).rejects.toMatchObject({
      code: "TEAM_AGENT_NATIVE_RESTORE_FAILED",
    } satisfies Partial<TeamAgentActivationError>);
    expect(manager.prepareRestoreAgentRun).toHaveBeenCalledOnce();
    expect(manager.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(fixture.runSessions.getRevokedRunIds()).toEqual([]);
  });

  it("keeps restored external members on strict platform restore and root binding acceptance", async () => {
    const externalNode = testAgentNode("/Codex", {
      agentRunId: "codex-run",
      platformAgentRunId: "codex-thread",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      workspaceRootPath: "/tmp/codex-team-workspace",
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "external-team",
      coordinatorAddress: externalNode.address,
      children: [externalNode],
    });
    const context = new MixedAgentMemberContext({
      address: externalNode.address,
      agentRunId: externalNode.agentRunId,
      runtimeKind: externalNode.runtimeKind,
      platformAgentRunId: externalNode.platformAgentRunId,
    });
    const teamContext = new TeamRunContext({
      physicalScope: createRootTeamRunPhysicalScope(config.rootTeam.teamRunId),
      teamRunId: config.rootTeam.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: config.rootTeam,
      runtimeContext: new MixedTeamRunContext({
        memberContexts: [context],
        configuredMemberActivationMode: "restore",
      }),
    });
    const run = {
      runId: externalNode.agentRunId,
      isActive: () => true,
      subscribeToEvents: vi.fn(() => () => undefined),
    };
    const candidate = {
      runId: externalNode.agentRunId,
      runtimeKind: externalNode.runtimeKind,
      platformAgentRunId: externalNode.platformAgentRunId,
      commitPublication: vi.fn(() => run),
      abort: vi.fn(async () => ({ kind: "aborted" as const })),
    };
    const manager = {
      prepareNewAgentRun: vi.fn(),
      prepareRestoreAgentRun: vi.fn(),
      prepareRestoreAgentRunFromPlatformState: vi.fn(async () => candidate),
    };
    const acceptPlatformBinding = vi.fn(async () => undefined);
    const activityInspector = { inspect: vi.fn(() => { throw new Error("not expected"); }) };
    const runSessions = createRecordingAgentToolMcpRunSessionReleaser();
    const handle = new MixedAgentMemberHandle({
      agentToolMcpRunSessionReleaser: runSessions.releaser,
      teamContext,
      context,
      config: externalNode,
      activationMode: "restore",
      agentRunManager: manager as never,
      activityInspector: activityInspector as never,
      memberTeamContextBuilder: { build: vi.fn(async () => null) } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-codex" })),
      } as never,
      publish: vi.fn(),
      acceptPlatformBinding,
      deliverInterAgentMessage: vi.fn(),
    });

    await expect(handle.getOrCreateAgentRun()).resolves.toBe(run);

    expect(manager.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledWith({
      runId: "codex-run",
      config: expect.objectContaining({ workspaceId: "workspace-codex" }),
      platformAgentRunId: "codex-thread",
    });
    expect(manager.prepareRestoreAgentRun).not.toHaveBeenCalled();
    expect(manager.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(activityInspector.inspect).not.toHaveBeenCalled();
    expect(acceptPlatformBinding).toHaveBeenCalledWith(expect.objectContaining({
      platformAgentRunId: "codex-thread",
    }));
    expect(runSessions.getRevokedRunIds()).toEqual([]);
  });
});
