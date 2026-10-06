import type { WorkspaceToolReveal } from '~/composables/layout/useWorkspaceToolReveal';
import { useLocalization } from '~/composables/useLocalization';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useActiveContextStore } from '~/stores/activeContextStore';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import { mapAbsolutePathToWorkspaceRelative } from '~/utils/fileExplorer/absoluteWorkspacePathMapping';
import { hasTrustedElectronLocalFileCapability } from '~/utils/fileExplorer/localFileCapability';
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime';
import { normalizeWorkspaceRootPath } from '~/utils/workspaceMetadata';
import { mobileWorkContextKey } from '~/types/mobileWork';

export type EventMonitorFilePreviewResult =
  | { status: 'opened'; path: string }
  | { status: 'unavailable' | 'failed'; message: string };

type EventMonitorPreviewLocator =
  | { kind: 'local-absolute'; workspaceId: string; path: string }
  | { kind: 'workspace-relative'; workspaceId: string; relativePath: string };

const contextWorkspace = (context: ReturnType<typeof useMobileWorkStore>['currentContext']) => {
  if (!context) return null;
  if (context.kind === 'workspace') {
    return {
      workspaceId: context.workspaceId,
      workspaceRootPath: context.rootPath,
    };
  }
  if (context.kind === 'agent-run' || context.kind === 'team-run') {
    return {
      workspaceId: '',
      workspaceRootPath: context.workspaceRootPath,
    };
  }
  return null;
};

export function useEventMonitorFilePreview(options: {
  revealTool: WorkspaceToolReveal | null;
  isOriginCurrent: () => boolean;
}) {
  const fileExplorerStore = useFileExplorerStore();
  const mobileWorkStore = useMobileWorkStore();
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

  const openMobilePath = async (action: AbsoluteFilePathAction): Promise<EventMonitorFilePreviewResult> => {
    const context = mobileWorkStore.currentContext;
    const workspace = contextWorkspace(context);
    if (!context || !workspace?.workspaceRootPath) {
      return unavailable('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
    }

    let workspaceId = workspace.workspaceId;
    if (!workspaceId) {
      const metadata = await workspaceStore.resolveWorkspaceMetadataByRootPath(workspace.workspaceRootPath);
      workspaceId = metadata?.workspaceId || '';
    }
    if (!workspaceId) {
      return unavailable('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
    }

    const locator = mapAbsolutePathToWorkspaceRelative(action.normalizedCandidate, {
      workspaceId,
      workspaceRootPath: workspace.workspaceRootPath,
    });
    if (!locator) {
      return unavailable('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
    }

    if (!options.isOriginCurrent()) return failed();
    mobileWorkStore.requestFilePreview({
      contextKey: mobileWorkContextKey(context),
      workspaceId: locator.workspaceId,
      relativePath: locator.relativePath,
      source: 'event-monitor',
      readOnly: true,
      presentation: 'inline',
    });
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
