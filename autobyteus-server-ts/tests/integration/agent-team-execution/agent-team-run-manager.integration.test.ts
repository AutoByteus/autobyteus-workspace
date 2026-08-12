import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import type { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamTerminationError } from "../../../src/agent-team-execution/errors.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const createConfig = (memberRuntimeKinds: readonly RuntimeKind[]) => {
  const children = memberRuntimeKinds.map((runtimeKind, index) => testAgentNode(
    index === 0 ? "/Coordinator" : `/Member${index}`,
    {
      agentRunId: index === 0 ? "run-coordinator" : `run-member-${index}`,
      runtimeKind,
    },
  ));
  return testTeamRunConfig({
    rootTeamRunId: "team-runtime-root",
    rootTeamDefinitionId: "team-def-mixed-only",
    coordinatorAddress: "/Coordinator",
    children,
  });
};

const createRuntimeContext = () => new MixedTeamRunContext({
  memberContexts: [],
  teamExecutionAddress: createTeamExecutionAddress({
    rootTeamRunId: "team-runtime-root",
    memberAddress: "/Coordinator",
  }),
});

const createBackend = (input: {
  teamRunId: string;
  config?: ReturnType<typeof createConfig>;
  active?: boolean;
  runtimeContext?: MixedTeamRunContext;
}) => {
  const state = { active: input.active ?? true };
  const config = input.config ?? createConfig([RuntimeKind.AUTOBYTEUS]);
  const runtimeContext = input.runtimeContext ?? createRuntimeContext();
  const context = new TeamRunContext({
    teamRunId: input.teamRunId,
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext,
  });
  const backend = {
    teamRunId: input.teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    getTeamRunContext: () => context,
    getRuntimeContext: () => runtimeContext,
    isActive: () => state.active,
    getLeafAgentStatusSnapshots: () => [],
    hasOpenExecutionWork: () => false,
    subscribeToEvents: vi.fn(() => () => undefined),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    executeMemberCommand: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverResolvedInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    resolveRecipient: vi.fn(),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
    settleMember: vi.fn().mockResolvedValue({ accepted: true }),
    startTaskAgentExecution: vi.fn().mockResolvedValue({ accepted: true }),
    releaseTaskAgentExecutionWork: vi.fn(),
    settleTaskAgentExecution: vi.fn().mockResolvedValue({ accepted: true }),
    startTaskTeamExecution: vi.fn().mockResolvedValue({ accepted: true }),
    markTaskTeamExecutionActive: vi.fn(),
    releaseTaskTeamExecutionWork: vi.fn(),
    postMessageToTaskTeamExecution: vi.fn().mockResolvedValue({ accepted: true }),
    settleTaskTeamExecution: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
    publishEvent: vi.fn(),
    openTaskActivationEventLease: vi.fn(),
    assertTaskActivationEventLeaseWithinBudget: vi.fn(),
    commitTaskActivationEventLease: vi.fn(),
    abortTaskActivationEventLease: vi.fn(),
  } as unknown as TeamRunBackend & { getTeamRunContext(): TeamRunContext<MixedTeamRunContext> };
  return { backend, state, context };
};

const createFactory = (created: ReturnType<typeof createBackend>): MixedTeamRunBackendFactory => ({
  createBackend: vi.fn(async (config, teamRunId) => {
    expect(config).toBe(created.context.config);
    expect(teamRunId).toBe(created.context.teamRunId);
    return created.backend;
  }),
  restoreBackend: vi.fn().mockResolvedValue(created.backend),
} as unknown as MixedTeamRunBackendFactory);

const createSidecars = () => ({
  teamCommunicationService: { attachToTeamRun: vi.fn(() => vi.fn()) },
  runFileChangeService: { attachToTeamRun: vi.fn(() => vi.fn()) },
});

afterEach(() => vi.clearAllMocks());

describe("AgentTeamRunManager integration", () => {
  it.each([
    [[RuntimeKind.AUTOBYTEUS]],
    [[RuntimeKind.CODEX_APP_SERVER]],
    [[RuntimeKind.CLAUDE_AGENT_SDK]],
    [[RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]],
  ] as const)("creates and registers a mixed TeamRun for runtime composition %j", async (runtimeKinds) => {
    const config = createConfig(runtimeKinds);
    const created = createBackend({ teamRunId: "team-runtime-root", config });
    const factory = createFactory(created);
    const sidecars = createSidecars();
    const manager = new AgentTeamRunManager({
      mixedTeamRunBackendFactory: factory,
      teamCommunicationService: sidecars.teamCommunicationService as never,
      runFileChangeService: sidecars.runFileChangeService as never,
    });

    const run = await manager.createTeamRun(config, "team-runtime-root");

    expect(run.teamRunId).toBe("team-runtime-root");
    expect(run.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(run.context.config.rootTeam.coordinatorAddress).toBe("/Coordinator");
    expect(manager.getActiveRun(run.teamRunId)).toBe(run);
    expect(manager.listActiveRuns()).toEqual([run.teamRunId]);
    expect(factory.createBackend).toHaveBeenCalledWith(config, "team-runtime-root");
    expect(sidecars.teamCommunicationService.attachToTeamRun).toHaveBeenCalledWith(run);
    expect(sidecars.runFileChangeService.attachToTeamRun).toHaveBeenCalledWith(run);
  });

  it("restores through the mixed backend with the exact current context", async () => {
    const config = createConfig([RuntimeKind.CODEX_APP_SERVER]);
    const runtimeContext = createRuntimeContext();
    const context = new TeamRunContext({
      teamRunId: "team-runtime-root",
      teamAddress: "/",
      teamBackendKind: TeamBackendKind.MIXED,
      config,
      runtimeContext,
    });
    const created = createBackend({ teamRunId: context.teamRunId, config, runtimeContext });
    const factory = createFactory(created);
    const manager = new AgentTeamRunManager({ mixedTeamRunBackendFactory: factory });

    const run = await manager.restoreTeamRun(context);

    expect(run.teamRunId).toBe(context.teamRunId);
    expect(run.context).toMatchObject({ teamAddress: "/", config, runtimeContext });
    expect(factory.restoreBackend).toHaveBeenCalledWith(expect.objectContaining({
      teamRunId: context.teamRunId,
      teamAddress: "/",
      runtimeContext,
    }));
  });

  it("routes the unchanged collaboration intent through the mixed backend", async () => {
    const config = createConfig([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]);
    const created = createBackend({ teamRunId: "team-runtime-root", config });
    const manager = new AgentTeamRunManager({ mixedTeamRunBackendFactory: createFactory(created) });
    const run = await manager.createTeamRun(config, "team-runtime-root");
    const intent = {
      recipientAddress: "/Member1",
      caller: { rootTeamRunId: "team-runtime-root", memberAddress: "/Coordinator" },
      content: "Please continue.",
      messageType: "agent_message",
    } as const;

    await expect(run.deliverInterAgentMessage(intent)).resolves.toEqual({ accepted: true });
    expect(created.backend.deliverInterAgentMessage).toHaveBeenCalledWith(intent);
  });

  it("evicts inactive TeamRuns when queried or listed", async () => {
    const config = createConfig([RuntimeKind.CODEX_APP_SERVER]);
    const created = createBackend({ teamRunId: "team-runtime-root", config });
    const manager = new AgentTeamRunManager({ mixedTeamRunBackendFactory: createFactory(created) });
    const run = await manager.createTeamRun(config, "team-runtime-root");
    expect(manager.getActiveRun(run.teamRunId)).toBe(run);

    created.state.active = false;
    expect(manager.getTeamRun(run.teamRunId)).toBeNull();
    expect(manager.listActiveRuns()).toEqual([]);
  });

  it("wraps backend termination failures", async () => {
    const config = createConfig([RuntimeKind.AUTOBYTEUS]);
    const created = createBackend({ teamRunId: "team-runtime-root", config });
    created.backend.terminate = vi.fn().mockRejectedValue(new Error("boom"));
    const manager = new AgentTeamRunManager({ mixedTeamRunBackendFactory: createFactory(created) });
    const run = await manager.createTeamRun(config, "team-runtime-root");

    await expect(manager.terminateTeamRun(run.teamRunId)).rejects.toBeInstanceOf(AgentTeamTerminationError);
  });
});
