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
import type { ProjectTaskStatus } from "../../../src/projects/domain/models.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });

/** "Part of" through the real Project and Task services over a private data root and a real publisher (task-part-of). */
describe("Project Task parts (services)", () => {
  let appData: string, layout: ProjectsLayout, store: ProjectStore, publisher: ProjectChangePublisher;
  let projects: ProjectService, tasks: ProjectTaskService, emitted: ProjectChangeMessage[], projectId: string;
  let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 9, 19, 0, 0, tick++));
  const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
  const taskFile = (taskId: string) => layout.taskFile(projectId, taskId);
  const create = (description: string, extra: { partOfTaskId?: string | null; dependsOnTaskIds?: string[] } = {}, project = projectId) =>
    tasks.createTask({ projectId: project, description, ...extra });
  const setParent = (taskId: string, partOfTaskId: string | null | undefined, description = "edited") =>
    tasks.updateTask({ projectId, taskId, description, ...(partOfTaskId !== undefined ? { partOfTaskId } : {}) });
  const setStatus = (taskId: string, status: ProjectTaskStatus) => tasks.updateTaskById({ taskId, status });
  const stored = async (taskId: string) => (await store.readTask(projectId, taskId))!;
  const upserts = () => emitted.flatMap((m) => m.type === "task_upserted" && m.scope.kind === "project" ? [m.task] : []);
  const assign = (taskId: string, agentRunId: string) =>
    tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", hostRoot, execution: { agentRunId } });

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-parts-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    const adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    publisher = new ProjectChangePublisher();
    emitted = [];
    release = vi.fn<TaskExecutionReleaseRequest>(async (_r, runs) => runs.map((execution) => ({ execution, stopped: true })));
    projects = new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] }, changes: publisher, now });
    tasks = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout), now,
      requestRelease: release, taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)), changes: publisher });
    publisher.bind({
      readProject: (id) => projects.getProject(id),
      readTask: (location) => tasks.readTaskChangeView(location),
      readWorkerStatus: (location) => tasks.workerStatusOf(location),
    }, (message) => emitted.push(message));
    await tasks.load();
    projectId = (await projects.createProject({ name: "AutoByteus" })).projectId;
  });
  afterEach(async () => { await publisher.idle(); await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  describe("storing the parent", () => {
    it("a new Task stores its parent on itself only; the parent's file is unchanged (AC-001)", async () => {
      const parent = await create("Cross-node collaboration");
      const bytes = await fs.readFile(taskFile(parent.taskId), "utf8");
      const part = await create("Slice 1", { partOfTaskId: ` ${parent.taskId} ` });
      expect(part).toMatchObject({ taskKey: "autobyteus-2", partOfTaskId: parent.taskId });
      expect(await readJson(taskFile(part.taskId))).toMatchObject({ partOfTaskId: parent.taskId });
      expect(await fs.readFile(taskFile(parent.taskId), "utf8")).toBe(bytes);
      expect((await create("No parent")).partOfTaskId).toBeNull();
      expect((await create("Null parent", { partOfTaskId: null })).partOfTaskId).toBeNull();
    });

    it("replaces, keeps when omitted, clears with null; the same parent is no edit (AC-002)", async () => {
      const a = await create("A");
      const b = await create("B");
      const part = await create("P", { partOfTaskId: a.taskId });
      const moved = await setParent(part.taskId, b.taskId, "P");
      expect(moved.partOfTaskId).toBe(b.taskId);
      expect(moved.updatedAt > part.updatedAt).toBe(true);
      const kept = await setParent(part.taskId, undefined, "P edited");
      expect(kept.partOfTaskId).toBe(b.taskId);
      const same = await setParent(part.taskId, b.taskId, "P edited");
      expect(same.updatedAt).toBe(kept.updatedAt);
      const cleared = await setParent(part.taskId, null, "P edited");
      expect(cleared.partOfTaskId).toBeNull();
      expect(cleared.updatedAt > kept.updatedAt).toBe(true);
      expect(await readJson(taskFile(part.taskId))).toMatchObject({ partOfTaskId: null });
      // A parent change alone is a patch.
      await expect(tasks.updateTask({ projectId, taskId: part.taskId, partOfTaskId: a.taskId })).resolves.toMatchObject({ partOfTaskId: a.taskId });
    });

    it("refuses self, unknown and another Project's Task with nothing written and no context step (AC-003)", async () => {
      const other = (await projects.createProject({ name: "Marketing" })).projectId;
      const foreign = await create("foreign", {}, other);
      const a = await create("A");
      const before = await fs.readFile(taskFile(a.taskId), "utf8");
      const projectBefore = await fs.readFile(layout.projectFile(projectId), "utf8");
      const prepare = vi.spyOn(ProjectTaskContextStore.prototype, "prepare");
      const rejected = [
        () => setParent(a.taskId, a.taskId),
        () => setParent(a.taskId, "project_task_missing"),
        () => setParent(a.taskId, foreign.taskId),
        () => tasks.updateTask({ projectId, taskId: a.taskId, description: "changed", partOfTaskId: foreign.taskId,
          contextChanges: { draftId: "3f2a9c1e-0b4d-4e6f-8a7b-9c0d1e2f3a4b", addStoredFilenames: ["ctx_a__b.txt"] } }),
        () => create("B", { partOfTaskId: foreign.taskId }),
        () => create("C", { partOfTaskId: "project_task_missing" }),
      ];
      for (const attempt of rejected) await expect(attempt()).rejects.toMatchObject({ code: "TASK_PARENT_INVALID" });
      expect(prepare).not.toHaveBeenCalled();
      expect(await fs.readFile(taskFile(a.taskId), "utf8")).toBe(before);
      expect(await fs.readFile(layout.projectFile(projectId), "utf8")).toBe(projectBefore);
      expect((await tasks.listTasks(projectId)).map((t) => t.description)).toEqual(["A"]);
    });

    it("one level only: no part of a part, no parent for a Task with parts; re-saving the same parent passes (AC-004)", async () => {
      const a = await create("A");
      const b = await create("B", { partOfTaskId: a.taskId });
      const c = await create("C");
      const d = await create("D");
      await expect(setParent(c.taskId, b.taskId)).rejects.toMatchObject({ code: "TASK_PARENT_INVALID",
        message: "autobyteus-2 is itself part of autobyteus-1; a part can't have parts of its own." });
      await expect(create("E", { partOfTaskId: b.taskId })).rejects.toMatchObject({ code: "TASK_PARENT_INVALID" });
      await expect(setParent(a.taskId, d.taskId)).rejects.toMatchObject({ code: "TASK_PARENT_INVALID",
        message: "This Task has parts, so it can't be part of another Task." });
      await expect(setParent(b.taskId, a.taskId, "B")).resolves.toMatchObject({ partOfTaskId: a.taskId });
      // Clearing always works, also on a Task with parts.
      await expect(setParent(a.taskId, null, "A")).resolves.toMatchObject({ partOfTaskId: null });
    });

    it("concurrent \"B part of A\" and \"A part of B\" cannot both succeed (AC-004, QR-001)", async () => {
      const a = await create("A");
      const b = await create("B");
      const results = await Promise.allSettled([setParent(b.taskId, a.taskId, "B"), setParent(a.taskId, b.taskId, "A")]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "TASK_PARENT_INVALID" } });
      expect((await tasks.listTasks(projectId)).filter((t) => t.partOfTaskId)).toHaveLength(1);
    });

    it("a concurrent parent write and dependency write of one Project are both validated and both kept", async () => {
      const a = await create("A");
      const b = await create("B");
      await Promise.all([setParent(b.taskId, a.taskId, "B"), tasks.updateTask({ projectId, taskId: a.taskId, description: "A", dependsOnTaskIds: [b.taskId] })]);
      expect(await stored(b.taskId)).toMatchObject({ partOfTaskId: a.taskId, dependsOnTaskIds: [] });
      expect(await stored(a.taskId)).toMatchObject({ partOfTaskId: null, dependsOnTaskIds: [b.taskId] });
    });

    it("part of and depends on are independent: a part may depend on its parent and a parent on its part (AC-005)", async () => {
      const a = await create("A");
      const b = await create("B", { partOfTaskId: a.taskId, dependsOnTaskIds: [a.taskId] });
      expect(b).toMatchObject({ partOfTaskId: a.taskId, dependsOnTaskIds: [a.taskId] });
      const parent = await tasks.updateTask({ projectId, taskId: a.taskId, description: "A", dependsOnTaskIds: [] });
      expect(parent.dependsOnTaskIds).toEqual([]);
      const c = await create("C", { partOfTaskId: a.taskId });
      expect((await tasks.updateTask({ projectId, taskId: a.taskId, description: "A", dependsOnTaskIds: [c.taskId] })).dependsOnTaskIds).toEqual([c.taskId]);
      // Changing the dependencies keeps the parent, and the other way round.
      expect((await tasks.updateTask({ projectId, taskId: b.taskId, description: "B", dependsOnTaskIds: [] })).partOfTaskId).toBe(a.taskId);
      expect((await setParent(b.taskId, null, "B")).dependsOnTaskIds).toEqual([]);
    });

    it("a Temp task has no parent: part_of on it, or naming it, is refused (AC-003)", async () => {
      const a = await create("A");
      const { taskId: temp } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", hostRoot,
        execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
      await expect(tasks.updateTaskById({ taskId: temp, partOf: "autobyteus-1" })).rejects.toMatchObject({ code: "TASK_PARENT_INVALID" });
      await expect(tasks.updateTaskById({ taskId: a.taskId, partOf: temp })).rejects.toMatchObject({ code: "TASK_PARENT_INVALID" });
      await expect(tasks.createTaskWithLocalContextFiles({ projectId, description: "B", localContextFiles: [], partOf: temp })).rejects.toMatchObject({ code: "TASK_PARENT_INVALID" });
      expect((await stored(a.taskId)).partOfTaskId).toBeNull();
    });
  });

  describe("closing a parent (REQ-016, REQ-017)", () => {
    const family = async () => {
      const parent = await create("Parent");
      const todo = await create("Todo part", { partOfTaskId: parent.taskId });
      const running = await create("Running part", { partOfTaskId: parent.taskId });
      const done = await create("Done part", { partOfTaskId: parent.taskId });
      const cancelled = await create("Cancelled part", { partOfTaskId: parent.taskId });
      const outsider = await create("Not a part");
      await setStatus(running.taskId, "IN_PROGRESS");
      await setStatus(done.taskId, "DONE");
      await setStatus(cancelled.taskId, "CANCELLED");
      await assign(running.taskId, "running-worker");
      await tasks.drainRuntimeReleases();
      release.mockClear();
      return { parent, todo, running, done, cancelled, outsider };
    };

    for (const status of ["CANCELLED", "DONE"] as const) {
      it(`${status} on a parent sets its open parts to ${status}, closing their task agents; Done and Cancelled parts keep theirs (AC-018)`, async () => {
        const { parent, todo, running, done, cancelled, outsider } = await family();
        const doneBytes = await fs.readFile(taskFile(done.taskId), "utf8");
        await publisher.idle();
        emitted.length = 0;
        const ack = await setStatus(parent.taskId, status);
        expect(ack).toEqual({ projectId, taskId: parent.taskId, taskReference: parent.taskKey, status, dependsOnTaskIds: [], partOfTaskId: null,
          closedPartReferences: [todo.taskKey, running.taskKey] });
        expect((await stored(todo.taskId)).status).toBe(status);
        expect((await stored(running.taskId)).status).toBe(status);
        expect((await stored(done.taskId)).status).toBe("DONE");
        expect(await fs.readFile(taskFile(done.taskId), "utf8")).toBe(doneBytes);
        expect((await stored(cancelled.taskId)).status).toBe("CANCELLED");
        expect((await stored(outsider.taskId)).status).toBe("TODO");
        expect(tasks.isOpen({ agentRunId: "running-worker" })).toBe(false);
        await tasks.drainRuntimeReleases();
        expect(release).toHaveBeenCalledWith(hostRoot, [{ agentRunId: "running-worker" }]);
        await publisher.idle();
        expect(upserts().map((t) => [t.taskId, t.status])).toEqual(expect.arrayContaining([[parent.taskId, status], [todo.taskId, status], [running.taskId, status]]));
      });
    }

    it("a same-status write, a reopen and a part's own close never cascade; DONE → CANCELLED reaches parts still open (AC-018, REQ-005)", async () => {
      const { parent, todo, running } = await family();
      await setStatus(parent.taskId, "DONE");
      await setStatus(todo.taskId, "TODO");
      // DONE → DONE changes no status, so nothing cascades.
      expect(await setStatus(parent.taskId, "DONE")).not.toHaveProperty("closedPartReferences");
      expect((await stored(todo.taskId)).status).toBe("TODO");
      // Reopening the parent leaves the parts as they are.
      expect(await setStatus(parent.taskId, "IN_PROGRESS")).not.toHaveProperty("closedPartReferences");
      expect([(await stored(todo.taskId)).status, (await stored(running.taskId)).status]).toEqual(["TODO", "DONE"]);
      await setStatus(parent.taskId, "DONE");
      await setStatus(todo.taskId, "TODO");
      expect((await setStatus(parent.taskId, "CANCELLED")).closedPartReferences).toEqual([todo.taskKey]);
      expect([(await stored(todo.taskId)).status, (await stored(running.taskId)).status]).toEqual(["CANCELLED", "DONE"]);
      // Closing every part never changes the parent (DEC-002).
      const other = await create("Other parent");
      const only = await create("Only part", { partOfTaskId: other.taskId });
      expect(await setStatus(only.taskId, "DONE")).not.toHaveProperty("closedPartReferences");
      expect((await stored(other.taskId)).status).toBe("TODO");
    });

    it("a part attached to or created under a closed parent keeps its own status (DEC-018)", async () => {
      const parent = await create("Parent");
      await setStatus(parent.taskId, "DONE");
      const late = await create("Late part", { partOfTaskId: parent.taskId });
      const moved = await create("Moved part");
      await setParent(moved.taskId, parent.taskId, "Moved part");
      expect([(await stored(late.taskId)).status, (await stored(moved.taskId)).status]).toEqual(["TODO", "TODO"]);
    });

    it("a part that fails to close is logged and skipped; the parent and the other parts close (QR-005)", async () => {
      const { parent, todo, running } = await family();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const updateTask = store.updateTask.bind(store);
      vi.spyOn(store, "updateTask").mockImplementation(async (project, taskId, updater) => {
        if (taskId === todo.taskId) throw new Error("disk full");
        return updateTask(project, taskId, updater);
      });
      const ack = await setStatus(parent.taskId, "CANCELLED");
      expect(ack).toMatchObject({ status: "CANCELLED", closedPartReferences: [running.taskKey] });
      expect(warn).toHaveBeenCalledWith("TASK_PART_CLOSE_FAILED", expect.objectContaining({ projectId, taskId: parent.taskId, partTaskId: todo.taskId, error: "disk full" }));
      expect((await stored(todo.taskId)).status).toBe("TODO");
      expect((await stored(parent.taskId)).status).toBe("CANCELLED");
    });

    it("the cascade also runs when the same update_task changes the parent's relations (inside the relations lock)", async () => {
      const parent = await create("Parent");
      const part = await create("Part", { partOfTaskId: parent.taskId });
      const other = await create("Other");
      const ack = await tasks.updateTaskById({ taskId: parent.taskId, status: "DONE", dependsOn: [other.taskKey] });
      expect(ack).toMatchObject({ status: "DONE", dependsOnTaskIds: [other.taskId], closedPartReferences: [part.taskKey] });
      expect((await stored(part.taskId)).status).toBe("DONE");
    });
  });

  describe("deleting and publishing", () => {
    it("deleting a parent leaves its parts without a parent, updatedAt kept, republished; deleting a part leaves the parent (AC-007)", async () => {
      const a = await create("A");
      const b = await create("B", { partOfTaskId: a.taskId });
      const c = await create("C", { partOfTaskId: a.taskId, dependsOnTaskIds: [a.taskId] });
      const d = await create("D");
      await publisher.idle();
      emitted.length = 0;
      expect(await tasks.deleteTask({ projectId, taskId: c.taskId })).toBe(true);
      expect((await readJson(taskFile(a.taskId))).updatedAt).toBe(a.updatedAt);
      expect(await tasks.deleteTask({ projectId, taskId: a.taskId })).toBe(true);
      await publisher.idle();
      expect(await readJson(taskFile(b.taskId))).toMatchObject({ partOfTaskId: null, updatedAt: b.updatedAt });
      expect((await readJson(taskFile(d.taskId))).updatedAt).toBe(d.updatedAt);
      expect(upserts().filter((t) => t.taskId === b.taskId).at(-1)).toMatchObject({ partOfTaskId: null });
      expect(emitted).toContainEqual(expect.objectContaining({ type: "task_removed", taskId: a.taskId }));
    });

    it("a cleanup that runs after a re-parent never overwrites the new parent", async () => {
      const a = await create("A");
      const b = await create("B");
      const part = await create("P", { partOfTaskId: a.taskId });
      const updateTask = store.updateTask.bind(store);
      // The part moves to B between the cleanup's list and its write.
      vi.spyOn(store, "updateTask").mockImplementationOnce(async (project, taskId, updater) => {
        await updateTask(project, taskId, (task) => ({ ...task, partOfTaskId: b.taskId }));
        return updateTask(project, taskId, updater);
      });
      await tasks.deleteTask({ projectId, taskId: a.taskId });
      expect((await stored(part.taskId)).partOfTaskId).toBe(b.taskId);
    });

    it("task_upserted carries partOfTaskId (AC-008)", async () => {
      const a = await create("A");
      const b = await create("B", { partOfTaskId: a.taskId });
      await publisher.idle();
      expect(upserts()).toEqual(expect.arrayContaining([
        expect.objectContaining({ taskId: a.taskId, partOfTaskId: null }),
        expect.objectContaining({ taskId: b.taskId, partOfTaskId: a.taskId }),
      ]));
    });

    it("parts never block delegation or status changes of a part or its parent (AC-006, REQ-005)", async () => {
      const a = await create("A");
      const b = await create("B", { partOfTaskId: a.taskId });
      await expect(assign(b.taskId, "part-worker")).resolves.toEqual({ taskId: b.taskId });
      await expect(assign(a.taskId, "parent-worker")).resolves.toEqual({ taskId: a.taskId });
      await expect(setStatus(b.taskId, "DONE")).resolves.toMatchObject({ status: "DONE" });
      expect((await stored(a.taskId)).status).toBe("TODO");
      expect(tasks.isOpen({ agentRunId: "parent-worker" })).toBe(true);
    });
  });
});
