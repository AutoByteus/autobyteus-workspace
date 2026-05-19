import { computed } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useFileExplorerStore, type OpenFileState } from '~/stores/fileExplorer';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import type { ContextAttachment } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';
import {
  createWorkspaceContextAttachment,
  inferContextAttachmentType,
} from '~/utils/contextFiles/contextAttachmentModel';

export const MOBILE_FILE_PREVIEW_MAX_CHARS = 120_000;

export type MobilePreviewSupport = 'supported' | 'unsupported';
export type MobileAttachmentTarget = 'active-run' | 'mobile-draft' | 'none';

const TEXT_PREVIEW_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cs', '.css', '.go', '.h', '.hpp', '.html', '.java', '.js', '.json', '.jsx',
  '.kt', '.less', '.log', '.lua', '.md', '.mjs', '.php', '.py', '.rb', '.rs', '.sass', '.scss',
  '.sh', '.sql', '.swift', '.toml', '.ts', '.tsx', '.txt', '.vue', '.xml', '.yaml', '.yml',
]);

const pathExtension = (path: string): string => {
  const basename = path.split(/[\\/]/).pop() || '';
  const index = basename.lastIndexOf('.');
  return index === -1 ? '' : basename.slice(index).toLowerCase();
};

const isSupportedPreviewPath = (path: string): boolean => {
  const ext = pathExtension(path);
  return !ext || TEXT_PREVIEW_EXTENSIONS.has(ext);
};

const addUniqueAttachment = (
  attachments: ContextAttachment[],
  attachment: ContextAttachment,
  add: (attachment: ContextAttachment) => void,
): boolean => {
  const locator = attachment.locator.trim();
  if (!locator || attachments.some((entry) => entry.locator === locator)) {
    return false;
  }
  add(attachment);
  return true;
};

export function useMobileFileContextCoordinator() {
  const fileExplorerStore = useFileExplorerStore();
  const activeContextStore = useActiveContextStore();
  const agentContextsStore = useAgentContextsStore();
  const selectionStore = useAgentSelectionStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const mobileWorkStore = useMobileWorkStore();

  const isActiveMobileRunContext = (context: MobileWorkContext | null): boolean => {
    if (context?.kind === 'agent-run') {
      return selectionStore.selectedType === 'agent'
        && selectionStore.selectedRunId === context.runId
        && Boolean(agentContextsStore.getRun(context.runId))
        && activeContextStore.activeAgentContext?.state.runId === context.runId;
    }
    if (context?.kind === 'team-run') {
      const team = teamContextsStore.getTeamContextById(context.teamRunId);
      return selectionStore.selectedType === 'team'
        && selectionStore.selectedRunId === context.teamRunId
        && Boolean(team)
        && team?.focusedMemberRouteKey === context.focusedMemberRouteKey
        && Boolean(activeContextStore.activeAgentContext);
    }
    return false;
  };

  const isMobileDraftContext = (context: MobileWorkContext | null): boolean => (
    !context
    || context.kind === 'workspace'
    || context.kind === 'agent-definition'
    || context.kind === 'team-definition'
  );

  const getVisibleContextAttachments = (context: MobileWorkContext | null): ContextAttachment[] => {
    if (isActiveMobileRunContext(context)) {
      return [...activeContextStore.currentContextPaths];
    }
    if (isMobileDraftContext(context)) {
      return [...mobileWorkStore.draftContextAttachments];
    }
    return [];
  };

  const visibleContextAttachments = computed<ContextAttachment[]>(() => getVisibleContextAttachments(mobileWorkStore.currentContext));

  function getPreviewSupport(filePath: string): { support: MobilePreviewSupport; message: string | null } {
    if (isSupportedPreviewPath(filePath)) {
      return { support: 'supported', message: null };
    }
    return {
      support: 'unsupported',
      message: 'Mobile preview supports text, code, and Markdown files. Use desktop for binary, PDF, spreadsheet, image, audio, or video previews.',
    };
  }

  async function openPreview(filePath: string, workspaceId: string): Promise<void> {
    const support = getPreviewSupport(filePath);
    if (support.support === 'unsupported') {
      return;
    }
    await fileExplorerStore.openFilePreview(filePath, workspaceId);
  }

  function getPreviewState(filePath: string, workspaceId: string): OpenFileState | null {
    const active = fileExplorerStore.getActiveFileData(workspaceId);
    if (active?.path === filePath) {
      return active;
    }
    const wsState = fileExplorerStore._getWorkspaceState(workspaceId);
    return wsState?.openFiles.find((file) => file.path === filePath) ?? null;
  }

  function removeVisibleContextAttachment(context: MobileWorkContext | null, attachmentId: string): void {
    if (isActiveMobileRunContext(context)) {
      const activeIndex = activeContextStore.currentContextPaths.findIndex((entry) => entry.id === attachmentId);
      if (activeIndex !== -1) {
        activeContextStore.removeContextFilePath(activeIndex);
      }
      return;
    }
    if (isMobileDraftContext(context)) {
      mobileWorkStore.removeDraftContextAttachment(attachmentId);
    }
  }

  function clearVisibleContextAttachments(context: MobileWorkContext | null): void {
    if (isActiveMobileRunContext(context)) {
      activeContextStore.clearContextFilePaths();
      return;
    }
    if (isMobileDraftContext(context)) {
      mobileWorkStore.clearDraftContextAttachments();
    }
  }

  function attachWorkspaceFile(
    filePath: string,
    context: MobileWorkContext | null = mobileWorkStore.currentContext,
  ): { attached: boolean; attachment: ContextAttachment; target: MobileAttachmentTarget } {
    const attachment = createWorkspaceContextAttachment(filePath, inferContextAttachmentType(filePath));
    if (isActiveMobileRunContext(context)) {
      const attached = addUniqueAttachment(
        activeContextStore.currentContextPaths,
        attachment,
        (next) => activeContextStore.addContextFilePath(next),
      );
      return { attached, attachment, target: 'active-run' };
    }

    if (isMobileDraftContext(context)) {
      const attached = addUniqueAttachment(
        mobileWorkStore.draftContextAttachments,
        attachment,
        (next) => mobileWorkStore.addDraftContextAttachment(next),
      );
      return { attached, attachment, target: 'mobile-draft' };
    }

    return { attached: false, attachment, target: 'none' };
  }

  return {
    visibleContextAttachments,
    getVisibleContextAttachments,
    removeVisibleContextAttachment,
    clearVisibleContextAttachments,
    getPreviewSupport,
    openPreview,
    getPreviewState,
    attachWorkspaceFile,
  };
}
