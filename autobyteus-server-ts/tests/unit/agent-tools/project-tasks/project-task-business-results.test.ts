import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../../src/projects/services/project-service.js";
import * as taskServices from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskService } from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../../../src/projects/context/project-task-context-store.js";
import { AdHocTaskStore } from "../../../../src/projects/stores/ad-hoc-task-store.js";
import { AdHocTasksLayout } from "../../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { createRootExecutionIdentity, type RootSubjectKind } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { CreateOrUpdateTaskTool, ListProjectTasksTool } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";

const mcp = async (name: string, args: Record<string, unknown>) => {
  const result = await new ProjectTaskToolsMcpAdapterProvider().getAdapters().find(a => a.definition.name === name)!
    .execute({ rawArguments: args, session: {} as never });
  if (result.kind !== "mcp_tool_result") throw new Error("Expected structured result");
  return result.result;
};
const root = (kind: RootSubjectKind) => createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: `root-${kind}` });
let dir: string, layout: ProjectsLayout, store: ProjectStore, context: ProjectTaskContextStore, tasks: ProjectTaskService, projectId: string;
let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
const service = async (storeOverride?: object) => {
  const created = new ProjectTaskService({ store: (storeOverride ?? store) as ProjectStore, contextStore: context, requestRelease: release,
    adHocTasks: new AdHocTaskStore(new AdHocTasksLayout(path.join(dir, "ad-hoc-tasks"))) });
  await created.load();
  return created;
};
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-business-tools-"));
  layout = new ProjectsLayout(path.join(dir, "projects"));
  store = new ProjectStore(layout);
  context = new ProjectTaskContextStore(layout);
  projectId = (await new ProjectService({ store }).createProject({ name: "Business fixture" })).projectId;
  release = vi.fn<TaskExecutionReleaseRequest>(async (_root, agentRuns) => agentRuns.map(execution => ({ execution, stopped: true })));
  tasks = await service();
  vi.spyOn(taskServices, "getProjectTaskService").mockImplementation(() => tasks);
});
afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });

describe("shared native/MCP business Task result boundary (Q-2)", () => {
  it("lists saved work/context, open and closed assignments with explicit copy IDs, never workers' internal runs or platform detail (REQ-010, AC-013)", async () => {
    const draft = await tasks.beginContextDraft(projectId);
    const upload = await tasks.uploadContextFile(projectId, draft.draftId, { filename: "instructions.txt", mimetype: "text/plain", file: Readable.from(["saved context"]) } as never);
    const task = await tasks.createTask({ projectId, description: "Full saved work description",
      contextDraft: { draftId: draft.draftId, storedFilenames: [upload.storedFilename] } });
    const assigned = (agentRun: { agentRunId: string } | { teamRunId: string }, kind: RootSubjectKind, coordinatorAgentRunId?: string) =>
      tasks.linkNewTaskExecution({ role: "assigned", taskId: task.taskId, assignedBy: `manager-${kind}`, hostRoot: root(kind), execution: agentRun, ...(coordinatorAgentRunId ? { teamCoordinatorAgentRunId: coordinatorAgentRunId } : {}) });
    await assigned({ agentRunId: "closed-worker" }, "agent");
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "TODO" });
    await assigned({ agentRunId: "accepted-agent" }, "agent"); await tasks.markStarted({ agentRunId: "accepted-agent" });
    await assigned({ teamRunId: "failed-team" }, "agent_team", "failed-team-lead");
    await tasks.markFailed({ teamRunId: "failed-team" }, { code: "TASK_DISPATCH_FAILED", message: "Internal dispatch detail" });
    await assigned({ agentRunId: "starting-agent" }, "agent_org");
    await tasks.linkNewTaskExecution({ role: "delegated", creator: { agentRunId: "accepted-agent" }, hostRoot: root("agent"), execution: { agentRunId: "internal-delegate" } });
    await tasks.linkNewTaskExecution({ role: "broughtIn", creator: { agentRunId: "accepted-agent" }, hostRoot: root("agent"), execution: { agentRunId: "owned-helper" } });

    const native = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId }));
    expect((await mcp("list_project_tasks", { project_id: projectId })).structuredContent).toEqual(native);
    expect(native).toEqual({ projectId, tasks: [{ projectId, taskId: task.taskId, description: task.description, status: "TODO",
      contextFiles: task.contextFiles, assignments: [
        { kind: "agent", agentRunId: "accepted-agent", assignedBy: "manager-agent", outcome: "accepted" },
        { kind: "team", teamRunId: "failed-team", teamCoordinatorAgentRunId: "failed-team-lead", assignedBy: "manager-agent_team", outcome: "failed" },
        { kind: "agent", agentRunId: "starting-agent", assignedBy: "manager-agent_org", outcome: "not_confirmed" },
      ], closedAssignments: [
        // The copy that did the earlier (now reopened) work stays findable after its Task closed.
        { kind: "agent", agentRunId: "closed-worker", assignedBy: "manager-agent", outcome: "not_confirmed" },
      ] }] });
    expect(JSON.stringify(native)).not.toContain("targetAgentRunId");
    expect(await fs.readFile(native.tasks[0].contextFiles[0].localPath, "utf8")).toBe("saved context");
    for (const privateDetail of ["internal-delegate", "owned-helper", "hostRoot", "closedAt", "Internal dispatch detail", "linkedAt"]) {
      expect(JSON.stringify(native)).not.toContain(privateDetail);
    }
    const patch = { task_id: task.taskId, description: "Revised saved work" };
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, patch))).toEqual({ task: { projectId, taskId: task.taskId, status: "TODO" } });
    expect((await mcp("create_or_update_task", patch)).structuredContent).toEqual({ task: { projectId, taskId: task.taskId, status: "TODO" } });
    const reread = (await mcp("list_project_tasks", { project_id: projectId })).structuredContent as typeof native;
    expect(reread.tasks[0]).toEqual({ ...native.tasks[0], description: "Revised saved work" });
  });

  it("attaches context_files on create and patch through native and MCP, returning only this call's files compactly (AC-001, AC-002, AC-009)", async () => {
    const sourceDir = path.join(dir, "agent-sources");
    await fs.mkdir(sourceDir);
    const file = async (name: string) => { const p = path.join(sourceDir, name); await fs.writeFile(p, `bytes of ${name}`); return p; };
    const shot = await file("shot1.png"), notes = await file("notes.md");
    const created = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, { project_id: projectId, description: "Fix green status", context_files: [shot, notes] }));
    const taskId = created.task.taskId;
    const saved = (await store.readTask(projectId, taskId))!.contextFiles!;
    expect(created).toEqual({ task: { projectId, taskId: expect.any(String), status: "TODO", attachedContextFiles: [
      { storedFilename: saved[0]!.storedFilename, displayName: "shot1.png" }, { storedFilename: saved[1]!.storedFilename, displayName: "notes.md" }] } });
    const patch = { task_id: taskId, context_files: [await file("shot2.png")] };
    const viaMcp = (await mcp("create_or_update_task", patch)).structuredContent as typeof created;
    const viaNative = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, patch));
    const files = (await store.readTask(projectId, taskId))!.contextFiles!;
    expect(files.map(f => f.displayName)).toEqual(["shot1.png", "notes.md", "shot2.png", "shot2.png"]);
    expect(viaMcp).toEqual({ task: { projectId, taskId, status: "TODO", attachedContextFiles: [{ storedFilename: files[2]!.storedFilename, displayName: "shot2.png" }] } });
    expect(viaNative).toEqual({ task: { projectId, taskId, status: "TODO", attachedContextFiles: [{ storedFilename: files[3]!.storedFilename, displayName: "shot2.png" }] } });
    // The Task's full list (with locators and saved paths) stays on list_project_tasks.
    const listed = (await mcp("list_project_tasks", { project_id: projectId })).structuredContent as { tasks: Array<{ contextFiles: Array<{ localPath: string }> }> };
    expect(await fs.readFile(listed.tasks[0]!.contextFiles[0]!.localPath, "utf8")).toBe("bytes of shot1.png");
    // Calls that attach nothing keep the exact plain acknowledgement.
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, { project_id: projectId, description: "Plain", context_files: [] })))
      .toEqual({ task: { projectId, taskId: expect.any(String), status: "TODO" } });
    expect((await mcp("create_or_update_task", { task_id: taskId, status: "IN_PROGRESS" })).structuredContent).toEqual({ task: { projectId, taskId, status: "IN_PROGRESS" } });
  });

  it.each(["native", "mcp"] as const)("reports an invalid context file through %s with its path and changes nothing (AC-005)", async mode => {
    const task = await tasks.createTask({ projectId, description: "Unchanged" });
    const before = await fs.readFile(layout.taskFile(projectId, task.taskId), "utf8");
    const missing = path.join(dir, "gone.png");
    const run = (args: Record<string, unknown>) => mode === "native"
      ? new CreateOrUpdateTaskTool().execute(null, args).then(() => { throw new Error("Must reject"); }, e => JSON.parse(e.message))
      : mcp("create_or_update_task", args).then(r => r.structuredContent);
    expect(await run({ task_id: task.taskId, status: "DONE", context_files: [missing] }))
      .toEqual({ error: { code: "TASK_CONTEXT_FILE_UNAVAILABLE", message: `Context file '${missing}' does not exist or cannot be accessed.` } });
    expect(await run({ project_id: projectId, description: "Never", context_files: ["relative.md"] }))
      .toEqual({ error: { code: "TASK_CONTEXT_INVALID", message: "Context file 'relative.md' must be a normalized absolute path." } });
    expect(await fs.readFile(layout.taskFile(projectId, task.taskId), "utf8")).toBe(before);
    expect((await store.listTasks(projectId)).map(t => t.taskId)).toEqual([task.taskId]);
  });

  it("marks a Task whose agent run resources can't be read as assignments unavailable, never as an empty list", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await tasks.createTask({ projectId, description: "B" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: a.taskId, assignedBy: "manager", hostRoot: root("agent"), execution: { agentRunId: "w" } });
    await fs.writeFile(layout.taskExecutionResourcesFile(projectId, a.taskId), "[]");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    tasks = await service();
    const listed = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId }));
    const damaged = listed.tasks.find((t: { taskId: string }) => t.taskId === a.taskId);
    expect(damaged).toMatchObject({ assignmentsUnavailable: true });
    expect(damaged).not.toHaveProperty("assignments");
    expect(listed.tasks.find((t: { taskId: string }) => t.taskId !== a.taskId)).toMatchObject({ assignments: [] });
    const done = await new CreateOrUpdateTaskTool().execute(null, { task_id: a.taskId, status: "DONE" })
      .then(() => { throw new Error("Must reject"); }, e => JSON.parse(e.message));
    expect(done).toEqual({ error: { code: "TASK_AGENT_RESOURCES_UNAVAILABLE", message: expect.stringContaining("Fix or restore the file and restart the app") } });
  });

  it.each(["agent", "agent_team", "agent_org"] as const)("acknowledges recorded DONE only; stops under %s are requested again by repeated DONE and Task B is untouched", async kind => {
    const created = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, { project_id: projectId, description: "A" }));
    expect(created).toEqual({ task: { projectId, taskId: expect.any(String), status: "TODO" } });
    const taskId = created.task.taskId;
    await tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", hostRoot: root(kind), execution: { teamRunId: "A" }, teamCoordinatorAgentRunId: "A-lead" });
    const b = await tasks.createTask({ projectId, description: "B protected" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: b.taskId, assignedBy: "manager", hostRoot: root(kind), execution: { agentRunId: "B" } });
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    release.mockResolvedValueOnce([{ execution: { teamRunId: "A" }, stopped: false, error: { code: "EXACT_CLOSE_FAILED", message: "private component receipt retained" } }]);
    const done = { task: { projectId, taskId, status: "DONE" } }, args = { task_id: taskId, status: "DONE" };
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, args))).toEqual(done);
    await tasks.drainRuntimeReleases();
    expect(errors).toHaveBeenCalledWith("TASK_AGENT_RESOURCE_STOP_FAILED", expect.objectContaining({ taskId }));
    expect((await mcp("create_or_update_task", args)).structuredContent).toEqual(done); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenLastCalledWith(root(kind), [{ teamRunId: "A" }]);
    expect(await fs.readFile(layout.taskExecutionResourcesFile(projectId, taskId), "utf8")).not.toContain("EXACT_CLOSE_FAILED");
    expect(tasks.isOpen({ agentRunId: "B" })).toBe(true);
    const listing = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId, status: "DONE" }));
    expect(listing.tasks[0].assignments).toEqual([]);
  });

  it.each(["native", "mcp"] as const)("does not fabricate a create acknowledgement after a %s postcommit failure", async mode => {
    tasks = await service(Object.assign(Object.create(store), {
      createTask: async (...args: Parameters<ProjectStore["createTask"]>) => { await store.createTask(...args); throw new Error("test-owned postcommit failure"); },
    }));
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const args = { project_id: projectId, description: "Recorded but unconfirmed" };
    const result = mode === "native"
      ? await new CreateOrUpdateTaskTool().execute(null, args).then(() => { throw new Error("Must not acknowledge"); }, e => JSON.parse(e.message))
      : (await mcp("create_or_update_task", args)).structuredContent;
    expect(result).toMatchObject({ error: { code: "PROJECT_OPERATION_UNCONFIRMED" } });
    expect(result).not.toHaveProperty("task");
    expect(await store.listTasks(projectId)).toEqual([expect.objectContaining({ description: args.description, status: "TODO" })]);
    expect(diagnostics).toHaveBeenCalled();
  });

  it.each(["native", "mcp"] as const)("returns truthful DONE postcommit uncertainty through %s: runs closed, status recorded, stop requested", async mode => {
    const task = await tasks.createTask({ projectId, description: "Saved" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot: root("agent"), execution: { agentRunId: "owned" } });
    tasks = await service(Object.assign(Object.create(store), {
      updateTask: async (...args: Parameters<ProjectStore["updateTask"]>) => { await store.updateTask(...args); throw new Error("private postcommit detail"); },
    }));
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const args = { task_id: task.taskId, status: "DONE" };
    const mcpResult = mode === "mcp" ? await mcp("create_or_update_task", args) : null;
    if (mcpResult) expect(mcpResult.isError).toBe(true);
    const result = mode === "native" ? await new CreateOrUpdateTaskTool().execute(null, args).then(() => { throw new Error("Must not acknowledge"); }, e => JSON.parse(e.message))
      : mcpResult!.structuredContent;
    expect(result).toEqual({ error: { code: "PROJECT_OPERATION_UNCONFIRMED", message: "Task change could not be confirmed. Check the saved Task before repeating." } });
    await tasks.drainRuntimeReleases();
    expect(diagnostics).toHaveBeenCalled();
    expect((await store.readTask(projectId, task.taskId))!.status).toBe("DONE");
    expect(tasks.isOpen({ agentRunId: "owned" })).toBe(false);
    expect(release).toHaveBeenCalledWith(root("agent"), [{ agentRunId: "owned" }]);
    expect(JSON.stringify(result)).not.toMatch(/private|released|rollback/);
  });
});
