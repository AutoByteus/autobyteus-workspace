import { asText } from "../command-text.js";
import {
  actionLine,
  firstLineOf,
  messageParts,
  quoted,
  readLine,
  type PlatformToolConverter,
} from "./platform-line-parts.js";

/**
 * The project board (contract §3). Current names: `list_projects`, `list_project_tasks`,
 * `search_project_tasks`, `get_project_task`, `create_project`, `update_project`, `create_task`,
 * `update_task`. Recorded history, kept because journals of earlier runs hold them:
 * `create_or_update_task`, `create_or_update_project` and Antigravity's `manage_task`.
 */

const NOT_RECORDED = "(not recorded)";

const createTask: PlatformToolConverter = (call, result) => {
  const description = asText(call.args.description);
  return actionLine(`Create project task: ${asText(call.args.title) ?? firstLineOf(description, "(title not recorded)")}`,
    result, messageParts(description));
};

/** `Update project task <id>: status <status>`; any other changed field is named after it. */
const updateTask: PlatformToolConverter = (call, result) => {
  const changes = [
    ...(asText(call.args.status) ? [`status ${asText(call.args.status)}`] : []),
    ...(asText(call.args.title) ? [`title ${quoted(asText(call.args.title)!)}`] : []),
  ];
  const head = `Update project task ${asText(call.args.task_id) ?? NOT_RECORDED}${changes.length ? `: ${changes.join(", ")}` : ""}`;
  const comment = asText(call.args.add_comment);
  return actionLine(head, result, [
    ...messageParts(asText(call.args.description)),
    ...messageParts(comment ? `Comment: ${comment}` : null),
  ]);
};

/** Recorded history. */
const createOrUpdateTask: PlatformToolConverter = (call, result) =>
  actionLine(`Create or update project task: ${asText(call.args.title) ?? firstLineOf(asText(call.args.description), "(not recorded)")}`, result);

const getProjectTask: PlatformToolConverter = (call, result) =>
  readLine(`Read project task ${asText(call.args.task_id) ?? NOT_RECORDED}`, result);

const listProjectTasks: PlatformToolConverter = (call, result) => {
  const project = asText(call.args.project_id);
  return readLine(`List project tasks${project ? ` (project ${project})` : ""}`, result);
};

const searchProjectTasks: PlatformToolConverter = (call, result) =>
  readLine(`Search project tasks ${quoted(asText(call.args.query) ?? "")}`, result);

const createProject: PlatformToolConverter = (call, result) =>
  actionLine(`Create project: ${asText(call.args.name) ?? NOT_RECORDED}`, result);

const updateProject: PlatformToolConverter = (call, result) =>
  actionLine(`Update project ${asText(call.args.project_id) ?? NOT_RECORDED}`, result);

/** Recorded history. */
const createOrUpdateProject: PlatformToolConverter = (call, result) =>
  actionLine(`Create or update project: ${asText(call.args.name) ?? NOT_RECORDED}`, result);

const listProjects: PlatformToolConverter = (_call, result) => readLine("List projects", result);

/** Recorded history (Antigravity): `manage_task {Action, TaskId}`. */
const manageTask: PlatformToolConverter = (call, result) => actionLine(
  `Project task: ${[asText(call.args.Action), asText(call.args.TaskId)].filter((part) => part !== null).join(" ") || NOT_RECORDED}`,
  result,
);

export const projectTaskToolConverters: ReadonlyMap<string, PlatformToolConverter> = new Map([
  ["create_task", createTask],
  ["update_task", updateTask],
  ["get_project_task", getProjectTask],
  ["list_project_tasks", listProjectTasks],
  ["search_project_tasks", searchProjectTasks],
  ["create_project", createProject],
  ["update_project", updateProject],
  ["list_projects", listProjects],
  ["create_or_update_task", createOrUpdateTask],
  ["create_or_update_project", createOrUpdateProject],
  ["manage_task", manageTask],
]);
