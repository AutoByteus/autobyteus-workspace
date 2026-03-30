import { appConfigProvider } from "../../../config/app-config-provider.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../workspaces/workspace-manager.js";

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
      const existing = this.workspaceManager.getWorkspaceById(normalizedWorkspaceId);
      const existingPath = existing?.getBasePath();
      if (existingPath) {
        return existingPath;
      }
      try {
        const workspace = await this.workspaceManager.getOrCreateWorkspace(normalizedWorkspaceId);
        const workspacePath = workspace.getBasePath();
        if (workspacePath) {
          return workspacePath;
        }
      } catch {
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
