import { appConfigProvider } from "../../../config/app-config-provider.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { WorkspaceAccessError } from "../../../workspaces/workspace-access-error.js";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class CodexWorkspaceResolver {
  private readonly workspaceManager: WorkspaceManager;

  constructor(workspaceManager: WorkspaceManager = getWorkspaceManager()) {
    this.workspaceManager = workspaceManager;
  }

  async resolveWorkingDirectory(workspaceId?: string | null): Promise<string> {
    const normalizedWorkspaceId = asString(workspaceId);
    if (normalizedWorkspaceId) {
      try {
        const workspace = await this.workspaceManager.getOrCreateRunWorkspace(normalizedWorkspaceId);
        const workspacePath = workspace.getBasePath();
        if (workspacePath) {
          return workspacePath;
        }
      } catch (error) {
        // WORKSPACE_NOT_RUNNABLE (a semantic memory view's workspace) is never replaced by the temp workspace.
        if (error instanceof WorkspaceAccessError) throw error;
        const registeredRoot = await this.workspaceManager.getRegisteredWorkspaceRootPath(normalizedWorkspaceId);
        if (registeredRoot) throw error;
        // fallback below
      }
    }

    try {
      return appConfigProvider.config.getTempWorkspaceDir();
    } catch {
      return process.cwd();
    }
  }
}

let cachedCodexWorkspaceResolver: CodexWorkspaceResolver | null = null;

export const getCodexWorkspaceResolver = (): CodexWorkspaceResolver => {
  if (!cachedCodexWorkspaceResolver) {
    cachedCodexWorkspaceResolver = new CodexWorkspaceResolver();
  }
  return cachedCodexWorkspaceResolver;
};
