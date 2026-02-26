export class WorkspaceConnectionError extends Error {
  constructor(message = "Workspace connection failed") {
    super(message);
    this.name = "WorkspaceConnectionError";
  }
}
