import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../../src/projects/services/project-service.js";
import * as taskServices from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskService } from "../../../../src/projects/services/project-task-service.js";
import * as searchServices from "../../../../src/projects/search/project-task-search-service.js";
import { ProjectTaskContextStore } from "../../../../src/projects/context/project-task-context-store.js";
import { AdHocTaskStore } from "../../../../src/projects/stores/ad-hoc-task-store.js";
import { AdHocTasksLayout } from "../../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { createRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import { PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseUpdateTaskInput } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";

/** task-comments: `update_task add_comment`; comments in `list_project_tasks`, `commentCount` in `search_project_tasks`; `partsNotClosed` (REQ-005, REQ-008, REQ-011). */
const tool = async (name: string, args: Record<string, unknown>) => {
  const result = await new ProjectTaskToolsMcpAdapterProvider().getAdapters().find((a) => a.definition.name === name)!
    .execute({ rawArguments: args, session: {} as never });
  if (result.kind !== "mcp_tool_result") throw new Error("Expected structured result");
  return result.result.structuredContent as Record<string, any>;
};
const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
let dir: string, layout: ProjectsLayout, store: ProjectStore, projects: ProjectService, tasks: ProjectTaskService, projectId: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-comments-tools-"));
  layout = new ProjectsLayout(path.join(dir, "projects"));
  store = new ProjectStore(layout);
  const changes = { taskChanged() {}, taskRemoved() {}, workerStatusChanged() {}, projectChanged() {}, projectRemoved() {} };
  projects = new ProjectService({ store, changes, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } });
  tasks = new ProjectTaskService({ store, changes, contextStore: new ProjectTaskContextStore(layout),
    adHocTasks: new AdHocTaskStore(new AdHocTasksLayout(path.join(dir, "ad-hoc-tasks"))),
    requestRelease: vi.fn<TaskExecutionReleaseRequest>(async (_root, runs) => runs.map((execution) => ({ execution, stopped: true }))) });
  await tasks.load();
  vi.spyOn(taskServices, "getProjectTaskService").mockImplementation(() => tasks);
  projectId = (await projects.createProject({ name: "AutoByteus" })).projectId;
});
afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });

const create = async (description: string, extra: Record<string, unknown> = {}) => (await tool("create_task", { project_id: projectId, title: description, description, ...extra })).task;
const idOfKey = async (key: string) => (await store.listTasks(projectId)).find((t) => t.taskKey === key)!.taskId;

describe("update_task add_comment (AC-001, REQ-005)", () => {
  it("appends one comment per call, by key or long ID; the result has no comment field; combined with status in one write", async () => {
    const task = await create("Cross-node collaboration");
    expect(await tool("update_task", { task_id: "AutoByteus-1", add_comment: "Dispatched with this direction." }))
      .toEqual({ task: { projectId, taskId: "autobyteus-1", title: "Cross-node collaboration", status: "TODO" } });
    await tool("update_task", { task_id: await idOfKey(task.taskId), add_comment: "User decided: keep it small." });
    expect(await tool("update_task", { task_id: task.taskId, status: "DONE", add_comment: "Merged and released." }))
      .toEqual({ task: { projectId, taskId: "autobyteus-1", title: "Cross-node collaboration", status: "DONE" } });
    const saved = (await store.readTask(projectId, await idOfKey(task.taskId)))!;
    expect(saved.comments.map((c) => [c.id, c.text])).toEqual([[1, "Dispatched with this direction."], [2, "User decided: keep it small."], [3, "Merged and released."]]);
    expect(saved).toMatchObject({ description: "Cross-node collaboration", status: "DONE" });
  });

  it("refuses blank text, a Temp task and an unknown Task with nothing written", async () => {
    const task = await create("A");
    const bytes = await fs.readFile(layout.taskFile(projectId, await idOfKey(task.taskId)), "utf8");
    expect(await tool("update_task", { task_id: task.taskId, status: "DONE", add_comment: "   " })).toMatchObject({ error: { code: "TASK_COMMENT_INVALID" } });
    expect(await tool("update_task", { task_id: "autobyteus-9", add_comment: "x" })).toMatchObject({ error: { code: "TASK_NOT_FOUND" } });
    const { taskId: temp } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/w", hostRoot,
      execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
    expect(await tool("update_task", { task_id: temp, add_comment: "x" })).toMatchObject({ error: { code: "TASK_COMMENT_INVALID" } });
    expect(await fs.readFile(layout.taskFile(projectId, await idOfKey(task.taskId)), "utf8")).toBe(bytes);
  });

  it("checks the argument's shape: a string, trimmed, blank refused (not ignored); add_comment alone is a change", () => {
    expect(parseUpdateTaskInput({ task_id: "t", add_comment: "  note \n" })).toEqual({ task_id: "t", add_comment: "note" });
    expect(() => parseUpdateTaskInput({ task_id: "t", add_comment: " " })).toThrow(expect.objectContaining({ code: "TASK_COMMENT_INVALID" }));
    for (const add_comment of [null, 7, ["x"], {}]) {
      expect(() => parseUpdateTaskInput({ task_id: "t", add_comment })).toThrow(expect.objectContaining({ code: "PROJECT_TOOL_ARGUMENT_INVALID" }));
    }
    expect(() => parseUpdateTaskInput({ task_id: "t" })).toThrow(expect.objectContaining({ code: "TASK_PATCH_REQUIRED",
      message: "Supply title, description, status, context_files, depends_on, part_of and/or add_comment to update a Task." }));
  });

  it("is a string parameter of update_task only, described in one line; no new tool (REQ-010, AC-008)", () => {
    expect(buildProjectTaskToolSchema("update_task").parameters.find((p) => p.name === "add_comment")).toMatchObject({ required: false });
    expect(buildProjectTaskToolSchema("create_task").parameters.some((p) => p.name === "add_comment")).toBe(false);
    expect(PROJECT_TASK_TOOL_DESCRIPTIONS.update_task).toContain("Optional add_comment (Project Tasks only): text added as a new comment at the end of the Task's comments; the description is not changed. Each call adds one comment.");
    expect(new ProjectTaskToolsMcpAdapterProvider().getAdapters().map((a) => a.definition.name).filter((name) => /comment/i.test(name))).toEqual([]);
  });
});

describe("comments in Task reads (AC-005)", () => {
  it("list_project_tasks shows the comment count and get_project_task the comment texts oldest first; no field when there are none", async () => {
    const a = await create("A");
    await create("B");
    await tool("update_task", { task_id: a.taskId, add_comment: "first" });
    await tasks.addComment({ projectId, taskId: await idOfKey(a.taskId), text: "second\nline" });
    const short = new Map(((await tool("list_project_tasks", { project_id: projectId })).tasks as Array<Record<string, unknown>>).map((t) => [t.taskId, t]));
    expect(short.get("autobyteus-1")).toMatchObject({ commentCount: 2 });
    expect(short.get("autobyteus-1")).not.toHaveProperty("comments");
    expect(short.get("autobyteus-2")).not.toHaveProperty("commentCount");
    expect((await tool("get_project_task", { project_id: projectId, task_id: "autobyteus-1" })).comments).toEqual(["first", "second\nline"]);
    expect(await tool("get_project_task", { project_id: projectId, task_id: "autobyteus-2" })).not.toHaveProperty("comments");
  });

  it("search_project_tasks gives each result's comment count, absent when 0 (the exact tier's comment match: project-task-search.test.ts)", async () => {
    const a = await create("Release the desktop app");
    await create("Sidebar collapse");
    await tool("update_task", { task_id: a.taskId, add_comment: "Ship the ARM64 build first." });
    await tool("update_task", { task_id: a.taskId, add_comment: "Then Intel." });
    vi.spyOn(searchServices, "getProjectTaskSearchService").mockImplementation(() => ({
      search: async (id: string) => ({ matches: (await tasks.listTasks(id)).map((task) => ({ task, match: "exact" as const })), meaningSearch: { state: "ready" as const } }),
    }) as never);
    const found = new Map(((await tool("search_project_tasks", { project_id: projectId, query: "anything" })).tasks as Array<Record<string, unknown>>).map((t) => [t.taskId, t]));
    expect(found.get("autobyteus-1")).toEqual({ taskId: "autobyteus-1", status: "TODO", title: "Release the desktop app", match: "exact", commentCount: 2 });
    expect(found.get("autobyteus-2")).not.toHaveProperty("commentCount");
  });
});

describe("partsNotClosed in the update_task result (AC-009, REQ-011)", () => {
  it("lists the parts a parent's close could not close by key, next to closedParts; absent when all closed", async () => {
    await create("Parent");
    await create("Closes", { part_of: "autobyteus-1" });
    await create("Fails", { part_of: "autobyteus-1" });
    const failing = await idOfKey("autobyteus-3");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const updateTask = store.updateTask.bind(store);
    vi.spyOn(store, "updateTask").mockImplementation(async (project, taskId, updater) => {
      if (taskId === failing) throw new Error("disk full");
      return updateTask(project, taskId, updater);
    });
    expect(await tool("update_task", { task_id: "autobyteus-1", status: "CANCELLED" })).toEqual({ task: { projectId, taskId: "autobyteus-1",
      title: "Parent", status: "CANCELLED", closedParts: ["autobyteus-2"], partsNotClosed: ["autobyteus-3"] } });
    vi.mocked(store.updateTask).mockRestore();
    expect(await tool("update_task", { task_id: "autobyteus-1", status: "DONE" })).toEqual({ task: { projectId, taskId: "autobyteus-1",
      title: "Parent", status: "DONE", closedParts: ["autobyteus-3"] } });
  });
});
