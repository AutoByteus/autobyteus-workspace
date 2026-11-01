import type { MultipartFile } from "@fastify/multipart";
import { ProjectError } from "../domain/project-errors.js";
import { getProjectStore, type ProjectStore } from "../stores/project-store.js";
import { getProjectTaskContextStore, type ProjectTaskContextStore } from "../context/project-task-context-store.js";
import { TaskContextOwnership } from "./task-context-ownership.js";

type Dependencies = {
  store?: Pick<ProjectStore, "readProject" | "readTask" | "updateTask">;
  contextStore?: ProjectTaskContextStore;
};

/**
 * Task context upload drafts and saved context files, for the app's REST routes: every operation first checks that
 * its Project and Task (or the draft's Task) exist; beginning a draft for an existing Task reclaims its unpublished bytes.
 */
export class ProjectTaskContextDrafts {
  constructor(private readonly deps: Dependencies = {}) {}
  private get store() { return this.deps.store ?? getProjectStore(); }
  private get context() { return this.deps.contextStore ?? getProjectTaskContextStore(); }
  private get ownership() { return new TaskContextOwnership(() => this.store, () => this.context); }

  async beginContextDraft(projectId: string, taskId?: string) {
    await this.ownership.assertOwner(projectId, taskId);
    if (taskId) await this.ownership.reclaimUnpublished(projectId, taskId);
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
    const task = await this.ownership.assertOwner(projectId, taskId);
    const file = task?.contextFiles?.find((f) => f.storedFilename === filename);
    if (!file) throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved Task context was not found.");
    const filePath = await this.context.savedFile(projectId, taskId, file).catch(() => { throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Saved Task bytes are unavailable."); });
    return { file, filePath };
  }

  private async assertDraftOwner(projectId: string, draftId: string) {
    await this.ownership.assertOwner(projectId);
    const manifest = await this.context.describe(projectId, draftId);
    await this.ownership.assertOwner(projectId, manifest.taskId);
  }
}

let singleton: ProjectTaskContextDrafts | null = null;
/** The process instance (over the process Projects and Task-context stores). */
export const getProjectTaskContextDrafts = (): ProjectTaskContextDrafts => singleton ??= new ProjectTaskContextDrafts();
export const resetProjectTaskContextDraftsForTests = (): void => { singleton = null; };
