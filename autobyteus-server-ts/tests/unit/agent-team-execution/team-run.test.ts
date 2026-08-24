import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const config = testTeamRunConfig({
  rootTeamRunId: "team-run-1",
  coordinatorAddress: "/Coordinator",
  children: [testAgentNode("/Coordinator", { agentRunId: "coordinator-run-1" })],
});

const createBackend = (): TeamRunBackend => ({
  teamRunId: "team-run-1",
  teamBackendKind: TeamBackendKind.MIXED,
  getRuntimeContext: () => null,
  isActive: () => true,
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
});

const createRun = (backend: TeamRunBackend): TeamRun => new TeamRun(
  new TeamRunContext({
    physicalScope: createRootTeamRunPhysicalScope("team-run-1"),
    teamRunId: "team-run-1",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    runtimeContext: null,
  }),
  backend,
);

describe("TeamRun", () => {
  it("delivers input only to the exact direct AgentRun selected by the root", async () => {
    const backend = createBackend();
    const run = createRun(backend);
    const message = new AgentInputUserMessage("continue");

    await expect(run.postMessage(message, "coordinator-run-1")).resolves.toEqual({ accepted: true });
    expect(backend.deliverToDirectAgent).toHaveBeenCalledWith("coordinator-run-1", message);
  });

  it("forwards exact direct-member commands without route or address fallback", async () => {
    const backend = createBackend();
    const run = createRun(backend);
    const command = { kind: "interrupt" as const };

    await expect(run.executeDirectAgentCommand("coordinator-run-1", command)).resolves.toEqual({ accepted: true });
    expect(backend.executeDirectAgentCommand).toHaveBeenCalledWith("coordinator-run-1", command);
  });

  it("keeps status/open-work and prepared settlement at the one local backend boundary", async () => {
    const backend = createBackend();
    const run = createRun(backend);
    await run.prepareDirectTaskSettlement("task_0001", { agentRunId: "task-agent-run-1" });

    expect(run.getLeafAgentStatusSnapshots()).toEqual([]);
    expect(run.hasOpenExecutionWork()).toBe(false);
    expect(backend.prepareDirectTaskSettlement).toHaveBeenCalledWith(
      "task_0001",
      { agentRunId: "task-agent-run-1" },
    );
  });
});
