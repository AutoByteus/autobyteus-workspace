import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import {
  ProjectTaskService,
  getProjectTaskService,
  initializeProjectTaskServiceProcessInstance,
  releaseProjectTaskServiceProcessInstance,
  resetProjectTaskServiceForTests,
} from "../../../src/projects/services/project-task-service.js";
import { TaskLifetimeGate } from "../../../src/agent-collaboration/execution/task/task-lifetime-gate.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { ProjectTaskContextLayout } from "../../../src/projects/context/project-task-context-layout.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionLinkIdentity } from "../../../src/agent-collaboration/execution/task/task-execution-lifetime.js";

const root = (rootSubjectKind: "agent" | "agent_team" | "agent_org", rootRunId = "root-A") => createRootExecutionIdentity({ rootSubjectKind, rootRunId });
const link = (rootSubjectKind: "agent" | "agent_team" | "agent_org", id: string, team = false): TaskExecutionLinkIdentity => ({
  root: root(rootSubjectKind), execution: team ? { teamRunId: id } : { agentRunId: id },
  ingressAgentRunId: team ? `${id}-coordinator` : id, purpose: "assignment",
});
let dir: string, store: ProjectStore, tasks: ProjectTaskService, projects: ProjectService, projectId: string;
let release: ReturnType<typeof vi.fn>, gate: TaskLifetimeGate;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "task-owned-lifetime-unit-"));
  store = new ProjectStore({ getAppDataDir: () => dir });
  const contextStore = new ProjectTaskContextStore(new ProjectTaskContextLayout(path.join(dir, "projects")));
  projects = new ProjectService({ store, contextStore, workspaceLookup: { getRegisteredWorkspaceRootPath: async () => null } });
  projectId = (await projects.createProject({ name: "test-owned Project" })).projectId;
  release = vi.fn(async (_root, _id, executions) => ({ requested: executions.map(execution => ({ execution, cleanup: "released" })), unrequested: [] }));
  tasks = new ProjectTaskService({ store, contextStore, requestRuntimeRelease: release,
    closureListener: { onLifetimesClosed: ids => gate.onLifetimesClosed(ids) } });
  gate = new TaskLifetimeGate(tasks);
});
afterEach(async () => { await tasks.drainRuntimeReleases(); await fs.rm(dir, { recursive: true, force: true }); });

describe("durable Project Task lifetime authority", () => {
  it.each(["agent", "agent_team", "agent_org"] as const)("atomically closes exact copies under %s without Task B or unlinked adoption; retries only outstanding release", async kind => {
    const task = await tasks.createTask({ projectId, description: "saved description only" });
    const b = await tasks.createTask({ projectId, description: "Task B protected" });
    const work = await tasks.resolveDelegationWork(task.taskId);
    const workB = await tasks.resolveDelegationWork(b.taskId);
    const a1 = link(kind, "A-agent"), a2 = link(kind, "A-team", true), bl = link(kind, "B-agent");
    for (const a of [a1, a2]) { await tasks.reserveExecution(work.lifetimeId, a, task.taskId); await tasks.recordDispatch(work.lifetimeId, a, "admitted"); }
    await tasks.reserveExecution(workB.lifetimeId, bl, b.taskId); await tasks.recordDispatch(workB.lifetimeId, bl, "delivered");
    const admission = await gate.admit(work.lifetimeId);
    release.mockImplementationOnce(async (_root, _id, refs) => {
      const state = await store.readState();
      expect(state.projects[0].tasks.find(t => t.taskId === task.taskId)?.status).toBe("DONE");
      expect(state.taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)?.completedAt).not.toBeNull();
      expect(() => admission.assertOpen()).toThrow(/closed/);
      return { requested: refs.map((execution, index) => ({ execution, cleanup: index ? "failed" : "released" })), unrequested: [] };
    });
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" });
    await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledWith(root(kind), work.lifetimeId, [a1.execution, a2.execution]);
    expect((await store.readState()).taskLifetimes.find(l => l.lifetimeId === workB.lifetimeId)).toMatchObject({ completedAt: null, executions: [expect.objectContaining({ cleanup: "not_requested" })] });
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenLastCalledWith(root(kind), work.lifetimeId, [a2.execution]);
    const closed = (await store.readState()).taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)!;
    await tasks.recordDispatch(work.lifetimeId, a1, "delivered"); // late accepted result preserves closure/proof
    await tasks.recordCleanup(work.lifetimeId, root(kind), { requested: [{ execution: a1.execution, cleanup: "pending" }], unrequested: [] });
    expect((await store.readState()).taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)).toMatchObject({ completedAt: closed.completedAt, executions: [expect.objectContaining({ dispatch: "delivered", cleanup: "released" }), expect.objectContaining({ cleanup: "released" })] });
    const calls = release.mock.calls.length;
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledTimes(calls);
  });

  it("reopens into a new lifetime and permanently rejects old worker inheritance across deletion/restart", async () => {
    const task = await tasks.createTask({ projectId, description: "saved work" });
    const old = await tasks.resolveDelegationWork(task.taskId);
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" });
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "TODO" });
    const current = await tasks.resolveDelegationWork(task.taskId);
    expect(current.lifetimeId).not.toBe(old.lifetimeId);
    await expect(tasks.resolveDelegationWork(task.taskId, old.lifetimeId)).rejects.toMatchObject({ code: "TASK_LIFETIME_CLOSED" });
    await tasks.deleteTask({ projectId, taskId: task.taskId });
    await projects.deleteProject(projectId);
    const reopened = new ProjectTaskService({ store });
    await expect(reopened.readLifetimeClosure(old.lifetimeId)).resolves.toBe("closed");
    await expect(new TaskLifetimeGate(reopened).admit(old.lifetimeId)).rejects.toMatchObject({ code: "TASK_LIFETIME_CLOSED" });
    await expect(reopened.readLifetimeClosure("unknown")).rejects.toMatchObject({ code: "TASK_LIFETIME_INVALID" });
    expect((await store.readState()).taskLifetimes.map(l => l.lifetimeId)).toEqual([old.lifetimeId, current.lifetimeId]);
  });

  it("rejects missing/ambiguous Tasks, cross-project ID reuse and duplicate exact execution reservation", async () => {
    const task = await tasks.createTask({ projectId, description: "A" });
    await expect(tasks.resolveDelegationWork("missing")).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    const secondProject = (await projects.createProject({ name: "second" })).projectId;
    const collision = new ProjectTaskService({ store, createId: () => task.taskId });
    await expect(collision.createTask({ projectId: secondProject, description: "collision" })).rejects.toMatchObject({ code: "TASK_ID_COLLISION" });
    const work = await tasks.resolveDelegationWork(task.taskId), a = link("agent", "A-agent");
    await tasks.reserveExecution(work.lifetimeId, a);
    await expect(tasks.reserveExecution(work.lifetimeId, a)).rejects.toMatchObject({ code: "TASK_LIFETIME_INVALID" });
    await store.updateRecords(records => records.map(p => p.projectId !== secondProject ? p : { ...p, tasks: [{ ...records[0].tasks[0] }] }));
    await expect(tasks.resolveDelegationWork(task.taskId)).rejects.toMatchObject({ code: "TASK_ID_AMBIGUOUS" });
  });

  it("never creates a lifetime or silently omits saved context when bytes are unavailable", async () => {
    const task = await tasks.createTask({ projectId, description: "must include attachment" });
    await store.updateRecords(records => records.map(p => ({ ...p, tasks: p.tasks.map(t => ({ ...t, contextFiles: [{ storedFilename: "ctx_missing__missing.txt", displayName: "missing", mimeType: "text/plain", sizeBytes: 4 }] })) })));
    await expect(tasks.resolveDelegationWork(task.taskId)).rejects.toThrow();
    expect((await store.readState()).taskLifetimes).toEqual([]);
  });

  it("reconciles unrequested stamped outcomes onto existing links and never invents a link for an unlinked stamp (F07)", async () => {
    const task = await tasks.createTask({ projectId, description: "membership authority" });
    const work = await tasks.resolveDelegationWork(task.taskId);
    const requested = link("agent_team", "A-requested", true), released = link("agent_team", "A-released", true), pending = link("agent_team", "A-pending", true);
    for (const l of [requested, released, pending]) { await tasks.reserveExecution(work.lifetimeId, l, task.taskId); await tasks.recordDispatch(work.lifetimeId, l, "admitted"); }
    release.mockImplementationOnce(async () => ({ requested: [], unrequested: [] }));
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    await tasks.recordCleanup(work.lifetimeId, root("agent_team"), { requested: [{ execution: released.execution, cleanup: "released" }], unrequested: [] });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const before = (await store.readState()).taskLifetimes[0]!.executions.length;
    await tasks.recordCleanup(work.lifetimeId, root("agent_team"), {
      requested: [{ execution: requested.execution, cleanup: "released" }],
      unrequested: [
        { execution: released.execution, cleanup: "failed", error: { code: "TASK_RELEASE_FAILED", message: "late sweep" } },
        { execution: pending.execution, cleanup: "failed", error: { code: "TASK_RELEASE_FAILED", message: "stop failed" } },
        { execution: { agentRunId: "stamped-unlinked" }, cleanup: "released" },
      ],
    });
    const executions = (await store.readState()).taskLifetimes[0]!.executions;
    expect(executions).toHaveLength(before);
    expect(executions.find(e => "teamRunId" in e.execution && e.execution.teamRunId === "A-requested")).toMatchObject({ cleanup: "released" });
    expect(executions.find(e => "teamRunId" in e.execution && e.execution.teamRunId === "A-released")).toMatchObject({ cleanup: "released" });
    expect(executions.find(e => "teamRunId" in e.execution && e.execution.teamRunId === "A-released")!.error).toBeUndefined();
    expect(executions.find(e => "teamRunId" in e.execution && e.execution.teamRunId === "A-pending")).toMatchObject({ cleanup: "failed", error: { code: "TASK_RELEASE_FAILED" } });
    expect(warn).toHaveBeenCalledExactlyOnceWith("TASK_LIFETIME_UNLINKED_EXECUTION", {
      lifetimeId: work.lifetimeId, root: { rootSubjectKind: "agent_team", rootRunId: "root-A" },
      execution: { agentRunId: "stamped-unlinked" }, cleanup: "released",
    });
    await expect(tasks.recordCleanup(work.lifetimeId, root("agent_team"), { requested: [{ execution: { agentRunId: "never-linked" }, cleanup: "released" }], unrequested: [] }))
      .rejects.toMatchObject({ code: "TASK_LIFETIME_INVALID" });
    warn.mockRestore();
  });

  it("repeated DONE with every link released requests no release and changes nothing", async () => {
    const task = await tasks.createTask({ projectId, description: "repeat DONE" });
    const work = await tasks.resolveDelegationWork(task.taskId), a = link("agent", "A-agent");
    await tasks.reserveExecution(work.lifetimeId, a, task.taskId); await tasks.recordDispatch(work.lifetimeId, a, "delivered");
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    const settled = JSON.stringify((await store.readState()).taskLifetimes);
    const calls = release.mock.calls.length;
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    await tasks.recordCleanup(work.lifetimeId, root("agent"), { requested: [], unrequested: [{ execution: a.execution, cleanup: "failed", error: { code: "X", message: "late" } }] });
    expect(release).toHaveBeenCalledTimes(calls);
    expect(JSON.stringify((await store.readState()).taskLifetimes)).toBe(settled);
  });

  it("an unbound service closes durably and records pending TASK_ROOT_RELEASE_UNAVAILABLE", async () => {
    const unbound = new ProjectTaskService({ store });
    const task = await unbound.createTask({ projectId, description: "no runtime binding" });
    const work = await unbound.resolveDelegationWork(task.taskId), a = link("agent", "A-agent");
    await unbound.reserveExecution(work.lifetimeId, a, task.taskId); await unbound.recordDispatch(work.lifetimeId, a, "admitted");
    await unbound.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await unbound.drainRuntimeReleases();
    expect((await store.readState()).taskLifetimes.find(l => l.lifetimeId === work.lifetimeId)).toMatchObject({ completedAt: expect.any(String),
      executions: [expect.objectContaining({ cleanup: "pending", error: expect.objectContaining({ code: "TASK_ROOT_RELEASE_UNAVAILABLE" }) })] });
  });

  it("a null root release request maps to pending TASK_ROOT_RELEASE_UNAVAILABLE; a throwing request to failed", async () => {
    const task = await tasks.createTask({ projectId, description: "no registered root" });
    const work = await tasks.resolveDelegationWork(task.taskId), a = link("agent", "A-agent");
    await tasks.reserveExecution(work.lifetimeId, a, task.taskId); await tasks.recordDispatch(work.lifetimeId, a, "admitted");
    release.mockImplementationOnce(() => null);
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    expect((await store.readState()).taskLifetimes[0]!.executions[0]).toMatchObject({ cleanup: "pending", error: { code: "TASK_ROOT_RELEASE_UNAVAILABLE" } });
    release.mockImplementationOnce(() => { throw new Error("root lookup failed"); });
    await tasks.updateTask({ projectId, taskId: task.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    expect((await store.readState()).taskLifetimes[0]!.executions[0]).toMatchObject({ cleanup: "failed", error: { code: "TASK_RUNTIME_RELEASE_FAILED" } });
  });

  it("initializes one process instance, fails fast on a second initialization, and releases it", () => {
    resetProjectTaskServiceForTests();
    const bound = initializeProjectTaskServiceProcessInstance({ closureListener: { onLifetimesClosed: () => undefined } });
    expect(getProjectTaskService()).toBe(bound);
    expect(() => initializeProjectTaskServiceProcessInstance({})).toThrow("already initialized");
    releaseProjectTaskServiceProcessInstance(new ProjectTaskService());
    expect(getProjectTaskService()).toBe(bound);
    releaseProjectTaskServiceProcessInstance(bound);
    const fallback = getProjectTaskService();
    expect(fallback).not.toBe(bound);
    expect(() => initializeProjectTaskServiceProcessInstance({})).toThrow("already initialized");
    resetProjectTaskServiceForTests();
  });
});
