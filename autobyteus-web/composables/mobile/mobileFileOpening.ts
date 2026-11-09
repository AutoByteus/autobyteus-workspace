import { useActiveContextStore } from '~/stores/activeContextStore';
import { useRemoteRunsStore } from '~/stores/remoteRunsStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { mapAbsolutePathToWorkspaceRelative } from '~/utils/fileExplorer/absoluteWorkspacePathMapping';
import type { MobileFileNavigation } from '~/composables/mobile/useMobileNavigation';

/** How a phone open of a node path ended; the caller words the refusal. */
export type MobileFileOpenOutcome =
  | { status: 'opened'; path: string }
  | { status: 'unavailable' }
  | { status: 'failed' };

/**
 * The phone opens a file named by an absolute path (a conversation's file link or a path attachment) full screen on
 * its Files screen, as a history entry (autobyteus-277 DS-008). Inside the open agent's folder it opens as a workspace
 * file; anywhere else on the node's computer it opens by its absolute path, read-only (autobyteus-436, a node file).
 * A run another node runs is `unavailable`: its paths are that node's. The one owner of this rule for links and
 * attachments (autobyteus-450).
 */
export const openMobileFilePath = async (input: Readonly<{
  absolutePath: string;
  mobileNavigation: MobileFileNavigation;
  isOriginCurrent: () => boolean;
}>): Promise<MobileFileOpenOutcome> => {
  const activeContextStore = useActiveContextStore();
  const target = activeContextStore.activeWorkspaceTarget;
  const workspaceRootPath = target?.workspaceRootPath;
  if (target && useRemoteRunsStore().runOfAgentRun(target.context.state.runId)) return { status: 'unavailable' };
  let locator: ReturnType<typeof mapAbsolutePathToWorkspaceRelative> = null;
  if (target && workspaceRootPath) {
    const metadata = await useWorkspaceStore().resolveWorkspaceMetadataByRootPath(workspaceRootPath);
    const workspaceId = metadata?.workspaceId || '';
    locator = workspaceId ? mapAbsolutePathToWorkspaceRelative(input.absolutePath, { workspaceId, workspaceRootPath }) : null;
  }
  if (!input.isOriginCurrent() || activeContextStore.activeWorkspaceTarget?.context !== target?.context) return { status: 'failed' };
  if (locator) {
    await input.mobileNavigation.openFile({ workspaceId: locator.workspaceId, path: locator.relativePath });
    return { status: 'opened', path: locator.relativePath };
  }
  await input.mobileNavigation.openNodeFile({ path: input.absolutePath });
  return { status: 'opened', path: input.absolutePath };
};
