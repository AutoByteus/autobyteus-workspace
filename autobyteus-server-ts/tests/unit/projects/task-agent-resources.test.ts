import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { TaskAgentResourceService } from "../../../src/projects/services/task-agent-resource-service.js";
import { TaskAgentResourceStore } from "../../../src/projects/stores/task-agent-resource-store.js";
import { parseTaskAgentResourceFile } from "../../../src/projects/stores/task-agent-resource-schema.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskAgentResourceReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-agent-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
const otherRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "team-root" });
const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };

describe("Task agent run resources (SR-023/SR-024)", () => {
  let root: string, layout: ProjectsLayout, store: ProjectStore, projectId: string;
  let release: ReturnType<typeof vi.fn<TaskAgentResourceReleaseRequest>>;
  let tasks: ProjectTaskService;
  const boot = async () => {
    const service = new ProjectTaskService({ store, contextStore: new ProjectTaskContextStore(layout), requestRelease: release,
      taskAgentResources: new TaskAgentResourceService(new TaskAgentResourceStore(layout)) });
    await service.load();
    return service;
  };
  const resourcesFile = (taskId: string) => fs.readFile(layout.agentRunResourcesFile(projectId, taskId), "utf8").then(JSON.parse);
  const assign = (taskId: string, agentRunId: string, root = hostRoot) =>
    tasks.linkAgentRun({ role: "assigned", taskId, assignedBy: "manager", hostRoot: root, agentRun: { agentRunId } });

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-resources-"));
    layout = new ProjectsLayout(path.join(root, "projects"));
    store = new ProjectStore(layout);
    projectId = (await new ProjectService({ store, workspaceLookup: { getRegisteredWorkspaceRootPath: async () => null } }).createProject({ name: "P" })).projectId;
    release = vi.fn<TaskAgentResourceReleaseRequest>(async (_root, agentRuns) => agentRuns.map(agentRun => ({ agentRun, stopped: true })));
    tasks = await boot();
  });
  afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });

  it("links `starting` before resources, writes the exact documented file, and settles start once", async () => {
    const task = await tasks.createTask({ projectId, description: "A" });
    await expect(fs.access(layout.agentRunResourcesFile(projectId, task.taskId))).rejects.toThrow();
    await tasks.linkAgentRun({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot, agentRun: { teamRunId: "team-1" }, coordinatorAgentRunId: "lead-1" });
    await tasks.linkAgentRun({ role: "broughtIn", creator: { teamRunId: "team-1" }, hostRoot, agentRun: { agentRunId: "helper-1" } });
    await tasks.markStarted({ teamRunId: "team-1" });
    await tasks.markFailed({ agentRunId: "helper-1" }, { code: "TASK_DISPATCH_FAILED", message: "no\nnewlines" });
    await tasks.markStarted({ agentRunId: "helper-1" });
    expect(await resourcesFile(task.taskId)).toEqual({ taskId: task.taskId, agentRunResources: [
      { role: "assigned", assignedBy: "manager", hostRoot: { kind: "agent", runId: "manager-root" },
        agentRun: { kind: "team", teamRunId: "team-1", coordinatorAgentRunId: "lead-1" }, linkedAt: expect.any(String), start: "started", closedAt: null },
      { role: "broughtIn", hostRoot: { kind: "agent", runId: "manager-root" }, agentRun: { kind: "agent", agentRunId: "helper-1" },
        linkedAt: expect.any(String), start: "failed", startError: { code: "TASK_DISPATCH_FAILED", message: "no newlines" }, closedAt: null },
    ] });
    expect(tasks.ownerOf([{ agentRunId: "helper-1" }])).toEqual({ taskId: task.taskId, agentRun: { agentRunId: "helper-1" }, open: true });
    expect(tasks.openAgentRuns(task.taskId, "broughtIn")).toEqual([{ agentRunId: "helper-1" }]);
    expect(await tasks.currentAssignments([task.taskId])).toEqual(new Map([[task.taskId, [
      { targetAgentRunId: "lead-1", kind: "team", assignedBy: "manager", outcome: "accepted" }]]]));
  });

  it("schema invariants reject a mismatched taskId, a duplicate agent run, and misplaced assignedBy/startError", () => {
    const entry = { role: "delegated", hostRoot: { kind: "agent", runId: "r" }, agentRun: { kind: "agent", agentRunId: "a" }, linkedAt: "t", start: "starting", closedAt: null };
    expect(() => parseTaskAgentResourceFile({ taskId: "x", agentRunResources: [] }, "y")).toThrow("taskId");
    expect(() => parseTaskAgentResourceFile({ taskId: "y", agentRunResources: [entry, entry] }, "y")).toThrow("more than once");
    expect(() => parseTaskAgentResourceFile({ taskId: "y", agentRunResources: [{ ...entry, assignedBy: "m" }] }, "y")).toThrow("assignedBy");
    expect(() => parseTaskAgentResourceFile({ taskId: "y", agentRunResources: [{ ...entry, role: "assigned" }] }, "y")).toThrow("assignedBy");
    expect(() => parseTaskAgentResourceFile({ taskId: "y", agentRunResources: [{ ...entry, startError: { code: "C", message: "m" } }] }, "y")).toThrow("startError");
    expect(() => parseTaskAgentResourceFile({ taskId: "y", agentRunResources: [{ ...entry, start: "failed" }] }, "y")).toThrow("startError");
    expect(parseTaskAgentResourceFile({ taskId: "y", agentRunResources: [entry] }, "y").agentRunResources).toHaveLength(1);
  });

  it("DONE closes agent runs first (fences at once), then task.json, then asks each host root to stop all closed runs", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    const b = await tasks.createTask({ projectId, description: "B" });
    await assign(a.taskId, "worker-a"); await assign(a.taskId, "worker-a2", otherRoot); await assign(b.taskId, "worker-b");
    const observed: string[] = [];
    release.mockImplementation(async (root, agentRuns) => {
      observed.push(`${root.rootRunId}:${(await store.readTask(projectId, a.taskId))!.status}:${tasks.isOpen({ agentRunId: "worker-a" })}`);
      return agentRuns.map(agentRun => ({ agentRun, stopped: true }));
    });
    const writes = vi.spyOn(store, "updateTask");
    writes.mockImplementationOnce(async (...args) => {
      expect(tasks.isOpen({ agentRunId: "worker-a" })).toBe(false); // closure committed before the status write
      return ProjectStore.prototype.updateTask.apply(store, args);
    });
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledWith(hostRoot, [{ agentRunId: "worker-a" }]);
    expect(release).toHaveBeenCalledWith(otherRoot, [{ agentRunId: "worker-a2" }]);
    expect(observed.sort()).toEqual(["manager-root:DONE:false", "team-root:DONE:false"]);
    expect(tasks.isOpen({ agentRunId: "worker-b" })).toBe(true);
    expect((await resourcesFile(a.taskId)).agentRunResources.every((e: { closedAt: string | null }) => e.closedAt)).toBe(true);
    // Repeated DONE: no file change, and the stop is requested again for every closed agent run.
    const bytes = await fs.readFile(layout.agentRunResourcesFile(projectId, a.taskId), "utf8");
    release.mockClear();
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledTimes(2);
    expect(await fs.readFile(layout.agentRunResourcesFile(projectId, a.taskId), "utf8")).toBe(bytes);
  });

  it("a failed stop is logged, never persisted; a metadata failure after closure still requests the stop", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await assign(a.taskId, "worker-a");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    release.mockResolvedValueOnce([{ agentRun: { agentRunId: "worker-a" }, stopped: false, error: { code: "EXACT_CLOSE_FAILED", message: "still running" } }]);
    vi.spyOn(store, "updateTask").mockRejectedValueOnce(new Error("disk full"));
    await expect(tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" })).rejects.toThrow("disk full");
    await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledOnce();
    expect(tasks.isOpen({ agentRunId: "worker-a" })).toBe(false);
    expect((await store.readTask(projectId, a.taskId))!.status).toBe("TODO");
    expect(error).toHaveBeenCalledWith("TASK_AGENT_RESOURCE_STOP_FAILED", expect.objectContaining({ taskId: a.taskId, error: { code: "EXACT_CLOSE_FAILED", message: "still running" } }));
    expect(JSON.stringify(await resourcesFile(a.taskId))).not.toContain("EXACT_CLOSE_FAILED");
    // Repeating DONE completes it.
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
    expect((await store.readTask(projectId, a.taskId))!.status).toBe("DONE");
  });

  it("assignment link vs DONE, both orders: linked before (then closed) or rejected after; never open after DONE", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await assign(a.taskId, "before");
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
    expect(tasks.isOpen({ agentRunId: "before" })).toBe(false);
    await expect(assign(a.taskId, "after")).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    await expect(tasks.resolveAssignment(a.taskId)).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    // Concurrent: DONE is serialized with the assignment link of the same Task.
    const b = await tasks.createTask({ projectId, description: "B" });
    const [linked, done] = await Promise.allSettled([assign(b.taskId, "racing"), tasks.updateTask({ projectId, taskId: b.taskId, status: "DONE" })]);
    expect(done.status).toBe("fulfilled");
    if (linked.status === "fulfilled") expect(tasks.isOpen({ agentRunId: "racing" })).toBe(false);
    else expect(linked.reason).toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
  });

  it("an inherited link racing DONE reads the creator under the file lock: closed by DONE or rejected", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await assign(a.taskId, "worker");
    const results = await Promise.allSettled([
      tasks.linkAgentRun({ role: "delegated", creator: { agentRunId: "worker" }, hostRoot, agentRun: { agentRunId: "child" } }),
      tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }),
    ]);
    expect(results[1].status).toBe("fulfilled");
    expect(tasks.isOpen({ agentRunId: "child" })).toBe(false);
    await expect(tasks.linkAgentRun({ role: "broughtIn", creator: { agentRunId: "worker" }, hostRoot, agentRun: { agentRunId: "late" } }))
      .rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect((await resourcesFile(a.taskId)).agentRunResources.every((e: { closedAt: string | null }) => e.closedAt)).toBe(true);
  });

  it("reopen lists only the new assignment; Delete keeps the records so closed stays closed after restart", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await assign(a.taskId, "old-worker");
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "TODO" });
    await assign(a.taskId, "new-worker");
    expect((await tasks.currentAssignments([a.taskId])).get(a.taskId)).toEqual([
      { targetAgentRunId: "new-worker", kind: "agent", assignedBy: "manager", outcome: "not_confirmed" }]);
    await tasks.deleteTask({ projectId, taskId: a.taskId });
    const restarted = await boot();
    expect(restarted.ownerOf([{ agentRunId: "old-worker" }])).toMatchObject({ taskId: a.taskId, open: false });
    expect(restarted.ownerOf([{ agentRunId: "new-worker" }])).toMatchObject({ open: true });
    expect(restarted.ownerOf([{ agentRunId: "never-linked" }])).toBeNull();
  });

  it("a damaged file fails closed for its Task and for unknown copies only; the app starts and other Tasks work (Q-3)", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    const b = await tasks.createTask({ projectId, description: "B" });
    await assign(a.taskId, "worker-a"); await assign(b.taskId, "worker-b");
    await fs.writeFile(layout.agentRunResourcesFile(projectId, a.taskId), "{ truncated");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const restarted = await boot();
    expect(error).toHaveBeenCalledWith("TASK_AGENT_RESOURCES_UNAVAILABLE", expect.objectContaining({ taskId: a.taskId }));
    const unavailable = { code: "TASK_AGENT_RESOURCES_UNAVAILABLE", message: expect.stringContaining("Fix or restore the file and restart the app") };
    await expect(restarted.updateTask({ projectId, taskId: a.taskId, status: "DONE" })).rejects.toMatchObject(unavailable);
    await expect(restarted.resolveAssignment(a.taskId)).rejects.toMatchObject(unavailable);
    expect(() => restarted.assertResourceDataReadable()).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" }));
    expect(() => restarted.ownerOf([{ agentRunId: "unknown-copy" }])).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" }));
    expect(restarted.ownerOf([{ agentRunId: "worker-b" }])).toMatchObject({ taskId: b.taskId, open: true });
    const listed = await restarted.currentAssignments([a.taskId, b.taskId]);
    expect(listed.get(a.taskId)).toBe("unavailable");
    expect(listed.get(b.taskId)).toHaveLength(1);
    await restarted.updateTask({ projectId, taskId: a.taskId, description: "editing still works" });
    await restarted.updateTask({ projectId, taskId: b.taskId, status: "DONE" });
    expect(restarted.isOpen({ agentRunId: "worker-b" })).toBe(false);
    await restarted.createTask({ projectId, description: "creating still works" });
    // Recovery: fix or restore the file and restart; no self-repair happened meanwhile.
    expect(await fs.readFile(layout.agentRunResourcesFile(projectId, a.taskId), "utf8")).toBe("{ truncated");
    await fs.writeFile(layout.agentRunResourcesFile(projectId, a.taskId), JSON.stringify({ taskId: a.taskId, agentRunResources: [] }));
    const recovered = await boot();
    expect(() => recovered.assertResourceDataReadable()).not.toThrow();
    expect(recovered.ownerOf([{ agentRunId: "unknown-copy" }])).toBeNull();
    await recovered.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
  });

  it("serializes assignment linking and DONE per Task, without blocking other Tasks", async () => {
    const service = new TaskAgentResourceService(new TaskAgentResourceStore(layout));
    const gate = latch(), order: string[] = [];
    const first = service.serialize("t", async () => { order.push("first:start"); await gate.promise; order.push("first:end"); });
    const second = service.serialize("t", async () => { order.push("second"); });
    await service.serialize("other", async () => { order.push("other"); });
    gate.resolve(); await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "other", "first:end", "second"]);
  });
});
