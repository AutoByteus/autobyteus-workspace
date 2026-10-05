import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../../src/projects/stores/project-store.js";
import { ProjectService } from "../../../../src/projects/services/project-service.js";
import * as taskServices from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskService } from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../../../src/projects/context/project-task-context-store.js";
import { ProjectTaskContextLayout } from "../../../../src/projects/context/project-task-context-layout.js";
import { ProjectError } from "../../../../src/projects/domain/project-errors.js";
import { createRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionLinkIdentity } from "../../../../src/agent-collaboration/execution/task/task-execution-lifetime.js";
import type { TaskRootReleaseRequest } from "../../../../src/projects/runtime/project-task-runtime-release.js";
import { CreateOrUpdateTaskTool, ListProjectTasksTool } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";

const mcp = async (name: string, args: Record<string, unknown>) => {
  const result = await new ProjectTaskToolsMcpAdapterProvider().getAdapters().find(a => a.definition.name === name)!
    .execute({ rawArguments: args, session: {} as never });
  if (result.kind !== "mcp_tool_result") throw new Error("Expected structured result");
  return result.result;
};
const link = (kind: "agent" | "agent_team" | "agent_org", id: string, team = false, purpose: TaskExecutionLinkIdentity["purpose"] = "assignment"): TaskExecutionLinkIdentity => ({
  root: createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: `root-${kind}` }),
  execution: team ? { teamRunId: id } : { agentRunId: id }, ingressAgentRunId: team ? `${id}-coordinator` : id, purpose,
});
let dir: string, store: ProjectStore, context: ProjectTaskContextStore, tasks: ProjectTaskService, projectId: string;
let release: ReturnType<typeof vi.fn<TaskRootReleaseRequest>>;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-business-tools-"));
  store = new ProjectStore({ getAppDataDir: () => dir });
  context = new ProjectTaskContextStore(new ProjectTaskContextLayout(path.join(dir, "projects")));
  projectId = (await new ProjectService({ store, contextStore: context }).createProject({ name: "Business fixture" })).projectId;
  release = vi.fn<TaskRootReleaseRequest>(async (_root, _id, refs) => refs.map(execution => ({ execution, cleanup: "released" })));
  tasks = new ProjectTaskService({ store, contextStore: context, requestRuntimeRelease: release });
  vi.spyOn(taskServices, "getProjectTaskService").mockImplementation(() => tasks);
});
afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });

describe("shared native/MCP business Task result boundary", () => {
  it("lists full saved work/context and every exact assignment/delegation across roots/lifetimes, but no helper or cleanup error", async () => {
    const draft = await tasks.beginContextDraft(projectId);
    const upload = await tasks.uploadContextFile(projectId, draft.draftId, { filename: "instructions.txt", mimetype: "text/plain", file: Readable.from(["saved context"]) } as never);
    const task = await tasks.createTask({ projectId, description: "Full saved work description",
      contextDraft: { draftId: draft.draftId, storedFilenames: [upload.storedFilename] } });
    const old = await tasks.resolveDelegationWork(task.taskId);
    const links = [link("agent", "accepted-agent"), link("agent_team", "failed-team", true), link("agent_org", "admitted-agent", false, "delegation"),
      link("agent", "reserved-agent", false, "delegation"), link("agent_org", "owned-helper", false, "helper")];
    for (const identity of links) await tasks.reserveExecution(old.lifetimeId, identity, task.taskId);
    await tasks.recordDispatch(old.lifetimeId, links[0], "delivered");
    await tasks.recordDispatch(old.lifetimeId, links[1], "failed", { code: "DISPATCH_FAILED", message: "Internal dispatch detail" });
    await tasks.recordDispatch(old.lifetimeId, links[2], "admitted");
    release.mockImplementationOnce(async (_root, _id, refs) => refs.map(execution => ({ execution, cleanup: "failed", error: { code: "PRIVATE_PROVIDER_DETAIL", message: "provider/process cleanup detail" } })));
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "TODO" });
    const current = await tasks.resolveDelegationWork(task.taskId), fresh = link("agent_team", "fresh-team", true);
    await tasks.reserveExecution(current.lifetimeId, fresh, task.taskId);
    await tasks.recordDispatch(current.lifetimeId, fresh, "delivered");
    const native = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId }));
    expect((await mcp("list_project_tasks", { project_id: projectId })).structuredContent).toEqual(native);
    expect(native).toEqual({ projectId, tasks: [{ projectId, taskId: task.taskId, description: task.description, status: "TODO",
      contextFiles: task.contextFiles, assignments: [...links.slice(0, 4), fresh].map((l, i) => ({
        root: l.root, execution: l.execution, ingressAgentRunId: l.ingressAgentRunId,
        dispatchOutcome: ["accepted", "failed", "not_confirmed", "not_confirmed", "accepted"][i],
      })) }] });
    expect(await fs.readFile(native.tasks[0].contextFiles[0].localPath, "utf8")).toBe("saved context");
    for (const privateDetail of ["lifetimeId", "completedAt", "cleanup", "PRIVATE_PROVIDER_DETAIL", "Internal dispatch detail", "owned-helper"]) expect(JSON.stringify(native)).not.toContain(privateDetail);
    const patch = { project_id: projectId, task_id: task.taskId, description: "Revised saved work" };
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, patch))).toEqual({ task: { projectId, taskId: task.taskId, status: "TODO" } });
    expect((await mcp("create_or_update_task", patch)).structuredContent).toEqual({ task: { projectId, taskId: task.taskId, status: "TODO" } });
    const reread = (await mcp("list_project_tasks", { project_id: projectId })).structuredContent as typeof native;
    expect(reread.tasks[0]).toEqual({ ...native.tasks[0], description: "Revised saved work" });

    const full = await tasks.listTasks(projectId);
    expect(full[0].executionLifetimes).toHaveLength(2);
    expect(full[0].executionLifetimes[0].executions[0]).toMatchObject({ cleanup: "failed", error: { code: "PRIVATE_PROVIDER_DETAIL" } });
  });

  it.each(["agent", "agent_team", "agent_org"] as const)("acknowledges recorded DONE only, preserving %s pending/failure/exact explicit retry and Task B", async kind => {
    const created = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, { project_id: projectId, description: "A" }));
    expect(created).toEqual({ task: { projectId, taskId: expect.any(String), status: "TODO" } });
    const taskId = created.task.taskId, work = await tasks.resolveDelegationWork(taskId), identity = link(kind, "A", true);
    await tasks.reserveExecution(work.lifetimeId, identity, taskId); await tasks.recordDispatch(work.lifetimeId, identity, "delivered");
    const b = await tasks.createTask({ projectId, description: "B protected" }), workB = await tasks.resolveDelegationWork(b.taskId);
    const bLink = link(kind, "B"); await tasks.reserveExecution(workB.lifetimeId, bLink, b.taskId);
    let finish!: (value: Awaited<ReturnType<TaskRootReleaseRequest>>) => void;
    release.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const done = { task: { projectId, taskId, status: "DONE" } }, args = { project_id: projectId, task_id: taskId, status: "DONE" };
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, args))).toEqual(done);
    expect((await store.readState()).taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)).toMatchObject({ completedAt: expect.any(String), executions: [expect.objectContaining({ cleanup: "pending" })] });
    expect((await mcp("create_or_update_task", args)).structuredContent).toEqual(done);
    expect(release).toHaveBeenCalledTimes(1);
    finish([{ execution: identity.execution, cleanup: "failed", error: { code: "EXACT_CLOSE_FAILED", message: "private component receipt retained" } }]);
    await tasks.drainRuntimeReleases();
    const failed = await store.readState();
    expect(failed.taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)?.executions[0]).toMatchObject({ cleanup: "failed", error: { code: "EXACT_CLOSE_FAILED" } });
    expect((await mcp("create_or_update_task", args)).structuredContent).toEqual(done); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenLastCalledWith(identity.root, work.lifetimeId, [identity.execution]);
    const closed = (await store.readState()).taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)!;
    expect(closed.executions[0].cleanup).toBe("released");
    expect(closed.completedAt).toBe(failed.taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)!.completedAt);
    expect((await mcp("create_or_update_task", args)).structuredContent).toEqual(done); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledTimes(2);
    expect((await store.readState()).taskLifetimes.find(l => l.lifetimeId === workB.lifetimeId)).toMatchObject({ completedAt: null, executions: [expect.objectContaining({ cleanup: "not_requested" })] });
    const listing = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId, status: "DONE" }));
    expect(listing.tasks[0].assignments).toEqual([{ root: identity.root, execution: identity.execution, ingressAgentRunId: identity.ingressAgentRunId, dispatchOutcome: "accepted" }]);
  });

  it.each(["native", "mcp"] as const)("does not fabricate a create acknowledgement after %s postcommit read failure", async mode => {
    tasks = new ProjectTaskService({ store: { listRecords: store.listRecords.bind(store), updateRecords: store.updateRecords.bind(store),
      updateState: store.updateState.bind(store), readState: async () => { throw new Error("test-owned view failure"); } }, contextStore: context });
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const args = { project_id: projectId, description: "Recorded but view unavailable" };
    const result = mode === "native"
      ? await new CreateOrUpdateTaskTool().execute(null, args).then(() => { throw new Error("Must not acknowledge"); }, e => JSON.parse(e.message))
      : (await mcp("create_or_update_task", args)).structuredContent;
    expect(result).toMatchObject({ error: { code: "PROJECT_OPERATION_UNCONFIRMED" } });
    expect(result).not.toHaveProperty("task");
    expect((await store.readState()).projects[0].tasks).toEqual([expect.objectContaining({ description: args.description, status: "TODO" })]);
    expect(diagnostics).toHaveBeenCalled();
  });

  it.each(["native", "mcp"] as const)("returns truthful postcommit uncertainty through %s instead of inventing success or rollback", async mode => {
    const task = await tasks.createTask({ projectId, description: "Saved" }), work = await tasks.resolveDelegationWork(task.taskId), identity = link("agent", "owned");
    await tasks.reserveExecution(work.lifetimeId, identity, task.taskId);
    const stateRead = vi.fn(async () => {
      const state = await store.readState();
      if (state.projects[0].tasks[0].status === "DONE") throw new ProjectError("PROJECT_STATE_UNAVAILABLE", "private postcommit view detail");
      return state;
    });
    tasks = new ProjectTaskService({ store: { listRecords: store.listRecords.bind(store), updateRecords: store.updateRecords.bind(store),
      updateState: store.updateState.bind(store), readState: stateRead }, contextStore: context, requestRuntimeRelease: release });
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const args = { project_id: projectId, task_id: task.taskId, status: "DONE" };
    const mcpResult = mode === "mcp" ? await mcp("create_or_update_task", args) : null;
    if (mcpResult) expect(mcpResult.isError).toBe(true);
    const result = mode === "native" ? await new CreateOrUpdateTaskTool().execute(null, args).then(() => { throw new Error("Must not acknowledge"); }, e => JSON.parse(e.message))
      : mcpResult!.structuredContent;
    expect(result).toEqual({ error: { code: "PROJECT_OPERATION_UNCONFIRMED", message: "Task change could not be confirmed. Check the saved Task before repeating." } });
    await tasks.drainRuntimeReleases();
    expect(diagnostics).toHaveBeenCalled();
    const persisted = await store.readState();
    expect(persisted.projects[0].tasks[0].status).toBe("DONE");
    expect(persisted.taskLifetimes[0]).toMatchObject({ completedAt: expect.any(String), executions: [expect.objectContaining({ cleanup: "released" })] });
    expect(JSON.stringify(result)).not.toMatch(/private|released|rollback/);
  });
});
