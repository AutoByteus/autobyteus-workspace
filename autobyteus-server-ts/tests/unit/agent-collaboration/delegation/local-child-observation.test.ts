import { describe, expect, it, vi } from "vitest";
import { LocalChildObservation, type LocalChildPorts, type LocalChildRootEvent } from "../../../../src/agent-collaboration/execution/delegation/local-child-observation.js";
import type { DelegatedChild } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { projectAgentCollaborationEvent } from "../../../../src/services/agent-streaming/agent-collaboration-view-projector.js";

/**
 * autobyteus-461 DS-8: a delegating run's view of its local children while viewed: their agents' statuses and live
 * output, with each agent's address from the tree (SR-041). New and gone rows reach the view from `ChildRowsFeed`.
 */
const RUN = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const child = (run: DelegatedChild["run"], address: string): DelegatedChild => ({
  run, taskId: "T1", delegatorAgentRunId: "manager", entryAgentRunId: "agentRunId" in run ? run.agentRunId : "lead",
  started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: address,
});
const agents: Record<string, { agentRunId: string; address: string | null }[]> = {
  writer: [{ agentRunId: "writer", address: "/writer" }],
  eng: [{ agentRunId: "lead", address: "/lead" }, { agentRunId: "new-member", address: null }],
};

const harness = () => {
  let children: DelegatedChild[] = [child({ agentRunId: "writer" }, "/writer")];
  const listeners = new Set<() => void>();
  const presenters = new Map<string, (agentRunId: string, message: never) => void>();
  const closes = new Map<string, ReturnType<typeof vi.fn>>();
  const access = {
    pairedAgentStatuses: vi.fn((runId: string) => runId === "writer" ? [{ agentRunId: "writer", status: "running" }] : []),
    observePairedAgents: vi.fn(async (runId: string, present: (agentRunId: string, message: never) => void) => {
      presenters.set(runId, present);
      const close = vi.fn();
      closes.set(runId, close);
      return { close };
    }),
  };
  const ports: LocalChildPorts = {
    tree: ({ openChildrenOf: () => children, subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      agentsOf: async (run) => agents[run.rootRunId] ?? [] }),
    agents: () => access as never,
  };
  const events: LocalChildRootEvent[] = [];
  const observation = new LocalChildObservation({ run: RUN, publish: (event) => events.push(event), ports });
  const settle = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };
  return { observation, events, access, presenters, closes, listeners, settle,
    setChildren: (next: DelegatedChild[]) => { children = next; listeners.forEach((listener) => listener()); } };
};

describe("LocalChildObservation", () => {
  it("follows each open child while viewed: its current status, then its live output", async () => {
    const h = harness();
    h.observation.viewerAttached();
    await h.settle();
    expect(h.events).toEqual([{ kind: "local_child_presentation", agentRunId: "writer", memberAddress: "/writer",
      message: expect.objectContaining({ type: "AGENT_STATUS", payload: expect.objectContaining({ status: "running" }) }) }]);
    h.presenters.get("writer")!("writer", { type: "SEGMENT_CONTENT", payload: { delta: "hi" } } as never);
    expect(h.events.at(-1)).toMatchObject({ kind: "local_child_presentation", agentRunId: "writer", memberAddress: "/writer" });
    h.observation.viewerAttached();
    expect(h.access.observePairedAgents).toHaveBeenCalledTimes(1);
  });

  it("follows a new child and leaves one whose Task closed, publishing no rows; the last viewer stops following", async () => {
    const h = harness();
    h.observation.viewerAttached();
    await h.settle();
    h.setChildren([child({ agentRunId: "writer" }, "/writer"), child({ teamRunId: "eng" }, "/eng")]);
    await h.settle();
    h.presenters.get("eng")!("lead", { type: "AGENT_STATUS", payload: { status: "idle" } } as never);
    expect(h.events.at(-1)).toMatchObject({ kind: "local_child_presentation", agentRunId: "lead", memberAddress: "/lead" });
    h.setChildren([child({ teamRunId: "eng" }, "/eng")]);
    await h.settle();
    expect(h.events.every((event) => event.kind === "local_child_presentation")).toBe(true);
    // An agent without an address in the tree is not presented (it has no row in the view).
    const before = h.events.length;
    h.presenters.get("eng")!("new-member", { type: "AGENT_STATUS", payload: { status: "idle" } } as never);
    expect(h.events).toHaveLength(before);
    expect(h.closes.get("writer")).toHaveBeenCalledOnce();
    h.observation.viewerDetached();
    expect(h.closes.get("eng")).toHaveBeenCalledOnce();
    expect(h.listeners.size).toBe(0);
  });

  it("projects a child's output into the Agent view's agent_presentation (N-402)", () => {
    const event: LocalChildRootEvent = { kind: "local_child_presentation", agentRunId: "writer", memberAddress: "/writer",
      message: { type: "AGENT_STATUS", payload: { status: "idle", trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null } } as never };
    expect(projectAgentCollaborationEvent("manager", null, { changeSequence: 3, event } as never))
      .toMatchObject({ change_sequence: 3, event: { kind: "agent_presentation", agent_run_id: "writer", member_address: "/writer" } });
  });
});
