import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskExecutionTreeMembership } from "../../../src/agent-collaboration/execution/task/task-execution-tree-membership.js";
import type { RootTaskExecutionAdapter } from "../../../src/agent-collaboration/execution/task/root-task-execution-adapter.js";
import type { TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import { taskExecutionReferenceKey } from "@autobyteus/collaboration-stream-contracts";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-469 D-4: the loaded tree follows the Task records. The release step drops only the copies the release
 * stopped that are still closed and in the tree; the reopen step adds a copy that is not in the tree and undoes the add
 * when the step fails. Asked of the Task side, never inferred from a failed lookup.
 */

const root = { rootSubjectKind: "agent" as const, rootRunId: "host" };
afterEach(() => vi.restoreAllMocks());

const fixture = async () => {
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("A"); resources.addTask("B");
  const tree = new Set<string>();
  const adapter = {
    root,
    containsTaskExecution: (reference: TaskExecutionReference) => tree.has(taskExecutionReferenceKey(reference)),
    dropTaskExecutions: vi.fn(async (references: readonly TaskExecutionReference[]) => { references.forEach((reference) => tree.delete(taskExecutionReferenceKey(reference))); }),
    addTaskExecution: vi.fn(async (reference: TaskExecutionReference) => { tree.add(taskExecutionReferenceKey(reference)); }),
  } as unknown as RootTaskExecutionAdapter<unknown> & { dropTaskExecutions: ReturnType<typeof vi.fn>; addTaskExecution: ReturnType<typeof vi.fn> };
  const link = async (taskId: string, execution: TaskExecutionReference, teamCoordinatorAgentRunId?: string) => {
    await resources.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "host", recipientAddress: "/worker", hostRoot: root, execution,
      ...(teamCoordinatorAgentRunId ? { teamCoordinatorAgentRunId } : {}) });
    await resources.markStarted(execution);
    tree.add(taskExecutionReferenceKey(execution));
  };
  return { resources, tree, adapter, membership: new TaskExecutionTreeMembership(adapter, () => resources), link };
};

describe("TaskExecutionTreeMembership (autobyteus-469 D-4)", () => {
  it("drops only stopped copies that are still closed and in the tree", async () => {
    const f = await fixture();
    const stopped = { agentRunId: "stopped" }, pending = { agentRunId: "pending" }, reopened = { agentRunId: "reopened" }, outside = { agentRunId: "outside" };
    for (const execution of [stopped, pending, reopened]) await f.link("A", execution);
    f.resources.close("A");
    f.tree.delete("agent:outside");
    // `reopened` was continued before the release step ran: it is open again.
    f.resources.entry(reopened)!.open = true;
    await f.membership.dropStopped([
      { execution: stopped, stopped: true },
      { execution: pending, stopped: false, error: { code: "TASK_RELEASE_PENDING", message: "pending" } },
      { execution: reopened, stopped: true },
      { execution: outside, stopped: true },
    ]);
    expect(f.adapter.dropTaskExecutions).toHaveBeenCalledExactlyOnceWith([stopped]);
    // A stop that is not confirmed leaves the copy in the loaded tree (hidden as closed) until a later release confirms it.
    expect([...f.tree].sort()).toEqual(["agent:pending", "agent:reopened"]);
  });

  it("a failed drop is reported and leaves the copies in the loaded tree; the release result is unchanged", async () => {
    const f = await fixture();
    await f.link("A", { agentRunId: "worker" });
    f.resources.close("A");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    f.adapter.dropTaskExecutions.mockRejectedValueOnce(new Error("disk full"));
    await expect(f.membership.dropStopped([{ execution: { agentRunId: "worker" }, stopped: true }])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("agent:worker stay in the loaded tree"), expect.any(Error));
    expect(f.tree.has("agent:worker")).toBe(true);
  });

  it("adds a closed copy that left the tree, and the undo drops it again; one still in the tree is not added", async () => {
    const f = await fixture();
    await f.link("A", { agentRunId: "worker" });
    f.resources.close("A");
    f.tree.delete("agent:worker");
    const undo = await f.membership.addAtHead({ agentRunId: "worker" });
    expect(f.adapter.addTaskExecution).toHaveBeenCalledExactlyOnceWith({ agentRunId: "worker" });
    expect(f.tree.has("agent:worker")).toBe(true);
    await undo();
    expect(f.tree.has("agent:worker")).toBe(false);

    await f.link("B", { agentRunId: "in-tree" });
    const noop = await f.membership.addAtHead({ agentRunId: "in-tree" });
    await noop();
    expect(f.adapter.addTaskExecution).toHaveBeenCalledTimes(1);
    expect(f.tree.has("agent:in-tree")).toBe(true);
  });

  it("finds a closed copy of this root by its ingress (a Team by its coordinator only) or by its reference", async () => {
    const f = await fixture();
    await f.link("A", { teamRunId: "crew" }, "crew-lead");
    f.resources.close("A");
    expect(f.membership.closedExecutionFor({ ingressAgentRunId: "crew-lead" })).toEqual({ execution: { teamRunId: "crew" }, ingressAgentRunId: "crew-lead" });
    expect(f.membership.closedExecutionFor({ teamRunId: "crew" })).toEqual({ execution: { teamRunId: "crew" }, ingressAgentRunId: "crew-lead" });
    expect(f.membership.closedExecutionFor({ ingressAgentRunId: "crew-member" })).toBeNull();
    expect(new TaskExecutionTreeMembership(f.adapter, () => undefined).closedExecutionFor({ ingressAgentRunId: "crew-lead" })).toBeNull();
  });
});
