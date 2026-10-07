import { describe, expect, it, vi } from "vitest";
import { ProjectChangePublisher, type ProjectChangeReaders } from "../../../src/projects/changes/project-change-publisher.js";
import type { ProjectChangeMessage } from "../../../src/projects/changes/project-change-messages.js";
import type { ProjectTaskView, ProjectView, TaskRootStatus } from "../../../src/projects/domain/models.js";

const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
const project = (projectId: string, openTaskCount: number): ProjectView => ({
  projectId, name: "P", description: "", createdAt: "t", updatedAt: "t", workspaces: [], taskCount: openTaskCount, openTaskCount,
});
const task = (taskId: string, status: ProjectTaskView["status"]): ProjectTaskView => ({
  taskId, projectId: "p1", description: "Write it", status, createdAt: "t", updatedAt: "t", contextFiles: [], root: null,
});

/** A publisher over controllable state; flushes run when `run()` is called (deterministic `setImmediate`). */
const fixture = () => {
  const state = { tasks: new Map<string, ProjectTaskView>(), projects: new Map<string, ProjectView>(), status: "idle" as TaskRootStatus | null };
  const queued: Array<() => void> = [];
  const emitted: ProjectChangeMessage[] = [];
  const reads = { task: 0, project: 0, status: 0 };
  const readers: ProjectChangeReaders = {
    readProject: vi.fn(async (projectId) => { reads.project++; return state.projects.get(projectId) ?? null; }),
    readTask: vi.fn(async (location) => {
      reads.task++;
      const value = state.tasks.get(location.taskId);
      return value ? { kind: "project" as const, projectId: value.projectId, task: value } : null;
    }),
    readWorkerStatus: vi.fn(() => { reads.status++; return state.status; }),
  };
  const publisher = new ProjectChangePublisher((flush) => { queued.push(flush); });
  publisher.bind(readers, (message) => emitted.push(message));
  const run = async () => { while (queued.length) { queued.shift()!(); await new Promise((r) => setTimeout(r, 0)); } };
  return { state, emitted, reads, readers, publisher, run, queued };
};
const location = { projectId: "p1", taskId: "t1" };

describe("ProjectChangePublisher (Publication Contract)", () => {
  it("only marks during the trigger and reads after it, once per subject", async () => {
    const f = fixture();
    f.state.tasks.set("t1", task("t1", "TODO")); f.state.projects.set("p1", project("p1", 1));
    f.publisher.taskChanged(location);
    f.publisher.taskChanged(location);
    f.publisher.workerStatusChanged(location);
    // Nothing was read inside the triggering dispatch.
    expect(f.reads).toEqual({ task: 0, project: 0, status: 0 });
    // A Task change also schedules its Project (counts); one flush per subject.
    expect(f.queued).toHaveLength(2);
    await f.run();
    expect(f.emitted.map((m) => m.type)).toEqual(["task_upserted", "project_upserted"]);
    expect(f.reads).toEqual({ task: 1, project: 1, status: 0 });
  });

  it("serializes builds per subject: marks during a build cause exactly one further build that reads newer state", async () => {
    const f = fixture();
    f.state.tasks.set("t1", task("t1", "TODO"));
    const gate = latch();
    let calls = 0;
    (f.readers.readTask as ReturnType<typeof vi.fn>).mockImplementation(async (loc: { taskId: string }) => {
      calls++;
      const snapshot = f.state.tasks.get(loc.taskId)!;
      if (calls === 1) await gate.promise;
      return { kind: "project", projectId: "p1", task: snapshot };
    });
    f.publisher.taskChanged({ projectId: null, taskId: "t1" });
    await f.run(); // the first build is now in flight (waiting on the gate)
    f.state.tasks.set("t1", task("t1", "IN_PROGRESS")); f.publisher.taskChanged({ projectId: null, taskId: "t1" });
    f.state.tasks.set("t1", task("t1", "DONE")); f.publisher.taskChanged({ projectId: null, taskId: "t1" });
    expect(f.queued).toHaveLength(0); // no parallel build while one is in flight
    gate.resolve();
    await new Promise((r) => setTimeout(r, 0));
    await f.run();
    expect(calls).toBe(2);
    expect(f.emitted.map((m) => m.type === "task_upserted" ? m.task.status : m.type)).toEqual(["TODO", "DONE"]);
  });

  it("removal wins over view and status marks; a view build of a vanished Task emits its removal", async () => {
    const f = fixture();
    f.publisher.taskChanged(location); f.publisher.workerStatusChanged(location); f.publisher.taskRemoved(location);
    await f.run();
    expect(f.emitted).toContainEqual({ type: "task_removed", scope: { kind: "project", projectId: "p1" }, taskId: "t1" });
    expect(f.reads.task).toBe(0);
    f.emitted.length = 0;
    f.publisher.taskChanged({ projectId: null, taskId: "gone" });
    await f.run();
    expect(f.emitted).toEqual([{ type: "task_removed", scope: { kind: "no_project" }, taskId: "gone" }]);
    f.publisher.projectRemoved("p9");
    await f.run();
    expect(f.emitted.at(-1)).toEqual({ type: "project_removed", projectId: "p9" });
  });

  it("a status-only mark emits task_worker_status without reading the Task; no root means nothing", async () => {
    const f = fixture();
    f.state.status = "running";
    f.publisher.workerStatusChanged({ projectId: null, taskId: "t1" });
    await f.run();
    expect(f.emitted).toEqual([{ type: "task_worker_status", scope: { kind: "no_project" }, taskId: "t1", status: "running" }]);
    expect(f.reads.task).toBe(0);
    f.state.status = null;
    f.publisher.workerStatusChanged({ projectId: null, taskId: "t2" });
    await f.run();
    expect(f.emitted).toHaveLength(1);
  });

  it("a failed build is logged; the subject's chain continues and the next build publishes", async () => {
    const f = fixture();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    (f.readers.readTask as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("disk"));
    f.state.tasks.set("t1", task("t1", "TODO"));
    f.publisher.taskChanged({ projectId: null, taskId: "t1" });
    await f.run();
    expect(warn).toHaveBeenCalledWith("PROJECT_CHANGE_BUILD_FAILED", expect.objectContaining({ subject: "task:no_project:t1" }));
    f.publisher.taskChanged({ projectId: null, taskId: "t1" });
    await f.run();
    expect(f.emitted.map((m) => m.type)).toEqual(["task_upserted"]);
    warn.mockRestore();
  });

  it("an unbound publisher drops marks; marks never throw and idle() settles", async () => {
    const publisher = new ProjectChangePublisher((flush) => flush());
    expect(() => publisher.taskChanged(location)).not.toThrow();
    await expect(publisher.idle()).resolves.toBeUndefined();
  });
});
