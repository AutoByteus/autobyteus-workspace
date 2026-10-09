import { describe, expect, it, vi } from "vitest";
import { RootTaskExecutionLifecycle } from "../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { RootTaskExecutionAdapter } from "../../../src/agent-collaboration/execution/task/root-task-execution-adapter.js";
import { TaskDelegationError } from "../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";

const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
const root = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
const worker: TaskExecutionReference = { agentRunId: "worker" };
const team: TaskExecutionReference = { teamRunId: "review-team" };
const helper: TaskExecutionReference = { agentRunId: "helper" };
/** Agent run → its innermost task execution, and that execution's ingress (an Agent itself, a Team's coordinator). */
const chains: Record<string, TaskExecutionReference[]> = { worker: [worker], lead: [team], member: [team], helper: [helper] };
const ingress: Record<string, string> = { "agent:worker": "worker", "team:review-team": "lead", "agent:helper": "helper" };

/**
 * One root over a neutral adapter double whose backend keeps a released copy's authority (fenced)
 * after DONE, as the real registries do: restoring it fails until that authority is discarded.
 */
function fixture() {
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("task-A");
  const authority = new Map<string, "live" | "fenced">();
  const log: string[] = [];
  const control = { restorable: true, releasePending: false, releaseGate: null as Promise<void> | null, restoreFailure: null as Error | null };
  const key = taskExecutionReferenceKey;
  const adapter: RootTaskExecutionAdapter<string> = {
    root, isOpen: () => true, authorize: () => undefined, assertCurrentSchemaReady: () => undefined,
    planActivation: vi.fn(), beginActivation: vi.fn(), registrationFor: () => null, taskExecutionAt: () => null,
    ownershipChainFor: agentRunId => chains[agentRunId] ?? [],
    taskExecutionChainFor: agentRunId => chains[agentRunId] ?? [],
    listTaskExecutions: () => [worker, team, helper],
    taskExecutionStatus: reference => authority.get(key(reference)) === "live" ? "idle" : "offline",
    cancelOwnedExecution: vi.fn(),
    releaseOwnedExecution: vi.fn(async (reference: TaskExecutionReference): Promise<AgentOperationResult> => {
      log.push(`release:${key(reference)}:${authority.get(key(reference)) ?? "none"}`);
      if (control.releaseGate) await control.releaseGate;
      if (control.releasePending) return { accepted: false, code: "RUNTIME_RELEASE_PENDING", message: "still stopping" };
      if (!authority.has(key(reference))) return { accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" };
      authority.set(key(reference), "fenced");
      return { accepted: true };
    }),
    discardReleasedExecution: vi.fn((reference: TaskExecutionReference) => {
      log.push(`discard:${key(reference)}`);
      if (authority.get(key(reference)) === "fenced") authority.delete(key(reference));
    }),
    taskExecutionWithIngress: agentRunId => {
      const innermost = chains[agentRunId]?.[0];
      return innermost && ingress[key(innermost)] === agentRunId ? innermost : null;
    },
    containsTaskExecution: reference => key(reference) in ingress,
    publishTaskExecutionsClosed: vi.fn((references: readonly TaskExecutionReference[]) => { log.push(`closed:${references.map(key)}`); }),
    publishTaskExecutionsReopened: vi.fn((references: readonly TaskExecutionReference[]) => { log.push(`reopened:${references.map(key)}`); }),
    isLive: reference => authority.get(key(reference)) === "live",
    assertRestorableChain: agentRunId => {
      log.push(`restorable:${agentRunId}`);
      if (!control.restorable) throw new TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", "The saved conversation is unavailable.");
    },
    restoreChain: async agentRunId => {
      for (const reference of chains[agentRunId] ?? []) {
        if (authority.get(key(reference)) === "live") continue;
        if (control.restoreFailure) throw control.restoreFailure;
        // A retained fenced authority cannot be re-activated (it is closed for input).
        if (authority.get(key(reference)) === "fenced") throw new Error(`AgentRun '${agentRunId}' is closed for input.`);
        log.push(`restore:${key(reference)}`);
        authority.set(key(reference), "live");
      }
    },
    tryShutDownIfQuiet: async () => false,
  };
  const lifecycle = new RootTaskExecutionLifecycle(adapter, { taskExecutionResources: resources, gracePeriodMs: () => 600_000 });
  const assign = async (agentRun: TaskExecutionReference, coordinatorAgentRunId?: string) => {
    await resources.linkNewTaskExecution({ role: "assigned", taskId: "task-A", assignedBy: "manager", hostRoot: root, execution: agentRun,
      ...(coordinatorAgentRunId ? { teamCoordinatorAgentRunId: coordinatorAgentRunId } : {}) });
    await resources.markStarted(agentRun);
    authority.set(key(agentRun), "live");
  };
  /** DONE: the Task side closes every entry, then this root stops (fences) exactly those runs. */
  const done = async () => { await lifecycle.releaseTaskExecutions(resources.close("task-A")); log.length = 0; };
  /** `send_message_to(run ID)` as the root facades bind it: the target is woken and the message delivered. */
  const message = (sender: string, target: string) => lifecycle.deliverToExactTarget(sender, target,
    () => lifecycle.withLiveLease(target, async () => { log.push(`deliver:${target}`); return { accepted: true, message: `Delivered message to ${target}.` }; }));
  return { resources, authority, log, control, adapter, lifecycle, assign, done, message };
}

describe("reactivation of a closed assignment by its assigner (DS-L1)", () => {
  it("after the agent reopens the Task, the assigner's message discards the released copy, reopens only its entry, restores and delivers (AC-001, REQ-001..004/007)", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.resources.linkNewTaskExecution({ role: "delegated", creator: worker, hostRoot: root, execution: helper });
    await f.resources.markStarted(helper);
    await f.done();
    f.resources.setTaskOpen("task-A");

    expect(await f.message("manager", "worker")).toEqual({ accepted: true, message: "Delivered message to worker. worker was reactivated." });
    // The previous stop is settled first, the commit precedes the reopened event, and the restore follows it.
    // (The second `restorable` check is the ordinary wake's own, under the sender's lease.)
    expect(f.log).toEqual(["release:agent:worker:fenced", "discard:agent:worker", "restorable:worker", "reopened:agent:worker",
      "restorable:worker", "restore:agent:worker", "deliver:worker"]);
    expect(f.resources.isOpen(worker)).toBe(true);
    expect(f.resources.isOpen(helper)).toBe(false);
    // The Task stays exactly as the agent set it.
    expect(f.resources.tasks.get("task-A")?.done).toBe(false);
    // Already open: a later message is the ordinary path, with no reactivation step.
    f.log.length = 0;
    expect(await f.message("manager", "worker")).toEqual({ accepted: true, message: "Delivered message to worker." });
    expect(f.log).toEqual(["restorable:worker", "deliver:worker"]);
  });

  it("reactivates a Team copy through its coordinator run ID, as one assignment (AC-002)", async () => {
    const f = fixture();
    await f.assign(team, "lead");
    await f.done();
    f.resources.setTaskOpen("task-A");
    expect(await f.message("manager", "lead")).toMatchObject({ accepted: true, message: "Delivered message to lead. lead was reactivated." });
    expect(f.log).toEqual(["release:team:review-team:fenced", "discard:team:review-team", "restorable:lead", "reopened:team:review-team",
      "restorable:lead", "restore:team:review-team", "deliver:lead"]);
    expect(f.resources.reopenRequests).toEqual([{ execution: team, requestedBy: "manager" }]);
  });

  it.each([
    ["the Task is still DONE (AC-015)", "manager", "worker", false, { code: "TASK_AGENT_RESOURCE_CLOSED", message: expect.stringContaining("Move it to TODO or IN_PROGRESS with create_or_update_task first") }],
    ["another sender (AC-006)", "intruder", "worker", true, { code: "TASK_AGENT_RESOURCE_CLOSED", message: expect.stringContaining("Only the run that assigned it") }],
    ["a Team member that is not the ingress (AC-007)", "manager", "member", true, { code: "TASK_AGENT_RESOURCE_CLOSED", message: expect.stringContaining("message the run ID delegate_task returned (for a Team, its coordinator)") }],
    ["a helper of the assignment (AC-005)", "manager", "helper", true, { code: "TASK_AGENT_RESOURCE_CLOSED", message: expect.stringContaining("Only the run that assigned it") }],
  ])("refuses when %s; nothing is stopped, discarded, reopened or published", async (_case, sender, target, reopenTask, refusal) => {
    const f = fixture();
    await f.assign(worker);
    await f.assign(team, "lead");
    await f.resources.linkNewTaskExecution({ role: "delegated", creator: worker, hostRoot: root, execution: helper });
    await f.resources.markStarted(helper);
    await f.done();
    if (reopenTask) f.resources.setTaskOpen("task-A");
    expect(await f.message(sender, target)).toEqual({ accepted: false, ...refusal });
    expect(f.log).toEqual([]);
    expect(f.resources.reopenRequests).toEqual([]);
    expect([worker, team, helper].map(reference => f.resources.isOpen(reference))).toEqual([false, false, false]);
  });

  it("refuses a deleted Task and a never-started assignment with their reasons before touching runtime state (AC-008/009)", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.resources.linkNewTaskExecution({ role: "assigned", taskId: "task-A", assignedBy: "manager", hostRoot: root, execution: team, teamCoordinatorAgentRunId: "lead" });
    await f.resources.markFailed(team);
    await f.done();
    f.resources.setTaskOpen("task-A");
    expect(await f.message("manager", "lead")).toMatchObject({ accepted: false, code: "TASK_REACTIVATION_UNAVAILABLE" });
    f.resources.tasks.delete("task-A");
    expect(await f.message("manager", "worker")).toMatchObject({ accepted: false, code: "TASK_NOT_FOUND" });
    expect(f.log).toEqual([]);
  });

  it("refuses when the saved conversation is unavailable; the entry stays closed and nothing is published (REQ-006)", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.done();
    f.resources.setTaskOpen("task-A");
    f.control.restorable = false;
    expect(await f.message("manager", "worker")).toMatchObject({ accepted: false, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" });
    expect(f.resources.isOpen(worker)).toBe(false);
    expect(f.adapter.publishTaskExecutionsReopened).not.toHaveBeenCalled();
    expect(f.resources.reopenRequests).toEqual([]);
  });

  it("refuses while the previous stop is not confirmed: nothing is discarded or reopened, and a retry succeeds", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.done();
    f.resources.setTaskOpen("task-A");
    f.control.releasePending = true;
    expect(await f.message("manager", "worker")).toMatchObject({ accepted: false, code: "TASK_REACTIVATION_STOP_PENDING",
      message: expect.stringContaining("The previous stop of this Task work has not finished") });
    expect(f.log).toEqual(["release:agent:worker:fenced"]);
    expect(f.resources.isOpen(worker)).toBe(false);
    f.control.releasePending = false;
    expect(await f.message("manager", "worker")).toMatchObject({ accepted: true });
  });

  it("two concurrent reactivating messages restore one copy: the second never releases the restored copy (AR-002)", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.done();
    f.resources.setTaskOpen("task-A");
    const results = await Promise.all([f.message("manager", "worker"), f.message("manager", "worker")]);
    expect(results.map(result => result.accepted)).toEqual([true, true]);
    expect(results.filter(result => result.message?.endsWith("worker was reactivated.")).length).toBe(1);
    // A second reopen step that runs before the first commit finds no authority left; one that runs after it sees the entry open.
    expect(f.log.filter(entry => entry.startsWith("release:") && !entry.endsWith(":none"))).toEqual(["release:agent:worker:fenced"]);
    expect(f.log.filter(entry => entry.startsWith("restore:"))).toEqual(["restore:agent:worker"]);
    expect(f.adapter.publishTaskExecutionsReopened).toHaveBeenCalledTimes(1);
    expect(f.authority.get("agent:worker")).toBe("live");
  });

  it("a reactivation whose reopen step runs after another one restored the copy skips the discard: the live copy is never released (AR-002)", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.done();
    f.resources.setTaskOpen("task-A");
    const gate = latch();
    const eligibility = f.resources.assertReopenable.bind(f.resources);
    let calls = 0;
    vi.spyOn(f.resources, "assertReopenable").mockImplementation(async input => {
      await eligibility(input);
      if (++calls === 2) await gate.promise;
    });
    const first = f.message("manager", "worker");
    // The second message passes its eligibility check while the entry is still closed, then waits.
    const second = f.message("manager", "worker");
    expect(await first).toMatchObject({ accepted: true, message: "Delivered message to worker. worker was reactivated." });
    expect(f.authority.get("agent:worker")).toBe("live");
    gate.resolve();
    expect(await second).toEqual({ accepted: true, message: "Delivered message to worker." });
    expect(f.log.filter(entry => entry.startsWith("release:"))).toEqual(["release:agent:worker:fenced"]);
    expect(f.log.filter(entry => entry.startsWith("discard:"))).toEqual(["discard:agent:worker"]);
    expect(f.authority.get("agent:worker")).toBe("live");
  });

  it("a DONE that commits while the stop is being settled wins: the reactivation is refused and nothing is published (QR-001)", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.done();
    f.resources.setTaskOpen("task-A");
    const gate = latch();
    f.control.releaseGate = gate.promise;
    const pending = f.message("manager", "worker");
    await vi.waitFor(() => expect(f.log).toContain("release:agent:worker:fenced"));
    f.resources.close("task-A");
    gate.resolve();
    expect(await pending).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(f.resources.isOpen(worker)).toBe(false);
    expect(f.adapter.publishTaskExecutionsReopened).not.toHaveBeenCalled();
  });

  it("a restore failure after the commit says the copy was reactivated but not reached; the entry stays open", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.done();
    f.resources.setTaskOpen("task-A");
    f.control.restoreFailure = new Error("runtime unavailable");
    expect(await f.message("manager", "worker")).toEqual({ accepted: false, code: "TASK_EXECUTION_RESTORE_FAILED",
      message: expect.stringContaining("worker was reactivated (its Task work is open again) but did not receive this message; message it again.") });
    expect(f.resources.isOpen(worker)).toBe(true);
    expect(f.adapter.publishTaskExecutionsReopened).toHaveBeenCalledWith([worker]);
  });

  it("a later DONE stops the reactivated copy again and the cycle repeats (AC-010, REQ-009)", async () => {
    const f = fixture();
    await f.assign(worker);
    for (let round = 0; round < 2; round += 1) {
      await f.done();
      expect(f.authority.get("agent:worker")).toBe("fenced");
      f.resources.setTaskOpen("task-A");
      expect(await f.message("manager", "worker")).toMatchObject({ accepted: true, message: "Delivered message to worker. worker was reactivated." });
      expect(f.authority.get("agent:worker")).toBe("live");
    }
  });

  it("a message to an open copy or to an unowned agent takes the unchanged path (AC-014)", async () => {
    const f = fixture();
    await f.assign(worker);
    expect(await f.message("manager", "worker")).toEqual({ accepted: true, message: "Delivered message to worker." });
    expect(await f.message("manager", "outsider")).toEqual({ accepted: true, message: "Delivered message to outsider." });
    expect(f.resources.reopenRequests).toEqual([]);
    expect(f.log).toEqual(["restorable:worker", "deliver:worker", "deliver:outsider"]);
  });
});
