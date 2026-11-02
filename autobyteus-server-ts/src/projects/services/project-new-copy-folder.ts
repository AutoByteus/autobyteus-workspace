import fs from "node:fs/promises";
import { ProjectError } from "../domain/project-errors.js";
import type { ProjectStore } from "../stores/project-store.js";

const isExistingFolder = (folder: string): Promise<boolean> =>
  fs.stat(folder).then((entry) => entry.isDirectory(), () => false);

/**
 * Where a new local copy of a Task of this Project runs: the Project's first linked folder, or `null` when it has no
 * link (the copy inherits the top-level run's folder). Links are not checked when saved, so a first link that is not an
 * existing folder on this node refuses the delegation here, before anything starts; it never falls back.
 */
export const projectFolderForNewCopy = async (store: Pick<ProjectStore, "readProject">, projectId: string): Promise<string | null> => {
  const project = await store.readProject(projectId);
  if (!project) throw new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
  const folder = project.workspaces[0]?.workspaceRootPath ?? null;
  if (folder === null || await isExistingFolder(folder)) return folder;
  throw new ProjectError("TASK_PROJECT_FOLDER_UNAVAILABLE",
    `Project "${project.name}" has the linked folder "${folder}", which is not an existing folder on this node. Fix the Project's link, or link another folder, then delegate again. Nothing was started.`);
};
