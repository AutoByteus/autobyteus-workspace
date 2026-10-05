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
import { createRootExecutionIdentity, type RootSubjectKind } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskAgentResourceReleaseRequest } from "../../../../src/agent-collaboration/execution/task/task-agent-resource-port.js";
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
let release: ReturnType<typeof vi.fn<TaskAgentResourceReleaseRequest>>;
const service = async (storeOverride?: object) => {
  const created = new ProjectTaskService({ store: (storeOverride ?? store) as ProjectStore, contextStore: context, requestRelease: release });
  await created.load();
  return created;
};
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-business-tools-"));
  layout = new ProjectsLayout(path.join(dir, "projects"));
  store = new ProjectStore(layout);
  context = new ProjectTaskContextStore(layout);
  projectId = (await new ProjectService({ store }).createProject({ name: "Business fixture" })).projectId;
  release = vi.fn<TaskAgentResourceReleaseRequest>(async (_root, agentRuns) => agentRuns.map(agentRun => ({ agentRun, stopped: true })));
  tasks = await service();
  vi.spyOn(taskServices, "getProjectTaskService").mockImplementation(() => tasks);
});
afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });

describe("shared native/MCP business Task result boundary (Q-2)", () => {
  it("lists saved work/context and only current (open) assignments, never workers' internal runs or platform detail", async () => {
    const draft = await tasks.beginContextDraft(projectId);
    const upload = await tasks.uploadContextFile(projectId, draft.draftId, { filename: "instructions.txt", mimetype: "text/plain", file: Readable.from(["saved context"]) } as never);
    const task = await tasks.createTask({ projectId, description: "Full saved work description",
      contextDraft: { draftId: draft.draftId, storedFilenames: [upload.storedFilename] } });
    const assigned = (agentRun: { agentRunId: string } | { teamRunId: string }, kind: RootSubjectKind, coordinatorAgentRunId?: string) =>
      tasks.linkAgentRun({ role: "assigned", taskId: task.taskId, assignedBy: `manager-${kind}`, hostRoot: root(kind), agentRun, ...(coordinatorAgentRunId ? { coordinatorAgentRunId } : {}) });
    await assigned({ agentRunId: "closed-worker" }, "agent");
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "TODO" });
    await assigned({ agentRunId: "accepted-agent" }, "agent"); await tasks.markStarted({ agentRunId: "accepted-agent" });
    await assigned({ teamRunId: "failed-team" }, "agent_team", "failed-team-lead");
    await tasks.markFailed({ teamRunId: "failed-team" }, { code: "TASK_DISPATCH_FAILED", message: "Internal dispatch detail" });
    await assigned({ agentRunId: "starting-agent" }, "agent_org");
    await tasks.linkAgentRun({ role: "delegated", creator: { agentRunId: "accepted-agent" }, hostRoot: root("agent"), agentRun: { agentRunId: "internal-delegate" } });
    await tasks.linkAgentRun({ role: "broughtIn", creator: { agentRunId: "accepted-agent" }, hostRoot: root("agent"), agentRun: { agentRunId: "owned-helper" } });

    const native = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId }));
    expect((await mcp("list_project_tasks", { project_id: projectId })).structuredContent).toEqual(native);
    expect(native).toEqual({ projectId, tasks: [{ projectId, taskId: task.taskId, description: task.description, status: "TODO",
      contextFiles: task.contextFiles, assignments: [
        { targetAgentRunId: "accepted-agent", kind: "agent", assignedBy: "manager-agent", outcome: "accepted" },
        { targetAgentRunId: "failed-team-lead", kind: "team", assignedBy: "manager-agent_team", outcome: "failed" },
        { targetAgentRunId: "starting-agent", kind: "agent", assignedBy: "manager-agent_org", outcome: "not_confirmed" },
      ] }] });
    expect(await fs.readFile(native.tasks[0].contextFiles[0].localPath, "utf8")).toBe("saved context");
    for (const privateDetail of ["closed-worker", "internal-delegate", "owned-helper", "hostRoot", "closedAt", "Internal dispatch detail", "linkedAt"]) {
      expect(JSON.stringify(native)).not.toContain(privateDetail);
    }
    const patch = { project_id: projectId, task_id: task.taskId, description: "Revised saved work" };
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, patch))).toEqual({ task: { projectId, taskId: task.taskId, status: "TODO" } });
    expect((await mcp("create_or_update_task", patch)).structuredContent).toEqual({ task: { projectId, taskId: task.taskId, status: "TODO" } });
    const reread = (await mcp("list_project_tasks", { project_id: projectId })).structuredContent as typeof native;
    expect(reread.tasks[0]).toEqual({ ...native.tasks[0], description: "Revised saved work" });
  });

  it("marks a Task whose agent run resources can't be read as assignments unavailable, never as an empty list", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await tasks.createTask({ projectId, description: "B" });
    await tasks.linkAgentRun({ role: "assigned", taskId: a.taskId, assignedBy: "manager", hostRoot: root("agent"), agentRun: { agentRunId: "w" } });
    await fs.writeFile(layout.agentRunResourcesFile(projectId, a.taskId), "[]");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    tasks = await service();
    const listed = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId }));
    const damaged = listed.tasks.find((t: { taskId: string }) => t.taskId === a.taskId);
    expect(damaged).toMatchObject({ assignmentsUnavailable: true });
    expect(damaged).not.toHaveProperty("assignments");
    expect(listed.tasks.find((t: { taskId: string }) => t.taskId !== a.taskId)).toMatchObject({ assignments: [] });
    const done = await new CreateOrUpdateTaskTool().execute(null, { project_id: projectId, task_id: a.taskId, status: "DONE" })
      .then(() => { throw new Error("Must reject"); }, e => JSON.parse(e.message));
    expect(done).toEqual({ error: { code: "TASK_AGENT_RESOURCES_UNAVAILABLE", message: expect.stringContaining("Fix or restore the file and restart the app") } });
  });

  it.each(["agent", "agent_team", "agent_org"] as const)("acknowledges recorded DONE only; stops under %s are requested again by repeated DONE and Task B is untouched", async kind => {
    const created = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, { project_id: projectId, description: "A" }));
    expect(created).toEqual({ task: { projectId, taskId: expect.any(String), status: "TODO" } });
    const taskId = created.task.taskId;
    await tasks.linkAgentRun({ role: "assigned", taskId, assignedBy: "manager", hostRoot: root(kind), agentRun: { teamRunId: "A" }, coordinatorAgentRunId: "A-lead" });
    const b = await tasks.createTask({ projectId, description: "B protected" });
    await tasks.linkAgentRun({ role: "assigned", taskId: b.taskId, assignedBy: "manager", hostRoot: root(kind), agentRun: { agentRunId: "B" } });
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    release.mockResolvedValueOnce([{ agentRun: { teamRunId: "A" }, stopped: false, error: { code: "EXACT_CLOSE_FAILED", message: "private component receipt retained" } }]);
    const done = { task: { projectId, taskId, status: "DONE" } }, args = { project_id: projectId, task_id: taskId, status: "DONE" };
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, args))).toEqual(done);
    await tasks.drainRuntimeReleases();
    expect(errors).toHaveBeenCalledWith("TASK_AGENT_RESOURCE_STOP_FAILED", expect.objectContaining({ taskId }));
    expect((await mcp("create_or_update_task", args)).structuredContent).toEqual(done); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenLastCalledWith(root(kind), [{ teamRunId: "A" }]);
    expect(await fs.readFile(layout.agentRunResourcesFile(projectId, taskId), "utf8")).not.toContain("EXACT_CLOSE_FAILED");
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
    await tasks.linkAgentRun({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot: root("agent"), agentRun: { agentRunId: "owned" } });
    tasks = await service(Object.assign(Object.create(store), {
      updateTask: async (...args: Parameters<ProjectStore["updateTask"]>) => { await store.updateTask(...args); throw new Error("private postcommit detail"); },
    }));
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const args = { project_id: projectId, task_id: task.taskId, status: "DONE" };
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
