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

/** Task comments through the real Project and Task services over a private data root and a real publisher (task-comments). */
describe("Project Task comments (services)", () => {
  let appData: string, layout: ProjectsLayout, store: ProjectStore, publisher: ProjectChangePublisher;
  let projects: ProjectService, tasks: ProjectTaskService, emitted: ProjectChangeMessage[], projectId: string;
  let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 9, 22, 8, 0, tick++));
  const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
  const taskFile = (taskId: string) => layout.taskFile(projectId, taskId);
  const create = (description: string, partOfTaskId?: string) => tasks.createTask({ projectId, title: description, description, ...(partOfTaskId ? { partOfTaskId } : {}) });
  const stored = async (taskId: string) => (await store.readTask(projectId, taskId))!;
  const upserts = () => emitted.flatMap((m) => m.type === "task_upserted" && m.scope.kind === "project" ? [m.task] : []);

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-comments-"));
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

  describe("adding comments", () => {
    it("update_task's addComment appends with the next number and the server time, by key (any case) or long ID; the description and ack are unchanged (AC-001)", async () => {
      const task = await create("Cross-node collaboration");
      expect(await readJson(taskFile(task.taskId))).toMatchObject({ comments: [] });
      const ack = await tasks.updateTaskById({ taskId: "AutoByteus-1", addComment: "  Decision: use X  " });
      expect(ack).toEqual({ projectId, taskId: task.taskId, taskReference: "autobyteus-1", title: task.title, status: "TODO", dependsOnTaskIds: [], partOfTaskId: null });
      await tasks.updateTaskById({ taskId: task.taskId, addComment: "Second thought" });
      const saved = await stored(task.taskId);
      expect(saved.comments).toEqual([
        { id: 1, createdAt: expect.stringMatching(/^2026-10-22T08:00:\d{2}\.000Z$/), text: "Decision: use X" },
        { id: 2, createdAt: expect.any(String), text: "Second thought" },
      ]);
      expect(saved.comments[1]!.createdAt > saved.comments[0]!.createdAt).toBe(true);
      expect(saved.description).toBe("Cross-node collaboration");
      expect(saved.updatedAt).toBe(saved.comments[1]!.createdAt);
      expect(saved.updatedAt > task.updatedAt).toBe(true);
    });

    it("the app's addComment appends the same way and returns the Task; blank text is refused (AC-003)", async () => {
      const task = await create("A");
      const view = await tasks.addComment({ projectId, taskId: task.taskId, text: "From the app\nwith two lines" });
      expect(view.comments).toEqual([{ id: 1, createdAt: expect.any(String), text: "From the app\nwith two lines" }]);
      await expect(tasks.addComment({ projectId, taskId: task.taskId, text: "   " })).rejects.toMatchObject({ code: "TASK_COMMENT_INVALID" });
      await expect(tasks.addComment({ projectId, taskId: "project_task_missing", text: "x" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
      expect((await stored(task.taskId)).comments).toHaveLength(1);
    });

    it("status and a comment in one call are one write; a blank comment, a Temp task or an unknown Task writes nothing, not even the status (AC-001)", async () => {
      const task = await create("A");
      await tasks.linkNewTaskExecution({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot, execution: { agentRunId: "worker" } });
      const writes = vi.spyOn(store, "updateTask");
      const bytes = await fs.readFile(taskFile(task.taskId), "utf8");
      await expect(tasks.updateTaskById({ taskId: task.taskId, status: "DONE", addComment: " \n " })).rejects.toMatchObject({ code: "TASK_COMMENT_INVALID" });
      await expect(tasks.updateTaskById({ taskId: "autobyteus-99", status: "DONE", addComment: "x" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
      expect(writes).not.toHaveBeenCalled();
      expect(await fs.readFile(taskFile(task.taskId), "utf8")).toBe(bytes);
      expect(tasks.isOpen({ agentRunId: "worker" })).toBe(true);
      const { taskId: temp } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", hostRoot,
        execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
      await expect(tasks.updateTaskById({ taskId: temp, status: "DONE", addComment: "x" })).rejects.toMatchObject({ code: "TASK_COMMENT_INVALID" });
      expect(tasks.isOpen({ agentRunId: "temp-worker" })).toBe(true);
      writes.mockRestore();
      expect(await tasks.updateTaskById({ taskId: task.taskId, status: "DONE", addComment: "Merged and released." })).toMatchObject({ status: "DONE" });
      expect(await stored(task.taskId)).toMatchObject({ status: "DONE", comments: [{ id: 1, text: "Merged and released." }] });
      expect(tasks.isOpen({ agentRunId: "worker" })).toBe(false);
    });

    it("concurrent comments from an agent and the app are both kept with distinct consecutive numbers (AC-002, QR-001)", async () => {
      const task = await create("A");
      await Promise.all([
        tasks.updateTaskById({ taskId: task.taskId, addComment: "from the agent" }),
        tasks.addComment({ projectId, taskId: task.taskId, text: "from the user" }),
        tasks.updateTaskById({ taskId: task.taskId, description: "A edited", addComment: "with an edit" }),
      ]);
      const saved = await stored(task.taskId);
      expect(saved.comments.map((c) => c.id)).toEqual([1, 2, 3]);
      expect(saved.comments.map((c) => c.text).sort()).toEqual(["from the agent", "from the user", "with an edit"]);
      expect(saved.description).toBe("A edited");
    });

    it("task_upserted carries the thread, and delegation gets the texts in order (AC-008-wire, AC-010)", async () => {
      const task = await create("A");
      await tasks.updateTaskById({ taskId: task.taskId, addComment: "first" });
      await tasks.addComment({ projectId, taskId: task.taskId, text: "second" });
      await publisher.idle();
      expect(upserts().filter((t) => t.taskId === task.taskId).at(-1)!.comments.map((c) => [c.id, c.text])).toEqual([[1, "first"], [2, "second"]]);
      expect(await tasks.resolveAssignment("autobyteus-1")).toEqual({ taskId: task.taskId, taskReference: "autobyteus-1", projectId, title: task.title, description: "A",
        comments: ["first", "second"], referenceFiles: [] });
    });
  });

  describe("parts a parent's close could not close (autobyteus-187, AC-009)", () => {
    it("names the failed part by key next to closedParts; absent when every part closed", async () => {
      const parent = await create("Parent");
      const ok = await create("Closes", parent.taskId);
      const failing = await create("Fails", parent.taskId);
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const updateTask = store.updateTask.bind(store);
      vi.spyOn(store, "updateTask").mockImplementation(async (project, taskId, updater) => {
        if (taskId === failing.taskId) throw new Error("disk full");
        return updateTask(project, taskId, updater);
      });
      expect(await tasks.updateTaskById({ taskId: parent.taskId, status: "DONE" })).toMatchObject({
        closedPartReferences: [ok.taskKey], partsNotClosedReferences: [failing.taskKey] });
      vi.mocked(store.updateTask).mockRestore();
      const other = await create("Other parent");
      await create("Part", other.taskId);
      const all = await tasks.updateTaskById({ taskId: other.taskId, status: "CANCELLED" });
      expect(all).toHaveProperty("closedPartReferences");
      expect(all).not.toHaveProperty("partsNotClosedReferences");
    });
  });
});
