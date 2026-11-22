import { NO_MESSAGE_FEED } from "../../helpers/view-streams.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { describe, expect, it, vi } from "vitest";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationAgentStatusSnapshot } from "../../../src/agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { RunViewStream } from "../../../src/agent-collaboration/delegation/run-view-stream.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { isAgentOrgMessageEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { testViewSources } from "../../helpers/child-rows-feed.js";
import { NO_PEER_CHANNEL, NO_REMOTE_FILES } from "../../helpers/explicit-host-collaborators.js";

const orgRunId = "org-status-traversal";

/** An Org holds its own agents only: a direct agent and two mounted teams (autobyteus-461: nothing is hosted). */
const fixture = (): AgentOrgRunExecutionTreeSnapshot => {
  const direct = testOrgAgentNode("/director", "direct-agent");
  const mountedLead = testOrgAgentNode("/mounted/lead", "mounted-agent");
  const targetLead = testOrgAgentNode("/target/lead", "target-agent");
  return testAgentOrgExecutionTree({ orgRunId, members: [
    direct,
    testOrgTeamNode({ address: "/mounted", teamRunId: "mounted-configured-team", coordinatorAddress: mountedLead.address, members: [mountedLead] }),
    testOrgTeamNode({ address: "/target", teamRunId: "target-configured-team", coordinatorAddress: targetLead.address, members: [targetLead] }),
  ] });
};

const status = (memberAddress: string, agentRunId: string): CollaborationAgentStatusSnapshot => ({
  execution: createCollaborationMemberExecutionIdentity({
    root: createAgentOrgRootExecutionIdentity(orgRunId),
    memberAddress: assertAgentTeamAddress(memberAddress),
    agentRunId,
  }),
  details: { status: "idle", backgroundTasksRunning: 0, trigger: null, errorMessage: null, recoverableBlock: null },
  statusHint: "IDLE",
});

const teamRun = (statuses: readonly CollaborationAgentStatusSnapshot[]) => ({
  getInputStateSnapshots: vi.fn(() => []),
  getLeafAgentStatusSnapshots: vi.fn(() => statuses),
});

const buildRun = () => {
  const tree = fixture();
  const rootAgents = {
    listHandles: vi.fn(() => [{ getStatusSnapshot: () => status("/director", "direct-agent") }]),
    getInputStateSnapshots: vi.fn(() => []),
    getStatusSnapshots: vi.fn(() => [status("/director", "direct-agent")]),
  };
  const runs = new Map<string, ReturnType<typeof teamRun>>([
    ["mounted-configured-team", teamRun([status("/mounted/lead", "mounted-agent")])],
    ["target-configured-team", teamRun([status("/target/lead", "target-agent")])],
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
  const run = new AgentOrgRun({ remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_REMOTE_FILES.received, delegationIndex: noDelegations(), taskRecords: openTaskRecords(),
    root: createAgentOrgRootExecutionIdentity(orgRunId),
    tree,
    messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] },
    rootAgents: rootAgents as never,
    teams: teams as never,
    callbacks: {} as never,
    persistence: persistence as never,
    publisher: new RunViewStream<AgentOrgRunEvent>({ isMessageEvent: isAgentOrgMessageEvent }), messageFeed: NO_MESSAGE_FEED,
  });
  run.activate();
  return { run, runs, rootAgents, teams, frozenScopes, persistence };
};

const connect = async (run: AgentOrgRun) => {
  const sent: string[] = [];
  const handler = new AgentOrgStreamHandler({
    getActive: (id: string) => id === orgRunId ? run : null,
    recordRunActivity: vi.fn(),
  } as never, testViewSources());
  const sessionId = await handler.connect({ send: (value: string) => sent.push(value), close: vi.fn() }, orgRunId);
  const snapshot = sent.map((value) => CollaborationStreamServerMessageSchema.parse(JSON.parse(value)))
    .find((message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT");
  if (!snapshot || snapshot.type !== "ROOT_EXECUTION_VIEW_SNAPSHOT") throw new Error(`missing AgentOrg snapshot: ${sent.join("\n")}`);
  return { handler, sessionId, snapshot };
};

describe("AgentOrg status snapshot traversal", () => {
  it("streams every agent of the Org exactly once across reselect", async () => {
    const test = buildRun();
    const first = await connect(test.run);
    const second = await connect(test.run);
    expect(first.sessionId).toBeTruthy();
    expect(second.sessionId).toBeTruthy();
    for (const { snapshot } of [first, second]) {
      expect(snapshot.payload.root_org!.execution_tree).toMatchObject({ rootOrg: {
        members: [{ agentRunId: "direct-agent" }, { teamRunId: "mounted-configured-team" }, { teamRunId: "target-configured-team" }],
      } });
      const ids = snapshot.payload.root_org!.agent_statuses.map((entry) => entry.agent_run_id);
      expect(ids).toEqual(["direct-agent", "mounted-agent", "target-agent"]);
    }
    expect(test.teams.require.mock.calls.map(([id]) => id)).toEqual([
      "mounted-configured-team", "target-configured-team", "mounted-configured-team", "target-configured-team",
    ]);
    expect(test.teams.list).toHaveBeenCalledTimes(2); // each package snapshot gathers input state, not status traversal
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
