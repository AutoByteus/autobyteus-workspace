import { randomUUID } from "node:crypto";
import type { MultipartFile } from "@fastify/multipart";
import type {
  TaskAgentResourceLinkInput, TaskAgentResourcePort, TaskAgentResourceReleaseRequest, TaskAgentResourceRole,
} from "../../agent-collaboration/execution/task/task-agent-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type {
  CreateProjectTaskCommand, DeleteProjectTaskCommand, ProjectTask, ProjectTaskStatus, ProjectTaskView,
  TaskAcknowledgementView, TaskLocation, UpdateProjectTaskCommand, UpdateTaskByIdCommand,
} from "../domain/models.js";
import { AD_HOC_TASK_ID_PREFIX, type AdHocTask } from "../domain/ad-hoc-task.js";
import { projectTaskFileLocator, type ProjectTaskContextFile } from "../domain/project-task-context.js";
import { ProjectError } from "../domain/project-errors.js";
import type { TaskAssignment } from "../domain/task-agent-resources.js";
import { getProjectStore, type ProjectStore } from "../stores/project-store.js";
import { AdHocTaskStore } from "../stores/ad-hoc-task-store.js";
import { getProjectTaskContextStore, type ProjectTaskContextStore, type PreparedTaskContext } from "../context/project-task-context-store.js";
import { TaskAgentResourceRelease } from "../runtime/task-agent-resource-release.js";
import { TaskAgentResourceService } from "./task-agent-resource-service.js";
import { TaskAgentResourceStore } from "../stores/task-agent-resource-store.js";

type TaskPersistence = Pick<ProjectStore, "layout" | "readProject" | "listTasks" | "readTask" | "findTask" | "createTask" | "updateTask" | "deleteTask">;
type AssignedLink = Extract<TaskAgentResourceLinkInput, { role: "assigned" }>;
type Dependencies = {
  store?: TaskPersistence;
  /** Tasks with no Project (`<appData>/ad-hoc-tasks/`); outside the Projects store and its migration gate. */
  adHocTasks?: AdHocTaskStore;
  contextStore?: ProjectTaskContextStore;
  now?: () => Date;
  createId?: () => string;
  /** The process authority over agent run resources; bound once by the composition. */
  taskAgentResources?: TaskAgentResourceService;
  /** Exact-root stop request; absent means no runtime is asked to stop anything. */
  requestRelease?: TaskAgentResourceReleaseRequest;
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
const cleanup = async (operation: () => Promise<unknown>): Promise<void> => {
  try { await operation(); } catch (e) { console.warn("Task context cleanup failed.", e); }
};

/**
 * The Task subject boundary: Project Task metadata and context (released semantics over the
 * per-Project store), Tasks with no Project (ad-hoc, created only by described delegation), saved
 * work for assignment, status rules, and DONE / assignment orchestration for both. It is the
 * runtime's `TaskAgentResourcePort`, delegating agent run facts to TaskAgentResourceService.
 */
export class ProjectTaskService implements TaskAgentResourcePort {
  private readonly resources: TaskAgentResourceService;
  private readonly release: TaskAgentResourceRelease;
  private readonly adHocTasks: AdHocTaskStore;
  constructor(private readonly deps: Dependencies = {}) {
    this.adHocTasks = deps.adHocTasks ?? new AdHocTaskStore();
    // Agent run resources live beside the Task metadata in the same layouts.
    this.resources = deps.taskAgentResources
      ?? new TaskAgentResourceService(new TaskAgentResourceStore(deps.store?.layout, this.adHocTasks.layout));
    this.release = new TaskAgentResourceRelease(deps.requestRelease);
  }
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
  /** The Manager's read of current assignments per Task; `unavailable` when a Task's data can't be read. */
  async currentAssignments(taskIds: readonly string[]): Promise<Map<string, TaskAssignment[] | "unavailable">> {
    return new Map(await Promise.all(taskIds.map(async (taskId) => [taskId, await this.resources.currentAssignments(taskId)] as const)));
  }
  async createTask(command: CreateProjectTaskCommand): Promise<ProjectTaskView> {
    const description = normalizeDescription(command.description);
    const taskId = this.deps.createId?.() ?? `project_task_${randomUUID()}`;
    const timestamp = this.nowIso();
    await this.assertOwner(command.projectId);
    const prepared = command.contextDraft ? await this.context.prepare(command.projectId, taskId,
      command.contextDraft.draftId, command.contextDraft.storedFilenames, false) : { files: [], consumed: [] };
    // On any unproven failed outcome retain prepared bytes and draft, never infer rollback from catch.
    const task = await this.store.createTask(command.projectId, taskId, async () => {
      await this.validatePrepared(command.projectId, taskId, prepared);
      return { taskId, description, status: "TODO", createdAt: timestamp, updatedAt: timestamp, contextFiles: prepared.files };
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
    const existing = await this.assertOwner(command.projectId, command.taskId);
    // Input errors are rejected before anything is written (DONE would otherwise already have closed its runs).
    if (removals.some((name) => !(existing?.contextFiles ?? []).some((f) => f.storedFilename === name))) throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved context was not found in this Task.");
    const prepared = await this.prepareChanges(command.projectId, command.taskId, changes?.draftId, additions, Boolean(changes));
    let removed: ProjectTaskContextFile[] = [];
    const writeMetadata = () => this.store.updateTask(command.projectId, command.taskId, async (current) => {
      const files = current.contextFiles ?? [];
      if (removals.some((name) => !files.some((f) => f.storedFilename === name))) throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved context was not found in this Task.");
      await this.validatePrepared(command.projectId, command.taskId, prepared);
      removed = files.filter((f) => removals.includes(f.storedFilename));
      const meaningful = (description !== undefined && current.description !== description)
        || (status !== undefined && current.status !== status) || additions.length > 0 || removals.length > 0;
      return meaningful ? { ...current, ...(hasDescription ? { description } : {}), ...(hasStatus ? { status } : {}),
        ...(changes ? { contextFiles: [...files.filter((f) => !removals.includes(f.storedFilename)), ...prepared.files] } : {}), updatedAt: this.nowIso() } as ProjectTask : current;
    });
    const updated = status === "DONE"
      ? await this.closeAndWrite({ projectId: command.projectId, taskId: command.taskId }, writeMetadata)
      : await writeMetadata();
    await this.consume(command.projectId, prepared);
    if (removed.length) await cleanup(() => this.context.cleanupRemoved(command.projectId, command.taskId, removed));
    return this.toView(command.projectId, updated);
  }
  /**
   * Patches any Task by its unique id: an ad-hoc Task (direct path read, no Projects gate) or else
   * a Project Task (found across Projects). Description and status only; DONE closes its agent runs.
   */
  async updateTaskById(command: UpdateTaskByIdCommand): Promise<TaskAcknowledgementView> {
    const hasDescription = Object.hasOwn(command, "description");
    const hasStatus = Object.hasOwn(command, "status");
    if (!hasDescription && !hasStatus) throw new ProjectError("TASK_PATCH_REQUIRED", "Supply description and/or status to update a Task.");
    const description = hasDescription ? normalizeDescription(command.description) : undefined;
    const status = hasStatus ? validateTaskStatus(command.status) : undefined;
    if (typeof command.taskId !== "string" || !command.taskId.trim()) throw new ProjectError("TASK_NOT_FOUND", "Task ID must be nonblank.");
    const taskId = command.taskId;
    if (await this.adHocTasks.read(taskId)) {
      const write = () => this.adHocTasks.update(taskId, (current): AdHocTask => {
        const meaningful = (description !== undefined && current.description !== description) || (status !== undefined && current.status !== status);
        return meaningful ? { ...current, ...(description !== undefined ? { description } : {}), ...(status !== undefined ? { status } : {}), updatedAt: this.nowIso() } : current;
      });
      const updated = status === "DONE" ? await this.closeAndWrite({ projectId: null, taskId }, write) : await write();
      return { projectId: null, taskId, status: updated.status };
    }
    const { projectId } = await this.uniqueTask(taskId);
    const updated = await this.updateTask({ projectId, taskId, ...(description !== undefined ? { description } : {}), ...(status !== undefined ? { status } : {}) });
    return { projectId, taskId, status: updated.status };
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
    return Boolean(await this.store.deleteTask(command.projectId, command.taskId));
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
  /** Settles stop requests already made by DONE (tests and orderly shutdown). */
  async drainRuntimeReleases(): Promise<void> { await this.release.drain(); }

  // ── TaskAgentResourcePort (runtime-facing) ──
  async resolveAssignment(taskId: string) {
    const { projectId, task } = await this.uniqueTask(taskId);
    if (task.status === "DONE") throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The Task is DONE; reopen it before assigning new work.");
    await this.resources.load();
    this.resources.assertTaskReadable(taskId);
    const referenceFiles = await Promise.all((task.contextFiles ?? []).map(f => this.context.savedFile(projectId, taskId, f)));
    return { description: task.description, referenceFiles };
  }
  async linkAgentRun(input: TaskAgentResourceLinkInput): Promise<{ taskId: string }> {
    if (input.role !== "assigned") return { taskId: await this.resources.linkInherited(input) };
    if (input.adHocTask) return { taskId: await this.linkAdHocTask(input, input.adHocTask) };
    const { projectId } = await this.uniqueTask(input.taskId);
    await this.resources.serialize(input.taskId, async () => {
      // Status re-check inside the Task's serialization: a DONE is entirely before or entirely after.
      const task = await this.store.readTask(projectId, input.taskId);
      if (!task) throw new ProjectError("TASK_NOT_FOUND", `Task '${input.taskId}' was not found.`);
      if (task.status === "DONE") throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The Task is DONE; reopen it before assigning new work.");
      await this.resources.linkAssigned({ projectId, taskId: input.taskId }, input);
    });
    return { taskId: input.taskId };
  }
  markStarted(agentRun: TaskExecutionReference): Promise<void> { return this.resources.markStarted(agentRun); }
  markFailed(agentRun: TaskExecutionReference, error: { code: string; message: string }): Promise<void> { return this.resources.markFailed(agentRun, error); }
  ownerOf(chain: readonly TaskExecutionReference[]) { return this.resources.ownerOf(chain); }
  isOpen(agentRun: TaskExecutionReference): boolean { return this.resources.isOpen(agentRun); }
  openAgentRuns(taskId: string, role: TaskAgentResourceRole) { return this.resources.openAgentRuns(taskId, role); }
  closedAgentRunsIn(hostRoot: RootExecutionIdentity) { return this.resources.closedAgentRunsIn(hostRoot); }
  assertResourceDataReadable(): void { this.resources.assertAllReadable(); }

  /** Creates the Task with no Project (text only) and links the agent run as its assignment. */
  private async linkAdHocTask(link: AssignedLink, content: NonNullable<AssignedLink["adHocTask"]>): Promise<string> {
    const taskId = `${AD_HOC_TASK_ID_PREFIX}${randomUUID()}`;
    const timestamp = this.nowIso();
    await this.adHocTasks.create({ taskId, description: normalizeDescription(content.description),
      referenceFiles: [...content.referenceFiles], status: "TODO", createdAt: timestamp, updatedAt: timestamp });
    await this.resources.serialize(taskId, () => this.resources.linkAssigned({ projectId: null, taskId }, link));
    return taskId;
  }
  /** DONE (both Task kinds): close the Task's agent runs first (fences at once), then write the status, then ask roots to stop them. */
  private async closeAndWrite<T>(location: TaskLocation, write: () => Promise<T>): Promise<T> {
    let closed = false, written: T | undefined;
    try {
      await this.resources.closeTask(location, async () => {
        closed = true;
        written = await write();
      });
    } finally {
      if (closed) this.release.release(location.taskId, this.resources.closedByHostRoot(location.taskId));
    }
    return written!;
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
    if (!hasChanges) return { files: [], consumed: [] };
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
    return { ...task, projectId, contextFiles };
  }
}

let singleton: ProjectTaskService | null = null;
/** The process instance; an uninitialized process (tests, tool-only contexts) gets an unbound instance. */
export const getProjectTaskService = (): ProjectTaskService => singleton ??= new ProjectTaskService();
/** Called once by the process composition before any getProjectTaskService(); fails fast otherwise. */
export const initializeProjectTaskServiceProcessInstance = (deps: Pick<Dependencies, "taskAgentResources" | "adHocTasks" | "requestRelease">): ProjectTaskService => {
  if (singleton) throw new Error("The process ProjectTaskService is already initialized.");
  return singleton = new ProjectTaskService(deps);
};
export const releaseProjectTaskServiceProcessInstance = (instance: TaskAgentResourcePort): void => {
  if (singleton === instance) singleton = null;
};
export const resetProjectTaskServiceForTests = (): void => { singleton = null; };
