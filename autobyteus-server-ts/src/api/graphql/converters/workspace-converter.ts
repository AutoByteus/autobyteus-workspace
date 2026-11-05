import type { FileSystemWorkspace } from "../../../workspaces/filesystem-workspace.js";
import { WorkspaceMetadataInfo } from "../types/workspace.js";

export class WorkspaceConverter {
  static toGraphql(workspace: FileSystemWorkspace): WorkspaceMetadataInfo {
    const metadata = workspace.metadata;
    return {
      workspaceId: metadata.workspaceId,
      name: metadata.name,
      displayName: metadata.name,
      config: metadata.config,
      workspaceRootPath: metadata.rootPath,
      absolutePath: metadata.rootPath,
      kind: metadata.kind,
      isTemp: metadata.isTemp,
    };
  }
}
