import type { ContextAttachment } from '~/types/conversation';
import { getServerBaseUrl, getServerUrls } from '~/utils/serverConfig';

const isAbsoluteLocalPath = (value: string): boolean => value.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(value);

const normalizeBrowserUrl = (locator: string): string => {
  if (
    locator.startsWith('blob:') ||
    locator.startsWith('data:') ||
    locator.startsWith('local-file://') ||
    locator.startsWith('file://') ||
    locator.startsWith('http://') ||
    locator.startsWith('https://')
  ) {
    return locator;
  }

  const baseUrl = getServerBaseUrl().replace(/\/$/, '');
  if (locator.startsWith('/')) {
    return `${baseUrl}${locator}`;
  }

  if (locator.startsWith('rest/')) {
    return `${baseUrl}/${locator}`;
  }

  return locator;
};

const resolveWorkspacePreviewUrl = (input: {
  locator: string;
  workspaceId?: string | null;
  isEmbeddedElectronRuntime?: boolean;
}): string | null => {
  if (input.isEmbeddedElectronRuntime && isAbsoluteLocalPath(input.locator)) {
    return `local-file://${input.locator}`;
  }

  if (!input.workspaceId) {
    return null;
  }

  const restBaseUrl = getServerUrls().rest.replace(/\/$/, '');
  return `${restBaseUrl}/workspaces/${input.workspaceId}/content?path=${encodeURIComponent(input.locator)}`;
};

export const contextAttachmentPresentation = {
  getKey(attachment: ContextAttachment): string {
    return attachment.id;
  },

  getDisplayLabel(attachment: ContextAttachment): string {
    return attachment.displayName;
  },

  resolveImagePreviewUrl(
    attachment: ContextAttachment,
    options: {
      workspaceId?: string | null;
      isEmbeddedElectronRuntime?: boolean;
      failedKeys?: Set<string>;
    } = {},
  ): string | null {
    if (attachment.type !== 'Image') {
      return null;
    }
    if (options.failedKeys?.has(attachment.id)) {
      return null;
    }

    if (attachment.kind === 'workspace_path') {
      return resolveWorkspacePreviewUrl({
        locator: attachment.locator,
        workspaceId: options.workspaceId,
        isEmbeddedElectronRuntime: options.isEmbeddedElectronRuntime,
      });
    }

    return normalizeBrowserUrl(attachment.locator);
  },

  openAttachment(
    attachment: ContextAttachment,
    options: {
      workspaceId?: string | null;
      isEmbeddedElectronRuntime?: boolean;
      failedKeys?: Set<string>;
      preferFileViewerForPreviewableImages?: boolean;
      openWorkspaceFile?: (locator: string, workspaceId: string) => void;
      openFilePreview?: (url: string, workspaceId: string) => void;
      openBrowserUrl?: (url: string) => void;
    } = {},
  ): void {
    if (attachment.kind === 'workspace_path' && options.workspaceId && options.openWorkspaceFile) {
      options.openWorkspaceFile(attachment.locator, options.workspaceId);
      return;
    }

    const previewUrl =
      attachment.kind !== 'workspace_path'
        ? this.resolveImagePreviewUrl(attachment, {
            workspaceId: options.workspaceId,
            isEmbeddedElectronRuntime: options.isEmbeddedElectronRuntime,
            failedKeys: options.failedKeys,
          })
        : null;
    if (
      previewUrl &&
      options.preferFileViewerForPreviewableImages &&
      options.workspaceId &&
      options.openFilePreview
    ) {
      options.openFilePreview(previewUrl, options.workspaceId);
      return;
    }

    const fallbackWorkspaceUrl =
      attachment.kind === 'workspace_path'
        ? resolveWorkspacePreviewUrl({
            locator: attachment.locator,
            workspaceId: options.workspaceId,
            isEmbeddedElectronRuntime: options.isEmbeddedElectronRuntime,
          })
        : null;
    const browserUrl = fallbackWorkspaceUrl || normalizeBrowserUrl(attachment.locator);

    if (options.openBrowserUrl) {
      options.openBrowserUrl(browserUrl);
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(browserUrl, '_blank', 'noopener,noreferrer');
    }
  },
};
