import type { NativeCommandProcessScope } from './command-execution/native-command-process-scope.js';
import { terminalChildEnvironment, type TerminalEnvironmentContext } from "./terminal-child-environment.js";
import { NonInteractiveShellResolver } from "./command-execution/non-interactive-shell-resolver.js";
import { BackgroundProcessManager } from './background-process-manager.js';

export type AgentContextLike = TerminalEnvironmentContext & {
  workspaceRootPath?: string | null;
  agentId?: string;
  nativeCommandProcessScope?: NativeCommandProcessScope;
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

  const manager = new BackgroundProcessManager(undefined, new NonInteractiveShellResolver({ env: terminalChildEnvironment(context) }), undefined, context.nativeCommandProcessScope);
  contextRecord._backgroundProcessManager = manager;
  return manager;
}
