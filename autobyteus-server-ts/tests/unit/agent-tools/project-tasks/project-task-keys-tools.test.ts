import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../../src/projects/services/project-service.js";
import * as taskServices from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskService } from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../../../src/projects/context/project-task-context-store.js";
import { AdHocTaskStore } from "../../../../src/projects/stores/ad-hoc-task-store.js";
import { AdHocTasksLayout } from "../../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { createRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";

/** SR-002 / SR-003: the key is the agent-facing Task ID; tools take keys or long IDs and record "depends on". */
const tool = async (name: string, args: Record<string, unknown>) => {
  const result = await new ProjectTaskToolsMcpAdapterProvider().getAdapters().find((a) => a.definition.name === name)!
    .execute({ rawArguments: args, session: {} as never });
  if (result.kind !== "mcp_tool_result") throw new Error("Expected structured result");
  return result.result.structuredContent as Record<string, any>;
};
const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
let dir: string, layout: ProjectsLayout, store: ProjectStore, projects: ProjectService, tasks: ProjectTaskService, projectId: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-keys-tools-"));
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
const files = async () => {
  const out: Record<string, string> = {};
  const walk = async (d: string) => { for (const e of await fs.readdir(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) await walk(full); else out[full] = await fs.readFile(full, "utf8");
  } };
  await walk(layout.root);
  return out;
};

describe("keys as the agent-facing Task ID (REQ-018, REQ-019; AC-020, AC-022)", () => {
  it("every Task-ID field shows the key; no long Task ID in them, while saved context data keeps its stored form", async () => {
    const a = await create("A");
    const b = await create("B", { depends_on: [a.taskId] });
    expect([a, b]).toEqual([
      { projectId, taskId: "autobyteus-1", status: "TODO", dependsOn: [], partOf: null },
      { projectId, taskId: "autobyteus-2", status: "TODO", dependsOn: ["autobyteus-1"], partOf: null },
    ]);
    const listed = await tool("list_project_tasks", { project_id: projectId });
    expect(listed.tasks.map((t: Record<string, unknown>) => [t.taskId, t.dependsOn])).toEqual([["autobyteus-2", ["autobyteus-1"]], ["autobyteus-1", []]]);
    const idFields = listed.tasks.map(({ contextFiles: _files, ...fields }: Record<string, unknown>) => fields);
    expect(JSON.stringify(idFields)).not.toContain("project_task_");
    const updated = await tool("update_task", { task_id: "autobyteus-2", status: "IN_PROGRESS" });
    expect(updated.task).toEqual({ projectId, taskId: "autobyteus-2", status: "IN_PROGRESS", dependsOn: ["autobyteus-1"], partOf: null });
  });

  it("update_task acts on the same Task by key, by long ID and by key in any letter case; unknown keys fail as before", async () => {
    const a = await create("A");
    const id = await idOfKey(a.taskId);
    expect((await tool("update_task", { task_id: id, description: "by id" })).task.taskId).toBe("autobyteus-1");
    expect((await tool("update_task", { task_id: "AutoByteus-1", description: "by key" })).task.taskId).toBe("autobyteus-1");
    expect((await store.readTask(projectId, id))!.description).toBe("by key");
    expect(await tool("update_task", { task_id: "autobyteus-99", status: "DONE" })).toMatchObject({ error: { code: "TASK_NOT_FOUND" } });
  });

  it("a Temp task keeps its ID in update_task and gets no dependsOn; depends_on on it is refused", async () => {
    const { taskId } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/w", hostRoot,
      execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
    expect((await tool("update_task", { task_id: taskId, description: "Temp revised" })).task).toEqual({ projectId: null, taskId, status: "TODO" });
    expect(await tool("update_task", { task_id: taskId, depends_on: [] })).toMatchObject({ error: { code: "TASK_DEPENDENCY_INVALID" } });
  });

  it("delegation resolves a key (any case) or long ID to the stored ID; a Temp-task ID or unknown key is TASK_NOT_FOUND (AC-022, DEC-012)", async () => {
    const a = await create("A");
    const id = await idOfKey(a.taskId);
    expect(await tasks.resolveAssignment("AutoByteus-1")).toEqual({ taskId: id, taskReference: "autobyteus-1", description: "A", referenceFiles: [] });
    expect((await tasks.resolveAssignment(id)).taskId).toBe(id);
    const { taskId: temp } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/w", hostRoot,
      execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
    await expect(tasks.resolveAssignment(temp)).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    await expect(tasks.resolveAssignment("autobyteus-7")).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
  });
});

describe("depends_on through the tools (REQ-020, AC-024, REC-008)", () => {
  it("stores IDs, shows keys, replaces and clears; omitted keeps", async () => {
    const a = await create("A");
    const b = await create("B");
    const c = await create("C", { depends_on: [a.taskId, (await idOfKey(b.taskId))] });
    expect(c.dependsOn).toEqual(["autobyteus-1", "autobyteus-2"]);
    expect((await store.readTask(projectId, await idOfKey(c.taskId)))!.dependsOnTaskIds).toEqual([await idOfKey("autobyteus-1"), await idOfKey("autobyteus-2")]);
    expect((await tool("update_task", { task_id: c.taskId, description: "C kept" })).task.dependsOn).toEqual(["autobyteus-1", "autobyteus-2"]);
    expect((await tool("update_task", { task_id: c.taskId, depends_on: ["autobyteus-2"] })).task.dependsOn).toEqual(["autobyteus-2"]);
    expect((await tool("update_task", { task_id: c.taskId, depends_on: [] })).task.dependsOn).toEqual([]);
  });

  it("collapses repeated references to one Task (a repeated key, another letter case, key and long ID) on create and update (CR-001, REQ-007)", async () => {
    const a = await create("A");
    const idA = await idOfKey(a.taskId);
    const refs = [a.taskId, a.taskId, "AutoByteus-1", idA];
    const b = await create("B", { depends_on: refs });
    expect(b.dependsOn).toEqual(["autobyteus-1"]);
    const c = await create("C");
    const updated = (await tool("update_task", { task_id: c.taskId, depends_on: refs })).task;
    expect(updated.dependsOn).toEqual(["autobyteus-1"]);
    expect((await store.readTask(projectId, await idOfKey(c.taskId)))!.dependsOnTaskIds).toEqual([idA]);
    expect((await store.readTask(projectId, await idOfKey(b.taskId)))!.dependsOnTaskIds).toEqual([idA]);
  });

  it("refuses loops, other Projects' Tasks, Temp tasks and unknown references with TASK_DEPENDENCY_INVALID; nothing is written", async () => {
    const a = await create("A");
    const b = await create("B", { depends_on: [a.taskId] });
    const other = (await projects.createProject({ name: "Marketing" })).projectId;
    const foreign = (await tool("create_task", { project_id: other, description: "Foreign" })).task;
    const { taskId: temp } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/w", hostRoot,
      execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
    const before = await files();
    for (const depends_on of [[b.taskId], [foreign.taskId], [temp], ["autobyteus-77"], [a.taskId.toUpperCase().replace("AUTOBYTEUS", "nope")]]) {
      expect(await tool("update_task", { task_id: a.taskId, depends_on })).toMatchObject({ error: { code: "TASK_DEPENDENCY_INVALID" } });
    }
    expect(await tool("create_task", { project_id: projectId, description: "D", depends_on: [foreign.taskId] })).toMatchObject({ error: { code: "TASK_DEPENDENCY_INVALID" } });
    expect(await tool("update_task", { task_id: a.taskId, depends_on: [a.taskId] })).toMatchObject({ error: { code: "TASK_DEPENDENCY_INVALID" } });
    expect(await files()).toEqual(before);
  });

  it("parses depends_on as an array of non-empty strings; a depends_on-only update is a patch", async () => {
    const a = await create("A");
    for (const depends_on of ["autobyteus-1", [""], [3]]) {
      expect(await tool("update_task", { task_id: a.taskId, depends_on })).toMatchObject({ error: { code: "PROJECT_TOOL_ARGUMENT_INVALID" } });
    }
    expect((await tool("update_task", { task_id: a.taskId, depends_on: [] })).task).toMatchObject({ taskId: "autobyteus-1", dependsOn: [] });
  });

  it("a blocked Task can still be started and delegated through the tools (REQ-021, AC-027)", async () => {
    const a = await create("A");
    const b = await create("B", { depends_on: [a.taskId] });
    expect((await tool("update_task", { task_id: b.taskId, status: "IN_PROGRESS" })).task.status).toBe("IN_PROGRESS");
    const saved = await tasks.resolveAssignment(b.taskId);
    await expect(tasks.linkNewTaskExecution({ role: "assigned", taskId: saved.taskId, assignedBy: "manager", recipientAddress: "/w", hostRoot,
      execution: { agentRunId: "worker" } })).resolves.toEqual({ taskId: saved.taskId });
  });
});

describe("retired prefixes (REQ-003, AC-025)", () => {
  it("a deleted Project's prefix stays reserved, so its old keys never reach a new Task", async () => {
    await create("A");
    expect(await projects.deleteProject(projectId)).toBe(true);
    expect(JSON.parse(await fs.readFile(layout.retiredTaskKeyPrefixesFile(), "utf8"))).toEqual({ prefixes: ["autobyteus"] });
    projectId = (await projects.createProject({ name: "AutoByteus" })).projectId;
    expect((await create("New A")).taskId).toBe("autobyteus-2-1");
    expect(await tool("update_task", { task_id: "autobyteus-1", status: "DONE" })).toMatchObject({ error: { code: "TASK_NOT_FOUND" } });
    // Retiring is idempotent and keeps earlier prefixes.
    const second = (await projects.createProject({ name: "Second" })).projectId;
    await projects.deleteProject(second);
    await projects.deleteProject(projectId);
    expect(JSON.parse(await fs.readFile(layout.retiredTaskKeyPrefixesFile(), "utf8"))).toEqual({ prefixes: ["autobyteus", "second", "autobyteus-2"] });
    expect((await projects.createProject({ name: "AutoByteus" })).projectId).toBeTruthy();
    expect((await store.listProjects())[0]!.taskKeys.prefix).toBe("autobyteus-3");
  });
});
