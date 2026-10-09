import { randomUUID } from "node:crypto";
import type { MultipartFile } from "@fastify/multipart";
import type {
  ExistingTaskExecutionAssignInput, NewTaskExecutionLinkInput, TaskExecutionResourcePort, TaskExecutionReleaseRequest, TaskExecutionReopenInput,
  TaskExecutionReopenResult, TaskExecutionRole,
} from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type {
  CreateProjectTaskCommand, CreateTaskWithLocalContextFilesCommand, DeleteProjectTaskCommand, ProjectTask, ProjectTaskStatus, ProjectTaskView,
  TaskAcknowledgementView, TaskLocation, TaskRootStatus, TaskRootView, TaskWithoutProjectView, UpdateProjectTaskCommand, UpdateTaskByIdCommand,
} from "../domain/models.js";
import { AD_HOC_TASK_ID_PREFIX, type AdHocTask } from "../domain/ad-hoc-task.js";
import { projectTaskFileLocator, type ProjectTaskContextFile } from "../domain/project-task-context.js";
import { ProjectError } from "../domain/project-errors.js";
import { isTerminalTaskStatus, validateTaskStatus } from "../domain/task-status.js";
import { assertTaskExecutionAssignable, notCurrentTaskMessage } from "../domain/task-execution-resources.js";
import { getProjectStore, type ProjectStore } from "../stores/project-store.js";
import { AdHocTaskStore } from "../stores/ad-hoc-task-store.js";
import { getProjectTaskContextStore, type ProjectTaskContextStore, type PreparedTaskContext } from "../context/project-task-context-store.js";
import { TaskExecutionResourceRelease } from "../runtime/task-execution-resource-release.js";
import { TaskExecutionResourceService, type TaskAssignmentViews } from "./task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../stores/task-execution-resource-store.js";
import { getProjectChangePublisher, type ProjectChangeMarks } from "../changes/project-change-publisher.js";
import type { TaskChangeView } from "../changes/project-change-messages.js";
import { buildTaskRootView, rootWorkerStatus, type TaskWorkerStatusResolver } from "./task-root-view-builder.js";

type TaskPersistence = Pick<ProjectStore, "layout" | "readProject" | "listTasks" | "readTask" | "findTask" | "createTask" | "updateTask" | "deleteTask">;
type AssignedLink = Extract<NewTaskExecutionLinkInput, { role: "assigned" }>;
type Dependencies = {
  store?: TaskPersistence;
  /** Tasks with no Project (`<appData>/ad-hoc-tasks/`); outside the Projects store and its migration gate. */
  adHocTasks?: AdHocTaskStore;
  contextStore?: ProjectTaskContextStore;
  now?: () => Date;
  createId?: () => string;
  /** The process authority over agent run resources; bound once by the composition. */
  taskExecutionResources?: TaskExecutionResourceService;
  /** Exact-root stop request; absent means no runtime is asked to stop anything. */
  requestRelease?: TaskExecutionReleaseRequest;
  /** Told after each committed Task write (the `/ws/projects` feed); defaults to the process publisher. */
  changes?: ProjectChangeMarks;
  /** A Task root's live status from its hosting root (composition-bound); absent means `offline`. */
  workerStatus?: TaskWorkerStatusResolver;
};
const normalizeDescription = (description: unknown): string => {
  if (typeof description !== "string" || !description.trim()) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  return description.trim();
};
const terminalAssignment = (status: ProjectTaskStatus): ProjectError => new ProjectError("TASK_AGENT_RESOURCE_CLOSED",
  `The Task is ${status}; move it to TODO or IN_PROGRESS before assigning new work.`);
const compareTasks = (a: ProjectTask, b: ProjectTask): number => b.updatedAt.localeCompare(a.updatedAt) || a.taskId.localeCompare(b.taskId);
const cleanup = async (operation: () => Promise<unknown>): Promise<void> => {
  try { await operation(); } catch (e) { console.warn("Task context cleanup failed.", e); }
};
const noContext = (): PreparedTaskContext => ({ files: [], consumed: [] });
/** How one update changes saved context: removals (UI only), whether it rewrites the list, and its context step. */
type ContextUpdate = { removals: string[]; writesContextList: boolean; prepare: () => Promise<PreparedTaskContext> };

/**
 * The Task subject boundary: Project Task metadata and context (released semantics over the
 * per-Project store), Tasks with no Project (ad-hoc, created only by described delegation), saved
 * work for assignment, status rules, and closure (DONE or CANCELLED) / assignment orchestration for both. It is the
 * runtime's `TaskExecutionResourcePort`, delegating agent run facts to TaskExecutionResourceService.
 */
export class ProjectTaskService implements TaskExecutionResourcePort {
  private readonly resources: TaskExecutionResourceService;
  private readonly release: TaskExecutionResourceRelease;
  private readonly adHocTasks: AdHocTaskStore;
  constructor(private readonly deps: Dependencies = {}) {
    this.adHocTasks = deps.adHocTasks ?? new AdHocTaskStore();
    // Agent run resources live beside the Task metadata in the same layouts.
    this.resources = deps.taskExecutionResources
      ?? new TaskExecutionResourceService(new TaskExecutionResourceStore(deps.store?.layout, this.adHocTasks.layout));
    this.release = new TaskExecutionResourceRelease(deps.requestRelease);
    // Every committed run-resource write may change a Task's root (link, start, fail, DONE or CANCELLED, reopen).
    this.resources.setCommitListener((location) => this.changes.taskChanged(location));
  }
  private get changes(): ProjectChangeMarks { return this.deps.changes ?? getProjectChangePublisher(); }
  private get workerStatus(): TaskWorkerStatusResolver { return this.deps.workerStatus ?? (() => null); }
  private get store() { return this.deps.store ?? getProjectStore(); }
  private get context() { return this.deps.contextStore ?? getProjectTaskContextStore(); }
  private nowIso(): string { return (this.deps.now?.() ?? new Date()).toISOString(); }

  /** Loads the agent run resource view (composition, once, after app-data migrations). */
  load(): Promise<void> { return this.resources.load(); }

  async listTasks(projectId: string, status?: ProjectTaskStatus): Promise<ProjectTaskView[]> {
    if (status !== undefined) validateTaskStatus(status);
    return Promise.all((await this.store.listTasks(projectId))
      .filter((t) => status === undefined || t.status === status).sort(compareTasks).map((t) => this.toView(projectId, t)));
  }
  /** The Manager's read of open and closed assignments per Task; `unavailable` when a Task's data can't be read. */
  async assignments(taskIds: readonly string[]): Promise<Map<string, TaskAssignmentViews | "unavailable">> {
    return new Map(await Promise.all(taskIds.map(async (taskId) => [taskId, await this.resources.assignments(taskId)] as const)));
  }
  /** UI/GraphQL create: context comes from an upload draft. */
  async createTask(command: CreateProjectTaskCommand): Promise<ProjectTaskView> {
    const draft = command.contextDraft;
    return this.create(command.projectId, command.description, (taskId) => draft
      ? this.context.prepare(command.projectId, taskId, draft.draftId, draft.storedFilenames, false) : Promise.resolve(noContext()));
  }
  /** Agent-tool create: context is copied from node-local files (may be none). Never reachable from GraphQL. */
  async createTaskWithLocalContextFiles(command: CreateTaskWithLocalContextFilesCommand): Promise<ProjectTaskView> {
    return this.create(command.projectId, command.description,
      (taskId) => this.context.importLocalFiles(command.projectId, taskId, command.localContextFiles));
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
    const { task } = await this.update(command.projectId, command.taskId, { description, status }, {
      removals, writesContextList: Boolean(changes),
      prepare: () => this.prepareChanges(command.projectId, command.taskId, changes?.draftId, additions, Boolean(changes)),
    });
    return this.toView(command.projectId, task);
  }
  /**
   * Patches any Task by its unique id: an ad-hoc Task (direct path read, no Projects gate) or else
   * a Project Task (found across Projects). Description and status; for Project Tasks also
   * `localContextFiles`, copied in and appended (never removed). DONE or CANCELLED closes its agent runs.
   */
  async updateTaskById(command: UpdateTaskByIdCommand): Promise<TaskAcknowledgementView> {
    const hasDescription = Object.hasOwn(command, "description");
    const hasStatus = Object.hasOwn(command, "status");
    const localContextFiles = command.localContextFiles ?? [];
    if (!hasDescription && !hasStatus && !localContextFiles.length) {
      throw new ProjectError("TASK_PATCH_REQUIRED", "Supply description, status and/or context files to update a Task.");
    }
    const description = hasDescription ? normalizeDescription(command.description) : undefined;
    const status = hasStatus ? validateTaskStatus(command.status) : undefined;
    if (typeof command.taskId !== "string" || !command.taskId.trim()) throw new ProjectError("TASK_NOT_FOUND", "Task ID must be nonblank.");
    const taskId = command.taskId;
    if (await this.adHocTasks.read(taskId)) {
      if (localContextFiles.length) {
        throw new ProjectError("TASK_CONTEXT_INVALID", "Context files can be attached only to Project Tasks; this Task has no Project.");
      }
      const write = () => this.adHocTasks.update(taskId, (current): AdHocTask => {
        const meaningful = (description !== undefined && current.description !== description) || (status !== undefined && current.status !== status);
        return meaningful ? { ...current, ...(description !== undefined ? { description } : {}), ...(status !== undefined ? { status } : {}), updatedAt: this.nowIso() } : current;
      });
      const updated = status !== undefined && isTerminalTaskStatus(status) ? await this.closeAndWrite({ projectId: null, taskId }, write) : await write();
      this.changes.taskChanged({ projectId: null, taskId });
      return { projectId: null, taskId, status: updated.status };
    }
    const { projectId } = await this.uniqueTask(taskId);
    const { task, attached } = await this.update(projectId, taskId, { description, status }, {
      removals: [], writesContextList: localContextFiles.length > 0,
      prepare: () => this.context.importLocalFiles(projectId, taskId, localContextFiles),
    });
    return { projectId, taskId, status: task.status, ...(attached.length ? { attachedContextFiles: attached } : {}) };
  }
  /**
   * Permanent run delete: removes the ad-hoc Tasks whose agent runs that root hosted (from the view,
   * no scan). Best effort: failures are logged and never fail the run delete.
   */
  async deleteAdHocTasksHostedBy(hostRoot: RootExecutionIdentity): Promise<void> {
    try {
      await this.resources.load();
      for (const taskId of this.resources.adHocTaskIdsHostedBy(hostRoot)) {
        try {
          await this.resources.serialize(taskId, async () => {
            await this.adHocTasks.delete(taskId);
            this.resources.forget({ projectId: null, taskId });
            this.changes.taskRemoved({ projectId: null, taskId });
          });
        } catch (error) {
          console.warn("AD_HOC_TASK_DELETE_FAILED", { taskId, hostRoot, error: error instanceof Error ? error.message : String(error) });
        }
      }
    } catch (error) {
      console.warn("AD_HOC_TASK_DELETE_FAILED", { hostRoot, error: error instanceof Error ? error.message : String(error) });
    }
  }
  /** Removes metadata and context; the Task's agent run resources stay, so closed work stays closed. */
  async deleteTask(command: DeleteProjectTaskCommand): Promise<boolean> {
    const deleted = Boolean(await this.store.deleteTask(command.projectId, command.taskId));
    if (deleted) this.changes.taskRemoved({ projectId: command.projectId, taskId: command.taskId });
    return deleted;
  }
  /** Every Task with no Project ("Temp tasks"), latest change first, each with its root. */
  async listTasksWithoutProject(): Promise<TaskWithoutProjectView[]> {
    await this.resources.load();
    return (await this.adHocTasks.list()).sort(compareTasks).map((task) => this.toTaskWithoutProjectView(task));
  }
  /** The current view of one Task for the change feed; null when it no longer exists. */
  async readTaskChangeView(location: TaskLocation): Promise<TaskChangeView | null> {
    if (location.projectId === null) {
      const task = await this.adHocTasks.read(location.taskId);
      return task ? { kind: "no_project", task: this.toTaskWithoutProjectView(task) } : null;
    }
    const projectId = location.projectId;
    const task = await this.store.readTask(projectId, location.taskId)
      .catch((error: unknown) => { if ((error as { code?: unknown }).code === "PROJECT_NOT_FOUND") return null; throw error; });
    return task ? { kind: "project", projectId, task: await this.toView(projectId, task) } : null;
  }
  /** The Task root's live status (no file read); null when the Task has no root. */
  workerStatusOf(location: TaskLocation): TaskRootStatus | null {
    const root = this.resources.latestAssignment(location.taskId);
    return root ? rootWorkerStatus(root, this.workerStatus) : null;
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
  /** Settles stop requests already made by DONE or CANCELLED (tests and orderly shutdown). */
  async drainRuntimeReleases(): Promise<void> { await this.release.drain(); }

  // ── TaskExecutionResourcePort (runtime-facing) ──
  async resolveAssignment(taskId: string) {
    const { projectId, task } = await this.uniqueTask(taskId);
    if (isTerminalTaskStatus(task.status)) throw terminalAssignment(task.status);
    await this.resources.load();
    this.resources.assertTaskReadable(taskId);
    const referenceFiles = await Promise.all((task.contextFiles ?? []).map(f => this.context.savedFile(projectId, taskId, f)));
    return { description: task.description, referenceFiles };
  }
  async linkNewTaskExecution(input: NewTaskExecutionLinkInput): Promise<{ taskId: string }> {
    if (input.role !== "assigned") return { taskId: await this.resources.linkInherited(input) };
    if (input.adHocTask) return { taskId: await this.linkAdHocTask(input, input.adHocTask) };
    const { projectId } = await this.uniqueTask(input.taskId);
    await this.resources.serialize(input.taskId, async () => {
      // Status re-check inside the Task's serialization: a DONE or CANCELLED is entirely before or entirely after.
      const task = await this.store.readTask(projectId, input.taskId);
      if (!task) throw new ProjectError("TASK_NOT_FOUND", `Task '${input.taskId}' was not found.`);
      if (isTerminalTaskStatus(task.status)) throw terminalAssignment(task.status);
      await this.resources.linkAssigned({ projectId, taskId: input.taskId }, input);
    });
    return { taskId: input.taskId };
  }
  markStarted(execution: TaskExecutionReference): Promise<void> { return this.resources.markStarted(execution); }
  markFailed(execution: TaskExecutionReference, error: { code: string; message: string }): Promise<void> { return this.resources.markFailed(execution, error); }
  ownerOf(chain: readonly TaskExecutionReference[]) { return this.resources.ownerOf(chain); }
  isOpen(execution: TaskExecutionReference): boolean { return this.resources.isOpen(execution); }
  openTaskExecutions(taskId: string, role: TaskExecutionRole) { return this.resources.openTaskExecutions(taskId, role); }
  closedTaskExecutionsIn(hostRoot: RootExecutionIdentity) { return this.resources.closedTaskExecutionsIn(hostRoot); }
  assertResourceDataReadable(): void { this.resources.assertAllReadable(); }
  /** Marks the Tasks whose root is one of these task executions; the status is read later. Never throws. */
  taskExecutionsStatusChanged(_hostRoot: RootExecutionIdentity, references: readonly TaskExecutionReference[]): void {
    try {
      for (const reference of references) {
        const location = this.resources.rootTaskLocationOf(reference);
        if (location) this.changes.workerStatusChanged(location);
      }
    } catch (error) { console.warn("TASK_ROOT_STATUS_MARK_FAILED", error); }
  }
  /** Advisory: lets the runtime refuse an ineligible sender before it touches any runtime state. */
  async assertReopenable(input: TaskExecutionReopenInput): Promise<void> {
    const location = await this.reopenLocation(input.execution);
    this.resources.assertReopenable(location, input.execution, input.requestedBy);
    await this.assertReopenTaskNotTerminal(location, input.execution);
  }
  /**
   * The reactivation commit: re-validated under the copy's and then its current Task's serialization,
   * so a DONE or CANCELLED (or an assignment of the copy) is entirely before or after. Status is never written.
   */
  async reopenAssignment(input: TaskExecutionReopenInput): Promise<TaskExecutionReopenResult> {
    await this.reopenLocation(input.execution);
    // The copy's current Task is read under the copy's ordering (an assignment of the copy cannot move it meanwhile).
    return this.resources.serializeCopyInTask(input.execution, () => this.resources.locationOf(input.execution)?.taskId ?? "", async () => {
      const location = await this.reopenLocation(input.execution);
      this.resources.assertReopenable(location, input.execution, input.requestedBy);
      await this.assertReopenTaskNotTerminal(location, input.execution);
      return { taskId: location.taskId, reopened: await this.resources.reopenAssignment(location, input.execution, input.requestedBy) };
    });
  }
  /** Advisory existing-copy eligibility (the design's complete list), before any runtime step. */
  async assertAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string }>): Promise<void> {
    await this.resources.load();
    this.resources.assertAllReadable();
    const { projectId } = await this.uniqueTask(input.taskId);
    await this.assertAssignableTask(projectId, input.taskId);
    await this.assertCopyAssignable(input);
  }
  /** The existing-copy commit: every condition re-checked under the copy's and then the Task's serialization. */
  async assignExistingTaskExecution(input: ExistingTaskExecutionAssignInput): Promise<void> {
    await this.resources.load();
    const { projectId } = await this.uniqueTask(input.taskId);
    await this.resources.serializeCopyInTask(input.execution, () => input.taskId, async () => {
      this.resources.assertAllReadable();
      await this.assertAssignableTask(projectId, input.taskId);
      await this.assertCopyAssignable({ execution: input.execution, requestedBy: input.assignedBy, taskId: input.taskId });
      await this.resources.assignExisting({ projectId, taskId: input.taskId }, input);
    });
  }

  /** Creates the Task with no Project (text only) and links the agent run as its assignment. */
  private async linkAdHocTask(link: AssignedLink, content: NonNullable<AssignedLink["adHocTask"]>): Promise<string> {
    const taskId = `${AD_HOC_TASK_ID_PREFIX}${randomUUID()}`;
    const timestamp = this.nowIso();
    await this.adHocTasks.create({ taskId, description: normalizeDescription(content.description),
      referenceFiles: [...content.referenceFiles], status: "TODO", createdAt: timestamp, updatedAt: timestamp });
    this.changes.taskChanged({ projectId: null, taskId });
    await this.resources.serialize(taskId, () => this.resources.linkAssigned({ projectId: null, taskId }, link));
    return taskId;
  }
  /** DONE or CANCELLED (both Task kinds): close the Task's agent runs first (fences at once), then write the status, then ask roots to stop them. */
  private async closeAndWrite<T>(location: TaskLocation, write: () => Promise<T>): Promise<T> {
    let closed = false, written: T | undefined;
    try {
      await this.resources.closeTask(location, async () => {
        closed = true;
        written = await write();
      });
    } finally {
      if (closed) this.release.release(location.taskId, this.resources.releasableByHostRoot(location.taskId));
    }
    return written!;
  }
  private async reopenLocation(execution: TaskExecutionReference): Promise<TaskLocation> {
    await this.resources.load();
    const location = this.resources.locationOf(execution);
    if (!location) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run belongs to no Task.");
    return location;
  }
  /**
   * Reactivation needs the copy's current Task to exist and be TODO or IN_PROGRESS; only the agent changes
   * that status. When it is closed but an earlier Task of the copy was reopened, the refusal names the
   * current Task and the working next step (REQ-007).
   */
  private async assertReopenTaskNotTerminal(location: TaskLocation, execution: TaskExecutionReference): Promise<void> {
    const task = await this.readTaskAt(location);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", "The Task was deleted; its work cannot be reactivated.");
    if (!isTerminalTaskStatus(task.status)) return;
    for (const earlier of this.resources.earlierTaskLocationsOf(execution)) {
      const reopened = await this.readTaskAt(earlier);
      if (reopened && !isTerminalTaskStatus(reopened.status)) {
        throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", notCurrentTaskMessage(execution, { taskId: location.taskId, status: task.status }, earlier.taskId));
      }
    }
    throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED",
      `This Task is ${task.status}. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again.`);
  }
  /** A Task's metadata (with or without a Project); null when it (or its Project) was deleted. */
  private async readTaskAt(location: TaskLocation): Promise<{ status: ProjectTaskStatus } | null> {
    return location.projectId === null
      ? await this.adHocTasks.read(location.taskId)
      // A deleted Project took its Tasks with it.
      : await this.store.readTask(location.projectId, location.taskId)
        .catch((error: unknown) => { if ((error as { code?: unknown }).code === "PROJECT_NOT_FOUND") return null; throw error; });
  }
  /** Assignment target rules for a Project Task: it exists and is not DONE or CANCELLED. */
  private async assertAssignableTask(projectId: string, taskId: string): Promise<void> {
    const task = await this.store.readTask(projectId, taskId);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", `Task '${taskId}' was not found.`);
    if (isTerminalTaskStatus(task.status)) throw terminalAssignment(task.status);
  }
  /** The copy-side rules of an existing-copy assignment, on the copy's history across Tasks. */
  private async assertCopyAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string }>): Promise<void> {
    const history = this.resources.historyOf(input.execution);
    const currentLocation = history && history.current.closedAt === null ? this.resources.locationOfTask(history.currentTaskId) : null;
    const currentTask = currentLocation ? await this.readTaskAt(currentLocation) : null;
    assertTaskExecutionAssignable(history, { requestedBy: input.requestedBy, taskId: input.taskId, ...(currentTask ? { currentTaskStatus: currentTask.status } : {}) });
  }
  /** Shared create body: input and owner checks, then the context step, then the in-lock commit that publishes it. */
  private async create(projectId: string, rawDescription: string, prepareContext: (taskId: string) => Promise<PreparedTaskContext>): Promise<ProjectTaskView> {
    const description = normalizeDescription(rawDescription);
    const taskId = this.deps.createId?.() ?? `project_task_${randomUUID()}`;
    const timestamp = this.nowIso();
    await this.assertOwner(projectId);
    const prepared = await prepareContext(taskId);
    // On any unproven failed outcome retain prepared bytes and draft, never infer rollback from catch.
    const task = await this.store.createTask(projectId, taskId, async () => {
      await this.validatePrepared(projectId, taskId, prepared);
      return { taskId, description, status: "TODO", createdAt: timestamp, updatedAt: timestamp, contextFiles: prepared.files };
    });
    await this.consume(projectId, prepared);
    this.changes.taskChanged({ projectId, taskId });
    return this.toView(projectId, task);
  }
  /**
   * Shared Project Task update body over a validated patch. The context step (draft prepare or local
   * import) runs after every input check and before any write, so a failure changes nothing and DONE
   * or CANCELLED never closes runs first. Prepared files are appended to the current list under the Task lock.
   */
  private async update(projectId: string, taskId: string, patch: { description?: string; status?: ProjectTaskStatus }, context: ContextUpdate)
    : Promise<{ task: ProjectTask; attached: ProjectTaskContextFile[] }> {
    const { description, status } = patch;
    const { removals } = context;
    const existing = await this.assertOwner(projectId, taskId);
    // Input errors are rejected before anything is written (DONE or CANCELLED would otherwise already have closed its runs).
    if (removals.some((name) => !(existing?.contextFiles ?? []).some((f) => f.storedFilename === name))) throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved context was not found in this Task.");
    const prepared = await context.prepare();
    let removed: ProjectTaskContextFile[] = [];
    const writeMetadata = () => this.store.updateTask(projectId, taskId, async (current) => {
      const files = current.contextFiles ?? [];
      if (removals.some((name) => !files.some((f) => f.storedFilename === name))) throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved context was not found in this Task.");
      await this.validatePrepared(projectId, taskId, prepared);
      removed = files.filter((f) => removals.includes(f.storedFilename));
      const meaningful = (description !== undefined && current.description !== description)
        || (status !== undefined && current.status !== status) || prepared.files.length > 0 || removals.length > 0;
      return meaningful ? { ...current, ...(description !== undefined ? { description } : {}), ...(status !== undefined ? { status } : {}),
        ...(context.writesContextList ? { contextFiles: [...files.filter((f) => !removals.includes(f.storedFilename)), ...prepared.files] } : {}), updatedAt: this.nowIso() } as ProjectTask : current;
    });
    const updated = status !== undefined && isTerminalTaskStatus(status) ? await this.closeAndWrite({ projectId, taskId }, writeMetadata) : await writeMetadata();
    this.changes.taskChanged({ projectId, taskId });
    await this.consume(projectId, prepared);
    if (removed.length) await cleanup(() => this.context.cleanupRemoved(projectId, taskId, removed));
    return { task: updated, attached: prepared.files };
  }
  private async uniqueTask(taskId: string) {
    if (typeof taskId !== "string" || !taskId.trim()) throw new ProjectError("TASK_NOT_FOUND", "Task ID must be nonblank.");
    const matches = await this.store.findTask(taskId);
    if (matches.length !== 1) throw new ProjectError(matches.length ? "TASK_ID_AMBIGUOUS" : "TASK_NOT_FOUND",
      `Task '${taskId}' must identify exactly one current node-local Task (found ${matches.length}).`);
    return matches[0]!;
  }
  private async assertOwner(projectId: string, taskId?: string): Promise<ProjectTask | undefined> {
    if (!(await this.store.readProject(projectId))) throw new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
    if (taskId === undefined) return undefined;
    const task = await this.store.readTask(projectId, taskId);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", `Task '${taskId}' was not found in this project.`);
    return task;
  }
  private async assertDraftOwner(projectId: string, draftId: string) {
    await this.assertOwner(projectId);
    const manifest = await this.context.describe(projectId, draftId);
    await this.assertOwner(projectId, manifest.taskId);
  }
  private async prepareChanges(projectId: string, taskId: string, draftId: string | undefined, names: string[], hasChanges: boolean): Promise<PreparedTaskContext> {
    if (!hasChanges) return noContext();
    await this.reclaim(projectId, taskId);
    return this.context.prepare(projectId, taskId, draftId, names, true);
  }
  private async reclaim(projectId: string, taskId: string) {
    await this.store.updateTask(projectId, taskId, async (task) => {
      // Failed membership proof preserves bytes; housekeeping failure is non-fatal.
      await cleanup(() => this.context.reclaimUnpublished(projectId, taskId, new Set(task.contextFiles?.map((f) => f.storedFilename))));
      return task;
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
    return { ...task, projectId, contextFiles, root: this.taskRoot(task.taskId) };
  }
  private toTaskWithoutProjectView(task: AdHocTask): TaskWithoutProjectView {
    return { taskId: task.taskId, description: task.description, status: task.status, referenceFiles: [...task.referenceFiles],
      createdAt: task.createdAt, updatedAt: task.updatedAt, root: this.taskRoot(task.taskId) };
  }
  private taskRoot(taskId: string): TaskRootView | null {
    const root = this.resources.latestAssignment(taskId);
    return root ? buildTaskRootView(root, this.workerStatus) : null;
  }
}

let singleton: ProjectTaskService | null = null;
/** The process instance; an uninitialized process (tests, tool-only contexts) gets an unbound instance. */
export const getProjectTaskService = (): ProjectTaskService => singleton ??= new ProjectTaskService();
/** Called once by the process composition before any getProjectTaskService(); fails fast otherwise. */
export const initializeProjectTaskServiceProcessInstance = (deps: Pick<Dependencies, "taskExecutionResources" | "adHocTasks" | "requestRelease" | "workerStatus">): ProjectTaskService => {
  if (singleton) throw new Error("The process ProjectTaskService is already initialized.");
  return singleton = new ProjectTaskService(deps);
};
export const releaseProjectTaskServiceProcessInstance = (instance: TaskExecutionResourcePort): void => {
  if (singleton === instance) singleton = null;
};
export const resetProjectTaskServiceForTests = (): void => { singleton = null; };
