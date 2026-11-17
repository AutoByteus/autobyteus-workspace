import { currentTaskOf, openChildrenOf } from "../../helpers/delegation-index-of.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackReleases, type ReleaseTracker } from "../../helpers/project-task-release-tracker.js";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { parseTaskExecutionResourceFile } from "../../../src/projects/stores/task-execution-resource-schema.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { taskRunResources } from "../../helpers/task-run-resources.js";
import { NO_RUN_SIDE_TASK_PORTS } from "../../helpers/explicit-host-collaborators.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
const otherRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "team-root" });
const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };

describe("Task agent run resources (SR-023/SR-024)", () => {
  let root: string, layout: ProjectsLayout, store: ProjectStore, projectId: string;
  let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  let tasks: ProjectTaskService;
  let releases: ReleaseTracker;
  const boot = async () => {
    const service = new ProjectTaskService({ ...NO_RUN_SIDE_TASK_PORTS, store, contextStore: new ProjectTaskContextStore(layout), requestRelease: (releases = trackReleases(release)).request,
      taskExecutionResources: taskRunResources(new TaskExecutionResourceStore(layout)) });
    await service.load();
    return service;
  };
  const resourcesFile = (taskId: string) => fs.readFile(layout.taskExecutionResourcesFile(projectId, taskId), "utf8").then(JSON.parse);
  const assign = (taskId: string, agentRunId: string, root = hostRoot) =>
    tasks.linkNewTaskExecution({ role: "assigned", recipientAddress: "/worker", taskId, delegatedFrom: { delegatingRun: root, delegatorAgentRunId: "manager" }, execution: { agentRunId } });

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-resources-"));
    layout = new ProjectsLayout(path.join(root, "projects"));
    store = new ProjectStore(layout);
    projectId = (await new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } }).createProject({ name: "P" })).projectId;
    release = vi.fn<TaskExecutionReleaseRequest>(async (execution) => ({ execution, stopped: true }));
    tasks = await boot();
  });
  afterEach(async () => { await releases.settled(); vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });

  const from = (delegatingRun: typeof hostRoot | ReturnType<typeof createRootExecutionIdentity>, delegatorAgentRunId: string) => ({ delegatingRun, delegatorAgentRunId });
  const teamOne = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "team-1" });
  const subWork = (delegatingRun: ReturnType<typeof createRootExecutionIdentity>, delegator: string, agentRunId: string) =>
    tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/worker", delegatedFrom: from(delegatingRun, delegator), execution: { agentRunId } });

  it("links `starting` before resources, writes the exact documented file (contract §2.1), and settles start once", async () => {
    const task = await tasks.createTask({ projectId, title: "A", description: "A" });
    await expect(fs.access(layout.taskExecutionResourcesFile(projectId, task.taskId))).rejects.toThrow();
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: task.taskId, delegatedFrom: from(hostRoot, "manager"), recipientAddress: "/eng_team",
      execution: { teamRunId: "team-1" }, teamCoordinatorAgentRunId: "lead-1" });
    await subWork(teamOne, "lead-1", "helper-1");
    await tasks.markStarted({ teamRunId: "team-1" });
    await tasks.markFailed({ agentRunId: "helper-1" }, { code: "TASK_DISPATCH_FAILED", message: "no\nnewlines" });
    await tasks.markStarted({ agentRunId: "helper-1" });
    expect(await resourcesFile(task.taskId)).toEqual({ taskId: task.taskId, agentRunResources: [
      { role: "assigned", delegatedFrom: { delegatingRun: { kind: "agent", runId: "manager-root" }, delegatorAgentRunId: "manager" }, recipientAddress: "/eng_team",
        agentRun: { kind: "team", teamRunId: "team-1", coordinatorAgentRunId: "lead-1" }, linkedAt: expect.any(String), start: "started", closedAt: null },
      { role: "subWork", recipientAddress: "/worker", delegatedFrom: { delegatingRun: { kind: "agent_team", runId: "team-1" }, delegatorAgentRunId: "lead-1" },
        agentRun: { kind: "agent", agentRunId: "helper-1" },
        linkedAt: expect.any(String), start: "failed", startError: { code: "TASK_DISPATCH_FAILED", message: "no newlines" }, closedAt: null },
    ] });
    expect(currentTaskOf(tasks, { agentRunId: "helper-1" })).toMatchObject({ taskId: task.taskId, role: "subWork", open: true });
    expect(await tasks.assignments([task.taskId])).toEqual(new Map([[task.taskId, { open: [
      { kind: "team", teamRunId: "team-1", teamCoordinatorAgentRunId: "lead-1", assignedBy: "manager", outcome: "accepted" }], closed: [] }]]));
  });

  it("writes a peer's run with its node, members and address, on any role, and reads it back exactly (contract §2.1, E3)", async () => {
    const task = await tasks.createTask({ projectId, title: "A", description: "A" });
    await assign(task.taskId, "worker");
    await tasks.linkNewTaskExecution({ role: "subWork", delegatedFrom: from(createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "worker" }), "worker"),
      recipientAddress: "/research_team", execution: { teamRunId: "remote-team" }, teamCoordinatorAgentRunId: "lead",
      nodeId: "node-b", members: [{ address: "/research_team/lead", agentRunId: "lead" }] });
    const stored = (await resourcesFile(task.taskId)).agentRunResources[1];
    expect(stored).toEqual({ role: "subWork", delegatedFrom: { delegatingRun: { kind: "agent", runId: "worker" }, delegatorAgentRunId: "worker" },
      recipientAddress: "/research_team", agentRun: { kind: "team", teamRunId: "remote-team", coordinatorAgentRunId: "lead" },
      nodeId: "node-b", members: [{ address: "/research_team/lead", agentRunId: "lead" }], linkedAt: expect.any(String), start: "starting", closedAt: null });
    const restarted = await boot();
    expect(currentTaskOf(restarted, { teamRunId: "remote-team" })).toMatchObject({ recipientAddress: "/research_team", nodeId: "node-b" });
  });

  it("schema: the current shape only; an old-shape entry, a role `delegated`, misplaced address, members or startError are damage", () => {
    const entry = { role: "subWork", recipientAddress: "/worker", delegatedFrom: { delegatingRun: { kind: "agent", runId: "r" }, delegatorAgentRunId: "d" },
      agentRun: { kind: "agent", agentRunId: "a" }, linkedAt: "t", start: "starting", closedAt: null };
    const closed = { ...entry, closedAt: "t2" };
    const parse = (...entries: unknown[]) => parseTaskExecutionResourceFile({ taskId: "y", agentRunResources: entries }, "y");
    expect(() => parseTaskExecutionResourceFile({ taskId: "x", agentRunResources: [] }, "y")).toThrow("taskId");
    // AR-001: one entry per assignment period; a copy has at most one open entry, and only its last entry may be open.
    expect(() => parse(entry, entry)).toThrow("is open but is not its agent run's last entry");
    expect(() => parse(entry, closed)).toThrow("is open but is not its agent run's last entry");
    expect(parse(closed, closed, entry).executionResources).toHaveLength(3);
    // The shapes this release converts (DS-10) are not read by the runtime.
    expect(() => parse({ role: "assigned", recipientAddress: "/worker", assignedBy: "m", hostRoot: { kind: "agent", runId: "r" }, agentRun: entry.agentRun, linkedAt: "t", start: "started", closedAt: null }))
      .toThrow("delegatedFrom");
    expect(() => parse({ ...entry, role: "delegated" })).toThrow("role");
    expect(() => parse({ ...entry, delegatedFrom: { delegatingRun: { kind: "agent", runId: "r" } } })).toThrow("delegatedFrom");
    expect(() => parse({ ...entry, delegatedFrom: { ...entry.delegatedFrom, delegatingRun: { kind: "agent", runId: "r", extra: 1 } } })).toThrow("delegatedFrom");
    const { recipientAddress: _absent, ...withoutAddress } = entry;
    expect(() => parse(withoutAddress)).toThrow("recipientAddress");
    expect(parse({ ...entry, recipientAddress: "/a", nodeId: "n" }).executionResources[0]).toMatchObject({ recipientAddress: "/a", nodeId: "n" });
    expect(() => parse({ ...entry, members: [] })).toThrow("members");
    expect(() => parse({ ...entry, nodeId: "n", members: [] })).toThrow("members");
    expect(() => parse({ ...entry, startError: { code: "C", message: "m" } })).toThrow("startError");
    expect(() => parse({ ...entry, start: "failed" })).toThrow("startError");
    expect(parse(entry).executionResources).toHaveLength(1);
  });

  it("DONE closes agent runs first (fences at once), then task.json, then asks each run, by its own identity, to stop", async () => {
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    const b = await tasks.createTask({ projectId, title: "B", description: "B" });
    await assign(a.taskId, "worker-a"); await assign(a.taskId, "worker-a2", otherRoot); await assign(b.taskId, "worker-b");
    const observed: string[] = [];
    release.mockImplementation(async (execution) => {
      observed.push(`${"agentRunId" in execution ? execution.agentRunId : "?"}:${(await store.readTask(projectId, a.taskId))!.status}:${tasks.isOpen({ agentRunId: "worker-a" })}`);
      return { execution, stopped: true };
    });
    const writes = vi.spyOn(store, "updateTask");
    writes.mockImplementationOnce(async (...args) => {
      expect(tasks.isOpen({ agentRunId: "worker-a" })).toBe(false); // closure committed before the status write
      return ProjectStore.prototype.updateTask.apply(store, args);
    });
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }); await releases.settled();
    expect(release).toHaveBeenCalledWith({ agentRunId: "worker-a" });
    expect(release).toHaveBeenCalledWith({ agentRunId: "worker-a2" });
    expect(observed.sort()).toEqual(["worker-a2:DONE:false", "worker-a:DONE:false"]);
    expect(tasks.isOpen({ agentRunId: "worker-b" })).toBe(true);
    expect((await resourcesFile(a.taskId)).agentRunResources.every((e: { closedAt: string | null }) => e.closedAt)).toBe(true);
    // Repeated DONE: no file change, and the stop is requested again for every closed agent run.
    const bytes = await fs.readFile(layout.taskExecutionResourcesFile(projectId, a.taskId), "utf8");
    release.mockClear();
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }); await releases.settled();
    expect(release).toHaveBeenCalledTimes(2);
    expect(await fs.readFile(layout.taskExecutionResourcesFile(projectId, a.taskId), "utf8")).toBe(bytes);
  });

  it("a peer's run of a closed Task is fenced, never asked to stop here (CM-10)", async () => {
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: a.taskId, delegatedFrom: from(hostRoot, "manager"), recipientAddress: "/remote",
      execution: { agentRunId: "remote-run" }, nodeId: "node-b" });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" }); await releases.settled();
    expect(release).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith("TASK_AGENT_RESOURCE_FENCED_REMOTE", expect.objectContaining({ execution: { agentRunId: "remote-run" }, nodeId: "node-b" }));
  });

  it("a failed stop is logged, never persisted; a metadata failure after closure still requests the stop", async () => {
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    await assign(a.taskId, "worker-a");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    release.mockResolvedValueOnce({ execution: { agentRunId: "worker-a" }, stopped: false, error: { code: "EXACT_CLOSE_FAILED", message: "still running" } });
    vi.spyOn(store, "updateTask").mockRejectedValueOnce(new Error("disk full"));
    await expect(tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" })).rejects.toThrow("disk full");
    await releases.settled();
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
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    await assign(a.taskId, "before");
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
    expect(tasks.isOpen({ agentRunId: "before" })).toBe(false);
    await expect(assign(a.taskId, "after")).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    await expect(tasks.resolveAssignment(a.taskId)).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    // Concurrent: DONE is serialized with the assignment link of the same Task.
    const b = await tasks.createTask({ projectId, title: "B", description: "B" });
    const [linked, done] = await Promise.allSettled([assign(b.taskId, "racing"), tasks.updateTask({ projectId, taskId: b.taskId, status: "DONE" })]);
    expect(done.status).toBe("fulfilled");
    if (linked.status === "fulfilled") expect(tasks.isOpen({ agentRunId: "racing" })).toBe(false);
    else expect(linked.reason).toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
  });

  it("sub-work racing DONE reads its delegating run under the file lock: closed by DONE or rejected", async () => {
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    await assign(a.taskId, "worker");
    const worker = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "worker" });
    const results = await Promise.allSettled([subWork(worker, "worker", "child"), tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" })]);
    expect(results[1].status).toBe("fulfilled");
    expect(tasks.isOpen({ agentRunId: "child" })).toBe(false);
    await expect(subWork(worker, "worker", "late")).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    // An org run is never a delegated run, so it never creates sub-work.
    await expect(subWork(createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: "worker" }), "worker", "org-child"))
      .rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect((await resourcesFile(a.taskId)).agentRunResources.every((e: { closedAt: string | null }) => e.closedAt)).toBe(true);
  });

  it("reopen lists only the new assignment; T-3: Delete closes and stops its open runs first, then its record goes with it", async () => {
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    await assign(a.taskId, "old-worker");
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "TODO" });
    await assign(a.taskId, "new-worker");
    expect((await tasks.assignments([a.taskId])).get(a.taskId)).toEqual({
      open: [{ kind: "agent", agentRunId: "new-worker", assignedBy: "manager", outcome: "not_confirmed" }],
      closed: [{ kind: "agent", agentRunId: "old-worker", assignedBy: "manager", outcome: "not_confirmed" }] });
    release.mockClear();
    await tasks.deleteTask({ projectId, taskId: a.taskId });
    // Every run of the Task with no other open Task is asked to stop, by its own identity (model.py: a stop of a stopped run changes nothing).
    expect(release.mock.calls.map(([execution]) => execution)).toEqual([{ agentRunId: "old-worker" }, { agentRunId: "new-worker" }]);
    await expect(fs.access(layout.taskDir(projectId, a.taskId))).rejects.toMatchObject({ code: "ENOENT" });
    // Its runs are runs of their own now, also after a restart (R-9).
    expect(currentTaskOf(tasks, { agentRunId: "new-worker" })).toBeNull();
    const restarted = await boot();
    expect(currentTaskOf(restarted, { agentRunId: "old-worker" })).toBeNull();
    expect(currentTaskOf(restarted, { agentRunId: "new-worker" })).toBeNull();
  });

  it("stored legacy `broughtIn` entries stay readable, count as owned work and close with their Task (DEC-007)", async () => {
    const task = await tasks.createTask({ projectId, title: "A", description: "A" });
    await assign(task.taskId, "worker");
    const file = layout.taskExecutionResourcesFile(projectId, task.taskId);
    const stored = JSON.parse(await fs.readFile(file, "utf8"));
    stored.agentRunResources.push({ role: "broughtIn", recipientAddress: "/worker", delegatedFrom: { delegatingRun: { kind: "agent", runId: "worker" }, delegatorAgentRunId: "worker" },
      agentRun: { kind: "agent", agentRunId: "old-helper" }, linkedAt: new Date().toISOString(), start: "started", closedAt: null });
    await fs.writeFile(file, JSON.stringify(stored));
    const restarted = await boot();
    expect(currentTaskOf(restarted, { agentRunId: "old-helper" })).toMatchObject({ taskId: task.taskId, role: "broughtIn", open: true });
    await restarted.updateTask({ projectId, taskId: task.taskId, status: "DONE" });
    expect(restarted.isOpen({ agentRunId: "old-helper" })).toBe(false);
  });

  it("a damaged file fails closed for its Task and for unknown runs only; the app starts and other Tasks work (Q-3)", async () => {
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    const b = await tasks.createTask({ projectId, title: "B", description: "B" });
    await assign(a.taskId, "worker-a"); await assign(b.taskId, "worker-b");
    await fs.writeFile(layout.taskExecutionResourcesFile(projectId, a.taskId), "{ truncated");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const restarted = await boot();
    expect(error).toHaveBeenCalledWith("TASK_AGENT_RESOURCES_UNAVAILABLE", expect.objectContaining({ taskId: a.taskId }));
    const unavailable = { code: "TASK_AGENT_RESOURCES_UNAVAILABLE", message: expect.stringContaining("Fix or restore the file and restart the app") };
    await expect(restarted.updateTask({ projectId, taskId: a.taskId, status: "DONE" })).rejects.toMatchObject(unavailable);
    await expect(restarted.resolveAssignment(a.taskId)).rejects.toMatchObject(unavailable);
    expect(() => restarted.assertResourceDataReadable()).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" }));
        expect(currentTaskOf(restarted, { agentRunId: "worker-b" })).toMatchObject({ taskId: b.taskId, open: true });
    const listed = await restarted.assignments([a.taskId, b.taskId]);
    expect(listed.get(a.taskId)).toBe("unavailable");
    expect(listed.get(b.taskId)).toMatchObject({ open: [{ agentRunId: "worker-b" }], closed: [] });
    await restarted.updateTask({ projectId, taskId: a.taskId, description: "editing still works" });
    await restarted.updateTask({ projectId, taskId: b.taskId, status: "DONE" });
    expect(restarted.isOpen({ agentRunId: "worker-b" })).toBe(false);
    await restarted.createTask({ projectId, title: "creating still works", description: "creating still works" });
    // Recovery: fix or restore the file and restart; no self-repair happened meanwhile.
    expect(await fs.readFile(layout.taskExecutionResourcesFile(projectId, a.taskId), "utf8")).toBe("{ truncated");
    await fs.writeFile(layout.taskExecutionResourcesFile(projectId, a.taskId), JSON.stringify({ taskId: a.taskId, agentRunResources: [] }));
    const recovered = await boot();
    expect(() => recovered.assertResourceDataReadable()).not.toThrow();
    expect(currentTaskOf(recovered, { agentRunId: "unknown-copy" })).toBeNull();
    await recovered.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
  });

  it("keeps the one-hop open index in step with every committed swap: link, DONE, reopen + new link, restart, damaged file", async () => {
    const a = await tasks.createTask({ projectId, title: "A", description: "A" });
    const b = await tasks.createTask({ projectId, title: "B", description: "B" });
    const openOf = (service: ProjectTaskService, run = hostRoot) => openChildrenOf(service, run).map((open) => open.run);
    await assign(a.taskId, "a-first");
    expect(openOf(tasks)).toEqual([{ agentRunId: "a-first" }]);
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "DONE" });
    expect(openOf(tasks)).toEqual([]);
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "TODO" });
    await assign(a.taskId, "a-second");
    await assign(b.taskId, "b-worker");
    await assign(b.taskId, "b-other", otherRoot);
    expect(openOf(tasks)).toEqual([{ agentRunId: "a-second" }, { agentRunId: "b-worker" }]);
    expect(openOf(tasks, otherRoot)).toEqual([{ agentRunId: "b-other" }]);
    // After restart the index is rebuilt by the same swaps; a damaged file never reaches swap().
    await fs.writeFile(layout.taskExecutionResourcesFile(projectId, b.taskId), "{ truncated");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const restarted = await boot();
    expect(openOf(restarted)).toEqual([{ agentRunId: "a-second" }]);
    expect(openOf(restarted, otherRoot)).toEqual([]);
  });

  it("serializes assignment linking and DONE per Task, without blocking other Tasks", async () => {
    const service = taskRunResources(new TaskExecutionResourceStore(layout));
    const gate = latch(), order: string[] = [];
    const first = service.serialize("t", async () => { order.push("first:start"); await gate.promise; order.push("first:end"); });
    const second = service.serialize("t", async () => { order.push("second"); });
    await service.serialize("other", async () => { order.push("other"); });
    gate.resolve(); await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "other", "first:end", "second"]);
  });
});
