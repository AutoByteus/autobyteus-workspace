import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { fixture, helper, latch, root, team, worker } from "../../fixtures/root-task-copy-resume-fixtures.js";

const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), "existing-copy-assignment-"));
const notes = path.join(notesDir, "review-notes.md");
fs.writeFileSync(notes, "Review notes");
afterAll(() => fs.rmSync(notesDir, { recursive: true, force: true }));

/** A fixture whose copies did Task A (started), A then DONE and stopped (fenced), and Task B saved and open. */
const afterTaskADone = async (copies: Array<"worker" | "team"> = ["worker", "team"]) => {
  const f = fixture();
  if (copies.includes("worker")) await f.assign(worker);
  if (copies.includes("team")) await f.assign(team, "lead");
  f.resources.addTask("task-B", "Follow-up cleanup proposed by the reviewer");
  f.resources.tasks.get("task-B")!.referenceFiles.push(notes);
  await f.done();
  return f;
};
const unchanged = (f: Fixture) => {
  expect(f.resources.assignments).toEqual([]);
  expect(f.adapter.publishTaskExecutionsReopened).not.toHaveBeenCalled();
  expect(f.delivered).toEqual([]);
};

type Fixture = ReturnType<typeof fixture>;
const refusalCases: Array<[string, (f: Fixture) => Promise<void>, string, string]> = [
  ["the copy's current Task is still open (AC-006)", async (f: Fixture) => { f.resources.setTaskOpen("task-A"); f.resources.entry(worker)!.open = true; },
      "This copy still works on Task task-A. Mark it DONE or CANCELLED first, or delegate Task task-B to a new copy with recipient_address.", "manager"],
  ["the sender did not make its most recent assignment (AC-007, QR-002)", async () => undefined, "Only the run that made this copy's most recent assignment can give it a new Task", "intruder"],
  ["Task B is DONE (AC-009)", async (f: Fixture) => { f.resources.tasks.get("task-B")!.done = true; }, "Task is DONE", "manager"],
  ["Task B is unknown (AC-009)", async (f: Fixture) => { f.resources.tasks.delete("task-B"); }, "Task 'task-B' was not found.", "manager"],
  ["the copy's latest assignment is already Task B (AC-009)", async (f: Fixture) => { f.resources.entry(worker)!.taskId = "task-B"; },
      "This copy's most recent assignment is already Task task-B.", "manager"],
  ["the copy never started (AC-009)", async (f: Fixture) => { delete f.resources.entry(worker)!.everStarted; }, "This copy never started", "manager"],
  ["any Task's data is unreadable (REQ-005)", async (f: Fixture) => { f.resources.damaged.add("task-Z"); }, "could not be read", "manager"],
];

describe("assigning a new Task to an existing copy (DS-002)", () => {
  it("an Agent copy: settles its stop, commits B, publishes it reopened, restores it and delivers B's work as the delegator's message (AC-003, REQ-002/003)", async () => {
    const f = await afterTaskADone(["worker"]);
    expect(await f.assignTo(worker, "task-B")).toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "worker" } });
    // Stop settled and authority dropped before the commit; published reopened before the wake; the ordinary wake restores it.
    expect(f.log).toEqual(["release:agent:worker:fenced", "discard:agent:worker", "restorable:worker", "reopened:agent:worker",
      "restorable:worker", "restore:agent:worker", "deliver:worker"]);
    expect(f.resources.assignments).toEqual([{ hostRoot: root, execution: worker, taskId: "task-B", assignedBy: "manager" }]);
    expect(f.resources.entry(worker)).toMatchObject({ taskId: "task-B", open: true, start: "started" });
    // Task A is not changed.
    expect(f.resources.tasks.get("task-A")?.done).toBe(true);
    const [work] = f.delivered;
    expect(work!.target).toBe("worker");
    expect(work!.content).toContain("New Task assigned to you: task-B. Your previous Task is closed");
    expect(work!.content).toContain("Task delegator AgentRun ID: manager");
    expect(work!.content).toContain("Follow-up cleanup proposed by the reviewer");
    expect(work!.referenceFiles).toEqual([notes]);
  });

  it("a Team copy by its team run ID: its coordinator receives the work; the result names the team run and its coordinator (AC-001, AC-002)", async () => {
    const f = await afterTaskADone(["team"]);
    expect(await f.assignTo(team, "task-B")).toEqual({ delegated: true,
      copy: { kind: "team", teamRunId: "review-team", teamCoordinatorAgentRunId: "lead" } });
    expect(f.resources.assignments).toEqual([{ hostRoot: root, execution: team, teamCoordinatorAgentRunId: "lead", taskId: "task-B", assignedBy: "manager" }]);
    expect(f.delivered.map(entry => entry.target)).toEqual(["lead"]);
    expect(f.authority.get("team:review-team")).toBe("live");
  });

  it.each([
    ["a Team coordinator passed as target_agent_run_id", { agentRunId: "lead" }, 'lead is the coordinator of Team copy review-team; use target_team_run_id "review-team".'],
    ["a team run ID passed as target_agent_run_id", { agentRunId: "review-team" }, 'review-team is a Team copy\'s team run ID; use target_team_run_id "review-team".'],
    ["an Agent copy passed as target_team_run_id", { teamRunId: "worker" }, 'worker is an Agent copy\'s agent run ID; use target_agent_run_id "worker".'],
    ["a Team member", { agentRunId: "member" }, 'member is a member of Team copy review-team, not a copy itself; to assign that Team copy, use target_team_run_id "review-team".'],
    ["an unknown ID or a copy of another root", { agentRunId: "elsewhere" }, "elsewhere is not a delegated copy in this run."],
  ])("refuses %s with its specific reason; nothing changes (AC-008)", async (_case, copy, message) => {
    const f = await afterTaskADone();
    expect(await f.assignTo(copy, "task-B")).toEqual({ delegated: false, message: expect.stringContaining(message) });
    expect(f.log).toEqual([]);
    unchanged(f);
  });

  it.each(refusalCases)("refuses when %s before any runtime step; nothing changes", async (_case, arrange, message, sender) => {
    const f = await afterTaskADone(["worker"]);
    await arrange(f);
    expect(await f.assignTo(worker, "task-B", sender)).toEqual({ delegated: false, message: expect.stringContaining(message) });
    expect(f.log).toEqual([]);
    unchanged(f);
  });

  it("refuses a sub-work or helper copy (AC-008)", async () => {
    const f = fixture();
    await f.assign(worker);
    await f.resources.linkNewTaskExecution({ role: "delegated", creator: worker, hostRoot: root, execution: helper });
    await f.resources.markStarted(helper);
    f.resources.addTask("task-B");
    await f.done();
    expect(await f.assignTo(helper, "task-B")).toEqual({ delegated: false, message: expect.stringContaining("sub-work or a helper of a Task worker") });
    unchanged(f);
  });

  it("refuses a Task-owned sender: workers delegate sub-work without task_id (preserved)", async () => {
    const f = await afterTaskADone(["worker", "team"]);
    f.resources.setTaskOpen("task-A");
    f.resources.entry(team)!.open = true;
    expect(await f.assignTo(worker, "task-B", "lead")).toEqual({ delegated: false, message: "Task workers delegate sub-work without task_id." });
    unchanged(f);
  });

  it("refuses when the saved conversation is unavailable: the Task side is unchanged and nothing is published (REQ-005)", async () => {
    const f = await afterTaskADone(["worker"]);
    f.control.restorable = false;
    expect(await f.assignTo(worker, "task-B")).toEqual({ delegated: false, message: "The saved conversation is unavailable." });
    expect(f.resources.entry(worker)).toMatchObject({ taskId: "task-A", open: false });
    unchanged(f);
  });

  it("refuses while the previous stop is unconfirmed; a retry succeeds", async () => {
    const f = await afterTaskADone(["worker"]);
    f.control.releasePending = true;
    expect(await f.assignTo(worker, "task-B")).toEqual({ delegated: false, message: expect.stringContaining("The previous stop of this Task work has not finished") });
    unchanged(f);
    f.control.releasePending = false;
    expect(await f.assignTo(worker, "task-B")).toMatchObject({ delegated: true });
  });

  it("a delivery not accepted after the commit marks B's entry failed and says the work was not delivered", async () => {
    const f = await afterTaskADone(["worker"]);
    f.control.deliveryRefusal = { accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "input closed" };
    expect(await f.assignTo(worker, "task-B")).toEqual({ delegated: false, message: "Task task-B was assigned to the copy but its work was not delivered "
      + "(input closed). Message the copy's ingress worker, or mark Task task-B CANCELLED or delegate it to a new copy." });
    expect(f.resources.entry(worker)).toMatchObject({ taskId: "task-B", open: true, start: "failed" });
  });

  it("A → B → A: after B is DONE the copy can be given Task A again by the same assigner (AC-018)", async () => {
    const f = await afterTaskADone(["worker"]);
    expect(await f.assignTo(worker, "task-B")).toMatchObject({ delegated: true });
    await f.done("task-B");
    f.resources.setTaskOpen("task-A");
    expect(await f.assignTo(worker, "task-A")).toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "worker" } });
    expect(f.resources.entry(worker)).toMatchObject({ taskId: "task-A", open: true });
    expect(f.resources.tasks.get("task-B")?.done).toBe(true);
    expect(f.delivered.map(entry => entry.content.split("\n")[0])).toEqual([
      "New Task assigned to you: task-B. Your previous Task is closed; this is the work to do now.",
      "New Task assigned to you: task-A. Your previous Task is closed; this is the work to do now."]);
  });
});

describe("a DONE of the earlier Task racing the assignment (QR-001)", () => {
  it("DONE(A) closes before the assignment checks: the stop settles in the queue step and the copy ends live in B", async () => {
    const f = fixture();
    await f.assign(worker);
    f.resources.addTask("task-B");
    // A's closure commits, then the assignment and A's stop request run in parallel.
    const closed = f.resources.close("task-A");
    const [stop, assigned] = await Promise.all([f.lifecycle.releaseTaskExecutions(closed), f.assignTo(worker, "task-B")]);
    expect(assigned).toMatchObject({ delegated: true });
    expect(stop[0]).toMatchObject({ execution: worker });
    expect(f.resources.entry(worker)).toMatchObject({ taskId: "task-B", open: true });
    expect(f.authority.get("agent:worker")).toBe("live");
  });

  it("A's stop request arrives between the queue step and B's commit: it reaches no authority, and B's commit reopens the copy", async () => {
    const f = fixture();
    await f.assign(worker);
    f.resources.addTask("task-B");
    const closed = f.resources.close("task-A");
    const gate = latch();
    f.resources.beforeAssignCommit = () => gate.promise;
    const assigning = f.assignTo(worker, "task-B");
    await vi.waitFor(() => expect(f.log).toContain("discard:agent:worker"));
    const stop = await f.lifecycle.releaseTaskExecutions(closed);
    expect(stop).toEqual([{ execution: worker, stopped: true }]);
    gate.resolve();
    expect(await assigning).toMatchObject({ delegated: true });
    expect(f.resources.entry(worker)).toMatchObject({ taskId: "task-B", open: true });
    expect(f.authority.get("agent:worker")).toBe("live");
    expect(f.log.indexOf("closed:agent:worker")).toBeLessThan(f.log.indexOf("reopened:agent:worker"));
  });

  it("A's stop request arrives after B's commit (or A is DONE again): the copy now works on B and is not stopped (AC-004)", async () => {
    const f = await afterTaskADone(["worker"]);
    expect(await f.assignTo(worker, "task-B")).toMatchObject({ delegated: true });
    f.log.length = 0;
    // The Task side excludes a copy that moved on; the root re-checks its current Task too.
    expect(await f.lifecycle.releaseTaskExecutions([worker])).toEqual([{ execution: worker, stopped: false,
      error: expect.objectContaining({ code: "TASK_AGENT_RESOURCE_NOT_CLOSED" }) }]);
    expect(f.log).toEqual([]);
    expect(f.authority.get("agent:worker")).toBe("live");
    // DONE of B stops it like any DONE (AC-005).
    await f.done("task-B");
    expect(f.authority.get("agent:worker")).toBe("fenced");
  });

  it("the assignment checks before A's closure commits: refused, and A's later DONE stops the copy as usual", async () => {
    const f = fixture();
    await f.assign(worker);
    f.resources.addTask("task-B");
    expect(await f.assignTo(worker, "task-B")).toEqual({ delegated: false, message: expect.stringContaining("This copy still works on Task task-A") });
    await f.done();
    expect(f.authority.get("agent:worker")).toBe("fenced");
    expect(f.resources.entry(worker)).toMatchObject({ taskId: "task-A", open: false });
  });
});

describe("send_message_to guidance for a team run ID", () => {
  it("names the coordinator of this root's Team copy; anything else has none", async () => {
    const f = fixture();
    expect(f.lifecycle.teamCoordinatorOf("review-team")).toBe("lead");
    expect(f.lifecycle.teamCoordinatorOf("worker")).toBeNull();
    expect(f.lifecycle.teamCoordinatorOf("unknown")).toBeNull();
  });
});
