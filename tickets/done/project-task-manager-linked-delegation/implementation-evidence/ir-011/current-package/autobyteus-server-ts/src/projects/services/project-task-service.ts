import { taskExecutionReferenceKey } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { TaskLifetimeOperationGate } from "../../agent-collaboration/execution/task/task-lifetime-operation-gate.js";
import type { TaskExecutionLifetimePort, TaskExecutionLinkIdentity, TaskExecutionReleaseOutcome } from "../../agent-collaboration/execution/task/task-execution-lifetime.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { assertLifetimeOpen, uniqueTask, requireLifetime, reserveExecutionLink, requireExecutionLink, closeTaskLifetimes, boundedTaskError } from "../domain/project-task-execution-state.js";
import { ProjectTaskRuntimeRelease, type TaskRootReleaseRequest } from "../runtime/project-task-runtime-release.js";
import { randomUUID } from "node:crypto";
import type { MultipartFile } from "@fastify/multipart";
import type { CreateProjectTaskCommand, DeleteProjectTaskCommand, Project, ProjectTask, ProjectTaskStatus, ProjectTaskView, UpdateProjectTaskCommand } from "../domain/models.js";
import { projectTaskFileLocator, type ProjectTaskContextFile } from "../domain/project-task-context.js";
import { ProjectError } from "../domain/project-errors.js";
import { getProjectStore, type ProjectStore } from "../stores/project-store.js";
import { getProjectTaskContextStore, type ProjectTaskContextStore, type PreparedTaskContext } from "../context/project-task-context-store.js";

type Dependencies = {
  store?: Pick<ProjectStore, "listRecords" | "updateRecords" | "readState" | "updateState">;
  contextStore?: ProjectTaskContextStore;
  now?: () => Date;
  requestRuntimeRelease?: TaskRootReleaseRequest;
  createId?: () => string;
};
const normalizeDescription = (description: unknown): string => {
  if (typeof description !== "string" || !description.trim()) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  return description.trim();
};
export const validateTaskStatus = (status: unknown): ProjectTaskStatus => {
  if (status !== "TODO" && status !== "IN_PROGRESS" && status !== "DONE") throw new ProjectError("TASK_STATUS_INVALID", "Task status must be TODO, IN_PROGRESS or DONE.");
  return status;
};
const compareTasks = (a: ProjectTask, b: ProjectTask): number => b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId);
const projectIndex = (records: Project[], projectId: string): number => {
  const index = records.findIndex((p) => p.projectId === projectId);
  if (index < 0) throw new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
  return index;
};
const findTask = (tasks: ProjectTask[], taskId: string): ProjectTask => {
  const task = tasks.find((t) => t.taskId === taskId);
  if (!task) throw new ProjectError("TASK_NOT_FOUND", `Task '${taskId}' was not found in this project.`);
  return task;
};
const cleanup = async (operation: () => Promise<unknown>): Promise<void> => {
  try { await operation(); } catch (e) { console.warn("Task context cleanup failed.", e); }
};

/** Task invariant/metadata authority. Bytes/manifest mechanics remain in the owned context store. */
export class ProjectTaskService implements TaskExecutionLifetimePort {
  private readonly admissions = new TaskLifetimeOperationGate();
  private readonly releaseEffect: ProjectTaskRuntimeRelease;
  constructor(private readonly deps: Dependencies = {}) {
    this.releaseEffect = new ProjectTaskRuntimeRelease({ request: deps.requestRuntimeRelease,
      record: (id, root, results) => this.recordCleanup(id, root, results) });
  }
  private get store() { return this.deps.store ?? getProjectStore(); }
  private get context() { return this.deps.contextStore ?? getProjectTaskContextStore(); }
  private nowIso(): string { return (this.deps.now?.() ?? new Date()).toISOString(); }
  async listTasks(projectId: string, status?: ProjectTaskStatus): Promise<ProjectTaskView[]> {
    if (status !== undefined) validateTaskStatus(status);
    const records = await this.store.listRecords();
    return Promise.all([...records[projectIndex(records, projectId)].tasks]
      .filter((t) => status === undefined || t.status === status).sort(compareTasks).map((t) => this.toView(projectId, t)));
  }
  async createTask(command: CreateProjectTaskCommand): Promise<ProjectTaskView> {
    const description = normalizeDescription(command.description);
    const taskId = this.deps.createId?.() ?? `project_task_${randomUUID()}`;
    const timestamp = this.nowIso();
    await this.assertOwner(command.projectId);
    let prepared!: PreparedTaskContext;
    let task!: ProjectTask;
    await this.store.updateState(async state => {
      const index = projectIndex(state.projects, command.projectId);
      if (state.projects.some(p => p.tasks.some(t => t.taskId === taskId)) || state.taskLifetimes.some(l => l.taskId === taskId)) {
        throw new ProjectError("TASK_ID_COLLISION", "Task identity already exists; no context published.");
      }
      prepared = command.contextDraft ? await this.context.prepare(command.projectId, taskId,
        command.contextDraft.draftId, command.contextDraft.storedFilenames, false) : { files: [], consumed: [] };
      await this.validatePrepared(command.projectId, taskId, prepared);
      task = { taskId, description, status: "TODO", createdAt: timestamp, updatedAt: timestamp, contextFiles: prepared.files };
      state.projects[index] = { ...state.projects[index]!, tasks: [...state.projects[index]!.tasks, task] };
      return state;
    });
    await this.consume(command.projectId, prepared);
    return this.toView(command.projectId, task);
  }
  async updateTask(command: UpdateProjectTaskCommand): Promise<ProjectTaskView> {
    const hasDescription = Object.hasOwn(command, "description");
    const hasStatus = Object.hasOwn(command, "status");
    const changes = command.contextChanges;
    if (!hasDescription && !hasStatus && !changes) throw new ProjectError("TASK_PATCH_REQUIRED", "Supply description and/or status to update a Task.");
    const description = hasDescription ? normalizeDescription(command.description) : undefined;
    const status = hasStatus ? validateTaskStatus(command.status) : undefined;
    const additions = changes?.addStoredFilenames ?? [];
    const removals = changes?.removeStoredFilenames ?? [];
    if (new Set(removals).size !== removals.length) throw new ProjectError("TASK_CONTEXT_INVALID", "Context removals must be unique.");
    await this.assertOwner(command.projectId, command.taskId);
    const prepared = await this.prepareChanges(command.projectId, command.taskId, changes?.draftId, additions, Boolean(changes));
    let updated!: ProjectTask;
    let removed: ProjectTaskContextFile[] = [];
    const committedState = await this.store.updateState(async state => {
      const records = state.projects;
      const index = projectIndex(records, command.projectId);
      const current = findTask(records[index].tasks, command.taskId);
      const files = current.contextFiles ?? [];
      if (removals.some((name) => !files.some((f) => f.storedFilename === name))) throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved context was not found in this Task.");
      await this.validatePrepared(command.projectId, command.taskId, prepared);
      removed = files.filter((f) => removals.includes(f.storedFilename));
      const meaningful = (description !== undefined && current.description !== description)
        || (status !== undefined && current.status !== status) || additions.length > 0 || removals.length > 0;
      updated = meaningful ? { ...current, ...(hasDescription ? { description } : {}), ...(hasStatus ? { status } : {}),
        ...(changes ? { contextFiles: [...files.filter((f) => !removals.includes(f.storedFilename)), ...prepared.files] } : {}), updatedAt: this.nowIso() } as ProjectTask : current;
      state.projects[index] = { ...records[index], tasks: records[index].tasks.map((t) => t.taskId === command.taskId ? updated : t) };
      if (status === "DONE") closeTaskLifetimes(state, command.projectId, command.taskId, this.nowIso());
      return state;
    }, state => {
      for (const l of state.taskLifetimes) if (l.completedAt !== null) this.admissions.close(l.lifetimeId);
    });
    if (status === "DONE") for (const l of committedState.taskLifetimes.filter(l => l.projectId === command.projectId && l.taskId === command.taskId && l.completedAt !== null)) this.releaseEffect.initiate(l);
    await this.consume(command.projectId, prepared);
    if (removed.length) await cleanup(() => this.context.cleanupRemoved(command.projectId, command.taskId, removed));
    return this.toView(command.projectId, updated);
  }
  async deleteTask(command: DeleteProjectTaskCommand): Promise<boolean> {
    let removed: ProjectTask | undefined;
    await this.store.updateRecords((records) => {
      const index = projectIndex(records, command.projectId);
      removed = records[index].tasks.find((t) => t.taskId === command.taskId);
      const next = [...records]; next[index] = { ...records[index], tasks: records[index].tasks.filter((t) => t.taskId !== command.taskId) }; return next;
    });
    if (removed) await cleanup(() => this.context.deleteOwner(command.projectId, command.taskId));
    return Boolean(removed);
  }
  async beginContextDraft(projectId: string, taskId?: string) {
    await this.assertOwner(projectId, taskId);
    if (taskId) await this.reclaim(projectId, taskId);
    return this.context.begin(projectId, taskId);
  }
  async uploadContextFile(projectId: string, draftId: string, file: MultipartFile) {
    await this.assertDraftOwner(projectId, draftId);
    return this.context.upload(projectId, draftId, file);
  }
  async readDraftContextFile(projectId: string, draftId: string, filename: string) {
    await this.assertDraftOwner(projectId, draftId);
    return this.context.draftFile(projectId, draftId, filename);
  }
  async removeDraftContextFile(projectId: string, draftId: string, filename: string) {
    await this.assertDraftOwner(projectId, draftId);
    return this.context.removeDraftFiles(projectId, draftId, [filename]);
  }
  async discardContextDraft(projectId: string, draftId: string) {
    await this.assertDraftOwner(projectId, draftId);
    return this.context.discard(projectId, draftId);
  }
  async readSavedContextFile(projectId: string, taskId: string, filename: string) {
    const task = await this.assertOwner(projectId, taskId);
    const file = task?.contextFiles?.find((f) => f.storedFilename === filename);
    if (!file) throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved Task context was not found.");
    const filePath = await this.context.savedFile(projectId, taskId, file).catch(() => { throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved Task bytes are unavailable."); });
    return { file, filePath };
  }
  async resolveDelegationWork(taskId: string, inheritedLifetimeId?: string) {
    if (typeof taskId !== "string" || !taskId.trim()) throw new ProjectError("TASK_NOT_FOUND", "Task ID must be nonblank.");
    let description = "", referenceFiles: string[] = [], lifetimeId = "";
    await this.store.updateState(async state => {
      const { project, task } = uniqueTask(state, taskId);
      if (task.status === "DONE") throw new ProjectError("TASK_LIFETIME_CLOSED", "Explicitly reopen the Task before new delegation.");
      if (inheritedLifetimeId) {
        const inherited = requireLifetime(state, inheritedLifetimeId); assertLifetimeOpen(inherited);
        if (inherited.taskId !== taskId || inherited.projectId !== project.projectId) throw new ProjectError("TASK_LIFETIME_CONFLICT", "Owned workers cannot dispatch into another Task lifetime.");
      }
      description = task.description;
      referenceFiles = await Promise.all((task.contextFiles ?? []).map(f => this.context.savedFile(project.projectId, taskId, f)));
      let lifetime = state.taskLifetimes.find(l => l.taskId === taskId && l.completedAt === null);
      if (!lifetime) {
        lifetime = { lifetimeId: `project_task_lifetime_${randomUUID()}`, projectId: project.projectId, taskId,
          openedAt: this.nowIso(), completedAt: null, executions: [] };
        state.taskLifetimes.push(lifetime);
      }
      if (inheritedLifetimeId && inheritedLifetimeId !== lifetime.lifetimeId) throw new ProjectError("TASK_LIFETIME_CONFLICT", "Completed lifetimes cannot be inherited after reopen.");
      lifetimeId = lifetime.lifetimeId;
      return state;
    });
    return { lifetimeId, description, referenceFiles };
  }
  async assertOpen(id: string): Promise<void> {
    const lifetime = requireLifetime(await this.store.readState(), id);
    if (lifetime.completedAt !== null) this.admissions.close(id);
    assertLifetimeOpen(lifetime); this.admissions.assertOpen(id);
  }
  async assertClosed(id: string): Promise<void> {
    const lifetime = requireLifetime(await this.store.readState(), id);
    if (lifetime.completedAt === null) throw new ProjectError("TASK_LIFETIME_INVALID", "Scoped completion requires a closed lifetime.");
    this.admissions.close(id);
  }
  async assertExecutionLinked(id: string, identity: TaskExecutionLinkIdentity): Promise<void> {
    const link = requireExecutionLink(await this.store.readState(), id, identity);
    if (link.dispatch !== "admitted" && link.dispatch !== "delivered") throw new ProjectError("TASK_LIFETIME_INVALID", "Execution is not durably admitted.");
  }
  async acquireAdmission(id: string) {
    await this.assertOpen(id); return this.admissions.acquire(id);
  }
  async reserveExecution(id: string, identity: TaskExecutionLinkIdentity, explicitTaskId?: string): Promise<void> {
    await this.store.updateState(state => {
      const l = requireLifetime(state, id); assertLifetimeOpen(l);
      this.admissions.assertOpen(id);
      if (explicitTaskId) {
        const { project, task } = uniqueTask(state, explicitTaskId);
        if (task.status === "DONE" || l.taskId !== task.taskId || l.projectId !== project.projectId) throw new ProjectError("TASK_LIFETIME_CLOSED", "Task changed before reservation.");
      }
      reserveExecutionLink(state, id, identity, this.nowIso()); return state;
    });
  }
  async recordDispatch(id: string, identity: TaskExecutionLinkIdentity, dispatch: 'admitted' | 'delivered' | 'failed', error?: { code: string; message: string }): Promise<void> {
    await this.store.updateState(state => {
      const link = requireExecutionLink(state, id, identity);
      if (link.dispatch === 'delivered' && dispatch !== 'delivered') throw new ProjectError("TASK_LIFETIME_INVALID", "Accepted work cannot be reset to failed/unadmitted.");
      link.dispatch = dispatch; if (error) link.error = boundedTaskError(error);
      return state; // Never reset completion or cleanup after a late accepted result.
    });
  }
  async recordCleanup(id: string, root: RootExecutionIdentity, results: readonly TaskExecutionReleaseOutcome[]): Promise<void> {
    await this.store.updateState(state => {
      const l = requireLifetime(state, id);
      for (const result of results) {
        const link = l.executions.find(e => e.root.rootSubjectKind === root.rootSubjectKind && e.root.rootRunId === root.rootRunId
          && taskExecutionReferenceKey(e.execution) === taskExecutionReferenceKey(result.execution));
        if (!link) throw new ProjectError("TASK_LIFETIME_INVALID", "Cleanup result has no exact reservation.");
        if (l.completedAt === null && link.dispatch !== "failed") throw new ProjectError("TASK_LIFETIME_INVALID", "Open-lifetime cleanup requires failed dispatch proof.");
        if (link.cleanup !== 'released') link.cleanup = result.cleanup;
        if (result.error) link.error = boundedTaskError(result.error);
      }
      return state;
    });
  }
  async drainRuntimeReleases(): Promise<void> { await this.releaseEffect.drain(); }
  private async assertOwner(projectId: string, taskId?: string): Promise<ProjectTask | undefined> {
    const records = await this.store.listRecords();
    const project = records[projectIndex(records, projectId)];
    return taskId === undefined ? undefined : findTask(project.tasks, taskId);
  }
  private async assertDraftOwner(projectId: string, draftId: string) {
    const manifest = await this.context.describe(projectId, draftId);
    await this.assertOwner(projectId, manifest.taskId);
  }
  private async prepareChanges(projectId: string, taskId: string, draftId: string | undefined, names: string[], hasChanges: boolean): Promise<PreparedTaskContext> {
    if (!hasChanges) return { files: [], consumed: [] };
    await this.reclaim(projectId, taskId);
    return this.context.prepare(projectId, taskId, draftId, names, true);
  }
  private async reclaim(projectId: string, taskId: string) {
    await this.store.updateRecords(async (records) => {
      const task = findTask(records[projectIndex(records, projectId)].tasks, taskId);
      // Failed membership proof preserves bytes; housekeeping failure is non-fatal.
      await cleanup(() => this.context.reclaimUnpublished(projectId, taskId, new Set(task.contextFiles?.map((f) => f.storedFilename))));
      return records;
    });
  }
  private async validatePrepared(projectId: string, taskId: string, prepared: PreparedTaskContext) {
    for (const f of prepared.files) await this.context.savedFile(projectId, taskId, f);
  }
  private async consume(projectId: string, prepared: PreparedTaskContext) {
    if (prepared.draftId && prepared.consumed.length) await cleanup(() => this.context.removeDraftFiles(projectId, prepared.draftId!, prepared.consumed));
  }
  private async toView(projectId: string, task: ProjectTask): Promise<ProjectTaskView> {
    const contextFiles = await Promise.all((task.contextFiles ?? []).map(async (f) => {
      const localPath = await this.context.savedFile(projectId, task.taskId, f).catch(() => undefined);
      return { ...f, locator: projectTaskFileLocator(projectId, task.taskId, f.storedFilename), ...(localPath ? { localPath } : {}) };
    }));
    const state = await this.store.readState();
    return { ...task, projectId, contextFiles, executionLifetimes: state.taskLifetimes.filter(l => l.projectId === projectId && l.taskId === task.taskId) };
  }
}
let singleton: ProjectTaskService | null = null;
export const getProjectTaskService = (): ProjectTaskService => singleton ??= new ProjectTaskService();
export const resetProjectTaskServiceForTests = (): void => { singleton = null; };
