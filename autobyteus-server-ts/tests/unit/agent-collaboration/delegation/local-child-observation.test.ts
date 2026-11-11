import { describe, expect, it, vi } from "vitest";
import { LocalChildObservation, type LocalChildPorts, type LocalChildRootEvent } from "../../../../src/agent-collaboration/execution/delegation/local-child-observation.js";
import type { DelegatedChild } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { projectAgentCollaborationEvent } from "../../../../src/services/agent-streaming/agent-collaboration-view-projector.js";

/**
 * autobyteus-461 DS-8: a delegating run's view of its local children while viewed: their agents' statuses and live
 * output, a new row when it delegates, and the rows that leave when a child's Task closes.
 */
const RUN = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const child = (run: DelegatedChild["run"], address: string): DelegatedChild => ({
  run, taskId: "T1", delegatorAgentRunId: "manager", entryAgentRunId: "agentRunId" in run ? run.agentRunId : "lead",
  started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: address,
});
const launch = { runtimeKind: "autobyteus", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
const agentRow = (agentRunId: string, address: string) => ({ address, agentRunId, platformAgentRunId: null, delegatorAgentRunId: "manager",
  startedAt: "2026-11-01T00:00:00.000Z", source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: launch } }) as never;
const teamRow = () => ({ address: "/eng", teamRunId: "eng", members: [{ address: "/lead", agentRunId: "lead", platformAgentRunId: null }],
  taskExecutions: [], delegatorAgentRunId: "manager", startedAt: "2026-11-01T00:00:00.000Z", source: {} }) as never;

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
    tree: () => ({ openChildrenOf: () => children, subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; } }),
    rowOf: async (c) => "agentRunId" in c.run ? agentRow(c.run.agentRunId, c.recipientAddress) : teamRow(),
    agents: () => access as never,
  };
  const events: LocalChildRootEvent[] = [];
  const observation = new LocalChildObservation({ run: RUN, publish: (event) => events.push(event), ports: () => ports });
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

  it("announces a new child as a row and a child whose Task closed as closed; the last viewer stops following", async () => {
    const h = harness();
    h.observation.viewerAttached();
    await h.settle();
    h.setChildren([child({ agentRunId: "writer" }, "/writer"), child({ teamRunId: "eng" }, "/eng")]);
    await h.settle();
    expect(h.events).toContainEqual({ kind: "local_child_started", row: expect.objectContaining({ teamRunId: "eng" }) });
    h.presenters.get("eng")!("lead", { type: "AGENT_STATUS", payload: { status: "idle" } } as never);
    expect(h.events.at(-1)).toMatchObject({ kind: "local_child_presentation", agentRunId: "lead", memberAddress: "/lead" });
    h.setChildren([child({ teamRunId: "eng" }, "/eng")]);
    await h.settle();
    expect(h.events).toContainEqual({ kind: "local_children_closed", runs: [{ agentRunId: "writer" }] });
    expect(h.closes.get("writer")).toHaveBeenCalledOnce();
    h.observation.viewerDetached();
    expect(h.closes.get("eng")).toHaveBeenCalledOnce();
    expect(h.listeners.size).toBe(0);
  });

  it("projects a new row and closed rows into the Agent view's existing events", () => {
    const sequenced = (event: LocalChildRootEvent) => ({ changeSequence: 3, event }) as never;
    expect(projectAgentCollaborationEvent("manager", null, sequenced({ kind: "local_child_started", row: agentRow("writer", "/writer") })))
      .toMatchObject({ event: { kind: "task_execution_started", host_kind: "root", host_run_id: "manager", execution: { agentRunId: "writer" } } });
    expect(projectAgentCollaborationEvent("manager", null, sequenced({ kind: "local_children_closed", runs: [{ teamRunId: "eng" }] })))
      .toMatchObject({ event: { kind: "task_executions_closed", task_executions: [{ teamRunId: "eng" }] } });
  });
});
