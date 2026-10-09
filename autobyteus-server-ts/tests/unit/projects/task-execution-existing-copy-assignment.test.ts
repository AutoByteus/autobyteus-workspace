import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore } from "../../../src/projects/stores/ad-hoc-task-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { parseTaskExecutionResourceFile } from "../../../src/projects/stores/task-execution-resource-schema.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "manager-root" });
const team: TaskExecutionReference = { teamRunId: "review-team" };
const worker: TaskExecutionReference = { agentRunId: "worker" };
const subWork: TaskExecutionReference = { agentRunId: "sub-work" };

/** The Task side of assigning a new Task to an existing copy: one current Task per copy, history kept (SR-006). */
describe("existing-copy assignment on the Task side", () => {
  let appData: string, layout: ProjectsLayout, adHocLayout: AdHocTasksLayout, store: ProjectStore, projectId: string;
  let tasks: ProjectTaskService, release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  const boot = async () => {
    release = vi.fn<TaskExecutionReleaseRequest>(async (_root, executions) => executions.map(execution => ({ execution, stopped: true })));
    const service = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout),
      requestRelease: release, taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)) });
    await service.load();
    return service;
  };
  const rawFile = async (taskId: string) => JSON.parse(await fs.readFile(layout.taskExecutionResourcesFile(projectId, taskId), "utf8"));
  const setStatus = async (taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED") => {
    await tasks.updateTaskById({ taskId, status });
    await tasks.drainRuntimeReleases();
  };
  const released = () => release.mock.calls.flatMap(([, executions]) => executions);
  /** Task A delegated by `manager` to the Team copy (started), then A DONE; Task B created. */
  const teamDidA = async () => {
    const a = (await tasks.createTask({ projectId, description: "Lazy member activation" })).taskId;
    const b = (await tasks.createTask({ projectId, description: "Follow-up cleanup" })).taskId;
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: a, assignedBy: "manager", recipientAddress: "/review_team", hostRoot, execution: team, teamCoordinatorAgentRunId: "lead" });
    await tasks.markStarted(team);
    await setStatus(a, "DONE");
    release.mockClear();
    return { a, b };
  };
  const assign = (taskId: string, execution = team, assignedBy = "manager") => tasks.assignExistingTaskExecution({
    hostRoot, execution, taskId, assignedBy, ...("teamRunId" in execution ? { teamCoordinatorAgentRunId: "lead" } : {}) });

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "existing-copy-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    projectId = (await new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } }).createProject({ name: "P" })).projectId;
    tasks = await boot();
  });
  afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("appends B's starting entry (address copied), leaves A unchanged, makes B the copy's current Task and B's root, and survives a restart (REQ-003/008/013)", async () => {
    const { a, b } = await teamDidA();
    const fileA = await rawFile(a);
    await tasks.assertAssignable({ execution: team, requestedBy: "manager", taskId: b });
    await assign(b);
    expect(await rawFile(a)).toEqual(fileA);
    expect((await rawFile(b)).agentRunResources).toEqual([{ role: "assigned", assignedBy: "manager", recipientAddress: "/review_team",
      hostRoot: { kind: "agent_team", runId: "manager-root" }, agentRun: { kind: "team", teamRunId: "review-team", coordinatorAgentRunId: "lead" },
      linkedAt: expect.any(String), start: "starting", closedAt: null }]);
    expect(tasks.ownerOf([team])).toEqual({ taskId: b, execution: team, open: true });
    expect(tasks.closedTaskExecutionsIn(hostRoot)).toEqual([]);
    expect((await tasks.readTaskChangeView({ projectId, taskId: b }))?.task.root).toMatchObject({ kind: "team", teamRunId: "review-team", ingressAgentRunId: "lead", closed: false });
    // A stays DONE and its root shows the copy closed (AC-002).
    expect((await tasks.readTaskChangeView({ projectId, taskId: a }))?.task).toMatchObject({ status: "DONE", root: { teamRunId: "review-team", closed: true } });
    await tasks.markStarted(team);
    const restarted = await boot();
    expect(restarted.ownerOf([team])).toEqual({ taskId: b, execution: team, open: true });
    expect(restarted.closedTaskExecutionsIn(hostRoot)).toEqual([]);
    expect((await restarted.assignments([a, b]))).toEqual(new Map([
      [a, { open: [], closed: [{ kind: "team", teamRunId: "review-team", teamCoordinatorAgentRunId: "lead", assignedBy: "manager", outcome: "accepted" }] }],
      [b, { closed: [], open: [{ kind: "team", teamRunId: "review-team", teamCoordinatorAgentRunId: "lead", assignedBy: "manager", outcome: "accepted" }] }],
    ]));
  });

  it("a DONE or CANCELLED of A (repeated) never stops or hides the copy that now works on B; DONE of B does (AC-004, AC-005, REQ-006)", async () => {
    const { a, b } = await teamDidA();
    await assign(b);
    await setStatus(a, "TODO");
    await setStatus(a, "DONE");
    await setStatus(a, "CANCELLED");
    expect(released()).toEqual([]);
    expect(tasks.isOpen(team)).toBe(true);
    expect(tasks.closedTaskExecutionsIn(hostRoot)).toEqual([]);
    await setStatus(b, "DONE");
    expect(released()).toEqual([team]);
    expect(tasks.closedTaskExecutionsIn(hostRoot)).toEqual([team]);
    // A repeated DONE of B re-requests the stop; a DONE of A still never does.
    release.mockClear();
    await setStatus(a, "DONE");
    expect(released()).toEqual([]);
    await setStatus(b, "DONE");
    expect(released()).toEqual([team]);
  });

  it.each([
    ["the copy's current Task is still open (AC-006)", async (f: { a: string }) => { await setStatus(f.a, "IN_PROGRESS"); await tasks.reopenAssignment({ execution: team, requestedBy: "manager" }); }, "manager", "TASK_AGENT_RESOURCE_CONFLICT", "This copy still works on Task"],
    ["another run assigns it (AC-007, QR-002)", async () => undefined, "intruder", "TASK_AGENT_RESOURCE_CONFLICT", "Only the run that made this copy's most recent assignment"],
    ["Task B is DONE (AC-009)", async (f: { b: string }) => { await setStatus(f.b, "DONE"); }, "manager", "TASK_AGENT_RESOURCE_CLOSED", "The Task is DONE"],
    ["Task B is CANCELLED (AC-009)", async (f: { b: string }) => { await setStatus(f.b, "CANCELLED"); }, "manager", "TASK_AGENT_RESOURCE_CLOSED", "The Task is CANCELLED"],
  ] as const)("refuses when %s; nothing is written", async (_case, arrange, requestedBy, code, message) => {
    const f = await teamDidA();
    await arrange(f as never);
    const before = await fs.readdir(path.join(layout.tasksDir(projectId), path.basename(path.dirname(layout.taskExecutionResourcesFile(projectId, f.b)))));
    for (const attempt of [() => tasks.assertAssignable({ execution: team, requestedBy, taskId: f.b }), () => assign(f.b, team, requestedBy)]) {
      await expect(attempt()).rejects.toMatchObject({ code, message: expect.stringContaining(message) });
    }
    expect(await fs.readdir(path.join(layout.tasksDir(projectId), path.basename(path.dirname(layout.taskExecutionResourcesFile(projectId, f.b)))))).toEqual(before);
  });

  it("names the open Task and its status when the copy is busy (REQ-005)", async () => {
    const { a, b } = await teamDidA();
    await setStatus(a, "IN_PROGRESS");
    await tasks.reopenAssignment({ execution: team, requestedBy: "manager" });
    await expect(tasks.assertAssignable({ execution: team, requestedBy: "manager", taskId: b })).rejects.toMatchObject({
      message: `This copy still works on Task ${a} (IN_PROGRESS). Mark it DONE or CANCELLED first, or delegate Task ${b} to a new copy with recipient_address.` });
  });

  it("refuses unknown and ambiguous Tasks, a copy whose latest assignment is already B, a never-started copy, and sub-work (AC-008/009)", async () => {
    const { a, b } = await teamDidA();
    await expect(tasks.assertAssignable({ execution: team, requestedBy: "manager", taskId: "nope" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    await expect(tasks.assertAssignable({ execution: team, requestedBy: "manager", taskId: a })).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    await setStatus(a, "TODO");
    await expect(tasks.assertAssignable({ execution: team, requestedBy: "manager", taskId: a })).rejects.toMatchObject({
      code: "TASK_AGENT_RESOURCE_CONFLICT", message: expect.stringContaining(`This copy's most recent assignment is already Task ${a}. To continue it, move Task ${a} to TODO or IN_PROGRESS`) });
    // A copy that never started (its only start failed) has no conversation to resume.
    const c = (await tasks.createTask({ projectId, description: "C" })).taskId;
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: c, assignedBy: "manager", recipientAddress: "/w", hostRoot, execution: worker });
    await tasks.markFailed(worker, { code: "TASK_DISPATCH_FAILED", message: "start failed" });
    await setStatus(c, "CANCELLED");
    await expect(tasks.assertAssignable({ execution: worker, requestedBy: "manager", taskId: b })).rejects.toMatchObject({
      code: "TASK_REACTIVATION_UNAVAILABLE", message: expect.stringContaining("This copy never started") });
    // Sub-work of a Task worker is not an assignment.
    await setStatus(a, "IN_PROGRESS");
    await tasks.reopenAssignment({ execution: team, requestedBy: "manager" });
    await tasks.linkNewTaskExecution({ role: "delegated", creator: team, hostRoot, execution: subWork });
    await tasks.markStarted(subWork);
    await setStatus(a, "DONE");
    await expect(tasks.assertAssignable({ execution: subWork, requestedBy: "manager", taskId: b })).rejects.toMatchObject({
      message: expect.stringContaining("sub-work or a helper of a Task worker") });
  });

  it("refuses while any Task's data is unreadable (REQ-005, AR-004)", async () => {
    const { b } = await teamDidA();
    const z = (await tasks.createTask({ projectId, description: "Z" })).taskId;
    await fs.mkdir(path.dirname(layout.taskExecutionResourcesFile(projectId, z)), { recursive: true });
    await fs.writeFile(layout.taskExecutionResourcesFile(projectId, z), "{ truncated");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    tasks = await boot();
    await expect(tasks.assertAssignable({ execution: team, requestedBy: "manager", taskId: b })).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" });
    await expect(assign(b)).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" });
  });

  it("A → B → A appends a new period to A's file and keeps the earlier one; A's closed and open assignments list both periods (AC-018, AR-001)", async () => {
    const { a, b } = await teamDidA();
    const [firstPeriod] = (await rawFile(a)).agentRunResources;
    await assign(b); await tasks.markStarted(team);
    await setStatus(b, "DONE");
    await setStatus(a, "IN_PROGRESS");
    await tasks.assertAssignable({ execution: team, requestedBy: "manager", taskId: a });
    await assign(a);
    const entries = (await rawFile(a)).agentRunResources;
    expect(entries).toEqual([firstPeriod, expect.objectContaining({ assignedBy: "manager", start: "starting", closedAt: null })]);
    expect(entries[1].linkedAt >= firstPeriod.linkedAt).toBe(true);
    expect(() => parseTaskExecutionResourceFile(JSON.parse(JSON.stringify(entries.length ? { taskId: a, agentRunResources: entries } : {})), a)).not.toThrow();
    expect(tasks.ownerOf([team])).toEqual({ taskId: a, execution: team, open: true });
    await tasks.markStarted(team);
    // Settling the start touched only the copy's last entry in A's file.
    expect((await rawFile(a)).agentRunResources[0]).toEqual(firstPeriod);
    expect((await tasks.assignments([a])).get(a)).toEqual({
      open: [{ kind: "team", teamRunId: "review-team", teamCoordinatorAgentRunId: "lead", assignedBy: "manager", outcome: "accepted" }],
      closed: [{ kind: "team", teamRunId: "review-team", teamCoordinatorAgentRunId: "lead", assignedBy: "manager", outcome: "accepted" }] });
    expect((await tasks.readTaskChangeView({ projectId, taskId: a }))?.task.root).toMatchObject({ teamRunId: "review-team", closed: false });
    // DONE of B again stops nothing; DONE of A stops the copy once.
    release.mockClear();
    await setStatus(b, "DONE");
    expect(released()).toEqual([]);
    await setStatus(a, "DONE");
    expect(released()).toEqual([team]);
    const restarted = await boot();
    expect(restarted.ownerOf([team])).toEqual({ taskId: a, execution: team, open: false });
  });

  it("reopening an earlier Task names the copy's current Task and the delegate_task next step (AC-010, REQ-007)", async () => {
    const { a, b } = await teamDidA();
    await assign(b); await tasks.markStarted(team);
    await setStatus(b, "DONE");
    await setStatus(a, "TODO");
    const hint = `This copy's current Task is ${b} (DONE); reopening Task ${a} does not reach it. To have this copy continue Task ${a}, `
      + `call delegate_task with target_team_run_id "review-team" and task_id "${a}".`;
    await expect(tasks.assertReopenable({ execution: team, requestedBy: "manager" })).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED", message: hint });
    await expect(tasks.reopenAssignment({ execution: team, requestedBy: "manager" })).rejects.toMatchObject({ message: hint });
    // Reopening the copy's current Task (B) still reactivates it there (same-Task reactivation is preserved).
    await setStatus(b, "IN_PROGRESS");
    expect(await tasks.reopenAssignment({ execution: team, requestedBy: "manager" })).toEqual({ taskId: b, reopened: true });
  });

  it("a DONE of A and the assignment of B never leave two open entries, in either order (QR-001)", async () => {
    for (const order of ["done-first", "assign-first"] as const) {
      const a = (await tasks.createTask({ projectId, description: `A ${order}` })).taskId;
      const b = (await tasks.createTask({ projectId, description: `B ${order}` })).taskId;
      const copy = { agentRunId: `copy-${order}` };
      await tasks.linkNewTaskExecution({ role: "assigned", taskId: a, assignedBy: "manager", recipientAddress: "/w", hostRoot, execution: copy });
      await tasks.markStarted(copy);
      release.mockClear();
      const done = setStatus(a, "DONE");
      const assigning = (order === "done-first" ? done : Promise.resolve()).then(() => tasks.assignExistingTaskExecution({ hostRoot, execution: copy, taskId: b, assignedBy: "manager" }));
      const [, outcome] = await Promise.allSettled([done, assigning]);
      const openEntries = [...(await rawFile(a)).agentRunResources, ...((await rawFile(b).catch(() => ({ agentRunResources: [] }))).agentRunResources)]
        .filter((entry: { agentRun: { agentRunId?: string }; closedAt: string | null }) => entry.agentRun.agentRunId === copy.agentRunId && entry.closedAt === null);
      expect(openEntries.length).toBeLessThanOrEqual(1);
      if (order === "done-first") {
        expect(outcome.status).toBe("fulfilled");
        expect(tasks.ownerOf([copy])).toMatchObject({ taskId: b, open: true });
      } else if (outcome.status === "rejected") {
        // The assignment ran before A's closure: refused, and A's DONE stopped the copy.
        expect((outcome.reason as { code: string }).code).toBe("TASK_AGENT_RESOURCE_CONFLICT");
        expect(released()).toEqual([copy]);
      }
      // A stop request for A never names a copy whose current Task is now B.
      if (tasks.ownerOf([copy])?.taskId === b) expect(released().filter(execution => "agentRunId" in execution && execution.agentRunId === copy.agentRunId).length).toBeLessThanOrEqual(1);
    }
  });
});
