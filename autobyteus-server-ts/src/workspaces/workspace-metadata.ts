export type WorkspaceKind = "filesystem" | "skill" | "temp" | "semantic_memory";

export interface WorkspaceMetadata {
  workspaceId: string;
  name: string;
  rootPath: string;
  kind: WorkspaceKind;
  config: Record<string, unknown>;
  isTemp: boolean;
}
