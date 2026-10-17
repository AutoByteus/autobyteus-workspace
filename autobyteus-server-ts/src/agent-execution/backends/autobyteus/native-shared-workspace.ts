import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { configuredSharedWorkspace } from "../../../workspaces/shared-workspace-binding.js";
import { scopedProjectGitEnvironment } from "../../../runtime-management/shared/scoped-project-git-environment.js";

/** Preserve the selected shared path even when only registry metadata exists. */
export async function resolveNativeSharedWorkspace(manager: WorkspaceManager, id: string) {
  const registered = await manager.getRegisteredWorkspaceRootPath(id);
  return registered && await configuredSharedWorkspace(registered) ? manager.getOrCreateWorkspace(id) : undefined;
}
export async function nativeSharedTerminalData(root: string) {
  return await configuredSharedWorkspace(root)
    ? { terminalChildEnvironment: () => scopedProjectGitEnvironment(process.env, root) } : {};
}
