import { describe, expect, it, vi } from "vitest";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationAgentStatusSnapshot } from "../../../src/agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { TaskTeamExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const orgRunId = "org-status-traversal";
const startedAt = "2026-09-06T00:00:01.000Z";

const taskTeam = (
  teamRunId: string,
  agentRunId: string,
  taskExecutions: readonly TaskTeamExecution[] = [],
  delegatorAgentRunId = "direct-agent",
): TaskTeamExecution => ({
  address: "/target" as const,
  teamRunId,
  members: [{ address: "/target/lead" as const, agentRunId, platformAgentRunId: null }],
  taskExecutions,
  delegatorAgentRunId,
  startedAt,
});

const fixture = (): AgentOrgRunExecutionTreeSnapshot => {
  const direct = testOrgAgentNode("/director", "direct-agent");
  const mountedLead = testOrgAgentNode("/mounted/lead", "mounted-agent");
  const targetLead = testOrgAgentNode("/target/lead", "target-agent");
  const mountedNested = taskTeam("mounted-nested-team", "mounted-nested-agent", [], "mounted-task-agent");
  const mountedTask = taskTeam("mounted-task-team", "mounted-task-agent", [mountedNested], "mounted-agent");
  const rootNested = taskTeam("root-nested-team", "root-nested-agent", [], "root-team-agent");
  const rootTask = taskTeam("root-task-team", "root-team-agent", [rootNested]);
  const shutDownRootTask = taskTeam("shut-down-root-team", "shut-down-root-agent");
  const mounted = {
    ...testOrgTeamNode({
      address: "/mounted",
      teamRunId: "mounted-configured-team",
      coordinatorAddress: mountedLead.address,
      members: [mountedLead],
    }),
    taskExecutions: [mountedTask],
  };
  const target = testOrgTeamNode({
    address: "/target",
    teamRunId: "target-configured-team",
    coordinatorAddress: targetLead.address,
    members: [targetLead],
  });
  const base = testAgentOrgExecutionTree({ orgRunId, members: [direct, mounted, target] });
  return validateAgentOrgRunExecutionTreePayload({
    ...base,
    rootOrg: {
      ...base.rootOrg,
      taskExecutions: [{
        address: "/director",
        agentRunId: "root-task-agent",
        platformAgentRunId: null,
        delegatorAgentRunId: "direct-agent",
        startedAt,
      }, rootTask, shutDownRootTask],
    },
  }, orgRunId);
};

const status = (memberAddress: string, agentRunId: string): CollaborationAgentStatusSnapshot => ({
  execution: createCollaborationMemberExecutionIdentity({
    root: createAgentOrgRootExecutionIdentity(orgRunId),
    memberAddress: assertAgentTeamAddress(memberAddress),
    agentRunId,
  }),
  details: { status: "idle", trigger: null, errorMessage: null, recoverableBlock: null },
  statusHint: "IDLE",
});

const teamRun = (statuses: readonly CollaborationAgentStatusSnapshot[]) => ({
  getInputStateSnapshots: vi.fn(() => []),
  getLeafAgentStatusSnapshots: vi.fn(() => statuses),
});

const buildRun = () => {
  const tree = fixture();
  const rootAgents = {
    listHandles: vi.fn(() => [
      { getStatusSnapshot: () => status("/director", "direct-agent") },
      { getStatusSnapshot: () => status("/director", "root-task-agent") },
    ]),
    getInputStateSnapshots: vi.fn(() => []),
    getStatusSnapshots: vi.fn(() => [status("/director", "direct-agent"), status("/director", "root-task-agent")]),
    isTaskLive: vi.fn(() => true),
  };
  const runs = new Map<string, ReturnType<typeof teamRun>>([
    ["mounted-configured-team", teamRun([
      status("/mounted/lead", "mounted-agent"),
      status("/target/lead", "mounted-task-agent"),
      status("/target/lead", "mounted-nested-agent"),
    ])],
    ["target-configured-team", teamRun([status("/target/lead", "target-agent")])],
    ["mounted-task-team", teamRun([status("/target/lead", "mounted-task-agent")])],
    ["mounted-nested-team", teamRun([status("/target/lead", "mounted-nested-agent")])],
    ["root-task-team", teamRun([
      status("/target/lead", "root-team-agent"),
      status("/target/lead", "root-nested-agent"),
    ])],
    ["root-nested-team", teamRun([status("/target/lead", "root-nested-agent")])],
  ]);
  const frozenScopes = new Map([...runs.keys()].map((teamRunId) => [teamRunId, {
    fenceAgentRunsForRootShutdown: vi.fn(async () => ({ accepted: true as const })),
    finish: vi.fn(async () => ({ accepted: true as const })),
  }]));
  const teams = {
    list: vi.fn(() => [...runs.values()]),
    get: vi.fn((teamRunId: string) => runs.get(teamRunId) ?? null),
    require: vi.fn((teamRunId: string) => {
      const run = runs.get(teamRunId);
      if (!run) throw new Error(`missing TeamRun '${teamRunId}'`);
      return run;
    }),
    freezeForRootTermination: vi.fn(() => [...frozenScopes.values()]),
  };
  const persistence = { drain: vi.fn(async () => undefined) };
  Object.assign(rootAgents, { freezeForRootTermination: vi.fn(() => []) });
  const run = new AgentOrgRun({
    root: createAgentOrgRootExecutionIdentity(orgRunId),
    tree,
    messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] },
    rootAgents: rootAgents as never,
    teams: teams as never,
    callbacks: {} as never,
    persistence: persistence as never,
    publisher: new RootEventPublisher<AgentOrgRunEvent>(),
    taskExecutionIdentity: {} as never,
  });
  run.activate();
  return { run, runs, rootAgents, teams, frozenScopes, persistence };
};

const connect = async (run: AgentOrgRun) => {
  const sent: string[] = [];
  const handler = new AgentOrgStreamHandler({
    getActive: (id: string) => id === orgRunId ? run : null,
    recordRunActivity: vi.fn(),
  } as never);
  const sessionId = await handler.connect({ send: (value: string) => sent.push(value), close: vi.fn() }, orgRunId);
  const snapshot = sent.map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)))
    .find((message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT");
  if (!snapshot || snapshot.type !== "ROOT_EXECUTION_VIEW_SNAPSHOT") throw new Error(`missing AgentOrg snapshot: ${sent.join("\n")}`);
  return { handler, sessionId, snapshot };
};

describe("AgentOrg status snapshot traversal", () => {
  it("streams every root-owned and recursively Team-owned Agent exactly once across reselect", async () => {
    const test = buildRun();

    const first = await connect(test.run);
    const second = await connect(test.run);

    expect(first.sessionId).toBeTruthy();
    expect(second.sessionId).toBeTruthy();
    for (const { snapshot } of [first, second]) {
      expect(snapshot.payload.root_org!.execution_tree).toMatchObject({
        rootOrg: {
          members: [
            { agentRunId: "direct-agent" },
            { teamRunId: "mounted-configured-team", taskExecutions: [{
              teamRunId: "mounted-task-team",
              taskExecutions: [{ teamRunId: "mounted-nested-team" }],
            }] },
            { teamRunId: "target-configured-team" },
          ],
          taskExecutions: [
            { agentRunId: "root-task-agent" },
            { teamRunId: "root-task-team", taskExecutions: [{ teamRunId: "root-nested-team" }] },
            { teamRunId: "shut-down-root-team", delegatorAgentRunId: "direct-agent" },
          ],
        },
      });
      const ids = snapshot.payload.root_org!.agent_statuses.map((entry) => entry.agent_run_id);
      expect(ids).toEqual([
        "direct-agent",
        "root-task-agent",
        "mounted-agent",
        "mounted-task-agent",
        "mounted-nested-agent",
        "target-agent",
        "root-team-agent",
        "root-nested-agent",
        "shut-down-root-agent",
      ]);
      expect(snapshot.payload.root_org!.agent_statuses.find((entry) => entry.agent_run_id === "shut-down-root-agent"))
        .toMatchObject({ member_address: "/target/lead", status: "offline" });
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(test.teams.require.mock.calls.map(([id]) => id)).toEqual([
      "mounted-configured-team", "target-configured-team", "root-task-team",
      "mounted-configured-team", "target-configured-team", "root-task-team",
    ]);
    expect(test.teams.list).toHaveBeenCalledTimes(2); // each package snapshot gathers input state, not status traversal
    expect(test.runs.get("mounted-task-team")!.getLeafAgentStatusSnapshots).not.toHaveBeenCalled();
    expect(test.runs.get("mounted-nested-team")!.getLeafAgentStatusSnapshots).not.toHaveBeenCalled();
    expect(test.runs.get("root-nested-team")!.getLeafAgentStatusSnapshots).not.toHaveBeenCalled();
  });

  it("reports a shut-down root task Team as offline without requiring a live TeamRun", () => {
    const test = buildRun();

    const statuses = test.run.getAgentStatusSnapshots();
    expect(test.teams.require).not.toHaveBeenCalledWith("shut-down-root-team");
    expect(statuses.filter((entry) => entry.execution.agentRunId === "shut-down-root-agent")
      .map((entry) => entry.details.status)).toEqual(["offline"]);
  });

  it("keeps the flat registered Team scope authoritative for frozen root shutdown", async () => {
    const test = buildRun();
    test.run.getAgentStatusSnapshots();

    await expect(test.run.terminate()).resolves.toEqual({ accepted: true });

    expect(test.teams.freezeForRootTermination).toHaveBeenCalledOnce();
    for (const scope of test.frozenScopes.values()) {
      expect(scope.fenceAgentRunsForRootShutdown).toHaveBeenCalledOnce();
      expect(scope.finish).toHaveBeenCalledOnce();
    }
    expect(test.persistence.drain).toHaveBeenCalledOnce();
  });
});
