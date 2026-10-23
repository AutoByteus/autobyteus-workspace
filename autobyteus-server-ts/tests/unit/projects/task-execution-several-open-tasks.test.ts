import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });

/**
 * A task agent (Agent or Team copy) with several open Tasks given by delegate_task (task-agent-several-tasks,
 * autobyteus-275), through the real Task services and file store. Started from the Solution Designer's probe
 * (AF-001): with two open Tasks, the last close fenced the copy but asked no one to stop it.
 */
describe("a task agent with several open Tasks", () => {
  let root: string, layout: ProjectsLayout, store: ProjectStore, projectId: string, tasks: ProjectTaskService, resources: TaskExecutionResourceService;
  let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  const team = { teamRunId: "team-1" };
  const create = async (description: string, partOfTaskId?: string) => tasks.createTask({ projectId, description, ...(partOfTaskId ? { partOfTaskId } : {}) });
  const setStatus = (taskId: string, status: "DONE" | "CANCELLED" | "TODO") => tasks.updateTaskById({ taskId, status });
  const released = () => release.mock.calls.map(([, runs]) => runs);
  /** The first Task: a new copy linked and started, as delegation does. */
  const assignFirst = async (taskId: string) => {
    await tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", hostRoot, execution: team, teamCoordinatorAgentRunId: "lead-1" });
    await tasks.markStarted(team);
  };
  /** Another Task to the same copy, as delegate_task with target_team_run_id does (advisory check, then the commit, then start). */
  const assignAnother = async (taskId: string, requestedBy = "manager") => {
    await tasks.assertAssignable({ execution: team, requestedBy, taskId });
    await tasks.assignExistingTaskExecution({ hostRoot, execution: team, taskId, assignedBy: requestedBy, teamCoordinatorAgentRunId: "lead-1" });
    await tasks.markStarted(team);
  };

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "task-several-open-"));
    layout = new ProjectsLayout(path.join(root, "projects"));
    store = new ProjectStore(layout);
    projectId = (await new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } }).createProject({ name: "P" })).projectId;
    release = vi.fn<TaskExecutionReleaseRequest>(async (_r, runs) => runs.map((execution) => ({ execution, stopped: true })));
    resources = new TaskExecutionResourceService(new TaskExecutionResourceStore(layout));
    tasks = new ProjectTaskService({ store, contextStore: new ProjectTaskContextStore(layout), requestRelease: release, taskExecutionResources: resources });
    await tasks.load();
  });
  afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });

  it("AF-001 (the probe): with two open entries, the first close keeps the copy and the last close asks to stop it once", async () => {
    const a = await create("A");
    const b = await create("B");
    await assignFirst(a.taskId);
    // The second open entry, written directly as the probe did (independent of the assignment rule).
    await resources.serialize(b.taskId, () => resources.assignExisting({ projectId, taskId: b.taskId },
      { hostRoot, execution: team, taskId: b.taskId, assignedBy: "manager", teamCoordinatorAgentRunId: "lead-1" }));
    await setStatus(b.taskId, "DONE"); await tasks.drainRuntimeReleases();
    expect(released()).toEqual([]);
    expect(tasks.isOpen(team)).toBe(true);
    await setStatus(a.taskId, "DONE"); await tasks.drainRuntimeReleases();
    expect(tasks.isOpen(team)).toBe(false);
    expect(released()).toEqual([[team]]);
    expect(release).toHaveBeenCalledWith(hostRoot, [team]);
  });

  it("gives B while A is open, by the most recent assigner only; both show the copy (AC-001, AC-002)", async () => {
    const a = await create("Parent"), b = await create("Part", a.taskId);
    await assignFirst(a.taskId);
    await expect(assignAnother(b.taskId, "intruder")).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CONFLICT",
      message: expect.stringContaining("Only the agent that gave this task agent its most recent Task") });
    await assignAnother(b.taskId);
    expect(tasks.ownerOf([team])).toEqual({ taskId: b.taskId, execution: team, open: true });
    expect(await tasks.openTaskReferencesOf(team, b.taskId)).toEqual([a.taskKey]);
    for (const task of [a, b]) {
      expect((await tasks.readTaskChangeView({ projectId, taskId: task.taskId }))?.task.root).toMatchObject({ teamRunId: "team-1", closed: false });
    }
    await expect(assignAnother(a.taskId)).rejects.toMatchObject({ message: "This task agent already works on this Task." });
  });

  it("closing one Task keeps the copy running; closing the last stops it once (AC-003, AC-004, QR-001)", async () => {
    const a = await create("A"), b = await create("B");
    await assignFirst(a.taskId);
    await assignAnother(b.taskId);
    await setStatus(b.taskId, "DONE"); await tasks.drainRuntimeReleases();
    expect(released()).toEqual([]);
    expect(tasks.isOpen(team)).toBe(true);
    expect(tasks.ownerOf([team])).toEqual({ taskId: a.taskId, execution: team, open: true });
    expect((await tasks.readTaskChangeView({ projectId, taskId: b.taskId }))?.task.root).toMatchObject({ closed: true });
    await setStatus(a.taskId, "DONE"); await tasks.drainRuntimeReleases();
    expect(released()).toEqual([[team]]);
    expect(tasks.isOpen(team)).toBe(false);
  });

  it("closing a parent closes its parts on the same copy; the copy is stopped once, after the last (AC-005)", async () => {
    const parent = await create("Parent");
    const p1 = await create("Part 1", parent.taskId), p2 = await create("Part 2", parent.taskId);
    await assignFirst(parent.taskId);
    await assignAnother(p1.taskId);
    await assignAnother(p2.taskId);
    expect(await tasks.updateTaskById({ taskId: parent.taskId, status: "CANCELLED" })).toMatchObject({ closedPartReferences: [p1.taskKey, p2.taskKey] });
    await tasks.drainRuntimeReleases();
    expect(released()).toEqual([[team]]);
    expect(tasks.isOpen(team)).toBe(false);
  });

  it("sub-work joins the newest open Task; closing that Task stops the sub-work while the copy runs on (AC-006, DEC-007)", async () => {
    const a = await create("A"), b = await create("B");
    await assignFirst(a.taskId);
    await assignAnother(b.taskId);
    const helper = { agentRunId: "helper" };
    await tasks.linkNewTaskExecution({ role: "delegated", creator: team, hostRoot, execution: helper });
    await tasks.markStarted(helper);
    expect(tasks.ownerOf([helper, team])).toMatchObject({ taskId: b.taskId, execution: helper, open: true });
    await setStatus(b.taskId, "DONE"); await tasks.drainRuntimeReleases();
    expect(released()).toEqual([[helper]]);
    expect(tasks.isOpen(team)).toBe(true);
    expect(tasks.isOpen(helper)).toBe(false);
  });

  it("a closed Task can be given back to the copy while it runs on another (AC-007)", async () => {
    const a = await create("A"), b = await create("B");
    await assignFirst(a.taskId);
    await assignAnother(b.taskId);
    await setStatus(a.taskId, "DONE"); await tasks.drainRuntimeReleases();
    await setStatus(a.taskId, "TODO");
    await assignAnother(a.taskId);
    expect(tasks.ownerOf([team])).toEqual({ taskId: a.taskId, execution: team, open: true });
    expect(await tasks.openTaskReferencesOf(team, a.taskId)).toEqual([b.taskKey]);
    expect(released()).toEqual([]);
  });

  it("two of its Tasks closing at once never stop it while a third is open; the last stops it once (QR-002)", async () => {
    const a = await create("A"), b = await create("B"), c = await create("C");
    await assignFirst(a.taskId);
    await assignAnother(b.taskId);
    await assignAnother(c.taskId);
    await Promise.all([setStatus(b.taskId, "DONE"), setStatus(c.taskId, "CANCELLED")]);
    await tasks.drainRuntimeReleases();
    expect(released()).toEqual([]);
    expect(tasks.isOpen(team)).toBe(true);
    await setStatus(a.taskId, "DONE"); await tasks.drainRuntimeReleases();
    expect(released()).toEqual([[team]]);
  });

  it("concurrent closing of its last two Tasks asks to stop it (at least once, never before both are closed)", async () => {
    const a = await create("A"), b = await create("B");
    await assignFirst(a.taskId);
    await assignAnother(b.taskId);
    await Promise.all([setStatus(a.taskId, "DONE"), setStatus(b.taskId, "DONE")]);
    await tasks.drainRuntimeReleases();
    expect(tasks.isOpen(team)).toBe(false);
    expect(released().length).toBeGreaterThanOrEqual(1);
    expect(released().every((runs) => runs.length === 1 && runs[0]!.teamRunId === "team-1")).toBe(true);
  });
});
