export type ProjectErrorCode =
  | "PROJECT_NAME_REQUIRED"
  | "PROJECT_NAME_TAKEN"
  | "PROJECT_NOT_FOUND"
  | "WORKSPACE_NOT_REGISTERED"
  | "WORKSPACE_ALREADY_LINKED"
  | "WORKSPACE_LINK_NOT_FOUND"
  | "TASK_DESCRIPTION_REQUIRED"
  | "TASK_NOT_FOUND"
  | "TASK_STATUS_INVALID"
  | "TASK_PATCH_REQUIRED"
  | "PROJECT_TOOL_ARGUMENT_INVALID"
  | "TASK_CREATE_STATUS_UNSUPPORTED"
  | "TASK_CONTEXT_INVALID"
  | "TASK_CONTEXT_NOT_FOUND";

export class ProjectError extends Error {
  constructor(
    readonly code: ProjectErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectError";
  }
}
