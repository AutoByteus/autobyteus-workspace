export type WorkspaceMetadataKind = 'filesystem' | 'skill' | 'temp';

export interface WorkspaceMetadata {
  workspaceId: string;
  workspaceRootPath: string;
  displayName: string;
  kind: WorkspaceMetadataKind;
}

export type WorkspaceMetadataLoadStatus =
  | 'unregistered'
  | 'registering'
  | 'registered'
  | 'error';

export interface WorkspaceMetadataLoadState {
  status: WorkspaceMetadataLoadStatus;
  error: string | null;
}
