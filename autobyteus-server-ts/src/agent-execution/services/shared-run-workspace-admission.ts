import fs from "node:fs/promises";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { checkSharedWorkspaceForRun } from "../../workspaces/shared-workspace-binding.js";

/** Called once by activation (new and restore), not by message/file operations.
 * Provisioning has already registered the selected workspace metadata. */
export async function admitSharedRunWorkspace(workspaceId: string | null | undefined): Promise<void> {
  if (!workspaceId) return;
  try { await fs.access("/etc/autobyteus-nfs/attachment.json"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  const manager = getWorkspaceManager();
  const root = manager.getWorkspaceById(workspaceId)?.getBasePath()
    ?? await manager.getRegisteredWorkspaceRootPath(workspaceId);
  if (root) await checkSharedWorkspaceForRun(root);
}
