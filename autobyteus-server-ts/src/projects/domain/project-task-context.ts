export interface ProjectTaskContextFile {
  storedFilename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface ProjectTaskContextFileView extends ProjectTaskContextFile { locator: string; localPath?: string }
export interface ProjectTaskContextDraft { draftId: string; storedFilenames: string[] }
export interface ProjectTaskContextChanges { draftId?: string; addStoredFilenames?: string[]; removeStoredFilenames?: string[] }
export interface ProjectTaskDraftManifest { draftId: string; projectId: string; taskId?: string; files: ProjectTaskContextFile[] }
export const isSafeContextFilename = (name: unknown): name is string =>
  typeof name === "string" && /^ctx_[a-zA-Z0-9_-]+__[a-zA-Z0-9._-]+$/.test(name);
export const projectTaskFileLocator = (projectId: string, taskId: string, filename: string): string =>
  `/rest/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/context-files/${encodeURIComponent(filename)}`;
