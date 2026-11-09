import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closedTaskExecutionsDigest } from "@autobyteus/collaboration-stream-contracts";
import { AgentRunCollaborationResolver } from "../../../../src/api/graphql/types/agent-run-collaboration.js";
import { createCollaborationAgentStatusSnapshot } from "../../../../src/agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import {
  StandaloneAgentRunRootManager,
  bindProcessStandaloneAgentRunRootManager,
  releaseProcessStandaloneAgentRunRootManager,
} from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

// autobyteus-426 REQ-009 (D-09): the history poll's read of listed standalone runs: states, and since autobyteus-446 the
// active root's closed-set digest, never the collaboration view.

type Reference = { agentRunId: string } | { teamRunId: string };

const snapshot = (agentRunId: string, memberAddress: string, status: string, recoverableBlock: unknown = null) =>
  createCollaborationAgentStatusSnapshot({
    execution: createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity("host"), memberAddress, agentRunId }),
    status, recoverableBlock: recoverableBlock as never,
  });

const rootWith = (lifecycleActive: boolean, statuses: unknown[], closed: Reference[] = []) => ({
  isActive: () => lifecycleActive,
  getAgentStatusSnapshots: vi.fn(() => statuses),
  closedTaskExecutions: vi.fn(() => closed),
  getExecutionTreeSnapshot: vi.fn(),
});
const EMPTY = closedTaskExecutionsDigest([]);

/** A manager holding only its registered roots; getAgentStatuses reads nothing else. */
const managerWith = (roots: Record<string, ReturnType<typeof rootWith>>): StandaloneAgentRunRootManager => {
  const manager = Object.create(StandaloneAgentRunRootManager.prototype) as StandaloneAgentRunRootManager;
  Object.defineProperty(manager, "active", { value: new Map(Object.entries(roots)) });
  return manager;
};

afterEach(() => vi.restoreAllMocks());

describe("StandaloneAgentRunRootManager.getAgentStatuses", () => {
  it("answers an active root's live child snapshots, and inactive with none for every other run, in the asked order", () => {
    const writer = snapshot("writer-1", "/release_notes_writer", "running");
    const active = rootWith(true, [writer]);
    const activating = rootWith(false, [snapshot("x", "/x", "idle")]);
    const manager = managerWith({ "host-a": active, "host-b": activating });

    expect(manager.getAgentStatuses(["host-b", "host-a", "unknown"])).toEqual([
      { runId: "host-b", isActive: false, statuses: [], closedTaskExecutionsDigest: null },
      { runId: "host-a", isActive: true, statuses: [writer], closedTaskExecutionsDigest: EMPTY },
      { runId: "unknown", isActive: false, statuses: [], closedTaskExecutionsDigest: null },
    ]);
    expect(activating.getAgentStatusSnapshots).not.toHaveBeenCalled();
    expect(activating.closedTaskExecutions).not.toHaveBeenCalled();
    expect(active.getExecutionTreeSnapshot).not.toHaveBeenCalled();
  });

  it("answers the digest of the active root's closed set: it changes when a Task closes and returns when it reopens", () => {
    const closed: Reference[] = [];
    const manager = managerWith({ host: rootWith(true, [], closed) });
    const digest = () => manager.getAgentStatuses(["host"])[0]!.closedTaskExecutionsDigest;

    expect(digest()).toBe(EMPTY);
    closed.push({ agentRunId: "writer-1" }, { teamRunId: "docs-review-team" });
    expect(digest()).toBe(closedTaskExecutionsDigest([{ teamRunId: "docs-review-team" }, { agentRunId: "writer-1" }]));
    expect(digest()).not.toBe(EMPTY);
    closed.splice(0, closed.length);
    expect(digest()).toBe(EMPTY);
  });
});

describe("agentRunCollaborationStatuses", () => {
  const withManager = <T>(manager: unknown, run: () => T): T => {
    bindProcessStandaloneAgentRunRootManager(manager as never);
    try { return run(); } finally { releaseProcessStandaloneAgentRunRootManager(manager as never); }
  };

  it("maps each child's identity, status and recoverable block, and the closed-set digest; nothing of the collaboration view", () => {
    const block = { kind: "compaction", message: "blocked" };
    const manager = managerWith({ host: rootWith(true, [
      snapshot("writer-1", "/release_notes_writer", "idle"),
      snapshot("lead-1", "/docs_review_team/lead", "error", block),
    ], [{ agentRunId: "old-writer" }]) });
    const answer = withManager(manager, () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(["host", "stopped"]));
    expect(answer).toEqual([
      { runId: "host", isActive: true, closedTaskExecutionsDigest: closedTaskExecutionsDigest([{ agentRunId: "old-writer" }]), statuses: [
        { agentRunId: "writer-1", memberAddress: "/release_notes_writer", status: "idle", recoverableBlock: null },
        { agentRunId: "lead-1", memberAddress: "/docs_review_team/lead", status: "error", recoverableBlock: block },
      ] },
      { runId: "stopped", isActive: false, closedTaskExecutionsDigest: null, statuses: [] },
    ]);
  });

  it("refuses more than 100 runs with BAD_USER_INPUT", () => {
    const ids = Array.from({ length: 101 }, (_, index) => `run-${index}`);
    expect(() => withManager(managerWith({}), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids)))
      .toThrow(expect.objectContaining({ extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }) }));
    expect(withManager(managerWith({}), () => new AgentRunCollaborationResolver().agentRunCollaborationStatuses(ids.slice(0, 100)))).toHaveLength(100);
  });
});
