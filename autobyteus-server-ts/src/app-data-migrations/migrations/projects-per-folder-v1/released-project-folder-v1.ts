/**
 * Frozen Project target reader/types from project-store.ts and domain/models.ts at
 * 5316a0cad19498819a8a50c594b72c0197d8b6a1 (before path-only associations).
 * Keeps projects-per-folder-v1 equality, conflict and retry classification stable.
 * Historical knowledge belongs only to this migration; do not import current Project types.
 */
/** A workspace link as persisted inside a Project record. */
export interface ReleasedProjectWorkspaceLink {
  workspaceId: string;
  /** Root path snapshot taken when the link was created. */
  workspaceRootPath: string;
  description: string;
  addedAt: string;
}

/** A Project as persisted in `<appDataDir>/projects/<projectId>/project.json`; its Tasks live in their own folders. */
export interface ReleasedProject {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workspaces: ReleasedProjectWorkspaceLink[];
}


const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isValidLink = (link: unknown): link is ReleasedProjectWorkspaceLink => {
  const c = link as Partial<ReleasedProjectWorkspaceLink> | null;
  return Boolean(c) && isNonEmptyString(c?.workspaceId) && isNonEmptyString(c?.workspaceRootPath)
    && typeof c?.description === "string" && isNonEmptyString(c?.addedAt);
};

/** Frozen released reader of `project.json`: known fields only; an invalid file is not a Project. */
export const readReleasedProjectFolderV1 = (raw: unknown, projectId: string): ReleasedProject | null => {
  const c = raw as Partial<ReleasedProject> | null;
  if (!c || c.projectId !== projectId || !isNonEmptyString(c.name) || typeof c.description !== "string"
    || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt) || !Array.isArray(c.workspaces)) return null;
  return { projectId, name: c.name, description: c.description, createdAt: c.createdAt, updatedAt: c.updatedAt,
    workspaces: c.workspaces.filter(isValidLink).map((l) => ({
      workspaceId: l.workspaceId, workspaceRootPath: l.workspaceRootPath, description: l.description, addedAt: l.addedAt })) };
};
