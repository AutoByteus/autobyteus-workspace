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
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { ProjectChangePublisher } from "../../../src/projects/changes/project-change-publisher.js";
import type { ProjectChangeMessage } from "../../../src/projects/changes/project-change-messages.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });

/** Task keys and "depends on" through the real Project and Task services over a private data root and a real publisher. */
describe("Project Task keys and dependencies (services)", () => {
  let appData: string, layout: ProjectsLayout, store: ProjectStore, publisher: ProjectChangePublisher;
  let projects: ProjectService, tasks: ProjectTaskService, emitted: ProjectChangeMessage[], projectId: string;
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 9, 17, 0, 0, tick++));
  const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
  const taskFile = (taskId: string, project = projectId) => layout.taskFile(project, taskId);
  const create = async (description: string, dependsOnTaskIds?: string[], project = projectId) =>
    tasks.createTask({ projectId: project, description, ...(dependsOnTaskIds ? { dependsOnTaskIds } : {}) });
  const upserts = () => emitted.flatMap((m) => m.type === "task_upserted" && m.scope.kind === "project" ? [m.task] : []);

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-keys-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    const adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    publisher = new ProjectChangePublisher();
    emitted = [];
    projects = new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] }, changes: publisher, now });
    tasks = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout), now,
      requestRelease: vi.fn<TaskExecutionReleaseRequest>(async (_r, runs) => runs.map((execution) => ({ execution, stopped: true }))),
      taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)), changes: publisher });
    publisher.bind({
      readProject: (id) => projects.getProject(id),
      readTask: (location) => tasks.readTaskChangeView(location),
      readWorkerStatus: (location) => tasks.workerStatusOf(location),
    }, (message) => emitted.push(message));
    await tasks.load();
    projectId = (await projects.createProject({ name: "AutoByteus" })).projectId;
  });
  afterEach(async () => { await publisher.idle(); await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  describe("keys", () => {
    it("UI and agent-tool creates get the next key, which survives edits and status changes (AC-001, REQ-017)", async () => {
      const ui = await create("From the UI");
      const tool = await tasks.createTaskWithLocalContextFiles({ projectId, description: "From an agent", localContextFiles: [] });
      expect([ui.taskKey, tool.taskKey]).toEqual(["autobyteus-1", "autobyteus-2"]);
      await tasks.updateTask({ projectId, taskId: ui.taskId, description: "Edited" });
      await tasks.updateTaskById({ taskId: ui.taskId, status: "IN_PROGRESS" });
      await tasks.updateTaskById({ taskId: tool.taskId, status: "DONE" });
      expect((await tasks.listTasks(projectId)).map((t) => [t.taskId, t.taskKey]).sort())
        .toEqual([[ui.taskId, "autobyteus-1"], [tool.taskId, "autobyteus-2"]].sort());
    });

    it("never reuses the number of a deleted Task (AC-002)", async () => {
      await create("one");
      const newest = await create("two");
      await tasks.deleteTask({ projectId, taskId: newest.taskId });
      expect((await create("three")).taskKey).toBe("autobyteus-3");
    });

    it("a renamed Project keeps its prefix; new Projects with colliding prefixes get a suffix (AC-003, AC-004)", async () => {
      const before = await create("before rename");
      await projects.updateProject({ projectId, name: "AutoByteus Core" });
      await projects.patchProjectRecord({ projectId, name: "AutoByteus Core 2" });
      expect((await create("after rename")).taskKey).toBe("autobyteus-2");
      expect((await tasks.listTasks(projectId)).find((t) => t.taskId === before.taskId)?.taskKey).toBe("autobyteus-1");
      const second = (await projects.createProject({ name: "AutoByteus" })).projectId;
      const third = (await projects.createProject({ name: "AutoByteus!" })).projectId;
      expect((await create("x", undefined, second)).taskKey).toBe("autobyteus-2-1");
      expect((await create("y", undefined, third)).taskKey).toBe("autobyteus-3-1");
    });

    it("derives prefixes from names in every script (AC-005)", async () => {
      const expected: Record<string, string> = { "AutoByteus Agents": "autobyteus-agents", "Customer Onboarding Experience Redesign": "customer-onboarding-experience-redesign",
        "Café Ops": "cafe-ops", "客户门户": "客户门户", "!!!": "project" };
      for (const [name, prefix] of Object.entries(expected)) {
        const id = (await projects.createProject({ name })).projectId;
        expect((await create("first", undefined, id)).taskKey).toBe(`${prefix}-1`);
      }
    });

    it("keeps key allocation state out of every Project view and the change feed (REC-001)", async () => {
      await create("x");
      const view = await projects.getProject(projectId);
      expect(view).not.toHaveProperty("taskKeys");
      expect((await projects.listProjects())[0]).not.toHaveProperty("taskKeys");
      await publisher.idle();
      expect(JSON.stringify(emitted)).not.toContain("lastNumber");
    });

    it("a Temp task's worker answer has a null key (AC-007)", async () => {
      const execution = { agentRunId: "temp-worker" };
      await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", hostRoot, execution, adHocTask: { description: "Temp", referenceFiles: [] } });
      expect((await tasks.currentTasksOfTaskWorkers([execution]))[0]?.task).toMatchObject({ projectId: null, taskKey: null });
    });
  });

  describe("depends on", () => {
    it("stores dependencies on this Task only, leaving the other Task's file unchanged (AC-008)", async () => {
      const a = await create("A");
      const b = await create("B");
      const bytesOfA = await fs.readFile(taskFile(a.taskId), "utf8");
      const updated = await tasks.updateTask({ projectId, taskId: b.taskId, description: "B", dependsOnTaskIds: [a.taskId, ` ${a.taskId} `] });
      expect(updated.dependsOnTaskIds).toEqual([a.taskId]);
      expect(updated.updatedAt > b.updatedAt).toBe(true);
      expect((await readJson(taskFile(b.taskId))).dependsOnTaskIds).toEqual([a.taskId]);
      expect(await fs.readFile(taskFile(a.taskId), "utf8")).toBe(bytesOfA);
      const c = await create("C", [a.taskId, b.taskId]);
      expect(c).toMatchObject({ taskKey: "autobyteus-3", dependsOnTaskIds: [a.taskId, b.taskId] });
    });

    it("omitted keeps the list, [] clears it, and the same set is not an edit (AC-010)", async () => {
      const a = await create("A");
      const b = await create("B", [a.taskId]);
      const kept = await tasks.updateTask({ projectId, taskId: b.taskId, description: "B edited" });
      expect(kept.dependsOnTaskIds).toEqual([a.taskId]);
      const same = await tasks.updateTask({ projectId, taskId: b.taskId, description: "B edited", dependsOnTaskIds: [a.taskId] });
      expect(same.updatedAt).toBe(kept.updatedAt);
      expect((await tasks.updateTask({ projectId, taskId: b.taskId, description: "B edited", dependsOnTaskIds: [] })).dependsOnTaskIds).toEqual([]);
      expect((await readJson(taskFile(b.taskId))).dependsOnTaskIds).toEqual([]);
    });

    it("rejects self, unknown, other-Project and loop-forming dependencies with nothing written (AC-009)", async () => {
      const other = (await projects.createProject({ name: "Marketing" })).projectId;
      const foreign = await create("foreign", undefined, other);
      const a = await create("A");
      const b = await create("B", [a.taskId]);
      const c = await create("C", [b.taskId]);
      const before = await Promise.all([a, b, c].map((t) => fs.readFile(taskFile(t.taskId), "utf8")));
      const projectBefore = await fs.readFile(layout.projectFile(projectId), "utf8");
      const prepare = vi.spyOn(ProjectTaskContextStore.prototype, "prepare");
      const rejected = [
        () => tasks.updateTask({ projectId, taskId: a.taskId, description: "changed", dependsOnTaskIds: [a.taskId] }),
        () => tasks.updateTask({ projectId, taskId: a.taskId, description: "changed", dependsOnTaskIds: ["project_task_missing"] }),
        () => tasks.updateTask({ projectId, taskId: a.taskId, description: "changed", dependsOnTaskIds: [foreign.taskId] }),
        () => tasks.updateTask({ projectId, taskId: a.taskId, description: "changed", dependsOnTaskIds: [b.taskId] }),
        () => tasks.updateTask({ projectId, taskId: a.taskId, description: "changed", dependsOnTaskIds: [c.taskId],
          contextChanges: { draftId: "3f2a9c1e-0b4d-4e6f-8a7b-9c0d1e2f3a4b", addStoredFilenames: ["ctx_a__b.txt"] } }),
        () => create("D", [foreign.taskId]),
        () => create("E", ["project_task_missing"]),
      ];
      for (const attempt of rejected) await expect(attempt()).rejects.toMatchObject({ code: "TASK_DEPENDENCY_INVALID" });
      expect(prepare).not.toHaveBeenCalled();
      expect(await Promise.all([a, b, c].map((t) => fs.readFile(taskFile(t.taskId), "utf8")))).toEqual(before);
      expect(await fs.readFile(layout.projectFile(projectId), "utf8")).toBe(projectBefore);
      expect((await tasks.listTasks(projectId)).map((t) => t.description).sort()).toEqual(["A", "B", "C"]);
    });

    it("concurrent edits cannot close a loop (QR-003)", async () => {
      const a = await create("A");
      const b = await create("B");
      const results = await Promise.allSettled([
        tasks.updateTask({ projectId, taskId: b.taskId, description: "B", dependsOnTaskIds: [a.taskId] }),
        tasks.updateTask({ projectId, taskId: a.taskId, description: "A", dependsOnTaskIds: [b.taskId] }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "TASK_DEPENDENCY_INVALID" } });
      const stored = await tasks.listTasks(projectId);
      expect(stored.filter((t) => t.dependsOnTaskIds.length)).toHaveLength(1);
    });

    it("deleting a Task drops it from every dependent, keeps their updatedAt and republishes them (AC-018)", async () => {
      const a = await create("A");
      const b = await create("B", [a.taskId]);
      const c = await create("C", [a.taskId, b.taskId]);
      const d = await create("D");
      await publisher.idle();
      emitted.length = 0;
      expect(await tasks.deleteTask({ projectId, taskId: a.taskId })).toBe(true);
      await publisher.idle();
      expect((await readJson(taskFile(b.taskId)))).toMatchObject({ dependsOnTaskIds: [], updatedAt: b.updatedAt });
      expect((await readJson(taskFile(c.taskId)))).toMatchObject({ dependsOnTaskIds: [b.taskId], updatedAt: c.updatedAt });
      expect((await readJson(taskFile(d.taskId))).updatedAt).toBe(d.updatedAt);
      expect(emitted).toContainEqual(expect.objectContaining({ type: "task_removed", taskId: a.taskId }));
      expect(upserts().map((t) => [t.taskId, t.dependsOnTaskIds]).sort()).toEqual([[b.taskId, []], [c.taskId, [b.taskId]]].sort());
      expect((await create("E")).taskKey).toBe("autobyteus-5");
    });

    it("a cleanup failure is logged and never fails the delete", async () => {
      const a = await create("A");
      await create("B", [a.taskId]);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      vi.spyOn(store, "updateTask").mockRejectedValueOnce(new Error("disk full"));
      await expect(tasks.deleteTask({ projectId, taskId: a.taskId })).resolves.toBe(true);
      expect(warn).toHaveBeenCalledWith("TASK_DEPENDENCY_CLEANUP_FAILED", expect.objectContaining({ taskId: a.taskId }));
    });

    it("task_upserted carries taskKey and dependsOnTaskIds (AC-011)", async () => {
      const a = await create("A");
      await create("B", [a.taskId]);
      await publisher.idle();
      expect(upserts()).toEqual(expect.arrayContaining([
        expect.objectContaining({ taskKey: "autobyteus-1", dependsOnTaskIds: [] }),
        expect.objectContaining({ taskKey: "autobyteus-2", dependsOnTaskIds: [a.taskId] }),
      ]));
    });

    it("dependencies never block delegation, status changes or Done (AC-019)", async () => {
      const a = await create("A");
      const b = await create("B", [a.taskId]);
      const execution = { agentRunId: "worker" };
      await expect(tasks.linkNewTaskExecution({ role: "assigned", taskId: b.taskId, assignedBy: "manager", hostRoot, execution })).resolves.toEqual({ taskId: b.taskId });
      await expect(tasks.updateTaskById({ taskId: b.taskId, status: "IN_PROGRESS" })).resolves.toMatchObject({ status: "IN_PROGRESS" });
      await expect(tasks.updateTaskById({ taskId: b.taskId, status: "DONE" })).resolves.toMatchObject({ status: "DONE" });
      expect((await tasks.listTasks(projectId)).find((t) => t.taskId === a.taskId)?.status).toBe("TODO");
    });
  });
});
