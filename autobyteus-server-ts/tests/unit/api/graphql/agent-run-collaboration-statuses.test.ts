import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closedTaskExecutionsDigest } from "@autobyteus/collaboration-stream-contracts";
import { AgentRunCollaborationResolver } from "../../../../src/api/graphql/types/agent-run-collaboration.js";
import {
  StandaloneAgentRunRootManager,
  bindProcessStandaloneAgentRunRootManager,
  releaseProcessStandaloneAgentRunRootManager,
} from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

import { bindDelegationTree, unbindDelegationTree } from "../../../../src/agent-collaboration/delegation/delegation-tree-binding.js";
import { bindLocalChildPorts, unbindLocalChildPorts, type LocalChildPorts } from "../../../../src/agent-collaboration/execution/delegation/local-child-observation.js";

// autobyteus-426 REQ-009 (D-09): the history poll's read of listed standalone runs: whether each is active, and the digest
// of the runs it delegated to whose Task closed (autobyteus-461: from the Task entries, the same while it runs or not).

type Reference = { agentRunId: string } | { teamRunId: string };
const EMPTY = closedTaskExecutionsDigest([]);

/** A manager holding only its registered roots and the Task side's open check; nothing is read from a file. */
const managerWith = (active: readonly string[], closed: Set<string>) => {
  const manager = Object.create(StandaloneAgentRunRootManager.prototype) as StandaloneAgentRunRootManager;
  Object.defineProperty(manager, "active", { value: new Map(active.map((id) => [id, { isActive: () => true }])) });
  Object.defineProperty(manager, "pending", { value: new Map() });
  const key = (run: Reference) => "agentRunId" in run ? run.agentRunId : run.teamRunId;
  Object.defineProperty(manager, "options", { value: { taskExecutionResources: { isOpen: (run: Reference) => !closed.has(key(run)) } } });
  return manager;
};
const children: Record<string, Reference[]> = { host: [{ agentRunId: "writer-1" }, { teamRunId: "docs-review-team" }], stopped: [{ teamRunId: "closed-team" }] };
const tree = { childrenOf: (run: { rootRunId: string }) => children[run.rootRunId] ?? [] } as never;
afterEach(() => { unbindDelegationTree(tree); vi.restoreAllMocks(); });

describe("StandaloneAgentRunRootManager.getAgentStatuses", () => {
  it("answers whether each run is active, in the asked order, with the digest of its closed children", async () => {
    bindDelegationTree(tree);
    const closed = new Set<string>();
    const manager = managerWith(["host-a"], closed);
    await expect(manager.getAgentStatuses(["host-b", "host-a", "unknown"])).resolves.toEqual([
      { runId: "host-b", isActive: false, statuses: [], closedTaskExecutionsDigest: EMPTY },
      { runId: "host-a", isActive: true, statuses: [], closedTaskExecutionsDigest: EMPTY },
      { runId: "unknown", isActive: false, statuses: [], closedTaskExecutionsDigest: EMPTY },
    ]);
  });

  it("a stopped run's digest changes when a child's Task closes and returns when it reopens (autobyteus-435 AC-011-1)", async () => {
    bindDelegationTree(tree);
    const closed = new Set<string>();
    const manager = managerWith([], closed);
    const digest = async () => (await manager.getAgentStatuses(["host"]))[0]!.closedTaskExecutionsDigest;
    expect(await digest()).toBe(EMPTY);
    closed.add("writer-1"); closed.add("docs-review-team");
    expect(await digest()).toBe(closedTaskExecutionsDigest([{ teamRunId: "docs-review-team" }, { agentRunId: "writer-1" }]));
    closed.clear();
    expect(await digest()).toBe(EMPTY);
  });

  it("CR-461-002: an active run names every agent of its open local children with its status, and the empty closed set its view lists", async () => {
    // writer-1 is open and running; the team is open and stopped (its members offline); closed-1 is closed: not in the view.
    const openChildren = [
      { run: { agentRunId: "writer-1" }, recipientAddress: "/writer" },
      { run: { teamRunId: "docs-review-team" }, recipientAddress: "/docs_review" },
    ];
    const ports: LocalChildPorts = {
      tree: () => ({ openChildrenOf: () => openChildren as never, subscribe: () => () => undefined }),
      rowOf: async (child) => ("agentRunId" in child.run
        ? { address: "/writer", agentRunId: "writer-1" }
        : { address: "/docs_review", teamRunId: "docs-review-team", members: [{ address: "/lead", agentRunId: "lead-1" }, { address: "/checker", agentRunId: "checker-1" }] }) as never,
      agents: () => ({ observePairedAgents: vi.fn(), pairedAgentStatuses: (runId: string) => runId === "writer-1" ? [{ agentRunId: "writer-1", status: "running" }] : [] }) as never,
    };
    bindLocalChildPorts(ports);
    bindDelegationTree({ childrenOf: () => [{ agentRunId: "writer-1" }, { agentRunId: "closed-1" }] } as never);
    try {
      const manager = managerWith(["host"], new Set(["closed-1"]));
      await expect(manager.getAgentStatuses(["host"])).resolves.toEqual([{ runId: "host", isActive: true, closedTaskExecutionsDigest: EMPTY, statuses: [
        { agentRunId: "writer-1", memberAddress: "/writer", status: "running" },
        { agentRunId: "lead-1", memberAddress: "/lead", status: "offline" },
        { agentRunId: "checker-1", memberAddress: "/checker", status: "offline" },
      ] }]);
    } finally {
      unbindLocalChildPorts(ports);
    }
  });
});

describe("agentRunCollaborationStatuses", () => {
  const withManager = async <T>(manager: unknown, run: () => Promise<T>): Promise<T> => {
    bindProcessStandaloneAgentRunRootManager(manager as never);
    try { return await run(); } finally { releaseProcessStandaloneAgentRunRootManager(manager as never); }
  };

  it("maps each run's answer and its closed-set digest; nothing of the collaboration view", async () => {
    bindDelegationTree(tree);
    const manager = managerWith(["host"], new Set(["writer-1", "closed-team"]));
    const answer = await withManager(manager, () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(["host", "stopped"]));
    expect(answer).toEqual([
      { runId: "host", isActive: true, closedTaskExecutionsDigest: EMPTY, statuses: [] },
      { runId: "stopped", isActive: false, closedTaskExecutionsDigest: closedTaskExecutionsDigest([{ teamRunId: "closed-team" }]), statuses: [] },
    ]);
  });

  it("refuses more than 100 runs with BAD_USER_INPUT", async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `run-${index}`);
    await expect(withManager(managerWith([], new Set()), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids)))
      .rejects.toEqual(expect.objectContaining({ extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }) }));
    expect(await withManager(managerWith([], new Set()), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids.slice(0, 100)))).toHaveLength(100);
  });
});
