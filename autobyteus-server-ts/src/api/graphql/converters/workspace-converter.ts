import { TempWorkspace } from "../../../workspaces/temp-workspace.js";
import { WorkspaceInfo } from "../types/workspace.js";

type FileExplorerLike = {
  toShallowJson: (depth?: number) => Promise<string | object | null> | string | object | null;
};

type WorkspaceLike = {
  workspaceId: string;
  getName?: () => string;
  config?: { toDict?: () => Record<string, unknown> };
  getBasePath?: () => string;
  getFileExplorer?: () => Promise<FileExplorerLike>;
};

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const ensureJsonString = (payload: string | object | null): string | null => {
  if (payload === null) {
    return null;
  }
  if (typeof payload === "string") {
    return payload;
  }
  return JSON.stringify(payload);
};

export class WorkspaceConverter {
  static async toGraphql(workspace: WorkspaceLike): Promise<WorkspaceInfo> {
    try {
      const fileExplorer = workspace.getFileExplorer
        ? await workspace.getFileExplorer()
        : null;
      const fileExplorerJson = fileExplorer
        ? await fileExplorer.toShallowJson(1)
        : null;

      return {
        workspaceId: workspace.workspaceId,
        name: workspace.getName ? workspace.getName() : workspace.workspaceId,
        config: workspace.config?.toDict ? workspace.config.toDict() : {},
        fileExplorer: ensureJsonString(fileExplorerJson),
        absolutePath: workspace.getBasePath ? workspace.getBasePath() : null,
        isTemp: workspace.workspaceId === TempWorkspace.TEMP_WORKSPACE_ID,
      };
    } catch (error) {
      logger.error(
        `Failed to convert Workspace to GraphQL type for ID ${workspace.workspaceId}: ${String(error)}`,
      );
      throw new Error(`Failed to convert Workspace to GraphQL type: ${String(error)}`);
    }
  }
}
