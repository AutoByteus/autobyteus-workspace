import { appConfigProvider } from "../../../config/app-config-provider.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class ClaudeWorkspaceResolver {
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
        // fall through to temp workspace
      }
    }

    try {
      return appConfigProvider.config.getTempWorkspaceDir();
    } catch {
      return process.cwd();
    }
  }
}

let cachedClaudeWorkspaceResolver: ClaudeWorkspaceResolver | null = null;

export const getClaudeWorkspaceResolver = (): ClaudeWorkspaceResolver => {
  if (!cachedClaudeWorkspaceResolver) {
    cachedClaudeWorkspaceResolver = new ClaudeWorkspaceResolver();
  }
  return cachedClaudeWorkspaceResolver;
};
