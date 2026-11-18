import type { WorkspaceToolReveal } from '~/composables/layout/useWorkspaceToolReveal';
import { useLocalization } from '~/composables/useLocalization';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { FILE_ON_OTHER_NODE_MESSAGE_KEY, remoteRunFileNode } from '~/composables/remoteRuns/remoteRunFile';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import { mapAbsolutePathToWorkspaceRelative } from '~/utils/fileExplorer/absoluteWorkspacePathMapping';
import { hasTrustedElectronLocalFileCapability } from '~/utils/fileExplorer/localFileCapability';
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime';
import { normalizeWorkspaceRootPath } from '~/utils/workspaceMetadata';
import type { MobileFileNavigation } from '~/composables/mobile/useMobileNavigation';
import { openMobileFilePath } from '~/composables/mobile/mobileFileOpening';

export type EventMonitorFilePreviewResult =
  | { status: 'opened'; path: string }
  | { status: 'unavailable' | 'failed'; message: string };

/**
 * How a path opens in a desktop window: by its absolute path (the Files panel reads it as a local file in the embedded
 * window that can, as a node file in every other window, autobyteus-471), or inside the run's folder as a workspace file.
 */
type EventMonitorPreviewLocator =
  | { kind: 'absolute'; workspaceId: string; path: string }
  | { kind: 'workspace-relative'; workspaceId: string; relativePath: string };

export function useEventMonitorFilePreview(options: {
  revealTool: WorkspaceToolReveal | null;
  /** The phone opens a conversation's file on its Files screen (autobyteus-277 DS-008); null off the phone. */
  mobileNavigation: MobileFileNavigation | null;
  isOriginCurrent: () => boolean;
  /** The run whose conversation names the path. */
  originRunId: () => string | null | undefined;
}) {
  const fileExplorerStore = useFileExplorerStore();
  const { mobileNavigation } = options;
  const windowNodeContextStore = useWindowNodeContextStore();
  const workspaceStore = useWorkspaceStore();
  const activeContextStore = useActiveContextStore();
  const { t } = useLocalization();

  /** A run another node runs: its paths are that node's (autobyteus-471 REQ-003). */
  const onOtherNode = (nodeName: string): EventMonitorFilePreviewResult => ({
    status: 'unavailable',
    message: t(FILE_ON_OTHER_NODE_MESSAGE_KEY, { node: nodeName }),
  });

  const failed = (): EventMonitorFilePreviewResult => ({
    status: 'failed',
    message: t('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed'),
  });

  /** The phone opens the path on its Files screen (`openMobileFilePath`, shared with attachments). */
  const openMobilePath = async (action: AbsoluteFilePathAction): Promise<EventMonitorFilePreviewResult> => {
    if (!mobileNavigation) return failed();
    const outcome = await openMobileFilePath({
      absolutePath: action.normalizedCandidate, mobileNavigation, isOriginCurrent: options.isOriginCurrent,
    });
    if (outcome.status === 'opened') return outcome;
    return outcome.status === 'unavailable' ? onOtherNode(outcome.nodeName) : failed();
  };

  const openPath = async (action: AbsoluteFilePathAction): Promise<EventMonitorFilePreviewResult> => {
    try {
      if (!options.isOriginCurrent()) return failed();
      const remoteNode = remoteRunFileNode(options.originRunId());
      if (remoteNode) return onOtherNode(remoteNode);
      if (isMobileRemoteAccessRuntime()) {
        return await openMobilePath(action);
      }

      if (!options.revealTool) return failed();
      const workspaceTarget = activeContextStore.activeWorkspaceTarget;
      const bindingRevision = windowNodeContextStore.bindingRevision;
      const runId = workspaceTarget?.context.state.runId;
      const sourceRoot = normalizeWorkspaceRootPath(workspaceTarget?.workspaceRootPath);
      const isCurrent = () => {
        const current = activeContextStore.activeWorkspaceTarget;
        return options.isOriginCurrent() && windowNodeContextStore.bindingRevision === bindingRevision
          && (workspaceTarget
            ? current?.context === workspaceTarget.context && current.context.state.runId === runId
              && normalizeWorkspaceRootPath(current.workspaceRootPath) === sourceRoot
            : !current);
      };
      let activeMetadata = workspaceTarget
        ? workspaceTarget.context.config.workspaceMetadata
        : workspaceStore.activeWorkspaceMetadata;
      const activeWorkspace = workspaceTarget ? null : workspaceStore.activeWorkspace;
      let workspaceId = workspaceTarget?.context.config.workspaceId
        || activeMetadata?.workspaceId || activeWorkspace?.workspaceId || '';
      if (workspaceTarget && !workspaceTarget.context.config.workspaceId) {
        activeMetadata = await activeContextStore.resolveWorkspaceMetadataForTarget(workspaceTarget);
        if (!isCurrent() || !activeMetadata) return failed();
        workspaceId = workspaceTarget.context.config.workspaceId || '';
      }
      if (!workspaceId) return failed();

      let locator: EventMonitorPreviewLocator | null = null;
      if (windowNodeContextStore.isEmbeddedWindow && hasTrustedElectronLocalFileCapability()) {
        locator = { kind: 'absolute', workspaceId, path: action.normalizedCandidate };
      } else {
        const mappedLocator = mapAbsolutePathToWorkspaceRelative(action.normalizedCandidate, {
          workspaceId,
          workspaceRootPath: workspaceTarget?.workspaceRootPath || activeMetadata?.workspaceRootPath || activeWorkspace?.absolutePath,
        });
        if (mappedLocator) {
          locator = {
            kind: 'workspace-relative',
            workspaceId: mappedLocator.workspaceId,
            relativePath: mappedLocator.relativePath,
          };
        }
      }
      // Anywhere else on the window's node: a node file, read-only, by its absolute path (autobyteus-471 REQ-001).
      locator ??= { kind: 'absolute', workspaceId, path: action.normalizedCandidate };

      if (!isCurrent()) return failed();
      const previewPath = locator.kind === 'absolute' ? locator.path : locator.relativePath;
      await fileExplorerStore.openFilePreview(previewPath, locator.workspaceId, {
        accessIntent: { source: 'event-monitor', readOnly: true },
      });
      if (!isCurrent()) return failed();
      const revealed = await options.revealTool('files');
      if (!revealed || !isCurrent()) return failed();
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (!isCurrent()) return;
          document
            .querySelector<HTMLElement>('[data-event-monitor-active-file-tab="true"]')
            ?.focus();
        }, 0);
      }
      return { status: 'opened', path: previewPath };
    } catch (error) {
      console.warn('[EventMonitorFilePreview] File preview failed.', error);
      return {
        status: 'failed',
        message: t('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed'),
      };
    }
  };

  return { openPath };
}
