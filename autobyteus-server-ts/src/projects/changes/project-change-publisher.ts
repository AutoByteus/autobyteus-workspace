import type { ProjectView, TaskLocation, TaskRootStatus } from "../domain/models.js";
import {
  projectTaskWire, projectWire, taskScopeOf, taskWithoutProjectWire,
  type ProjectChangeMessage, type TaskChangeView,
} from "./project-change-messages.js";

/** What the write owners tell the publisher after a commit. Synchronous; never throws; never reads. */
export interface ProjectChangeMarks {
  taskChanged(location: TaskLocation): void;
  /** Only the Task root's live status may have changed (no Task file changed). */
  workerStatusChanged(location: TaskLocation): void;
  taskRemoved(location: TaskLocation): void;
  projectChanged(projectId: string): void;
  projectRemoved(projectId: string): void;
}

/** The committed state a build reads (composition-bound to the Project and Task services). */
export interface ProjectChangeReaders {
  readProject(projectId: string): Promise<ProjectView | null>;
  /** null when the Task no longer exists. */
  readTask(location: TaskLocation): Promise<TaskChangeView | null>;
  /** The Task root's live status; null when the Task has no root. */
  readWorkerStatus(location: TaskLocation): TaskRootStatus | null;
}

type MarkKind = "view" | "status" | "removed";
type Subject = Readonly<{ kind: "task"; location: TaskLocation }> | Readonly<{ kind: "project"; projectId: string }>;
type Pending = { subject: Subject; kinds: Set<MarkKind> };

const subjectKey = (subject: Subject): string => subject.kind === "project" ? `project:${subject.projectId}`
  : `task:${subject.location.projectId === null ? "no_project" : `project:${subject.location.projectId}`}:${subject.location.taskId}`;

/**
 * Publication contract of the `/ws/projects` feed:
 * 1. Triggers only mark a subject (a Task, or a Project for its counts); a Project Task mark also
 *    marks its Project.
 * 2. Reads happen in a flush scheduled with `setImmediate`, after the triggering dispatch and its
 *    microtasks, so a build sees committed, settled state (e.g. a woken agent's cleared overlay).
 * 3. Each subject has one chain: at most one build in flight; marks during a build are merged and
 *    cause exactly one further build. Emissions per subject follow build order and each build reads
 *    state at least as new as the previous one.
 * 4. `removed` wins over view and status marks; `status` alone emits only the worker status.
 * 5. A build failure is logged and never reaches a writer; clients recover by re-reading.
 * State: pending marks and per-subject chains only. Unbound (no readers), marks are dropped.
 */
export class ProjectChangePublisher implements ProjectChangeMarks {
  private readers: ProjectChangeReaders | null = null;
  private emit: (message: ProjectChangeMessage) => void = () => undefined;
  private readonly pending = new Map<string, Pending>();
  private readonly scheduled = new Set<string>();
  private readonly building = new Set<string>();
  private idleWaiters: Array<() => void> = [];

  constructor(private readonly schedule: (flush: () => void) => void = (flush) => { setImmediate(flush); }) {}

  bind(readers: ProjectChangeReaders, emit: (message: ProjectChangeMessage) => void): void {
    this.readers = readers; this.emit = emit;
  }
  unbind(): void {
    this.readers = null; this.emit = () => undefined;
    this.pending.clear();
  }

  taskChanged(location: TaskLocation): void {
    this.mark({ kind: "task", location }, "view");
    if (location.projectId !== null) this.mark({ kind: "project", projectId: location.projectId }, "view");
  }
  workerStatusChanged(location: TaskLocation): void { this.mark({ kind: "task", location }, "status"); }
  taskRemoved(location: TaskLocation): void {
    this.mark({ kind: "task", location }, "removed");
    if (location.projectId !== null) this.mark({ kind: "project", projectId: location.projectId }, "view");
  }
  projectChanged(projectId: string): void { this.mark({ kind: "project", projectId }, "view"); }
  projectRemoved(projectId: string): void { this.mark({ kind: "project", projectId }, "removed"); }

  /** Resolves once nothing is pending, scheduled or building (tests and orderly shutdown). */
  idle(): Promise<void> {
    if (!this.pending.size && !this.scheduled.size && !this.building.size) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private mark(subject: Subject, kind: MarkKind): void {
    try {
      if (!this.readers) return;
      const key = subjectKey(subject);
      const entry = this.pending.get(key) ?? { subject, kinds: new Set<MarkKind>() };
      entry.kinds.add(kind);
      this.pending.set(key, entry);
      this.scheduleFlush(key);
    } catch (error) { console.warn("PROJECT_CHANGE_MARK_FAILED", error); }
  }

  private scheduleFlush(key: string): void {
    if (this.scheduled.has(key) || this.building.has(key)) return;
    this.scheduled.add(key);
    this.schedule(() => { this.scheduled.delete(key); this.flush(key); });
  }

  private flush(key: string): void {
    const entry = this.pending.get(key);
    const readers = this.readers;
    if (!entry || !readers) { this.notifyIdle(); return; }
    this.pending.delete(key);
    this.building.add(key);
    void this.build(entry, readers)
      .catch((error) => console.warn("PROJECT_CHANGE_BUILD_FAILED", { subject: key, error: error instanceof Error ? error.message : String(error) }))
      .finally(() => {
        this.building.delete(key);
        if (this.pending.has(key)) this.scheduleFlush(key);
        else this.notifyIdle();
      });
  }

  private async build({ subject, kinds }: Pending, readers: ProjectChangeReaders): Promise<void> {
    if (subject.kind === "project") {
      const project = kinds.has("removed") ? null : await readers.readProject(subject.projectId);
      this.emit(project ? { type: "project_upserted", project: projectWire(project) } : { type: "project_removed", projectId: subject.projectId });
      return;
    }
    const scope = taskScopeOf(subject.location);
    const taskId = subject.location.taskId;
    if (kinds.has("removed")) { this.emit({ type: "task_removed", scope, taskId }); return; }
    if (kinds.has("view")) {
      const view = await readers.readTask(subject.location);
      if (!view) { this.emit({ type: "task_removed", scope, taskId }); return; }
      this.emit(view.kind === "project"
        ? { type: "task_upserted", scope: { kind: "project", projectId: view.projectId }, task: projectTaskWire(view.task) }
        : { type: "task_upserted", scope: { kind: "no_project" }, task: taskWithoutProjectWire(view.task) });
      return;
    }
    const status = readers.readWorkerStatus(subject.location);
    if (status) this.emit({ type: "task_worker_status", scope, taskId, status });
  }

  private notifyIdle(): void {
    if (this.pending.size || this.scheduled.size || this.building.size) return;
    const waiters = this.idleWaiters; this.idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}

let singleton: ProjectChangePublisher | null = null;
/** The node's process publisher; the composition binds its readers and the hub. */
export const getProjectChangePublisher = (): ProjectChangePublisher => singleton ??= new ProjectChangePublisher();
export const resetProjectChangePublisherForTests = (): void => { singleton = null; };
