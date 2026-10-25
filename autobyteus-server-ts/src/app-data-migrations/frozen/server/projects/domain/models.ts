import type { ProjectTaskContextFile } from "./project-task-context.js";
import type { ProjectTaskStatus } from "./task-status.js";

/** A workspace link as persisted inside a Project record. */
export interface ProjectWorkspaceLink {
  /** Canonical absolute folder path on this node; registration is not required. */
  workspaceRootPath: string;
  description: string;
}

/** A Task as persisted in `<projectId>/tasks/<taskId>/task.json` (which also records its `projectId`). It has no title; the description is the content. */
export interface ProjectTask {
  taskId: string;
  /** The readable key `<prefix>-<number>`, assigned at creation and never changed. */
  taskKey: string;
  description: string;
  status: ProjectTaskStatus;
  contextFiles?: ProjectTaskContextFile[];
  /** Other Tasks of the same Project this Task depends on (informs only); absent in a file means none. */
  dependsOnTaskIds: string[];
  /** The Task of the same Project this Task is part of (its parent, one level only); null (or absent in a file) means none. */
  partOfTaskId: string | null;
  /** The Task's comment thread, oldest first (ID order); add only. Absent in a file means none. */
  comments: ProjectTaskComment[];
  createdAt: string;
  updatedAt: string;
}

/** One comment of a Project Task: its number within the Task (1, 2, 3, …; never reused), the server time it was added, its text. */
export interface ProjectTaskComment {
  id: number;
  createdAt: string;
  text: string;
}

/** A Project as persisted in `<appDataDir>/projects/<projectId>/project.json`; its Tasks live in their own folders. */
export interface Project {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workspaces: ProjectWorkspaceLink[];
  /** Task key allocation state; internal to the store and never returned by any API. */
  taskKeys: ProjectTaskKeys;
}

/** A Project's key prefix (fixed when it was first keyed) and the highest Task number ever assigned in it. */
export interface ProjectTaskKeys {
  prefix: string;
  lastNumber: number;
}
