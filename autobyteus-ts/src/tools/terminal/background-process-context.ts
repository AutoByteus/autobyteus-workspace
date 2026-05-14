import { BackgroundProcessManager } from './background-process-manager.js';

export type AgentContextLike = {
  workspaceRootPath?: string | null;
  agentId?: string;
};

let defaultBackgroundManager: BackgroundProcessManager | null = null;

export function getBackgroundManager(context: AgentContextLike | null | undefined): BackgroundProcessManager {
  if (!context) {
    if (!defaultBackgroundManager) {
      defaultBackgroundManager = new BackgroundProcessManager();
    }
    return defaultBackgroundManager;
  }

  const contextRecord = context as Record<string, unknown>;
  const existing = contextRecord._backgroundProcessManager;
  if (existing instanceof BackgroundProcessManager) {
    return existing;
  }

  const manager = new BackgroundProcessManager();
  contextRecord._backgroundProcessManager = manager;
  return manager;
}
