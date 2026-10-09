import { describe, expect, it, vi } from "vitest";

import { fixture, helper, latch, root, team, worker } from "../../fixtures/root-task-copy-resume-fixtures.js";

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
    ["a Team member that is not the ingress (AC-007)", "manager", "member", true, { code: "TASK_AGENT_RESOURCE_CLOSED", message: expect.stringContaining("message the copy's agent run ID (for a Team copy, its coordinator's)") }],
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
