import { z } from "zod";
import type { ProjectTaskView, ProjectView, TaskLocation, TaskRootView, TaskWithoutProjectView } from "../domain/models.js";

/**
 * The `/ws/projects` change feed (server → client, one JSON message per frame). Views are the
 * GraphQL shapes field for field, so a client applies events and snapshot reads alike.
 */
export type TaskScope = Readonly<{ kind: "project"; projectId: string }> | Readonly<{ kind: "no_project" }>;
export const taskScopeOf = (location: TaskLocation): TaskScope =>
  location.projectId === null ? { kind: "no_project" } : { kind: "project", projectId: location.projectId };

const text = z.string().min(1);
const scopeSchema = z.union([
  z.strictObject({ kind: z.literal("project"), projectId: text }),
  z.strictObject({ kind: z.literal("no_project") }),
]);
const statusSchema = z.enum(["running", "initializing", "idle", "error", "offline"]);
const rootSchema = z.strictObject({
  kind: z.enum(["agent", "team"]),
  recipientAddress: text.nullable(),
  ingressAgentRunId: text,
  teamRunId: text.nullable(),
  hostRoot: z.strictObject({ kind: z.enum(["agent", "agent_team", "agent_org"]), runId: text }),
  start: z.enum(["starting", "started", "failed"]),
  startError: z.strictObject({ code: text, message: z.string() }).nullable(),
  closed: z.boolean(),
  status: statusSchema,
});
const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const projectTaskSchema = z.strictObject({
  contextFiles: z.array(z.strictObject({ storedFilename: text, displayName: z.string(), mimeType: z.string(), sizeBytes: z.number().int(), locator: text })),
  taskId: text, projectId: text, description: z.string(), status: taskStatusSchema,
  createdAt: text, updatedAt: text, root: rootSchema.nullable(),
});
const taskWithoutProjectSchema = z.strictObject({
  taskId: text, description: z.string(), status: taskStatusSchema, referenceFiles: z.array(z.string()),
  createdAt: text, updatedAt: text, root: rootSchema.nullable(),
});
const projectSchema = z.strictObject({
  projectId: text, name: z.string(), description: z.string(), createdAt: text, updatedAt: text,
  workspaces: z.array(z.strictObject({
    workspaceRootPath: z.string(), displayName: z.string(), description: z.string(),
    availability: z.enum(["AVAILABLE", "UNREGISTERED"]),
  })),
  openTaskCount: z.number().int(), taskCount: z.number().int(),
});

export const ProjectChangeMessageSchema = z.union([
  z.strictObject({ type: z.literal("connected") }),
  z.strictObject({ type: z.literal("project_upserted"), project: projectSchema }),
  z.strictObject({ type: z.literal("project_removed"), projectId: text }),
  z.strictObject({ type: z.literal("task_upserted"), scope: z.strictObject({ kind: z.literal("project"), projectId: text }), task: projectTaskSchema }),
  z.strictObject({ type: z.literal("task_upserted"), scope: z.strictObject({ kind: z.literal("no_project") }), task: taskWithoutProjectSchema }),
  z.strictObject({ type: z.literal("task_removed"), scope: scopeSchema, taskId: text }),
  z.strictObject({ type: z.literal("task_worker_status"), scope: scopeSchema, taskId: text, status: statusSchema }),
]);
export type ProjectChangeMessage = z.infer<typeof ProjectChangeMessageSchema>;
/** The Task view a `task_upserted` carries, by scope. */
export type TaskChangeView =
  | Readonly<{ kind: "project"; projectId: string; task: ProjectTaskView }>
  | Readonly<{ kind: "no_project"; task: TaskWithoutProjectView }>;

/** The exact writer: one validated JSON frame. */
export const serializeProjectChangeMessage = (message: ProjectChangeMessage): string =>
  JSON.stringify(ProjectChangeMessageSchema.parse(message));

const rootWire = (root: TaskRootView | null) => root && {
  kind: root.kind, recipientAddress: root.recipientAddress, ingressAgentRunId: root.ingressAgentRunId, teamRunId: root.teamRunId,
  hostRoot: { kind: root.hostRoot.kind, runId: root.hostRoot.runId }, start: root.start,
  startError: root.startError && { code: root.startError.code, message: root.startError.message }, closed: root.closed, status: root.status,
};
/** GraphQL `ProjectTask` fields only (no server paths). */
export const projectTaskWire = (task: ProjectTaskView) => ({
  contextFiles: task.contextFiles.map(({ storedFilename, displayName, mimeType, sizeBytes, locator }) =>
    ({ storedFilename, displayName, mimeType, sizeBytes, locator })),
  taskId: task.taskId, projectId: task.projectId, description: task.description, status: task.status,
  createdAt: task.createdAt, updatedAt: task.updatedAt, root: rootWire(task.root),
});
export const taskWithoutProjectWire = (task: TaskWithoutProjectView) => ({
  taskId: task.taskId, description: task.description, status: task.status, referenceFiles: [...task.referenceFiles],
  createdAt: task.createdAt, updatedAt: task.updatedAt, root: rootWire(task.root),
});
/** GraphQL `Project` fields only. */
export const projectWire = (project: ProjectView) => ({
  projectId: project.projectId, name: project.name, description: project.description, createdAt: project.createdAt, updatedAt: project.updatedAt,
  workspaces: project.workspaces.map(({ workspaceRootPath, displayName, description, availability }) =>
    ({ workspaceRootPath, displayName, description, availability })),
  openTaskCount: project.openTaskCount, taskCount: project.taskCount,
});
