import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { FlatTeamRunBackend } from "../../../src/agent-team-execution/local/flat-team-run-backend.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const createHarness = () => {
  const coordinator = testAgentNode("/Coordinator", {
    agentRunId: "coordinator-run",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  });
  const reviewer = testAgentNode("/Reviewer", {
    agentRunId: "reviewer-run",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  });
  const config = testTeamRunConfig({
    rootTeamRunId: "team-mixed-1",
    rootTeamDefinitionId: "team-def-mixed-1",
    coordinatorAddress: coordinator.address,
    children: [coordinator, reviewer],
  });
  const runtimeContext = new FlatTeamExecutionContext({
    memberContexts: [coordinator, reviewer].map((node) => new FlatAgentExecutionContext({
      address: node.address,
      agentRunId: node.agentRunId,
      runtimeKind: node.runtimeKind,
      platformAgentRunId: node.runtimeKind === RuntimeKind.CODEX_APP_SERVER
        ? "thread-coordinator"
        : "session-reviewer",
    })),
  });
  const context = new TeamRunContext({
    physicalScope: createRootExecutionPhysicalScope({
      root: createTeamRootExecutionIdentity(config.rootTeam.teamRunId),
      ancestorTeamRunIds: [],
    }),
    teamRunId: config.rootTeam.teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    handoffs: config.handoffs,
    runtimeContext,
  });
  const manager = {
    isActive: vi.fn(() => true),
    getLeafAgentStatusSnapshots: vi.fn(() => []),
    hasOpenExecutionWork: vi.fn(() => false),
    getOrCreateConfiguredChildTeam: vi.fn(),
    reserveDirectAgentInput: vi.fn(),
    deliverToDirectAgent: vi.fn(async () => ({ accepted: true })),
    executeDirectAgentCommand: vi.fn(async () => ({ accepted: true })),
    prepareTaskAgent: vi.fn(),
    prepareTaskTeam: vi.fn(),
    prepareDirectTaskSettlement: vi.fn(),
    prepareTermination: vi.fn(),
    terminate: vi.fn(async () => ({ accepted: true })),
  };
  return { backend: new FlatTeamRunBackend(context, manager as never), context, manager };
};

afterEach(() => vi.clearAllMocks());

describe("FlatTeamRunBackend exact local facade integration", () => {
  it("exposes one concrete TeamRun identity and current runtime context", () => {
    const { backend, context, manager } = createHarness();
    expect(backend.teamRunId).toBe("team-mixed-1");
    expect(backend.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(backend.getTeamRunContext()).toBe(context);
    expect(backend.getRuntimeContext()).toBe(context.runtimeContext);
    expect(backend.isActive()).toBe(true);
    expect(backend.getLeafAgentStatusSnapshots()).toEqual([]);
    expect(backend.hasOpenExecutionWork()).toBe(false);
    expect(manager.isActive).toHaveBeenCalledOnce();
  });

  it("forwards direct input and commands by the unchanged exact AgentRun ID", async () => {
    const { backend, manager } = createHarness();
    const message = AgentInputUserMessage.fromDict({ content: "Review this.", context_files: null });
    const command = { kind: "post_message" as const, message };

    await expect(backend.deliverToDirectAgent("reviewer-run", message)).resolves.toEqual({ accepted: true });
    await expect(backend.executeDirectAgentCommand("reviewer-run", command)).resolves.toEqual({ accepted: true });

    expect(manager.deliverToDirectAgent).toHaveBeenCalledWith("reviewer-run", message);
    expect(manager.executeDirectAgentCommand).toHaveBeenCalledWith("reviewer-run", command);
  });

  it("forwards prepared task execution, settlement, and termination capabilities without alternate ownership", async () => {
    const { backend, manager } = createHarness();
    const taskAgentInput = { taskId: "task-agent-1" } as never;
    const taskTeamInput = { taskId: "task-team-1" } as never;
    const preparedAgent = Object.freeze({ executionKind: "task_agent" });
    const preparedTeam = Object.freeze({ executionKind: "task_agent_team" });
    const preparedSettlement = Object.freeze({ taskId: "task-agent-1" });
    const preparedTermination = Object.freeze({ commit: vi.fn(), cancel: vi.fn() });
    manager.prepareTaskAgent.mockResolvedValue(preparedAgent);
    manager.prepareTaskTeam.mockResolvedValue(preparedTeam);
    manager.prepareDirectTaskSettlement.mockResolvedValue(preparedSettlement);
    manager.prepareTermination.mockResolvedValue(preparedTermination);

    await expect(backend.prepareTaskAgent(taskAgentInput)).resolves.toBe(preparedAgent);
    await expect(backend.prepareTaskTeam(taskTeamInput)).resolves.toBe(preparedTeam);
    await expect(backend.prepareDirectTaskSettlement("task-agent-1", { agentRunId: "task-agent-run" })).resolves.toBe(preparedSettlement);
    await expect(backend.prepareTermination()).resolves.toBe(preparedTermination);
    await expect(backend.terminate()).resolves.toEqual({ accepted: true });

    expect(manager.prepareTaskAgent).toHaveBeenCalledWith(taskAgentInput);
    expect(manager.prepareTaskTeam).toHaveBeenCalledWith(taskTeamInput);
    expect(manager.prepareDirectTaskSettlement).toHaveBeenCalledWith("task-agent-1", { agentRunId: "task-agent-run" });
    expect(manager.terminate).toHaveBeenCalledOnce();
  });
});
