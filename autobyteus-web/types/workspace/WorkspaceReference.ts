export type WorkspaceReferenceKind = 'filesystem';

export interface WorkspaceReference {
  workspaceId: string;
  workspaceRootPath: string;
  displayName: string;
  kind: WorkspaceReferenceKind;
}

export type WorkspaceActivationStatus =
  | 'uninitialized'
  | 'activating'
  | 'initialized'
  | 'error';

export interface WorkspaceActivationState {
  status: WorkspaceActivationStatus;
  error: string | null;
}
