/**
 * Why the node refused an access to a workspace (autobyteus-554):
 * - `WORKSPACE_READ_ONLY`: a write, create, rename, move or delete on a read-only workspace;
 * - `WORKSPACE_LINK_NOT_OPENED`: a path through a symbolic link in a workspace that does not follow links;
 * - `WORKSPACE_NOT_RUNNABLE`: a run asked to work in a workspace that can never be a run's workspace.
 */
export type WorkspaceAccessErrorCode =
  | "WORKSPACE_READ_ONLY"
  | "WORKSPACE_LINK_NOT_OPENED"
  | "WORKSPACE_NOT_RUNNABLE";

/** The message starts with the code, so string-only surfaces (GraphQL errors, JSON error bodies) carry it. */
export class WorkspaceAccessError extends Error {
  constructor(readonly code: WorkspaceAccessErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "WorkspaceAccessError";
  }
}
