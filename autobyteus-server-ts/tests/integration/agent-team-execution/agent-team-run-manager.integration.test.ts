import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import type { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamTerminationError } from "../../../src/agent-team-execution/errors.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createConfig = (memberRuntimeKinds: RuntimeKind[]): TeamRunConfig => new TeamRunConfig({
  teamDefinitionId: "team-def-mixed-only",
  teamBackendKind: TeamBackendKind.MIXED,
  coordinatorMemberName: "Coordinator",
  memberConfigs: memberRuntimeKinds.map((runtimeKind, index) => ({
    memberName: index === 0 ? "Coordinator" : `Member${index}`,
    memberRouteKey: index === 0 ? "coordinator" : `member-${index}`,
    memberRunId: index === 0 ? "run-coordinator" : `run-member-${index}`,
    agentDefinitionId: `agent-${runtimeKind}-${index}`,
    llmModelIdentifier: `model-${runtimeKind}`,
    autoExecuteTools: true,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind,
    workspaceId: `workspace-${runtimeKind}-${index}`,
  })),
});

const createRuntimeContext = () => new MixedTeamRunContext({
  coordinatorMemberRouteKey: "coordinator",
  memberContexts: [],
  collaborationRootTeamRunId: "team-runtime-root",
  teamMountPath: [],
  effectiveHandoffs: [],
});

const createBackend = (input: {
  runId: string;
  active?: boolean;
  status?: string | null;
  runtimeContext?: MixedTeamRunContext;
}) => {
  const state = {
    active: input.active ?? true,
    status: input.status ?? "idle",
  };
  const runtimeContext = input.runtimeContext ?? createRuntimeContext();

  const backend: TeamRunBackend = {
    runId: input.runId,
    teamBackendKind: TeamBackendKind.MIXED,
    getRuntimeContext: () => runtimeContext,
    isActive: () => state.active,
    getStatusSnapshot: () => ({ status: state.status as "idle" | "running" | "error" }),
    getMemberStatusSnapshots: () => [],
    subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
    settleMember: vi.fn().mockResolvedValue({ accepted: true }),
    startTaskAgentInstance: vi.fn().mockResolvedValue({ accepted: true }),
    settleTaskAgentInstance: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
    publishEvent: vi.fn(),
  };

  return { backend, state };
};

const createFactory = (backend: TeamRunBackend): MixedTeamRunBackendFactory => ({
  createBackend: vi.fn().mockResolvedValue(backend),
  restoreBackend: vi.fn().mockResolvedValue(backend),
} as unknown as MixedTeamRunBackendFactory);

const createSidecars = () => ({
  teamCommunicationService: { attachToTeamRun: vi.fn(() => vi.fn()) },
  runFileChangeService: { attachToTeamRun: vi.fn(() => vi.fn()) },
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AgentTeamRunManager integration", () => {
  it.each([
    [[RuntimeKind.AUTOBYTEUS]],
    [[RuntimeKind.CODEX_APP_SERVER]],
    [[RuntimeKind.CLAUDE_AGENT_SDK]],
    [[RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]],
  ] as const)("creates and registers a mixed team for runtime composition %j", async (memberRuntimeKinds) => {
    const created = createBackend({ runId: "team-mixed" });
    const mixed = createFactory(created.backend);
    const sidecars = createSidecars();
    const manager = new AgentTeamRunManager({
      mixedTeamRunBackendFactory: mixed,
      teamCommunicationService: sidecars.teamCommunicationService as never,
      runFileChangeService: sidecars.runFileChangeService as never,
    });

    const run = await manager.createTeamRun(createConfig([...memberRuntimeKinds]), "team-mixed");

    expect(run.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(run.context?.coordinatorMemberName).toBe("Coordinator");
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);
    expect(manager.listActiveRuns()).toContain(run.runId);
    expect(mixed.createBackend).toHaveBeenCalledTimes(1);
    expect(mixed.createBackend).toHaveBeenCalledWith(
      expect.objectContaining({ teamBackendKind: TeamBackendKind.MIXED }),
      "team-mixed",
    );
    expect(sidecars.teamCommunicationService.attachToTeamRun).toHaveBeenCalledWith(run);
    expect(sidecars.runFileChangeService.attachToTeamRun).toHaveBeenCalledWith(run);
  });

  it("restores through the mixed backend and normalizes the restored context", async () => {
    const runtimeContext = createRuntimeContext();
    const context = new TeamRunContext({
      runId: "team-restored-mixed",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: "Coordinator",
      config: createConfig([RuntimeKind.CODEX_APP_SERVER]),
      runtimeContext,
    });
    const backend = createBackend({ runId: context.runId, runtimeContext }).backend;
    const mixed = createFactory(backend);
    const manager = new AgentTeamRunManager({ mixedTeamRunBackendFactory: mixed });

    const run = await manager.restoreTeamRun(context);

    expect(run.runId).toBe(context.runId);
    expect(run.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(mixed.restoreBackend).toHaveBeenCalledWith(expect.objectContaining({
      teamBackendKind: TeamBackendKind.MIXED,
      runtimeContext,
    }));
  });

  it("routes inter-agent delivery through the mixed backend", async () => {
    const mixedBackend = createBackend({ runId: "team-mixed-delivery" });
    const manager = new AgentTeamRunManager({
      mixedTeamRunBackendFactory: createFactory(mixedBackend.backend),
    });
    const run = await manager.createTeamRun(
      createConfig([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]),
      "team-mixed-delivery",
    );
    const request = {
      senderRunId: "coord-run",
      senderMemberName: "Coordinator",
      teamRunId: run.runId,
      recipientMemberName: "Member1",
      content: "Please continue.",
      messageType: "agent_message",
    };

    await expect(run.deliverInterAgentMessage(request as never)).resolves.toEqual({ accepted: true });
    expect(mixedBackend.backend.deliverInterAgentMessage).toHaveBeenCalledWith(request);
  });

  it("evicts inactive team runs when queried or listed", async () => {
    const created = createBackend({ runId: "team-inactive" });
    const manager = new AgentTeamRunManager({
      mixedTeamRunBackendFactory: createFactory(created.backend),
    });

    const run = await manager.createTeamRun(createConfig([RuntimeKind.CODEX_APP_SERVER]), "team-inactive");
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);

    created.state.active = false;
    expect(manager.getTeamRun(run.runId)).toBeNull();
    expect(manager.listActiveRuns()).toEqual([]);
  });

  it("wraps backend termination failures", async () => {
    const failing = createBackend({ runId: "team-failing-terminate" });
    failing.backend.terminate = vi.fn().mockRejectedValue(new Error("boom"));
    const manager = new AgentTeamRunManager({
      mixedTeamRunBackendFactory: createFactory(failing.backend),
    });
    const run = await manager.createTeamRun(createConfig([RuntimeKind.AUTOBYTEUS]), "team-failing-terminate");

    await expect(manager.terminateTeamRun(run.runId)).rejects.toBeInstanceOf(AgentTeamTerminationError);
  });
});
