import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunCollaborationStatusesResolver } from "../../../../src/api/graphql/types/run-collaboration-statuses.js";
import {
  StandaloneAgentRunRootManager,
  bindProcessStandaloneAgentRunRootManager,
  releaseProcessStandaloneAgentRunRootManager,
} from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { DelegationTree, type RunPartsReader } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { LocalChildFollowers } from "../../../../src/agent-collaboration/execution/delegation/local-child-followers.js";
import { createAgentOrgRootExecutionIdentity, createAgentRootExecutionIdentity, createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RunViewChildren } from "../../../../src/services/agent-streaming/run-view-children.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { withStudioServices } from "../../../helpers/studio-reads.js";

/**
 * autobyteus-461 SR-055, SR-056 (autobyteus-426 REQ-009): one history poll for listed runs of every kind. Each run's
 * activity and the runs on this node it delegated to that its view shows, each by its identity (no launch details) with
 * its agents' statuses, from the child's own root when it runs, else `offline`. Nothing is restored; a child's identity
 * is read once per run from its own file, not per poll.
 */
const runs = { team: createTeamRootExecutionIdentity("team-1"), org: createAgentOrgRootExecutionIdentity("org-1"), host: createAgentRootExecutionIdentity("host-1") };
const agentsByRun: Record<string, { agentRunId: string; address: string | null; agentDefinitionId: string | null }[]> = {
  "writer-1": [{ agentRunId: "writer-1", address: "/writer", agentDefinitionId: "writer" }],
  "docs-team": [{ agentRunId: "lead-1", address: "/lead", agentDefinitionId: "lead" }, { agentRunId: "checker-1", address: "/checker", agentDefinitionId: "checker" }],
  "helper-1": [{ agentRunId: "helper-1", address: null, agentDefinitionId: "helper" }],
  // The delegating runs: each child names its delegator's address from them.
  "team-1": [{ agentRunId: "manager-1", address: "/manager", agentDefinitionId: "manager" }],
  "org-1": [{ agentRunId: "ceo-1", address: "/ceo", agentDefinitionId: "ceo" }],
  "host-1": [{ agentRunId: "host-1", address: "/host", agentDefinitionId: "host" }],
};
const fixture = async () => {
  const reads: string[] = [];
  const reader: RunPartsReader = { partsOf: async (run) => {
    reads.push(run.rootRunId);
    const agents = agentsByRun[run.rootRunId];
    return agents ? { agents, coordinatorAddress: null, mountedTeams: [] } : null;
  } };
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationTree(() => tasks, reader);
  tree.build(); tasks.setEntriesListener(tree);
  for (const id of ["T1", "T2", "T3", "T4"]) tasks.addTask(id);
  const link = (taskId: string, from: typeof runs.team, by: string, recipientAddress: string, execution: { agentRunId: string } | { teamRunId: string }, extra = {}) =>
    tasks.linkNewTaskExecution({ role: "assigned", taskId, recipientAddress, delegatedFrom: { delegatingRun: from, delegatorAgentRunId: by }, execution, ...extra } as never);
  await link("T1", runs.team, "manager-1", "/writer", { agentRunId: "writer-1" });
  await link("T2", runs.org, "ceo-1", "/docs_team", { teamRunId: "docs-team" }, { teamCoordinatorAgentRunId: "lead-1" });
  await link("T3", runs.host, "host-1", "/helper", { agentRunId: "helper-1" });
  // A peer's run keeps its own state source: not a local row.
  await link("T4", runs.team, "manager-1", "/far", { agentRunId: "far-1" }, { nodeId: "node-b" });
  for (const execution of [{ agentRunId: "writer-1" }, { teamRunId: "docs-team" }, { agentRunId: "helper-1" }, { agentRunId: "far-1" }]) await tasks.markStarted(execution);
  const live: Record<string, { agentRunId: string; status: string }[]> = { "writer-1": [{ agentRunId: "writer-1", status: "running" }] };
  const followers = new LocalChildFollowers({ tree,
    agents: () => ({ observePairedAgents: vi.fn(), pairedAgentStatuses: (runId: string) => live[runId] ?? [] }) as never });
  // This node's channel: only its own registry's names are read; any request to a peer would fail the test.
  const channel = new Proxy({ peerName: vi.fn(async (nodeId: string) => nodeId === "node-b" ? "docker" : nodeId) } as Record<string, unknown>, {
    get: (target, name) => name in target ? target[name as string] : () => { throw new Error(`A peer was asked: ${String(name)}`); } });
  const runViewChildren = new RunViewChildren({ memoryDir: "/unused", tree, followers, channel: () => channel as never });
  const manager = Object.create(StandaloneAgentRunRootManager.prototype) as StandaloneAgentRunRootManager;
  Object.defineProperty(manager, "active", { value: new Map() });
  Object.defineProperty(manager, "pending", { value: new Map() });
  const services = { runViewChildren,
    teamRunService: { getActiveTeamRun: (id: string) => id === "team-1" ? {} : null },
    agentOrgRunService: { getActive: () => null } };
  const poll = (asked: { kind: string; runId: string }[]) => withStudioServices(services, async () => {
    bindProcessStandaloneAgentRunRootManager(manager);
    try { return await new RunCollaborationStatusesResolver().runCollaborationStatuses(asked); }
    finally { releaseProcessStandaloneAgentRunRootManager(manager); }
  });
  return { tasks, reads, poll, channel };
};
afterEach(() => { vi.clearAllMocks(); });

describe("runCollaborationStatuses (SR-055)", () => {
  it("answers every kind, active or stopped, with each delegated run's identity and its agents' statuses", async () => {
    const f = await fixture();
    const answer = await f.poll([{ kind: "agent_team", runId: "team-1" }, { kind: "agent_org", runId: "org-1" }, { kind: "agent", runId: "host-1" }]);
    expect(answer).toEqual([
      { kind: "agent_team", runId: "team-1", isActive: true, children: [{
        row: { kind: "agent", address: "/writer", agentRunId: "writer-1", agentDefinitionId: "writer", delegatorAgentRunId: "manager-1", startedAt: expect.any(String) },
        delegatorAddress: "/manager", statuses: [{ agentRunId: "writer-1", memberAddress: "/writer", status: "running" }], node: null },
        // A peer's run (SR-057): its identity from its Task entry, its node named here, no statuses.
        { row: { kind: "agent", address: "/far", agentRunId: "far-1", agentDefinitionId: null, delegatorAgentRunId: "manager-1", startedAt: expect.any(String) },
          delegatorAddress: "/manager", statuses: [], node: { nodeId: "node-b", nodeName: "docker" } }] },
      { kind: "agent_org", runId: "org-1", isActive: false, children: [{
        row: { kind: "agent_team", address: "/docs_team", teamRunId: "docs-team", coordinatorAgentRunId: "lead-1", delegatorAgentRunId: "ceo-1", startedAt: expect.any(String),
          members: [{ address: "/lead", agentRunId: "lead-1", agentDefinitionId: "lead" }, { address: "/checker", agentRunId: "checker-1", agentDefinitionId: "checker" }] },
        delegatorAddress: "/ceo", node: null, statuses: [{ agentRunId: "lead-1", memberAddress: "/lead", status: "offline" }, { agentRunId: "checker-1", memberAddress: "/checker", status: "offline" }] }] },
      // An agent run with no stored address shows the address it was delegated to.
      { kind: "agent", runId: "host-1", isActive: false, children: [{
        row: { kind: "agent", address: "/helper", agentRunId: "helper-1", agentDefinitionId: "helper", delegatorAgentRunId: "host-1", startedAt: expect.any(String) },
        delegatorAddress: "/host", node: null, statuses: [{ agentRunId: "helper-1", memberAddress: "/helper", status: "offline" }] }] },
    ]);
  });

  it("asks nothing of a peer per poll: a peer child is answered from its Task entry and this node's registry (SR-057)", async () => {
    const f = await fixture();
    await f.poll([{ kind: "agent_team", runId: "team-1" }]);
    await f.poll([{ kind: "agent_team", runId: "team-1" }]);
    expect((f.channel as unknown as { peerName: ReturnType<typeof vi.fn> }).peerName).toHaveBeenCalledWith("node-b");
    // Its Task closes: it leaves the answer, as a local child does.
    f.tasks.close("T4");
    const [answer] = await f.poll([{ kind: "agent_team", runId: "team-1" }]) as Array<{ children: Array<{ node: unknown }> }>;
    expect(answer!.children.every((child) => child.node === null)).toBe(true);
  });

  it("reads a delegated run's identity and its delegator's address once, not per poll; a closed child leaves the answer", async () => {
    const f = await fixture();
    await f.poll([{ kind: "agent_team", runId: "team-1" }]);
    await f.poll([{ kind: "agent_team", runId: "team-1" }]);
    expect(f.reads.filter((id) => id === "writer-1")).toHaveLength(1);
    // The delegating run's agents (its delegators' addresses) are read once too.
    expect(f.reads.filter((id) => id === "team-1")).toHaveLength(1);
    // Its Task closes: the next poll no longer lists it.
    f.tasks.close("T1");
    await expect(f.poll([{ kind: "agent_team", runId: "team-1" }])).resolves.toEqual([{ kind: "agent_team", runId: "team-1", isActive: true,
      children: [expect.objectContaining({ node: { nodeId: "node-b", nodeName: "docker" } })] }]);
  });

  it("refuses more than 100 runs with BAD_USER_INPUT", async () => {
    const f = await fixture();
    const asked = Array.from({ length: 101 }, (_, index) => ({ kind: "agent", runId: `run-${index}` }));
    await expect(f.poll(asked)).rejects.toEqual(expect.objectContaining({ extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }) }));
    await expect(f.poll(asked.slice(0, 100))).resolves.toHaveLength(100);
  });
});
