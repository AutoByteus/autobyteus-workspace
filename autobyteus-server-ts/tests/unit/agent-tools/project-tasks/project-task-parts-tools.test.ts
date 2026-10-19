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
import { PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseCreateTaskInput, parseUpdateTaskInput } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";

/** task-part-of: `part_of` on create_task / update_task; `partOf`, `parts` and `closedParts` by key in tool results (REQ-013, REQ-014, REQ-017). */
const tool = async (name: string, args: Record<string, unknown>) => {
  const result = await new ProjectTaskToolsMcpAdapterProvider().getAdapters().find((a) => a.definition.name === name)!
    .execute({ rawArguments: args, session: {} as never });
  if (result.kind !== "mcp_tool_result") throw new Error("Expected structured result");
  return result.result.structuredContent as Record<string, any>;
};
const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
let dir: string, layout: ProjectsLayout, store: ProjectStore, projects: ProjectService, tasks: ProjectTaskService, projectId: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-parts-tools-"));
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

const create = async (description: string, extra: Record<string, unknown> = {}) => (await tool("create_task", { project_id: projectId, description, ...extra })).task;
const idOfKey = async (key: string) => (await store.listTasks(projectId)).find((t) => t.taskKey === key)!.taskId;
/** Creates Tasks until the next key would be `autobyteus-<number>`. */
const skipTo = async (number: number) => { while ((await store.listTasks(projectId)).length < number - 1) await create("filler"); };

describe("part_of through the tools (AC-014)", () => {
  it("stores the long ID, shows the key; accepts any letter case and the long ID; replaces, clears with \"\", omitted keeps", async () => {
    const parent = await create("Parent");
    const other = await create("Other parent");
    const part = await create("Part", { part_of: "AutoByteus-1" });
    expect(part).toEqual({ projectId, taskId: "autobyteus-3", status: "TODO", dependsOn: [], partOf: "autobyteus-1" });
    expect((await store.readTask(projectId, await idOfKey("autobyteus-3")))!.partOfTaskId).toBe(await idOfKey(parent.taskId));
    expect((await tool("update_task", { task_id: part.taskId, part_of: await idOfKey(other.taskId) })).task.partOf).toBe("autobyteus-2");
    expect((await tool("update_task", { task_id: part.taskId, description: "Part kept" })).task.partOf).toBe("autobyteus-2");
    expect((await tool("update_task", { task_id: part.taskId, part_of: "" })).task).toEqual({ projectId, taskId: "autobyteus-3", status: "TODO", dependsOn: [], partOf: null });
    expect((await store.readTask(projectId, await idOfKey("autobyteus-3")))!.partOfTaskId).toBeNull();
  });

  it("refuses unknown, self, nested and Temp-task parents with nothing written", async () => {
    const parent = await create("Parent");
    const part = await create("Part", { part_of: parent.taskId });
    const before = await Promise.all([parent, part].map(async (t) => fs.readFile(layout.taskFile(projectId, await idOfKey(t.taskId)), "utf8")));
    const { taskId: temp } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/w", hostRoot,
      execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
    for (const args of [{ task_id: part.taskId, part_of: "autobyteus-99" }, { task_id: part.taskId, part_of: part.taskId },
      { task_id: parent.taskId, part_of: part.taskId }, { task_id: part.taskId, part_of: temp }, { task_id: temp, part_of: parent.taskId }]) {
      expect(await tool("update_task", args)).toMatchObject({ error: { code: "TASK_PARENT_INVALID" } });
    }
    expect(await tool("create_task", { project_id: projectId, description: "Nested", part_of: part.taskId })).toMatchObject({ error: { code: "TASK_PARENT_INVALID" } });
    expect(await Promise.all([parent, part].map(async (t) => fs.readFile(layout.taskFile(projectId, await idOfKey(t.taskId)), "utf8")))).toEqual(before);
    expect((await store.listTasks(projectId))).toHaveLength(2);
  });

  it("checks the argument's shape: create_task needs a non-empty taskId; update_task takes \"\" as a change", () => {
    expect(parseCreateTaskInput({ project_id: "p", description: "x", part_of: " autobyteus-1 " })).toEqual({ project_id: "p", description: "x", part_of: "autobyteus-1" });
    for (const part_of of ["", " ", null, 7, ["autobyteus-1"]]) {
      expect(() => parseCreateTaskInput({ project_id: "p", description: "x", part_of })).toThrow(expect.objectContaining({ code: "PROJECT_TOOL_ARGUMENT_INVALID" }));
    }
    expect(parseUpdateTaskInput({ task_id: "t", part_of: "" })).toEqual({ task_id: "t", part_of: "" });
    expect(parseUpdateTaskInput({ task_id: "t", part_of: " autobyteus-1 " })).toEqual({ task_id: "t", part_of: "autobyteus-1" });
    for (const part_of of [null, 7, {}]) {
      expect(() => parseUpdateTaskInput({ task_id: "t", part_of })).toThrow(expect.objectContaining({ code: "PROJECT_TOOL_ARGUMENT_INVALID" }));
    }
    expect(() => parseUpdateTaskInput({ task_id: "t" })).toThrow(expect.objectContaining({ code: "TASK_PATCH_REQUIRED" }));
  });

  it("documents part_of and the parent-close effect in the existing voice", () => {
    for (const name of ["create_task", "update_task"] as const) {
      expect(buildProjectTaskToolSchema(name).parameters.find((p) => p.name === "part_of")).toMatchObject({ required: false });
      expect(PROJECT_TASK_TOOL_DESCRIPTIONS[name]).toContain("one level only (a part can't have parts)");
    }
    expect(PROJECT_TASK_TOOL_DESCRIPTIONS.update_task).toContain("Setting a Task that has parts to DONE or CANCELLED also sets its open parts the same way (stopping their task agents); closedParts lists them.");
    expect(PROJECT_TASK_TOOL_DESCRIPTIONS.update_task).toContain('"" clears it');
    for (const name of ["list_project_tasks", "search_project_tasks"] as const) expect(PROJECT_TASK_TOOL_DESCRIPTIONS[name]).toMatch(/partOf.*parts/);
  });
});

describe("partOf and parts in Task reads (AC-015)", () => {
  it("list_project_tasks shows each Task's parent key (or null) and its parts' keys in number order, also across a status filter", async () => {
    const parent = await create("Cross-node collaboration");
    expect(parent.taskId).toBe("autobyteus-1");
    await skipTo(9);
    const late = await create("Slice B", { part_of: "autobyteus-1" });
    const early = await create("Slice A", { part_of: "autobyteus-1" });
    expect([late.taskId, early.taskId]).toEqual(["autobyteus-9", "autobyteus-10"]);
    const third = await create("Slice C");
    await tool("update_task", { task_id: third.taskId, part_of: "autobyteus-1" });
    await tool("update_task", { task_id: "autobyteus-2", part_of: "autobyteus-1" });
    await tool("update_task", { task_id: "autobyteus-2", status: "DONE" });
    const listed = (await tool("list_project_tasks", { project_id: projectId })).tasks as Array<Record<string, unknown>>;
    const byKey = new Map(listed.map((t) => [t.taskId, t]));
    // Number order, as the app lists them: a string sort would put autobyteus-10 first.
    expect(byKey.get("autobyteus-1")).toMatchObject({ partOf: null, parts: ["autobyteus-2", "autobyteus-9", "autobyteus-10", "autobyteus-11"] });
    expect(byKey.get("autobyteus-9")).toMatchObject({ partOf: "autobyteus-1", parts: [] });
    expect(byKey.get("autobyteus-3")).toMatchObject({ partOf: null, parts: [] });
    expect(JSON.stringify(listed.map(({ contextFiles: _f, ...fields }) => fields))).not.toContain("project_task_");
    const done = (await tool("list_project_tasks", { project_id: projectId, status: "DONE" })).tasks;
    expect(done).toEqual([expect.objectContaining({ taskId: "autobyteus-2", partOf: "autobyteus-1", parts: [] })]);
  });

  it("search_project_tasks shows each result's parent and parts by key", async () => {
    const parent = await create("Docker image release");
    await create("Docker push step", { part_of: parent.taskId });
    vi.spyOn(searchServices, "getProjectTaskSearchService").mockImplementation(() => ({
      search: async (id: string) => ({ matches: (await tasks.listTasks(id)).map((task) => ({ task, match: "exact" as const })), meaningSearch: { state: "ready" as const } }),
    }) as never);
    const found = (await tool("search_project_tasks", { project_id: projectId, query: "docker" })).tasks as Array<Record<string, unknown>>;
    expect(new Map(found.map((t) => [t.taskId, [t.partOf, t.parts]]))).toEqual(new Map([["autobyteus-1", [null, ["autobyteus-2"]]], ["autobyteus-2", ["autobyteus-1", []]]]));
  });
});

describe("closedParts in the update_task result (AC-018, REQ-017)", () => {
  it("lists the keys of the parts the parent's DONE or CANCELLED closed; absent when it closed none", async () => {
    const parent = await create("Parent");
    const a = await create("A", { part_of: parent.taskId });
    const b = await create("B", { part_of: parent.taskId });
    await create("C", { part_of: parent.taskId });
    await tool("update_task", { task_id: "autobyteus-4", status: "DONE" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: await idOfKey(b.taskId), assignedBy: "manager", hostRoot, execution: { agentRunId: "b-worker" } });
    const result = await tool("update_task", { task_id: parent.taskId, status: "CANCELLED" });
    expect(result).toEqual({ task: { projectId, taskId: "autobyteus-1", status: "CANCELLED", dependsOn: [], partOf: null, closedParts: [a.taskId, b.taskId] } });
    expect(tasks.isOpen({ agentRunId: "b-worker" })).toBe(false);
    expect((await store.readTask(projectId, await idOfKey("autobyteus-4")))!.status).toBe("DONE");
    expect(await tool("update_task", { task_id: parent.taskId, status: "DONE" })).toEqual({ task: { projectId, taskId: "autobyteus-1", status: "DONE", dependsOn: [], partOf: null } });
  });
});
