import type { WorkspaceToolReveal } from '~/composables/layout/useWorkspaceToolReveal';
import { useLocalization } from '~/composables/useLocalization';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useActiveContextStore } from '~/stores/activeContextStore';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import { mapAbsolutePathToWorkspaceRelative } from '~/utils/fileExplorer/absoluteWorkspacePathMapping';
import { hasTrustedElectronLocalFileCapability } from '~/utils/fileExplorer/localFileCapability';
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime';
import { normalizeWorkspaceRootPath } from '~/utils/workspaceMetadata';
import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';

export type EventMonitorFilePreviewResult =
  | { status: 'opened'; path: string }
  | { status: 'unavailable' | 'failed'; message: string };

type EventMonitorPreviewLocator =
  | { kind: 'local-absolute'; workspaceId: string; path: string }
  | { kind: 'workspace-relative'; workspaceId: string; relativePath: string };

export function useEventMonitorFilePreview(options: {
  revealTool: WorkspaceToolReveal | null;
  isOriginCurrent: () => boolean;
}) {
  const fileExplorerStore = useFileExplorerStore();
  // The phone opens a conversation's file on its Files screen (autobyteus-277 DS-008).
  const mobileNavigation = isMobileRemoteAccessRuntime() ? useMobileNavigation() : null;
  const windowNodeContextStore = useWindowNodeContextStore();
  const workspaceStore = useWorkspaceStore();
  const activeContextStore = useActiveContextStore();
  const { t } = useLocalization();

  const unavailable = (key: string): EventMonitorFilePreviewResult => ({
    status: 'unavailable',
    message: t(key),
  });

  const failed = (): EventMonitorFilePreviewResult => ({
    status: 'failed',
    message: t('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed'),
  });

  /** The phone: the file, in the open agent's folder, opens full screen on the Files screen (a history entry). */
  const openMobilePath = async (action: AbsoluteFilePathAction): Promise<EventMonitorFilePreviewResult> => {
    const target = activeContextStore.activeWorkspaceTarget;
    const workspaceRootPath = target?.workspaceRootPath;
    if (!target || !workspaceRootPath || !mobileNavigation) {
      return unavailable('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
    }
    const metadata = await workspaceStore.resolveWorkspaceMetadataByRootPath(workspaceRootPath);
    const workspaceId = metadata?.workspaceId || '';
    const locator = workspaceId
      ? mapAbsolutePathToWorkspaceRelative(action.normalizedCandidate, { workspaceId, workspaceRootPath })
      : null;
    if (!locator) {
      return unavailable('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
    }
    if (!options.isOriginCurrent() || activeContextStore.activeWorkspaceTarget?.context !== target.context) return failed();
    await mobileNavigation.openFile({ workspaceId: locator.workspaceId, path: locator.relativePath });
    return { status: 'opened', path: locator.relativePath };
  };

  const openPath = async (action: AbsoluteFilePathAction): Promise<EventMonitorFilePreviewResult> => {
    try {
      if (!options.isOriginCurrent()) return failed();
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
      if (!workspaceId) {
        return workspaceTarget ? failed()
          : unavailable('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
      }

      let locator: EventMonitorPreviewLocator | null = null;
      if (windowNodeContextStore.isEmbeddedWindow && hasTrustedElectronLocalFileCapability()) {
        locator = { kind: 'local-absolute', workspaceId, path: action.normalizedCandidate };
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
      if (!locator) {
        return unavailable('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
      }

      if (!isCurrent()) return failed();
      const previewPath = locator.kind === 'local-absolute' ? locator.path : locator.relativePath;
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
