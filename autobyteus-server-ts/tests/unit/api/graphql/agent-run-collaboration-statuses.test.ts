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
  it("answers whether each run is active, in the asked order, with the digest of its closed children", () => {
    bindDelegationTree(tree);
    const closed = new Set<string>();
    const manager = managerWith(["host-a"], closed);
    expect(manager.getAgentStatuses(["host-b", "host-a", "unknown"])).toEqual([
      { runId: "host-b", isActive: false, statuses: [], closedTaskExecutionsDigest: EMPTY },
      { runId: "host-a", isActive: true, statuses: [], closedTaskExecutionsDigest: EMPTY },
      { runId: "unknown", isActive: false, statuses: [], closedTaskExecutionsDigest: EMPTY },
    ]);
  });

  it("changes the digest when a child's Task closes and returns when it reopens, running or stopped (autobyteus-435 AC-011-1)", () => {
    bindDelegationTree(tree);
    const closed = new Set<string>();
    for (const manager of [managerWith(["host"], closed), managerWith([], closed)]) {
      const digest = () => manager.getAgentStatuses(["host"])[0]!.closedTaskExecutionsDigest;
      expect(digest()).toBe(EMPTY);
      closed.add("writer-1"); closed.add("docs-review-team");
      expect(digest()).toBe(closedTaskExecutionsDigest([{ teamRunId: "docs-review-team" }, { agentRunId: "writer-1" }]));
      closed.clear();
      expect(digest()).toBe(EMPTY);
    }
  });
});

describe("agentRunCollaborationStatuses", () => {
  const withManager = <T>(manager: unknown, run: () => T): T => {
    bindProcessStandaloneAgentRunRootManager(manager as never);
    try { return run(); } finally { releaseProcessStandaloneAgentRunRootManager(manager as never); }
  };

  it("maps each run's answer and its closed-set digest; nothing of the collaboration view", () => {
    bindDelegationTree(tree);
    const manager = managerWith(["host"], new Set(["writer-1", "closed-team"]));
    const answer = withManager(manager, () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(["host", "stopped"]));
    expect(answer).toEqual([
      { runId: "host", isActive: true, closedTaskExecutionsDigest: closedTaskExecutionsDigest([{ agentRunId: "writer-1" }]), statuses: [] },
      { runId: "stopped", isActive: false, closedTaskExecutionsDigest: closedTaskExecutionsDigest([{ teamRunId: "closed-team" }]), statuses: [] },
    ]);
  });

  it("refuses more than 100 runs with BAD_USER_INPUT", () => {
    const ids = Array.from({ length: 101 }, (_, index) => `run-${index}`);
    expect(() => withManager(managerWith([], new Set()), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids)))
      .toThrow(expect.objectContaining({ extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }) }));
    expect(withManager(managerWith([], new Set()), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids.slice(0, 100)))).toHaveLength(100);
  });
});
