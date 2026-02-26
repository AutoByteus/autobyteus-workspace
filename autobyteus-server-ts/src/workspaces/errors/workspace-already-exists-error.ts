export class WorkspaceAlreadyExistsError extends Error {
  constructor(message = "Workspace already exists") {
    super(message);
    this.name = "WorkspaceAlreadyExistsError";
  }
}
