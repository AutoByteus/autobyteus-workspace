import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunCollaborationResolver } from "../../../../src/api/graphql/types/agent-run-collaboration.js";
import {
  StandaloneAgentRunRootManager,
  bindProcessStandaloneAgentRunRootManager,
  releaseProcessStandaloneAgentRunRootManager,
} from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { bindLocalChildPorts, unbindLocalChildPorts, type LocalChildPorts } from "../../../../src/agent-collaboration/execution/delegation/local-child-observation.js";

/**
 * autobyteus-426 REQ-009 (D-09), autobyteus-461 SR-040: the history poll of listed standalone runs answers, active or
 * stopped, whether each is active and every agent of its open local children (its view's rows) with its status from the
 * child's own root, else `offline`. Addresses come from the delegation tree; nothing is restored.
 */
const managerWith = (active: readonly string[]) => {
  const manager = Object.create(StandaloneAgentRunRootManager.prototype) as StandaloneAgentRunRootManager;
  Object.defineProperty(manager, "active", { value: new Map(active.map((id) => [id, { isActive: () => true }])) });
  Object.defineProperty(manager, "pending", { value: new Map() });
  return manager;
};

// The manager delegated to an agent run (running) and a team run (stopped); a peer's run is not a local row.
const children: Record<string, unknown[]> = {
  manager: [
    { run: { agentRunId: "writer-1" }, recipientAddress: "/writer" },
    { run: { teamRunId: "docs-review-team" }, recipientAddress: "/docs_review" },
    { run: { agentRunId: "far-1" }, recipientAddress: "/far", nodeId: "node-b" },
  ],
};
const agents: Record<string, { agentRunId: string; address: string | null }[]> = {
  "writer-1": [{ agentRunId: "writer-1", address: "/writer" }],
  "docs-review-team": [{ agentRunId: "lead-1", address: "/lead" }, { agentRunId: "checker-1", address: "/checker" }],
};
const live: Record<string, { agentRunId: string; status: string }[]> = { "writer-1": [{ agentRunId: "writer-1", status: "running" }] };
const ports: LocalChildPorts = {
  tree: () => ({ openChildrenOf: (run) => (children[run.rootRunId] ?? []) as never, subscribe: () => () => undefined,
    agentsOf: async (run) => agents[run.rootRunId] ?? [] }),
  rowOf: vi.fn(),
  agents: () => ({ observePairedAgents: vi.fn(), pairedAgentStatuses: (runId: string) => live[runId] ?? [] }) as never,
};
const MANAGER_STATUSES = [
  { agentRunId: "writer-1", memberAddress: "/writer", status: "running" },
  { agentRunId: "lead-1", memberAddress: "/lead", status: "offline" },
  { agentRunId: "checker-1", memberAddress: "/checker", status: "offline" },
];
afterEach(() => { unbindLocalChildPorts(ports); vi.clearAllMocks(); });

describe("StandaloneAgentRunRootManager.getAgentStatuses", () => {
  it("answers each run, active or stopped, in the asked order, with its children's agents and statuses", async () => {
    bindLocalChildPorts(ports);
    await expect(managerWith(["manager"]).getAgentStatuses(["manager", "unknown"])).resolves.toEqual([
      { runId: "manager", isActive: true, statuses: MANAGER_STATUSES },
      { runId: "unknown", isActive: false, statuses: [] },
    ]);
    // A stopped delegator's rows follow its children too: they are runs of their own.
    await expect(managerWith([]).getAgentStatuses(["manager"])).resolves.toEqual([{ runId: "manager", isActive: false, statuses: MANAGER_STATUSES }]);
    expect(ports.rowOf).not.toHaveBeenCalled();
  });

  it("names no child before the Task records are loaded", async () => {
    await expect(managerWith(["manager"]).getAgentStatuses(["manager"])).resolves.toEqual([{ runId: "manager", isActive: true, statuses: [] }]);
  });
});

describe("agentRunCollaborationStatuses", () => {
  const withManager = async <T>(manager: unknown, run: () => Promise<T>): Promise<T> => {
    bindProcessStandaloneAgentRunRootManager(manager as never);
    try { return await run(); } finally { releaseProcessStandaloneAgentRunRootManager(manager as never); }
  };

  it("maps each run's answer; nothing of the collaboration view and no closed-set digest", async () => {
    bindLocalChildPorts(ports);
    const answer = await withManager(managerWith([]), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(["manager"]));
    expect(answer).toEqual([{ runId: "manager", isActive: false, statuses: MANAGER_STATUSES.map((status) => ({ ...status, recoverableBlock: null })) }]);
  });

  it("refuses more than 100 runs with BAD_USER_INPUT", async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `run-${index}`);
    await expect(withManager(managerWith([]), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids)))
      .rejects.toEqual(expect.objectContaining({ extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }) }));
    expect(await withManager(managerWith([]), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids.slice(0, 100)))).toHaveLength(100);
  });
});
